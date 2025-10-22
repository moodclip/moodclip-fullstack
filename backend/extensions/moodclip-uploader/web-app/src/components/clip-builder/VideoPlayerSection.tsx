import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TranscriptParagraph, TranscriptWord, ClipChip } from '@/data/clipBuilderData';

interface SourceVideoMeta {
  url: string;
  duration: number;
  error?: string | null;
}

interface VideoPlayerSectionProps {
  sourceVideo: SourceVideoMeta;
  selectedWords: string[];
  transcript: TranscriptParagraph[];
  playMode: 'full' | 'selection' | 'lane';
  activeLane: ClipChip[];
  isPlaying: boolean;
  currentTime: number;
  currentClipIndex?: number;
  onPlayingChange: (playing: boolean) => void;
  onTimeChange: (time: number) => void;
  onPlayModeChange: (mode: 'full' | 'selection' | 'lane') => void;
  onClipIndexChange?: (index: number) => void;
  onDurationDiscovered?: (duration: number) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const flattenWords = (transcript: TranscriptParagraph[]): TranscriptWord[] =>
  transcript.flatMap((paragraph) => paragraph.words || []);

export const VideoPlayerSection = ({
  sourceVideo,
  selectedWords,
  transcript,
  playMode,
  activeLane,
  isPlaying,
  currentTime,
  currentClipIndex = 0,
  onPlayingChange,
  onTimeChange,
  onPlayModeChange,
  onClipIndexChange,
  onDurationDiscovered,
}: VideoPlayerSectionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaDuration, setMediaDuration] = useState<number>(sourceVideo.duration ?? 0);

  const words = useMemo(() => flattenWords(transcript), [transcript]);

  const selectionBounds = useMemo(() => {
    if (!selectedWords.length) return null;
    const selected = selectedWords
      .map((id) => words.find((word) => word.id === id))
      .filter(Boolean) as TranscriptWord[];
    if (!selected.length) return null;
    const start = Math.min(...selected.map((word) => word.startTime));
    const end = Math.max(...selected.map((word) => word.endTime));
    return { start, end };
  }, [selectedWords, words]);

  const resolvedPlayMode = useMemo<'full' | 'selection' | 'lane'>(() => {
    if (selectionBounds) return 'selection';
    if (playMode === 'lane' && activeLane.length > 0) return 'lane';
    return 'full';
  }, [selectionBounds, playMode, activeLane.length]);

  const activeClip = useMemo(() => {
    if (resolvedPlayMode !== 'lane' || !activeLane.length) return null;
    const index = clamp(currentClipIndex, 0, Math.max(activeLane.length - 1, 0));
    return activeLane[index];
  }, [resolvedPlayMode, activeLane, currentClipIndex]);

  useEffect(() => {
    if (resolvedPlayMode !== playMode) {
      onPlayModeChange(resolvedPlayMode);
    }
  }, [resolvedPlayMode, playMode, onPlayModeChange]);

  const effectiveDuration = useMemo(() => {
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) return mediaDuration;
    const fallback = sourceVideo.duration ?? 0;
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
  }, [mediaDuration, sourceVideo.duration]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const absolute = video.currentTime;

    if (resolvedPlayMode === 'selection' && selectionBounds) {
      const relative = Math.max(0, absolute - selectionBounds.start);
      if (absolute >= selectionBounds.end - 0.05) {
        video.pause();
        onPlayingChange(false);
        onTimeChange(selectionBounds.end - selectionBounds.start);
        return;
      }
      onTimeChange(relative);
      return;
    }

    if (resolvedPlayMode === 'lane' && activeLane.length && activeClip) {
      const clipDuration = Math.max(activeClip.endTime - activeClip.startTime, 0);
      const relative = Math.max(0, absolute - activeClip.startTime);
      if (relative >= clipDuration - 0.05) {
        if (currentClipIndex < activeLane.length - 1) {
          const nextIndex = currentClipIndex + 1;
          const nextClip = activeLane[nextIndex];
          onClipIndexChange?.(nextIndex);
          onTimeChange(0);
          video.currentTime = nextClip.startTime;
          return;
        }
        video.pause();
        onPlayingChange(false);
        onClipIndexChange?.(0);
        onTimeChange(0);
        return;
      }
      onTimeChange(relative);
      return;
    }

    onTimeChange(absolute);
  }, [resolvedPlayMode, selectionBounds, activeLane, activeClip, currentClipIndex, onClipIndexChange, onPlayingChange, onTimeChange]);

  const resetToContextStart = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (resolvedPlayMode === 'selection' && selectionBounds) {
      video.currentTime = selectionBounds.start;
      onTimeChange(0);
      return;
    }
    if (resolvedPlayMode === 'lane' && activeClip) {
      video.currentTime = activeClip.startTime;
      onTimeChange(0);
      return;
    }
    if (resolvedPlayMode === 'full' && currentTime > 0) {
      video.currentTime = currentTime;
    }
  }, [resolvedPlayMode, selectionBounds, activeClip, currentTime, onTimeChange]);

  useEffect(() => {
    setMediaDuration(sourceVideo.duration ?? 0);
  }, [sourceVideo.duration, sourceVideo.url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      if (duration > 0) {
        setMediaDuration(duration);
        onDurationDiscovered?.(duration);
      }
    };

    const handlePlay = () => onPlayingChange(true);
    const handlePause = () => onPlayingChange(false);

    video.addEventListener('loadedmetadata', handleLoaded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [handleTimeUpdate, onPlayingChange, onDurationDiscovered]);

  useEffect(() => {
    if (isPlaying) return; // avoid jumping the video while the viewer is watching
    const video = videoRef.current;
    if (!video) return;
    resetToContextStart();
  }, [selectionBounds?.start, activeClip?.startTime, resetToContextStart, isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sourceVideo.url) return;

    if (isPlaying) {
      let targetTime: number;
      if (resolvedPlayMode === 'selection' && selectionBounds) {
        targetTime = clamp(
          selectionBounds.start + currentTime,
          selectionBounds.start,
          selectionBounds.end,
        );
      } else if (resolvedPlayMode === 'lane' && activeClip) {
        targetTime = clamp(
          activeClip.startTime + currentTime,
          activeClip.startTime,
          activeClip.endTime,
        );
      } else {
        targetTime = clamp(currentTime, 0, effectiveDuration || Number.MAX_SAFE_INTEGER);
      }

      if (Math.abs(video.currentTime - targetTime) > 0.01) {
        video.currentTime = targetTime;
      }

      if (video.paused) {
        void video.play().catch(() => {
          onPlayingChange(false);
        });
      }
    } else if (!video.paused) {
      video.pause();
    }
  }, [
    isPlaying,
    resolvedPlayMode,
    currentTime,
    selectionBounds,
    activeClip,
    effectiveDuration,
    sourceVideo.url,
    onPlayingChange,
  ]);

  const videoUnavailable = !sourceVideo.url || Boolean(sourceVideo.error);

  return (
    <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4 sm:p-6 flex flex-col h-full">
      <div className="relative bg-black rounded-lg overflow-hidden mb-4 aspect-video">
        {videoUnavailable ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground px-6">
            <span className="text-sm sm:text-base opacity-80">{sourceVideo.error ? `Video unavailable: ${sourceVideo.error}` : 'The source video is still processing.'}</span>
          </div>
        ) : (
          <video
            key={sourceVideo.url}
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-contain bg-black"
            src={sourceVideo.url}
            preload="metadata"
            controls
            controlsList="nodownload"
            playsInline
          />
        )}

        {!videoUnavailable && <div className="absolute inset-0 pointer-events-none" />}
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <span>
            {resolvedPlayMode === 'selection' && selectionBounds
              ? 'Playing selection'
              : resolvedPlayMode === 'lane' && activeLane.length
                ? `Playing clip ${Math.min(currentClipIndex + 1, activeLane.length)} of ${activeLane.length}`
                : 'Playing full video'}
          </span>
        </div>
      </div>
    </div>
  );
};
