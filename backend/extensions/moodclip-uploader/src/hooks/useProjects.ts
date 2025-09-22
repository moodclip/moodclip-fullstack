import { useEffect, useMemo, useRef, useState } from "react";

type ProjectItem = {
  id: string;
  status?: string;
  aiReady?: boolean;
  durationSec?: number | null;
  lastClipUrl?: string | null;
  updatedAt?: number;
};

type FetchResult = { items: ProjectItem[]; nextCursor?: string | null };

async function fetchJSON(url: string, init?: RequestInit) {
  const resp = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text.slice(0, 240)}`);
  try { return JSON.parse(text); } catch { throw new Error("Invalid JSON"); }
}

export function useProjects(opts?: { pollMs?: number; autoStop?: boolean; search?: string; pageSize?: number }) {
  const pollMs = opts?.pollMs ?? 30000;
  const autoStop = opts?.autoStop ?? true;
  const search = (opts?.search ?? "").trim();
  const pageSize = Math.max(1, Math.min(opts?.pageSize ?? 20, 100));

  const [items, setItems] = useState<ProjectItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // consecutive polls where all projects are finished
  const quietCountRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const baseUrl = useMemo(() => {
    const u = new URL("/apps/moodclip-uploader-v4/proxy/projects", window.location.origin);
    u.searchParams.set("limit", String(pageSize));
    if (search) u.searchParams.set("q", search);
    return u.toString();
  }, [pageSize, search]);

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const data: FetchResult = await fetchJSON(baseUrl);
      setItems(data.items || []);
      setNextCursor(data.nextCursor || null);

      // auto-stop logic: if everything is final for 3 consecutive polls, stop
      if (autoStop) {
        const hasActive = (data.items || []).some(p =>
          p.status === "initializing" || p.status === "rendering"
        );
        quietCountRef.current = hasActive ? 0 : (quietCountRef.current + 1);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    try {
      const u = new URL(baseUrl);
      u.searchParams.set("cursor", nextCursor);
      const data: FetchResult = await fetchJSON(u.toString());
      setItems(prev => [...prev, ...(data.items || [])]);
      setNextCursor(data.nextCursor || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load more.");
    }
  };

  useEffect(() => {
    // initial fetch
    refresh();

    // polling
    timerRef.current = window.setInterval(async () => {
      await refresh();
      if (autoStop && quietCountRef.current >= 3 && timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, pollMs);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, pollMs, autoStop]);

  return { items, nextCursor, loading, error, refresh, loadMore };
}
