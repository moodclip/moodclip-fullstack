import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  BlockStack,
  InlineStack,
  Heading,
  Text,
  Button,
  Spinner,
  useApi,
} from '@shopify/ui-extensions-react/customer-account';

const CLOUD_RUN_BASE = 'https://mf-backend-270455452709.us-central1.run.app';
const PAGE_SIZE = 30;

type Project = { id: string; title?: string | null; status?: string | null; createdAt?: string | null };
type ProjectsResponse = { projects?: Project[]; nextCursor?: string | null };

const buildUrl = (cursor: string | null, token: string | null) => {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (cursor) params.set('cursor', cursor);
  if (token) params.set('token', token);
  return `${CLOUD_RUN_BASE}/proxy/projects?${params.toString()}`;
};

export function ProjectsView() {
  const {sessionToken} = useApi();

  const [projects, setProjects] = useState<Project[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diag, setDiag] = useState<string>('Booting…');

  const loadPage = useCallback(
    async (cursor: string | null) => {
      const isLoadMore = Boolean(cursor);
      setError(null);
      setDiag(isLoadMore ? 'Loading more projects…' : 'Fetching customer token…');
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoadingInitial(true);
      }

      try {
        const token = await sessionToken.get();
        const primaryUrl = buildUrl(cursor, null);

        const primaryHeaders: Record<string, string> = { Accept: 'application/json' };
        if (token) {
          primaryHeaders.Authorization = `Bearer ${token}`;
        }

        let res = await fetch(primaryUrl, {
          method: 'GET',
          headers: primaryHeaders,
          mode: 'cors',
          cache: 'no-store',
        });

        if (!res.ok) {
          const fallbackUrl = buildUrl(cursor, token);
          res = await fetch(fallbackUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            mode: 'cors',
            cache: 'no-store',
          });
        }

        const text = await res.text().catch(() => '');
        if (!res.ok) {
          throw new Error(`Projects request failed: ${res.status} ${text.slice(0, 120)}`);
        }

        let json: ProjectsResponse = {};
        try {
          json = JSON.parse(text || '{}') as ProjectsResponse;
        } catch {
          json = {};
        }

        const list = Array.isArray(json.projects) ? json.projects : [];
        setNextCursor(json.nextCursor ?? null);
        setProjects((prev) => {
          const merged = cursor ? [...prev, ...list] : list;
          setDiag(`Loaded ${merged.length} project(s).`);
          return merged;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        if (!cursor) {
          setProjects([]);
        }
        setDiag('');
      } finally {
        if (cursor) {
          setLoadingMore(false);
        } else {
          setLoadingInitial(false);
        }
      }
    },
    [sessionToken],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadPage(null);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  const hasMore = useMemo(() => Boolean(nextCursor), [nextCursor]);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    void loadPage(nextCursor);
  }, [nextCursor, loadingMore, loadPage]);

  return (
    <BlockStack spacing="base">
      <Heading>My Projects</Heading>

      {!!diag && <Text>{diag}</Text>}

      {loadingInitial && (
        <InlineStack spacing="tight">
          <Spinner size="small" />
          <Text>Loading projects…</Text>
        </InlineStack>
      )}

      {!loadingInitial && error && (
        <Text appearance="critical">Error: {error}</Text>
      )}

      {!loadingInitial && !error && projects.length === 0 && (
        <Text>No projects yet.</Text>
      )}

      {!loadingInitial && !error && projects.length > 0 && (
        <BlockStack spacing="base">
          {projects.map((p) => (
            <BlockStack key={p.id} spacing="tight">
              <InlineStack spacing="base">
                <Text emphasis="bold">{p.title || p.id}</Text>
                {p.status ? <Text>• {p.status}</Text> : null}
              </InlineStack>
              <Text>Open in editor: moodclip.com/#pid={p.id}</Text>
              {p.createdAt ? (
                <Text appearance="subdued" size="small">Created {new Date(p.createdAt).toLocaleString()}</Text>
              ) : null}
            </BlockStack>
          ))}

          {hasMore && (
            <InlineStack spacing="tight">
              <Button
                kind="secondary"
                loading={loadingMore}
                onPress={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </InlineStack>
          )}

          {!hasMore && projects.length > 0 && (
            <Text appearance="subdued" size="small">You've reached the end of your project history.</Text>
          )}
        </BlockStack>
      )}
    </BlockStack>
  );
}
