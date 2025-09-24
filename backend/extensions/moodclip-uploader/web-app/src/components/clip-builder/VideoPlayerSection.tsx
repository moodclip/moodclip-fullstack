import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
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
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

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

  const activeClip = useMemo(() => {
    if (playMode !== 'lane' || !activeLane.length) return null;
    const index = clamp(currentClipIndex, 0, Math.max(activeLane.length - 1, 0));
    return activeLane[index];
  }, [playMode, activeLane, currentClipIndex]);

  const totalLaneDuration = useMemo(
    () =>
      activeLane.reduce(
        (sum, clip) => sum + Math.max(clip.endTime - clip.startTime, 0),
        0,
      ),
    [activeLane],
  );

  const effectiveDuration = useMemo(() => {
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) return mediaDuration;
    const fallback = sourceVideo.duration ?? 0;
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
  }, [mediaDuration, sourceVideo.duration]);

  const getPlayDuration = useCallback(() => {
    if (playMode === 'selection' && selectionBounds) {
      return Math.max(selectionBounds.end - selectionBounds.start, 0);
    }
    if (playMode === 'lane' && activeLane.length) {
      return totalLaneDuration;
    }
    return effectiveDuration;
  }, [playMode, selectionBounds, activeLane.length, totalLaneDuration, effectiveDuration]);

  const getCumulativeTime = useCallback(() => {
    if (playMode === 'lane' && activeLane.length) {
      let cumulative = 0;
      for (let i = 0; i < currentClipIndex; i += 1) {
        const clip = activeLane[i];
        cumulative += Math.max(clip.endTime - clip.startTime, 0);
      }
      return cumulative + currentTime;
    }
    return currentTime;
  }, [playMode, activeLane, currentClipIndex, currentTime]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const absolute = video.currentTime;

    if (playMode === 'selection' && selectionBounds) {
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

    if (playMode === 'lane' && activeLane.length && activeClip) {
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
  }, [playMode, selectionBounds, activeLane, activeClip, currentClipIndex, onClipIndexChange, onPlayingChange, onTimeChange]);

  const resetToContextStart = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playMode === 'selection' && selectionBounds) {
      video.currentTime = selectionBounds.start;
      onTimeChange(0);
      return;
    }
    if (playMode === 'lane' && activeClip) {
      video.currentTime = activeClip.startTime;
      onTimeChange(0);
      return;
    }
    if (playMode === 'full' && currentTime > 0) {
      video.currentTime = currentTime;
    }
  }, [playMode, selectionBounds, activeClip, currentTime, onTimeChange]);

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
  }, [handleTimeUpdate, onPlayingChange]);

  useEffect(() => {
    if (isPlaying) return; // avoid jumping the video while the viewer is watching
    const video = videoRef.current;
    if (!video) return;
    resetToContextStart();
  }, [playMode, selectionBounds?.start, activeClip?.startTime, resetToContextStart, isPlaying]);

  const ensurePlayMode = useCallback(() => {
    if (selectedWords.length > 0 && playMode !== 'selection') {
      onPlayModeChange('selection');
    } else if (!selectedWords.length && playMode === 'selection') {
      onPlayModeChange('full');
    }
  }, [selectedWords.length, playMode, onPlayModeChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sourceVideo.url) return;

    if (isPlaying) {
      ensurePlayMode();
      let targetTime: number;
      if (playMode === 'selection' && selectionBounds) {
        targetTime = clamp(
          selectionBounds.start + currentTime,
          selectionBounds.start,
          selectionBounds.end,
        );
      } else if (playMode === 'lane' && activeClip) {
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
    playMode,
    currentTime,
    selectionBounds,
    activeClip,
    ensurePlayMode,
    effectiveDuration,
    sourceVideo.url,
    onPlayingChange,
  ]);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video || !sourceVideo.url) return;

    if (isPlaying) {
      video.pause();
      return;
    }

    ensurePlayMode();

    if (playMode === 'selection' && selectionBounds) {
      const offset = clamp(selectionBounds.start + currentTime, selectionBounds.start, selectionBounds.end);
      video.currentTime = offset;
    } else if (playMode === 'lane' && activeClip) {
      const clipOffset = clamp(activeClip.startTime + currentTime, activeClip.startTime, activeClip.endTime);
      video.currentTime = clipOffset;
    } else if (currentTime > 0) {
      video.currentTime = clamp(currentTime, 0, effectiveDuration || Number.MAX_SAFE_INTEGER);
    }

    void video.play().catch(() => {
      onPlayingChange(false);
    });
  }, [isPlaying, playMode, selectionBounds, currentTime, activeClip, ensurePlayMode, effectiveDuration, sourceVideo.url, onPlayingChange]);

  const handleSeek = (value: number) => {
    const video = videoRef.current;
    if (!video) return;

    if (playMode === 'lane' && activeLane.length) {
      let cumulative = 0;
      for (let i = 0; i < activeLane.length; i += 1) {
        const clip = activeLane[i];
        const clipDuration = Math.max(clip.endTime - clip.startTime, 0);
        if (value <= cumulative + clipDuration || i === activeLane.length - 1) {
          onClipIndexChange?.(i);
          const relative = value - cumulative;
          video.currentTime = clip.startTime + clamp(relative, 0, clipDuration);
          onTimeChange(Math.max(0, relative));
          break;
        }
        cumulative += clipDuration;
      }
      return;
    }

    if (playMode === 'selection' && selectionBounds) {
      const bounded = clamp(value, 0, selectionBounds.end - selectionBounds.start);
      video.currentTime = selectionBounds.start + bounded;
      onTimeChange(bounded);
      return;
    }

    video.currentTime = clamp(value, 0, effectiveDuration || Number.MAX_SAFE_INTEGER);
    onTimeChange(video.currentTime);
  };

  const playDuration = getPlayDuration();
  const cumulativeTime = getCumulativeTime();
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
          />
        )}

        {!videoUnavailable && (
          <div className="absolute inset-0 pointer-events-none" />
        )}

        {!videoUnavailable && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <Button
              size="lg"
              onPress={handlePlayPause}
              className="rounded-full w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur hover:bg-white/30 touch-manipulation pointer-events-auto"
              type="button"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-0.5 sm:ml-1" />
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <Slider
            value={[clamp(cumulativeTime, 0, playDuration || 0)]}
            max={playDuration || 0}
            step={0.1}
            disabled={videoUnavailable || playDuration === 0}
            onValueChange={([value]) => handleSeek(value)}
          />
          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
            <span>{formatTime(cumulativeTime)}</span>
            <span>{formatTime(playDuration)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <span>
            {playMode === 'selection' && selectionBounds
              ? 'Playing selection'
              : playMode === 'lane' && activeLane.length
                ? `Playing clip ${Math.min(currentClipIndex + 1, activeLane.length)} of ${activeLane.length}`
                : 'Playing full video'}
          </span>
        </div>
      </div>
    </div>
  );
};
