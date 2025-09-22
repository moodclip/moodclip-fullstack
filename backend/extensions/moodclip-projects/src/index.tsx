import React, {useEffect, useState} from 'react';
import {
  reactExtension,
  BlockStack,
  InlineStack,
  Heading,
  Text,
} from '@shopify/ui-extensions-react/customer-account';

type Project = { id: string; title?: string; status?: string | null };

function ProjectsPage({ sessionToken }: { sessionToken: { get(): Promise<string> } }) {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = await sessionToken.get();

        // Prefer App Proxy; fall back to Cloud Run if proxy is broken
        let bases: string[] = ['https://mf-backend-270455452709.us-central1.run.app'];
        try {
          const body = token.split('.')[1] || '';
          const payload = body ? JSON.parse(atob(body)) : {};
          const dest = String(payload.dest || payload.iss || '');
          if (dest) {
            const host = new URL(dest).host;
            bases = [`https://${host}/apps/moodclip-uploader-v4`, ...bases];
          }
        } catch {}

        let lastErr: any = null;
        for (const base of bases) {
          try {
            const r = await fetch(`${base}/proxy/projects?limit=30`, {
              method: 'GET',
              headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
              mode: 'cors',
              cache: 'no-store',
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const j = await r.json().catch(() => ({}));
            const list = Array.isArray(j?.projects) ? j.projects : [];
            if (!cancelled) {
              setProjects(list);
              setLoading(false);
              setError(null);
            }
            return;
          } catch (e) {
            lastErr = e;
          }
        }
        if (!cancelled) {
          setLoading(false);
          setError(String(lastErr?.message || 'projects_fetch_failed'));
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoading(false);
          setError(String(e?.message || e));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [sessionToken]);

  if (loading) {
    return (
      <BlockStack spacing="base">
        <Heading>My Projects</Heading>
        <Text>Loading…</Text>
      </BlockStack>
    );
  }

  if (error) {
    return (
      <BlockStack spacing="base">
        <Heading>My Projects</Heading>
        <Text appearance="critical">Error: {error}</Text>
      </BlockStack>
    );
  }

  if (!projects.length) {
    return (
      <BlockStack spacing="base">
        <Heading>My Projects</Heading>
        <Text>No projects yet.</Text>
      </BlockStack>
    );
  }

  return (
    <BlockStack spacing="base">
      <Heading>My Projects</Heading>
      {projects.map((p) => (
        <InlineStack spacing="base" key={p.id}>
          <Text emphasis="bold">{p.title || p.id}</Text>
          {p.status ? <Text>• {p.status}</Text> : null}
        </InlineStack>
      ))}
    </BlockStack>
  );
}

export default reactExtension('customer-account.page.render', ({sessionToken}) => {
  return <ProjectsPage sessionToken={sessionToken} />;
});
