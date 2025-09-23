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

export interface ProjectStatusResponse {
  project: ProjectSummary;
  clipStatuses?: ClipStatus[];
  aiSuggestions?: AISuggestion[];
  transcript?: string;
  transcriptUpdatedAt?: string;
  ownership?: ProjectOwnership;
}
