import type { DocumentData, DocumentReference } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

import { extractWordsFromProject, TranscriptWord } from './transcript-utils.server';

export interface AISuggestionPayload {
  id: string;
  title: string;
  description?: string;
  start: number;
  end: number;
  confidence?: number;
  source?: string;
  [key: string]: unknown;
}

interface CandidateSegment {
  start: number;
  end: number;
  text: string;
  score: number;
  rawScore: number;
  wordCount: number;
  speakerCount: number;
  hookScore: number;
  fillerPenalty: number;
  punctuationScore: number;
}

const MIN_DURATION = 5;
const MAX_DURATION = 22;
const TARGET_DURATION = 12;
const HOOK_WORDS = [
  'you',
  'your',
  'imagine',
  'secret',
  'powerful',
  'never',
  'ever',
  'massive',
  'crazy',
  'insane',
  'game-changing',
  'viral',
  'million',
  'impact',
  'story',
  'lesson',
  'why',
  'how',
  'what',
  "here's",
  'listen',
  'watch',
  'today',
  'right',
];
const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'sort of', 'kind of', 'basically'];

const toSeconds = (value: number): number => Math.max(0, Math.round(value * 1000) / 1000);

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const createCandidates = (words: TranscriptWord[], durationSec: number | null): CandidateSegment[] => {
  if (words.length === 0) return [];
  const candidates: CandidateSegment[] = [];
  const hookSet = new Set(HOOK_WORDS);
  const fillerSet = new Set(FILLER_WORDS);
  const maxDuration = durationSec && durationSec > 0 ? Math.min(MAX_DURATION, durationSec) : MAX_DURATION;
  const target = clamp(TARGET_DURATION, MIN_DURATION + 1, maxDuration);

  const lowerCase = (text: string) => text.toLowerCase();

  for (let i = 0; i < words.length; i++) {
    const startWord = words[i];
    const start = startWord.start;
    let textParts: string[] = [];
    let hookCount = 0;
    let fillerCount = 0;
    let emphasisCount = 0;
    const speakers = new Set<string>();

    for (let j = i; j < words.length; j++) {
      const word = words[j];
      if (word.end <= start) continue;
      textParts.push(word.text);

      const lower = lowerCase(word.text);
      if (hookSet.has(lower)) hookCount += 1;
      if (fillerSet.has(lower)) fillerCount += 1;
      if (EMPHASIS_PATTERN.test(word.text)) emphasisCount += 1;
      if (word.speaker) speakers.add(lowerCase(word.speaker));

      const end = word.end;
      const duration = end - start;
      if (duration < MIN_DURATION) {
        continue;
      }
      if (duration > maxDuration + 4) {
        break;
      }

      const text = textParts.join(' ');
      const punctuationScore = /[!?]/.test(text)
        ? 0.3
        : /(\.|,|;|:)/.test(text)
          ? 0.15
          : 0;
      const hookScore = clamp(hookCount * 0.35 + emphasisCount * 0.2, 0, 2.5);
      const fillerPenalty = clamp(fillerCount * 0.25, 0, 1.2);
      const speakerPenalty = speakers.size > 1 ? (speakers.size - 1) * 0.2 : 0;
      const durationScore = clamp(1 - Math.abs(duration - target) / target, 0, 1.2);
      const wordScore = clamp(textParts.length / 12, 0, 1.5);

      const rawScore =
        1 + durationScore * 1.2 + hookScore + punctuationScore + wordScore - fillerPenalty - speakerPenalty;
      const normalizedScore = Math.max(0, rawScore);

      candidates.push({
        start,
        end,
        text,
        score: normalizedScore,
        rawScore,
        wordCount: textParts.length,
        speakerCount: speakers.size || 1,
        hookScore,
        fillerPenalty,
        punctuationScore,
      });
    }
  }

  return candidates;
};

const EMPHASIS_PATTERN = /[!?]/;

const pickTopSegments = (candidates: CandidateSegment[], limit: number): CandidateSegment[] => {
  if (!candidates.length) return [];
  const sorted = [...candidates].sort((a, b) => {
    if (b.score === a.score) return a.start - b.start;
    return b.score - a.score;
  });

  const selected: CandidateSegment[] = [];
  const seenTexts = new Set<string>();

  const overlapRatio = (a: CandidateSegment, b: CandidateSegment): number => {
    const overlap = Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
    if (overlap <= 0) return 0;
    const shorter = Math.min(a.end - a.start, b.end - b.start);
    return overlap / shorter;
  };

  for (const candidate of sorted) {
    if (candidate.end <= candidate.start) continue;
    const normalizedText = candidate.text.toLowerCase().replace(/\s+/g, ' ').trim();
    if (normalizedText.length < 30) continue;
    if (seenTexts.has(normalizedText)) continue;
    if (selected.some((existing) => overlapRatio(existing, candidate) > 0.55)) continue;

    selected.push(candidate);
    seenTexts.add(normalizedText);
    if (selected.length >= limit) break;
  }

  return selected.sort((a, b) => a.start - b.start);
};

const buildTitle = (text: string): string => {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 'AI Clip';
  const slice = words.slice(0, 9).join(' ');
  const title = slice.charAt(0).toUpperCase() + slice.slice(1);
  return slice.length < text.length ? `${title}…` : title;
};

const buildDescription = (text: string): string | undefined => {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= 160) return trimmed;
  return `${trimmed.slice(0, 157)}…`;
};

const toSuggestion = (
  segment: CandidateSegment,
  index: number,
  maxScore: number,
): AISuggestionPayload => {
  const confidenceBase = maxScore > 0 ? clamp(segment.score / maxScore, 0, 1) : 0.5;
  const confidence = clamp(0.45 + confidenceBase * 0.45, 0.45, 0.95);

  return {
    id: `fallback-${index + 1}`,
    title: buildTitle(segment.text),
    description: buildDescription(segment.text),
    start: toSeconds(segment.start),
    end: toSeconds(segment.end),
    confidence: Math.round(confidence * 100) / 100,
    source: 'fallback:v1',
    score: segment.score,
    metadata: {
      wordCount: segment.wordCount,
      speakerCount: segment.speakerCount,
      hookScore: segment.hookScore,
      fillerPenalty: segment.fillerPenalty,
      punctuationScore: segment.punctuationScore,
    },
  };
};

const generateFallbackSuggestions = (
  words: TranscriptWord[],
  durationSec: number | null,
  limit = 5,
): AISuggestionPayload[] => {
  if (!words.length) return [];
  const candidates = createCandidates(words, durationSec);
  if (!candidates.length) return [];
  const segments = pickTopSegments(candidates, limit);
  if (!segments.length) return [];

  const maxScore = Math.max(...segments.map((segment) => segment.score));
  return segments.map((segment, index) => toSuggestion(segment, index, maxScore));
};

const shouldSkipFallback = (data: DocumentData | undefined): boolean => {
  if (!data) return false;
  const source = (data.aiSuggestionSource || data.aiSuggestionsSource || '') as string;
  if (typeof source === 'string' && source.startsWith('fallback:')) return false;
  if (Array.isArray(data.aiSuggestions) && data.aiSuggestions.length > 0) return true;
  return false;
};

export const ensureFallbackAISuggestions = async (
  projectRef: DocumentReference,
  data: DocumentData | undefined,
): Promise<AISuggestionPayload[]> => {
  if (Array.isArray(data?.aiSuggestions) && data!.aiSuggestions.length > 0) {
    return data!.aiSuggestions as AISuggestionPayload[];
  }

  if (shouldSkipFallback(data)) {
    return Array.isArray(data?.aiSuggestions) ? (data!.aiSuggestions as AISuggestionPayload[]) : [];
  }

  const { words, durationSec } = extractWordsFromProject(data);
  if (!words.length) {
    return [];
  }

  const suggestions = generateFallbackSuggestions(words, durationSec);
  if (!suggestions.length) {
    return [];
  }

  await projectRef.set(
    {
      aiSuggestions: suggestions,
      aiReady: true,
      aiSuggestionSource: 'fallback:v1',
      aiSuggestionGeneratedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return suggestions;
};
