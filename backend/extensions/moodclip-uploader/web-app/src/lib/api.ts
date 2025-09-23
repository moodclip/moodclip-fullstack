import type {
  AISuggestion,
  ClipStatus,
  MarkUploadResponse,
  ProjectStatusResponse,
  ProjectSummary,
  ProjectsResponse,
  TranscriptChunkResponse,
  StreamUrlResponse,
  UploadUrlResponse,
} from '@/types/backend';

const APP_PROXY_BASE = '/apps/moodclip-uploader-v4';
const APP_PROXY_PREFIX = `${APP_PROXY_BASE}`;
const MC_TOKEN_STORAGE_KEY = 'mc_token';
const CLAIM_TOKEN_STORAGE_KEY = 'mc_claim_tokens';

const defaultAccept = 'application/json';

const getSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch (error) {
    console.warn('Session storage unavailable', error);
    return null;
  }
};

const readSessionValue = (key: string): string | null => {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch (error) {
    console.warn('Failed to read session storage value', { key, error });
    return null;
  }
};

const writeSessionValue = (key: string, value: string | null) => {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    if (value === null) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, value);
    }
  } catch (error) {
    console.warn('Failed to write session storage value', { key, error });
  }
};

const getMcToken = (): string | null => readSessionValue(MC_TOKEN_STORAGE_KEY);

const readClaimTokenMap = (): Record<string, string> => {
  const raw = readSessionValue(CLAIM_TOKEN_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (error) {
    console.warn('Failed to parse claim token storage', error);
  }
  writeSessionValue(CLAIM_TOKEN_STORAGE_KEY, null);
  return {};
};

const writeClaimTokenMap = (map: Record<string, string>) => {
  writeSessionValue(CLAIM_TOKEN_STORAGE_KEY, JSON.stringify(map));
};

export const storeClaimToken = (videoId: string, claimToken?: string | null) => {
  if (!claimToken) return;
  const current = readClaimTokenMap();
  current[videoId] = claimToken;
  writeClaimTokenMap(current);
  console.info('[moodclip] Stored claim token', { videoId });
};

export const consumeClaimToken = (videoId: string): string | undefined => {
  const current = readClaimTokenMap();
  const token = current[videoId];
  if (!token) return undefined;
  delete current[videoId];
  writeClaimTokenMap(current);
  console.info('[moodclip] Consumed claim token', { videoId });
  return token;
};

const ensureHeaders = (input?: HeadersInit): Headers => {
  const headers = new Headers(input ?? {});
  if (!headers.has('Accept')) headers.set('Accept', defaultAccept);

  const mcToken = getMcToken();
  if (mcToken && !headers.has('X-MC-Token')) {
    headers.set('X-MC-Token', mcToken);
  }

  return headers;
};

const buildUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  return `${APP_PROXY_PREFIX}${path}`;
};

const parseJsonSafely = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  const text = await response.text();
  return text as unknown as T;
};

export const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = ensureHeaders(init.headers);
  const url = buildUrl(path);

  if (path.startsWith('/proxy/uploads') || path.startsWith('/proxy/mark')) {
    console.info('[moodclip] API request', {
      url,
      method: (init.method ?? 'GET').toUpperCase(),
      hasMcToken: headers.has('X-MC-Token'),
    });
  }

  const response = await fetch(url, {
    credentials: init.credentials ?? 'include',
    ...init,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const error = new Error(`Request to ${path} failed with ${response.status}`);
    const enrichedError = error as Error & { details?: string; status?: number; url?: string };
    enrichedError.details = errorBody;
    enrichedError.status = response.status;
    enrichedError.url = url;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return parseJsonSafely<T>(response);
};

interface RequestUploadOptions {
  signal?: AbortSignal;
  storeClaimToken?: boolean;
}

export const requestUploadUrl = async (
  file: File,
  options?: RequestUploadOptions,
): Promise<UploadUrlResponse> => {
  const params = new URLSearchParams({
    name: file.name,
    type: file.type || 'application/octet-stream',
  });

  console.debug('[moodclip] Requesting signed upload URL', {
    fileName: file.name,
    fileType: file.type,
    size: file.size,
  });

  const response = await apiFetch<UploadUrlResponse>(`/proxy/uploads?${params.toString()}`, {
    method: 'GET',
    signal: options?.signal,
  });

  console.debug('[moodclip] Received signed upload URL', {
    videoId: response.videoId,
    hasClaimToken: Boolean(response.claimToken),
  });

  if (options?.storeClaimToken !== false && response.claimToken) {
    storeClaimToken(response.videoId, response.claimToken);
  }

  return response;
};

export type UploadProgressCallback = (percent: number, event: ProgressEvent<EventTarget>) => void;

export interface UploadController {
  promise: Promise<void>;
  abort: () => void;
}

export const uploadToSignedUrl = (
  url: string,
  file: File,
  onProgress?: UploadProgressCallback,
): UploadController => {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<void>((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const percent = (event.loaded / event.total) * 100;
      onProgress(percent, event);
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed due to a network error.'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload was aborted.'));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };
  });

  xhr.open('PUT', url, true);
  xhr.withCredentials = false;
  xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
  xhr.send(file);

  return {
    promise,
    abort: () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        xhr.abort();
      }
    },
  };
};

export const markUploadReady = async (
  videoId: string,
  attempt?: number,
): Promise<MarkUploadResponse | undefined> => {
  console.debug('[moodclip] Marking upload ready', { videoId });

  return apiFetch<MarkUploadResponse>(`/proxy/mark`, {
    method: 'POST',
    headers: ensureHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ videoId, attempt }),
  }).catch((error) => {
    console.error('[moodclip] Failed to mark upload ready', { videoId, error });
    throw error;
  });
};

export const fetchProjectStatus = async (
  videoId: string,
  options?: { signal?: AbortSignal; includeTranscript?: boolean },
): Promise<ProjectStatusResponse> => {
  const params = new URLSearchParams();
  if (options?.includeTranscript) {
    params.append('include', 'transcript');
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';

  return apiFetch<ProjectStatusResponse>(`/proxy/status/${videoId}${suffix}`, {
    method: 'GET',
    signal: options?.signal,
  });
};

export const fetchProjects = async (
  params?: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<ProjectsResponse> => {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    query.set(key, String(value));
  });

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<ProjectsResponse>(`/proxy/projects${suffix}`, {
    method: 'GET',
    signal,
  });
};

export const fetchTranscriptChunk = async (
  videoId: string,
  params?: { part?: number; chunkSize?: number; format?: 'raw' | 'array' },
): Promise<TranscriptChunkResponse> => {
  const query = new URLSearchParams();
  if (params?.part !== undefined) query.set('part', String(params.part));
  if (params?.chunkSize !== undefined) query.set('chunkSize', String(params.chunkSize));
  if (params?.format) query.set('format', params.format);
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return apiFetch<TranscriptChunkResponse>(`/proxy/transcript/${videoId}${suffix}`, {
    method: 'GET',
  });
};

export const fetchStreamUrl = async (videoId: string): Promise<StreamUrlResponse> => {
  return apiFetch<StreamUrlResponse>(`/proxy/stream/${videoId}`, {
    method: 'GET',
  });
};

export const claimUpload = async (
  videoId: string,
  claimToken: string,
): Promise<{ ok: boolean }> => {
  return apiFetch<{ ok: boolean }>(`/proxy/claim`, {
    method: 'POST',
    headers: ensureHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ videoId, claimToken }),
  });
};

export const claimUploadForVideo = async (
  videoId: string,
  claimToken: string,
): Promise<{ ok: boolean }> => {
  return apiFetch<{ ok: boolean }>(`/proxy/claim/${videoId}`, {
    method: 'POST',
    headers: ensureHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ claimToken }),
  });
};

export const getPendingClaimTokens = () =>
  Object.entries(readClaimTokenMap()).map(([videoId, claimToken]) => ({ videoId, claimToken }));

export const hasPendingClaimTokens = () => getPendingClaimTokens().length > 0;

let claimInFlight: Promise<void> | null = null;

export const claimPendingUploads = async (): Promise<void> => {
  if (claimInFlight) return claimInFlight;

  const pending = getPendingClaimTokens();
  if (!pending.length) return;

  claimInFlight = (async () => {
    pending.forEach(({ videoId }) => consumeClaimToken(videoId));
    console.info('[moodclip] Claim endpoints are disabled; cleared pending claim tokens', {
      cleared: pending.length,
    });
  })().finally(() => {
    claimInFlight = null;
  });

  return claimInFlight;
};

export type ProjectStatus = ProjectStatusResponse['project'];
export type ProjectClips = ClipStatus[];
export type ProjectSuggestions = AISuggestion[];
export type ProjectListItem = ProjectSummary;

export { APP_PROXY_BASE };
