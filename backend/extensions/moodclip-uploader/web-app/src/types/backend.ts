export interface UploadUrlResponse {
  url: string;
  videoId: string;
  claimToken?: string;
  ownerCustomerId?: string | null;
}

export interface MarkUploadResponse {
  ok: boolean;
}

export interface ProjectSummary {
  id: string;
  title?: string | null;
  fileName?: string | null;
  status?: string | null;
  progress?: number | null;
  aiReady?: boolean | null;
  aiError?: string | null;
  durationSec?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  stage?: string | null;
  claimable?: boolean | null;
  queuedClipCount?: number | null;
}

export interface ProjectsResponse {
  items: ProjectSummary[];
  nextCursor?: string | null;
}

export interface ClipStatus {
  id: string;
  status: string;
  url?: string | null;
  progress?: number | null;
  title?: string | null;
  tint?: string | null;
  start?: number | null;
  end?: number | null;
  duration?: number | null;
}

export interface AISuggestion {
  id: string;
  title?: string;
  description?: string;
  start?: number;
  end?: number;
  confidence?: number;
  [key: string]: unknown;
}

export interface ProjectOwnership {
  ownedByYou?: boolean;
  claimable?: boolean;
}

export interface TranscriptMeta {
  available: boolean;
  inline?: boolean;
  size?: number;
  partCount?: number;
  truncated?: boolean;
  reason?: string;
  source?: string;
}

export interface ProjectStatusResponse {
  project: ProjectSummary;
  clipStatuses?: ClipStatus[];
  aiSuggestions?: AISuggestion[];
  transcript?: unknown;
  transcriptUpdatedAt?: string;
  transcriptMeta?: TranscriptMeta;
  ownership?: ProjectOwnership;
}

export interface TranscriptChunkResponse {
  rootKind: 'array' | 'paragraphs' | 'segments' | 'raw';
  part?: number;
  totalParts?: number;
  chunkSize?: number;
  count?: number;
  items?: unknown[];
  metadata?: Record<string, unknown> | null;
  transcript?: unknown;
  transcriptUpdatedAt?: string | null;
}

export interface StreamUrlResponse {
  url: string;
  expiresAt?: number | null;
}
