export const readGlobalProjectId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const w = window as typeof window & { __mc_project?: unknown };
    const fromGlobal = typeof w.__mc_project === 'string' ? w.__mc_project.trim() : '';
    if (fromGlobal) return fromGlobal;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hashId = hashParams.get('pid');
    if (hashId && hashId.trim()) return hashId.trim();
  } catch (error) {
    console.debug('[moodclip] unable to read global project id', error);
  }
  return null;
};
