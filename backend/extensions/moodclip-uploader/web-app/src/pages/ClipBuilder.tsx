import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { BuildClipSection } from '@/components/clip-builder/BuildClipSection';
import { TranscriptSection } from '@/components/clip-builder/TranscriptSection';
import { VideoPlayerSection } from '@/components/clip-builder/VideoPlayerSection';
import { toast } from '@/hooks/use-toast';
import { ensureAuthed, isLoggedIn } from '@/lib/auth';
import {
  fetchProjectStatus,
  fetchTranscriptChunk,
  fetchStreamUrl,
} from '@/lib/api';
import { readGlobalProjectId } from '@/lib/project-id';
import type {
  AIClipBubble,
  ClipChip,
  TranscriptParagraph,
  TranscriptWord,
} from '@/data/clipBuilderData';
import type { AISuggestion, ClipStatus } from '@/types/backend';

const SUGGESTION_TINTS = [
  'hsl(320 100% 70%)',
  'hsl(210 100% 70%)',
  'hsl(140 70% 60%)',
  'hsl(45 100% 70%)',
  'hsl(260 90% 70%)',
];

const DEFAULT_BUBBLE: AIClipBubble = {
  id: 'custom-clips',
  name: 'My Clips',
  tint: SUGGESTION_TINTS[0],
  clips: [],
};

const formatDurationLabel = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs ? `${mins}m ${secs}s` : `${mins}m`;
};

const formatTimestamp = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const normalizeTimeValue = (value: unknown, durationSec?: number): number => {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (durationSec && numeric > durationSec * 1.5) {
    return numeric / 100; // centiseconds fallback
  }
  if (!durationSec && numeric > 10_000) {
    return numeric / 100;
  }
  return numeric;
};

const normalizeWord = (
  word: any,
  fallbackId: string,
  durationSec?: number,
): TranscriptWord | null => {
  if (!word) return null;
  const rawText = word.text ?? word.word ?? word.value;
  const text = typeof rawText === 'string' ? rawText.trim() : '';
  if (!text) return null;

  const start = normalizeTimeValue(
    word.start ?? word.startTime ?? word.ts ?? word.offset ?? word.begin ?? 0,
    durationSec,
  );
  const end = normalizeTimeValue(
    word.end ?? word.endTime ?? word.until ?? word.offsetEnd ?? word.finish ?? start,
    durationSec,
  );
  const safeEnd = Number.isFinite(end) && end > start ? end : start + Math.max(0.3, text.length * 0.05);

  const speaker =
    typeof word.speaker === 'string'
      ? word.speaker
      : typeof word.channel === 'string'
        ? word.channel
        : word.speakerName ?? word.actor ?? 'Speaker';

  return {
    id: String(word.id ?? word.word_id ?? fallbackId),
    text,
    startTime: start,
    endTime: safeEnd,
    speaker,
    isHook: Boolean(word.isHook || word.hook),
  };
};

const normalizeParagraph = (
  paragraph: any,
  index: number,
  durationSec?: number,
): TranscriptParagraph => {
  const rawWords = Array.isArray(paragraph?.words) ? paragraph.words : [];
  const words = rawWords
    .map((word: any, wordIndex: number) => normalizeWord(word, `${index}-${wordIndex}`, durationSec))
    .filter(Boolean) as TranscriptWord[];

  const speaker =
    typeof paragraph?.speaker === 'string'
      ? paragraph.speaker
      : words[0]?.speaker ?? `Speaker ${index + 1}`;

  const timestamp = formatTimestamp(words[0]?.startTime ?? 0);

  return {
    id: paragraph?.id?.toString() ?? `p-${index}`,
    timestamp,
    speaker,
    words,
  };
};

const buildParagraphsFromWords = (words: TranscriptWord[]): TranscriptParagraph[] => {
  if (words.length === 0) return [];
  const paragraphs: TranscriptParagraph[] = [];
  let current: TranscriptParagraph | null = null;

  words.forEach((word, index) => {
    if (!current) {
      current = {
        id: `p-${paragraphs.length}`,
        timestamp: formatTimestamp(word.startTime),
        speaker: word.speaker ?? `Speaker ${paragraphs.length + 1}`,
        words: [],
      };
      paragraphs.push(current);
    }

    if (current.speaker !== word.speaker && current.words.length > 0) {
      current = {
        id: `p-${paragraphs.length}`,
        timestamp: formatTimestamp(word.startTime),
        speaker: word.speaker ?? current.speaker,
        words: [],
      };
      paragraphs.push(current);
    }

    current.words.push(word);
    const endsSentence = /[.?!]$/.test(word.text);
    if (endsSentence) {
      current = null;
    }
  });

  return paragraphs;
};

const normalizeTranscript = (
  raw: unknown,
  durationSec?: number,
): TranscriptParagraph[] => {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    if (raw.length && typeof raw[0] === 'object' && raw[0] && 'words' in (raw[0] as any)) {
      return (raw as any[]).map((paragraph, index) =>
        normalizeParagraph(paragraph, index, durationSec),
      );
    }

    if (raw.length && typeof raw[0] === 'object') {
      const words = (raw as any[])
        .map((item, index) => normalizeWord(item, `w-${index}`, durationSec))
        .filter(Boolean) as TranscriptWord[];
      return buildParagraphsFromWords(words);
    }
  }

  if (raw && typeof raw === 'object') {
    const candidate = raw as Record<string, unknown>;
    if (Array.isArray(candidate.paragraphs)) {
      return (candidate.paragraphs as any[]).map((paragraph, index) =>
        normalizeParagraph(paragraph, index, durationSec),
      );
    }
    if (Array.isArray(candidate.items)) {
      const words = (candidate.items as any[])
        .map((item, index) => {
          if (Array.isArray(item?.words)) {
            return (item.words as any[])
              .map((word, wordIndex) => normalizeWord(word, `${index}-${wordIndex}`, durationSec))
              .filter(Boolean);
          }
          return normalizeWord(item, `item-${index}`, durationSec);
        })
        .flat()
        .filter(Boolean) as TranscriptWord[];
      return buildParagraphsFromWords(words);
    }
  }

  if (typeof raw === 'string') {
    const tokens = raw.split(/\s+/).filter(Boolean);
    const words = tokens.map((token, index) => ({
      id: `w-${index}`,
      text: token,
      startTime: index * 0.5,
      endTime: index * 0.5 + 0.5,
      speaker: 'Speaker',
    }));
    return buildParagraphsFromWords(words);
  }

  return [];
};

const flattenWords = (transcript: TranscriptParagraph[]): TranscriptWord[] =>
  transcript.flatMap((paragraph) => paragraph.words);

const extractWordsInRange = (
  words: TranscriptWord[],
  start: number,
  end: number,
): TranscriptWord[] => {
  if (!words.length) return [];
  const inclusiveEnd = Math.max(end, start + 0.1);
  const matches = words.filter(
    (word) => word.startTime >= start && word.endTime <= inclusiveEnd,
  );
  if (matches.length) return matches;

  const firstIndex = words.findIndex((word) => word.startTime >= start);
  if (firstIndex === -1) {
    return words.slice(-Math.min(20, words.length));
  }
  return words.slice(firstIndex, Math.min(words.length, firstIndex + 25));
};

const buildClipChip = (
  id: string,
  text: string,
  startTime: number,
  endTime: number,
): ClipChip => ({
  id,
  text,
  startTime,
  endTime,
  duration: formatDurationLabel(Math.max(endTime - startTime, 0)),
});

const normalizeRange = (
  startValue: unknown,
  endValue: unknown,
  durationSec?: number,
): [number, number] => {
  let start = normalizeTimeValue(startValue, durationSec);
  let end = normalizeTimeValue(endValue, durationSec);
  if (!Number.isFinite(start) || start < 0) start = 0;
  if (!Number.isFinite(end) || end <= start) {
    end = start + 5;
  }
  if (durationSec && end > durationSec) end = durationSec;
  return [start, end];
};

const buildAiBubbles = (
  transcript: TranscriptParagraph[],
  suggestions: AISuggestion[],
  durationSec?: number,
): AIClipBubble[] => {
  if (!suggestions.length) {
    return [DEFAULT_BUBBLE];
  }

  const words = flattenWords(transcript);
  return suggestions.map((suggestion, index) => {
    const [start, end] = normalizeRange(suggestion.start, suggestion.end, durationSec);
    const relevantWords = extractWordsInRange(words, start, end);
    const clipText = relevantWords.length
      ? relevantWords.map((word) => word.text).join(' ')
      : suggestion.title || suggestion.description || `AI Clip ${index + 1}`;

    const clip = buildClipChip(
      suggestion.id ? `ai-clip-${suggestion.id}` : `ai-clip-${index}`,
      clipText,
      start,
      end,
    );

    return {
      id: suggestion.id || `ai-${index}`,
      name: suggestion.title || `AI Clip ${index + 1}`,
      tint: SUGGESTION_TINTS[index % SUGGESTION_TINTS.length],
      clips: [clip],
    };
  });
};

const buildGeneratedClipsBubble = (
  transcript: TranscriptParagraph[],
  clipStatuses: ClipStatus[],
  durationSec?: number,
): AIClipBubble | null => {
  if (!clipStatuses.length) return null;
  const words = flattenWords(transcript);

  const clips = clipStatuses.map((clip, index) => {
    const [start, end] = normalizeRange(clip.start, clip.end, durationSec);
    let text = clip.title ?? '';
    if (!text) {
      const rangeWords = extractWordsInRange(words, start, end);
      text = rangeWords.length ? rangeWords.map((word) => word.text).join(' ') : `Clip ${index + 1}`;
    }
    return buildClipChip(clip.id || `generated-${index}`, text, start, end);
  });

  return {
    id: 'generated-clips',
    name: 'Generated Clips',
    tint: 'hsl(200 100% 70%)',
    clips,
  };
};

const ensureBubblePresence = (bubbles: AIClipBubble[]): AIClipBubble[] => {
  if (!bubbles.length) return [DEFAULT_BUBBLE];
  return bubbles;
};

const getTranscriptDuration = (transcript: TranscriptParagraph[]): number => {
  const words = flattenWords(transcript);
  if (!words.length) return 0;
  return Math.max(...words.map((word) => word.endTime));
};

const ClipBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [videoId, setVideoId] = useState<string | null>(() => {
    const params = new URLSearchParams(location.search);
    return params.get('videoId') || readGlobalProjectId();
  });

  useEffect(() => {
    const syncVideoId = () => {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get('videoId');
      const nextId = fromQuery || readGlobalProjectId();
      setVideoId((prev) => (prev === nextId ? prev : nextId));
    };

    syncVideoId();
    window.addEventListener('hashchange', syncVideoId);
    return () => window.removeEventListener('hashchange', syncVideoId);
  }, [location.search]);

  const statusQuery = useQuery({
    queryKey: ['clip-builder-status', videoId],
    queryFn: ({ signal }) => {
      if (!videoId) throw new Error('Missing video id');
      return fetchProjectStatus(videoId, { signal, includeTranscript: true });
    },
    enabled: Boolean(videoId),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 2000,
  });

  const viewerContext = statusQuery.data?.ownership?.viewer ?? null;
  const viewerIsAuthed = Boolean(viewerContext?.customerId);

  const needsTranscriptFetch = Boolean(
    videoId &&
      statusQuery.data?.transcriptMeta?.available &&
      !statusQuery.data?.transcriptMeta?.inline,
  );

  const transcriptQuery = useQuery({
    queryKey: ['clip-builder-transcript', videoId],
    queryFn: () => fetchTranscriptChunk(videoId!),
    enabled: needsTranscriptFetch,
    staleTime: 60_000,
  });

  const streamQuery = useQuery({
    queryKey: ['clip-builder-stream', videoId],
    queryFn: () => fetchStreamUrl(videoId!),
    enabled: Boolean(videoId),
    staleTime: 5 * 60_000,
    retry: 2,
  });

  const durationSec = statusQuery.data?.project?.durationSec ?? undefined;

  const rawTranscript = useMemo(() => {
    if (statusQuery.data?.transcript) return statusQuery.data.transcript;
    if (transcriptQuery.data?.transcript) return transcriptQuery.data.transcript;
    if (Array.isArray(transcriptQuery.data?.items)) return transcriptQuery.data.items;
    return null;
  }, [statusQuery.data?.transcript, transcriptQuery.data]);

  const transcript = useMemo(
    () => normalizeTranscript(rawTranscript, durationSec),
    [rawTranscript, durationSec],
  );

  const rawSuggestions = statusQuery.data?.aiSuggestions;
  const suggestions = useMemo(() => rawSuggestions ?? [], [rawSuggestions]);
  const rawClipStatuses = statusQuery.data?.clipStatuses;
  const clipStatuses = useMemo(() => rawClipStatuses ?? [], [rawClipStatuses]);

  const initialBubbles = useMemo(() => {
    const aiBubbles = buildAiBubbles(transcript, suggestions, durationSec);
    const generatedBubble = buildGeneratedClipsBubble(transcript, clipStatuses, durationSec);
    return ensureBubblePresence(generatedBubble ? [...aiBubbles, generatedBubble] : aiBubbles);
  }, [transcript, suggestions, clipStatuses, durationSec]);

  const [bubbles, setBubbles] = useState<AIClipBubble[]>(initialBubbles);
  const initializedVideoIdRef = useRef<string | null>(null);
  const [activeBubbleId, setActiveBubbleId] = useState<string>(initialBubbles[0]?.id ?? '');
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playMode, setPlayMode] = useState<'full' | 'selection' | 'lane'>('full');
  const [currentClipIndex, setCurrentClipIndex] = useState(0);

  useEffect(() => {
    if (!videoId) return;
    if (!initialBubbles.length) return;

    if (initializedVideoIdRef.current !== videoId) {
      setBubbles(initialBubbles);
      setActiveBubbleId(initialBubbles[0]?.id ?? '');
      setSelectedWords([]);
      initializedVideoIdRef.current = videoId;
      return;
    }

    if (!bubbles.length) {
      setBubbles(initialBubbles);
      setActiveBubbleId(initialBubbles[0]?.id ?? '');
    }
  }, [initialBubbles, videoId, bubbles.length]);

  useEffect(() => {
    setActiveBubbleId((prev) => {
      if (prev && bubbles.some((bubble) => bubble.id === prev)) return prev;
      return bubbles[0]?.id ?? '';
    });
  }, [bubbles]);

  const activeBubble = bubbles.find((bubble) => bubble.id === activeBubbleId);

  const handleBubbleClick = useCallback((bubbleId: string) => {
    setActiveBubbleId(bubbleId);
    setSelectedWords([]);
  }, []);

  const handleAddClip = useCallback(
    (text: string, startTime: number, endTime: number) => {
      if (!activeBubble) return;
      const newClip = buildClipChip(`clip-${Date.now()}`, text, startTime, endTime);
      setBubbles((prev) =>
        prev.map((bubble) =>
          bubble.id === activeBubbleId
            ? { ...bubble, clips: [...bubble.clips, newClip] }
            : bubble,
        ),
      );
      setSelectedWords([]);
      toast({
        title: 'Clip added',
        description: `Added "${text.slice(0, 40)}${text.length > 40 ? '…' : ''}" to ${activeBubble.name}`,
      });
    },
    [activeBubble, activeBubbleId],
  );

  const handleDeleteChip = useCallback(
    (chipId: string) => {
      setBubbles((prev) =>
        prev.map((bubble) =>
          bubble.id === activeBubbleId
            ? { ...bubble, clips: bubble.clips.filter((clip) => clip.id !== chipId) }
            : bubble,
        ),
      );
    },
    [activeBubbleId],
  );

  const handleReorderChips = useCallback(
    (chips: ClipChip[]) => {
      setBubbles((prev) =>
        prev.map((bubble) =>
          bubble.id === activeBubbleId ? { ...bubble, clips } : bubble,
        ),
      );
    },
    [activeBubbleId],
  );

  const handleCreateBubble = useCallback(() => {
    const customIndex = bubbles.filter((bubble) => bubble.id.startsWith('custom-')).length;
    const newBubble: AIClipBubble = {
      id: `custom-${Date.now()}`,
      name: `Custom Clip ${customIndex + 1}`,
      tint: SUGGESTION_TINTS[(bubbles.length + 1) % SUGGESTION_TINTS.length],
      clips: [],
    };
    setBubbles((prev) => [...prev, newBubble]);
    setActiveBubbleId(newBubble.id);
  }, [bubbles]);

  const handleBubbleRename = useCallback((bubbleId: string, newName: string) => {
    setBubbles((prev) =>
      prev.map((bubble) => (bubble.id === bubbleId ? { ...bubble, name: newName } : bubble)),
    );
  }, []);

  const handlePlayAll = useCallback(() => {
    if (!activeBubble?.clips.length) return;
    if (isPlaying && playMode === 'lane') {
      setIsPlaying(false);
    } else {
      setPlayMode('lane');
      setCurrentClipIndex(0);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  }, [activeBubble, isPlaying, playMode]);

  const totalDuration = useMemo(() => {
    if (!activeBubble) return '0s';
    const totalSeconds = activeBubble.clips.reduce(
      (sum, clip) => sum + Math.max(clip.endTime - clip.startTime, 0),
      0,
    );
    return formatDurationLabel(totalSeconds);
  }, [activeBubble]);

  const transcriptReady = transcript.length > 0;
  const aiReady = Boolean(statusQuery.data?.project?.aiReady);
  const transcriptDuration = useMemo(() => getTranscriptDuration(transcript), [transcript]);

  const sourceVideo = useMemo(
    () => ({
      url: streamQuery.data?.url ?? '',
      duration: durationSec ?? transcriptDuration,
      error: streamQuery.isError ? (streamQuery.error as Error | undefined)?.message ?? 'unavailable' : null,
    }),
    [streamQuery.data?.url, durationSec, transcriptDuration, streamQuery.isError, streamQuery.error],
  );

  const handleExport = useCallback(async () => {
    if (!videoId) return;
    const authed = await isLoggedIn().catch(() => false);
    if (!authed) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to export or download your clips.',
      });
      await ensureAuthed({ projectId: videoId, action: 'download' });
      return;
    }

    toast({
      title: 'Export coming soon',
      description: 'Your clips are ready to preview. Export and download will be enabled shortly.',
    });
  }, [videoId]);

    return (
      <div className="min-h-screen animated-gradient-bg">
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1 sm:gap-2 px-2 sm:px-3">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Pipeline</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <h1 className="font-heading text-lg sm:text-xl font-semibold text-foreground">
                Clip Builder
              </h1>
            </div>
            {videoId && (
              <span className="text-xs text-muted-foreground">Video ID: {videoId}</span>
            )}
          </div>
        </div>
      </div>

      {!viewerIsAuthed && (
        <div className="container mx-auto px-4 py-6">
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Sign in to export or download your clips. You can preview the transcript, build clips, and watch the video below.
          </div>
        </div>
      )}

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {!videoId && (
          <div className="rounded-lg border border-border bg-card/60 p-4 text-sm text-muted-foreground">
            No project selected. Return to the pipeline to choose a video.
          </div>
        )}

        {statusQuery.isError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load clip builder data. Please refresh or return to the pipeline.
          </div>
        )}

        {!transcriptReady && statusQuery.isLoading && (
          <div className="rounded-lg border border-border bg-card/60 p-4 text-sm text-muted-foreground">
            Fetching transcript and suggestions…
          </div>
        )}

        {transcriptReady && !aiReady && (
          <div className="rounded-lg border border-border bg-card/60 p-4 text-sm text-muted-foreground">
            AI suggestions are still processing. You can start selecting transcript segments while we finish generating clips.
          </div>
        )}

        <BuildClipSection
          activeBubble={activeBubble}
          bubbles={bubbles}
          onBubbleClick={handleBubbleClick}
          onCreateBubble={handleCreateBubble}
          onDeleteChip={handleDeleteChip}
          onReorderChips={handleReorderChips}
          onPlayAll={handlePlayAll}
          totalDuration={totalDuration}
          isPlaying={isPlaying && playMode === 'lane'}
          currentClipIndex={currentClipIndex}
          currentTime={currentTime}
          onBubbleRename={handleBubbleRename}
          onExport={handleExport}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 min-h-[400px] sm:min-h-[600px]">
          <TranscriptSection
            transcript={transcript}
            selectedWords={selectedWords}
            onSelectedWordsChange={setSelectedWords}
            onAddClip={handleAddClip}
            activeBubble={activeBubble}
          />

          <VideoPlayerSection
            sourceVideo={sourceVideo}
            selectedWords={selectedWords}
            transcript={transcript}
            playMode={playMode}
            activeLane={activeBubble?.clips || []}
            isPlaying={isPlaying}
            currentTime={currentTime}
            currentClipIndex={currentClipIndex}
            onPlayingChange={setIsPlaying}
            onTimeChange={setCurrentTime}
            onPlayModeChange={setPlayMode}
            onClipIndexChange={setCurrentClipIndex}
          />
        </div>
      </div>
    </div>
  );
};

export default ClipBuilder;
