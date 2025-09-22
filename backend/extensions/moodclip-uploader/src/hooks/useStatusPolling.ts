// extensions/moodclip-uploader/src/hooks/useStatusPolling.ts
import { useEffect, useState } from 'react';
import { getShopifySessionToken } from '../lib/session';

export interface ClipStatus {
  id: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  url?: string | null;
  progress?: number;
}

// We keep this as 'any' because the backend returns { project, clipStatuses, ... }.
// Existing editor code reads from that shape.
export type StatusPayload = any;

type ReturnShape = {
  data: StatusPayload | null;
  error: string | null;
  loading: boolean;
};

/**
 * Polls status with App‑Proxy → Cloud Run fallback and optional Bearer token.
 */
export function useStatusPolling(videoId: string | null | undefined, intervalMs = 2000): ReturnShape {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!videoId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller = new AbortController();

    const tick = async () => {
      try {
        if (!active) return;
        setLoading(true);

        const token = await getShopifySessionToken().catch(() => null);
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const bases = [
          `/apps/moodclip-uploader-v4`,
          `https://mf-backend-270455452709.us-central1.run.app`,
        ];

        let lastErr: any = null;
        for (const base of bases) {
          try {
            const res = await fetch(`${base}/proxy/status/${videoId}`, {
              headers,
              signal: controller.signal,
              cache: 'no-store',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json().catch(() => ({}));
            if (!active) return;
            setData(json);
            setError(null);
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            continue;
          }
        }
        if (lastErr) throw lastErr;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        if (!active) return;
        setError(err?.message ?? 'Status polling failed');
      } finally {
        if (active) {
          setLoading(false);
          timer = setTimeout(tick, intervalMs);
        }
      }
    };

    tick();

    return () => {
      active = false;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [videoId, intervalMs]);

  return { data, error, loading };
}
