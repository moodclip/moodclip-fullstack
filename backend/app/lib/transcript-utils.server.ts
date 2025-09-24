import type { DocumentData } from 'firebase-admin/firestore';

export interface TranscriptWord {
  id: string;
  text: string;
  start: number;
  end: number;
  speaker?: string;
  confidence?: number;
  isHook?: boolean;
}

export interface NormalizeContext {
  units?: string;
  durationSec?: number;
  allowLegacyHeuristic?: boolean;
}

interface CollectorState {
  counter: number;
  visited: WeakSet<object>;
}

const DEFAULT_WORD_LENGTH_SECONDS = 0.42;
const MAX_RECURSION_DEPTH = 4;

const pickFirstDefined = (...values: unknown[]): unknown | undefined => {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
};

const parseMaybeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const direct = Number(trimmed);
    if (Number.isFinite(direct)) return direct;
    const ts = parseTimestampString(trimmed);
    if (ts !== null) return ts;
  }
  return null;
};

const parseTimestampString = (value: string): number | null => {
  if (!value.includes(':')) return null;
  const parts = value.split(':').map((part) => part.trim());
  if (parts.some((part) => part === '')) return null;
  let seconds = 0;
  let multiplier = 1;
  while (parts.length) {
    const part = parts.pop();
    if (!part) break;
    const numeric = Number(part);
    if (!Number.isFinite(numeric)) return null;
    seconds += numeric * multiplier;
    multiplier *= 60;
  }
  return seconds;
};

const normalizeTimeValue = (value: unknown, ctx: NormalizeContext = {}): number => {
  let numeric = parseMaybeNumber(value);
  if (numeric === null) return 0;

  const { units, durationSec, allowLegacyHeuristic } = ctx;
  if (typeof units === 'string') {
    const unit = units.toLowerCase();
    if (unit === 'cs' || unit === 'centiseconds') numeric /= 100;
    else if (unit === 'ms' || unit === 'milliseconds') numeric /= 1000;
    else if (unit === 'minutes') numeric *= 60;
  }

  const duration = typeof durationSec === 'number' && Number.isFinite(durationSec) ? durationSec : null;
  if (allowLegacyHeuristic) {
    if (duration && duration > 0 && numeric > duration * 1.5) {
      // Heuristic: treat oversized values as centiseconds.
      numeric = numeric / 100;
    } else if (numeric > 10_000) {
      // Default fallback for very large integer timestamps.
      numeric = numeric / 100;
    }
  }

  return numeric;
};

const normalizeDurationValue = (value: unknown): number | null => {
  const numeric = parseMaybeNumber(value);
  if (numeric === null || numeric <= 0) return null;
  if (numeric > 300 && numeric < 10_000) return numeric / 1000; // milliseconds -> seconds
  if (numeric >= 10_000) return numeric / 1000;
  return numeric;
};

const normalizeWordNode = (
  node: any,
  ctx: NormalizeContext,
  state: CollectorState,
  speakerHint?: string,
): TranscriptWord | null => {
  if (!node) return null;

  const rawText = pickFirstDefined(
    node.text,
    node.word,
    node.value,
    node.token,
    node.punctuated_word,
    node.alternatives?.[0]?.transcript,
  );
  const text = typeof rawText === 'string' ? rawText.trim() : '';
  if (!text) return null;

  const rawStart = pickFirstDefined(
    node.start,
    node.start_time,
    node.startTime,
    node.ts,
    node.offset,
    node.begin,
    node.time,
    node.from,
    node.offsetStart,
    node.t,
  );

  const rawEnd = pickFirstDefined(
    node.end,
    node.end_time,
    node.endTime,
    node.until,
    node.offset_end,
    node.offsetEnd,
    node.finish,
    node.to,
    node.timeEnd,
    node.offsetStop,
  );

  const start = normalizeTimeValue(rawStart, { ...ctx, allowLegacyHeuristic: true });
  let end = normalizeTimeValue(rawEnd, { ...ctx, allowLegacyHeuristic: true });

  if (!Number.isFinite(end) || end <= start) {
    const rawDuration = pickFirstDefined(node.duration, node.len, node.length, node.durationMs, node.duration_ms);
    const normalizedDuration = normalizeDurationValue(rawDuration);
    const fallbackDuration =
      normalizedDuration && normalizedDuration > 0
        ? normalizedDuration
        : Math.max(DEFAULT_WORD_LENGTH_SECONDS, text.split(/\s+/).length * (DEFAULT_WORD_LENGTH_SECONDS / 2));
    end = start + fallbackDuration;
  }

  const speakerRaw = pickFirstDefined(
    typeof node.speaker === 'string' ? node.speaker : undefined,
    typeof node.channel === 'string' ? node.channel : undefined,
    typeof node.speaker_label === 'string' ? node.speaker_label : undefined,
    typeof node.actor === 'string' ? node.actor : undefined,
    speakerHint,
  );
  const speaker = typeof speakerRaw === 'string' ? speakerRaw : undefined;

  const confidenceNumeric = parseMaybeNumber(
    pickFirstDefined(node.confidence, node.probability, node.p, node.alternatives?.[0]?.confidence),
  );
  const confidence = confidenceNumeric !== null ? confidenceNumeric : undefined;

  const isHook = Boolean(node.isHook || node.hook || node.highlight || node.is_highlight);

  const idSource = pickFirstDefined(node.id, node.word_id, node.index, node.pk, node.hash);
  const id = String(idSource ?? `w-${state.counter++}`);

  return {
    id,
    text,
    start,
    end,
    speaker,
    confidence,
    isHook,
  };
};

const synthesizeWordsFromPlainText = (
  raw: string,
  ctx: NormalizeContext,
  state: CollectorState,
  speakerHint?: string,
): TranscriptWord[] => {
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const words: TranscriptWord[] = [];
  let cursor = 0;
  const step = DEFAULT_WORD_LENGTH_SECONDS;
  const durationSec = ctx.durationSec && ctx.durationSec > 0 ? ctx.durationSec : tokens.length * step;
  const maxTime = durationSec + 1;

  for (const token of tokens) {
    const start = cursor;
    const end = Math.min(cursor + step, maxTime);
    const id = `synthetic-${state.counter++}`;
    words.push({ id, text: token, start, end, speaker: speakerHint });
    cursor += step;
  }

  return words;
};

const collectWords = (
  value: unknown,
  ctx: NormalizeContext,
  state: CollectorState,
  speakerHint?: string,
  depth = 0,
): TranscriptWord[] => {
  if (!value) return [];
  if (depth > MAX_RECURSION_DEPTH) return [];

  if (typeof value === 'object') {
    if (value && state.visited.has(value)) {
      return [];
    }
    if (value) state.visited.add(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectWords(entry, ctx, state, speakerHint, depth + 1));
  }

  if (typeof value === 'string') {
    return synthesizeWordsFromPlainText(value, ctx, state, speakerHint);
  }

  if (typeof value !== 'object' || value === null) {
    return [];
  }

  const node: Record<string, unknown> = value as Record<string, unknown>;
  const nextSpeaker = typeof node.speaker === 'string' ? (node.speaker as string) : speakerHint;

  if (Array.isArray(node.words)) {
    return node.words.flatMap((word) => collectWords(word, ctx, state, nextSpeaker, depth + 1));
  }

  if (Array.isArray((node as any).paragraphs)) {
    return ((node as any).paragraphs as unknown[]).flatMap((paragraph) =>
      collectWords(paragraph, ctx, state, nextSpeaker, depth + 1),
    );
  }

  if (node.paragraphs && Array.isArray((node.paragraphs as any).paragraphs)) {
    return ((node.paragraphs as any).paragraphs as unknown[]).flatMap((paragraph) =>
      collectWords(paragraph, ctx, state, nextSpeaker, depth + 1),
    );
  }

  if (Array.isArray((node as any).sentences)) {
    return ((node as any).sentences as unknown[]).flatMap((sentence) =>
      collectWords(sentence, ctx, state, nextSpeaker, depth + 1),
    );
  }

  if (Array.isArray((node as any).items)) {
    return ((node as any).items as unknown[]).flatMap((item) => collectWords(item, ctx, state, nextSpeaker, depth + 1));
  }

  if (Array.isArray((node as any).alternatives)) {
    for (const alt of (node as any).alternatives as unknown[]) {
      const words = collectWords(alt, ctx, state, nextSpeaker, depth + 1);
      if (words.length) return words;
    }
  }

  if ((node as any).results && Array.isArray((node as any).results.channels)) {
    for (const channel of ((node as any).results.channels as unknown[])) {
      const words = collectWords(channel, ctx, state, nextSpeaker, depth + 1);
      if (words.length) return words;
    }
  }

  const word = normalizeWordNode(node, ctx, state, speakerHint);
  return word ? [word] : [];
};

const finalizeWords = (words: TranscriptWord[], durationSec?: number): TranscriptWord[] => {
  if (!words.length) return [];
  const maxTime = durationSec && durationSec > 0 ? durationSec : undefined;

  const sorted = [...words].sort((a, b) => {
    if (a.start === b.start) return a.end - b.end;
    return a.start - b.start;
  });

  const result: TranscriptWord[] = [];
  const seen = new Set<string>();

  for (const word of sorted) {
    let start = Number.isFinite(word.start) ? word.start : 0;
    let end = Number.isFinite(word.end) ? word.end : start + DEFAULT_WORD_LENGTH_SECONDS;

    if (maxTime !== undefined) {
      if (start > maxTime) continue;
      if (end > maxTime) end = maxTime;
    }

    if (end <= start + 0.01) continue;

    const key = `${start.toFixed(3)}|${end.toFixed(3)}|${word.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...word, start, end });
  }

  return result;
};

const getNested = (data: any, path: string[]): unknown => {
  let current = data;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

const inferDuration = (data: DocumentData | undefined, words: TranscriptWord[]): number | null => {
  if (data) {
    const durationCandidates = [
      data.durationSec,
      data.duration,
      data.mediaDuration,
      data.mediaDurationSec,
      data.lengthSec,
      data.length,
      data.videoDuration,
      getNested(data, ['metadata', 'durationSec']),
      getNested(data, ['metadata', 'duration']),
    ];
    for (const candidate of durationCandidates) {
      const numeric = parseMaybeNumber(candidate);
      if (numeric && numeric > 0) return numeric;
    }
  }

  if (words.length) {
    return words[words.length - 1]?.end ?? null;
  }

  return null;
};

export const extractTranscriptCandidate = (data: any): unknown => {
  if (!data || typeof data !== 'object') return null;
  const candidates = [
    data.transcriptNormalized,
    data.transcript,
    data.transcriptParagraphs,
    data.transcriptParts,
    data.transcriptData,
    data.fullTranscript,
  ];
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null) return candidate;
  }
  return null;
};

export const extractWordsFromProject = (
  data: DocumentData | undefined,
): { words: TranscriptWord[]; durationSec: number | null } => {
  const ctxBase: NormalizeContext = { allowLegacyHeuristic: true };
  const prioritizedKeys: Array<string | string[]> = [
    'transcriptNormalized',
    'transcriptParagraphs',
    'transcriptParts',
    'transcriptData',
    'transcript',
    'fullTranscript',
    ['analysis', 'transcript'],
    ['analysis', 'paragraphs'],
    ['analysis', 'items'],
    ['deepgramTranscript'],
    ['deepgram'],
    ['payload', 'transcript'],
  ];

  const tried = new Set<unknown>();

  const tryCandidate = (candidate: unknown): TranscriptWord[] => {
    if (candidate === undefined || candidate === null) return [];
    if (typeof candidate === 'string' && !candidate.trim()) return [];
    if (typeof candidate === 'object' && tried.has(candidate)) return [];
    if (typeof candidate === 'object') tried.add(candidate);
    const state: CollectorState = { counter: 0, visited: new WeakSet<object>() };
    return collectWords(candidate, ctxBase, state);
  };

  for (const key of prioritizedKeys) {
    const candidate = Array.isArray(key) ? getNested(data, key.map(String)) : (data as any)?.[key as string];
    const words = tryCandidate(candidate);
    if (words.length) {
      const durationSec = inferDuration(data, words);
      return { words: finalizeWords(words, durationSec ?? undefined), durationSec };
    }
  }

  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (!/transcript|paragraph|segments|words|alternatives|deepgram/i.test(key)) continue;
      const words = tryCandidate(value);
      if (words.length) {
        const durationSec = inferDuration(data, words);
        return { words: finalizeWords(words, durationSec ?? undefined), durationSec };
      }
    }
  }

  return { words: [], durationSec: inferDuration(data, []) };
};
