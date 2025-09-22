import {useEffect, useState} from 'react';
import {
  BlockStack,
  InlineStack,
  Heading,
  Text,
  useApi,
} from '@shopify/ui-extensions-react/customer-account';

// Talk straight to Cloud Run; no App Proxy here.
const CLOUD_RUN_BASE = 'https://mf-backend-270455452709.us-central1.run.app';

type Project = { id: string; title?: string | null; status?: string | null };

export function ProjectsView() {
  const {sessionToken} = useApi();

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [diag, setDiag]         = useState<string>('Booting…');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setDiag('Fetching customer token…');

        // Safe probe: get the Customer Account session token
        const token = await sessionToken.get();
        if (cancelled) return;

        setDiag('Calling Cloud Run /proxy/projects…');

        // Primary path: Authorization header
        let res = await fetch(`${CLOUD_RUN_BASE}/proxy/projects?limit=30`, {
          method: 'GET',
          headers: {Accept: 'application/json', Authorization: `Bearer ${token}`},
          mode: 'cors',
          cache: 'no-store',
        });

        // Fallback: if some edge strips Authorization, retry with ?token=
        if (!res.ok) {
          setDiag(`Primary failed (${res.status}); retrying with ?token=…`);
          res = await fetch(
            `${CLOUD_RUN_BASE}/proxy/projects?limit=30&token=${encodeURIComponent(token)}`,
            {method: 'GET', headers: {Accept: 'application/json'}, mode: 'cors', cache: 'no-store'}
          );
        }

        const text = await res.text().catch(() => '');
        if (!res.ok) throw new Error(`Projects request failed: ${res.status} ${text.slice(0,140)}`);

        let json: any = {};
        try { json = JSON.parse(text || '{}'); } catch { json = {}; }

        const list: Project[] = Array.isArray(json?.projects) ? json.projects : [];
        if (cancelled) return;

        setProjects(list);
        setDiag(`Loaded ${list.length} project(s).`);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setError(String(e?.message || e));
        setProjects([]);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [sessionToken]);

  return (
    <BlockStack spacing="base">
      <Heading>My Projects</Heading>

      {!!diag && <Text>{diag}</Text>}

      {loading && <Text>Loading…</Text>}

      {!loading && error && (
        <Text appearance="critical">Error: {error}</Text>
      )}

      {!loading && !error && projects.length === 0 && (
        <Text>No projects yet.</Text>
      )}

      {!loading && !error && projects.length > 0 && (
        <BlockStack spacing="base">
          {projects.map((p) => (
            <BlockStack key={p.id} spacing="tight">
              <InlineStack spacing="base">
                <Text emphasis="bold">{p.title || p.id}</Text>
                {p.status ? <Text>• {p.status}</Text> : null}
              </InlineStack>
              <Text>Open in editor: moodclip.com/#pid={p.id}</Text>
            </BlockStack>
          ))}
        </BlockStack>
      )}
    </BlockStack>
  );
}
