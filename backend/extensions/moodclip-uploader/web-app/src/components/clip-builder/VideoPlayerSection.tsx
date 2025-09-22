import { useEffect, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { TranscriptParagraph, TranscriptWord, ClipChip } from '@/data/clipBuilderData';
import { cn } from '@/lib/utils';

interface VideoPlayerSectionProps {
  sourceVideo: { url: string; duration: number };
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
  onClipIndexChange
}: VideoPlayerSectionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mock video playback - in production would use actual video controls
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      let newTime = currentTime + 0.1;
      
      // Handle different play modes
      if (playMode === 'selection' && selectedWords.length > 0) {
        const allWords = transcript.flatMap(p => p.words);
        const selectedWordObjects = selectedWords
          .map(id => allWords.find(w => w.id === id))
          .filter(Boolean) as TranscriptWord[];
        
        const endTime = Math.max(...selectedWordObjects.map(w => w.endTime));
        if (newTime >= endTime) {
          onPlayingChange(false);
          return;
        }
      }
      
      if (playMode === 'lane' && activeLane.length > 0) {
        const currentClip = activeLane[currentClipIndex];
        if (currentClip) {
          const clipDuration = currentClip.endTime - currentClip.startTime;
          
          if (newTime >= clipDuration) {
            // Move to next clip
            if (currentClipIndex < activeLane.length - 1) {
              onClipIndexChange?.(currentClipIndex + 1);
              onTimeChange(0); // Reset time for next clip
              return;
            } else {
              // Finished all clips
              onPlayingChange(false);
              onClipIndexChange?.(0);
              onTimeChange(0);
              return;
            }
          }
        }
      }
      
      if (playMode === 'full' && newTime >= sourceVideo.duration) {
        onPlayingChange(false);
        return;
      }
      
      // Continue with time update for normal playback
      onTimeChange(newTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playMode, selectedWords, transcript, activeLane, sourceVideo.duration, onPlayingChange, onTimeChange, onClipIndexChange]);

  const handlePlayPause = () => {
    // Determine play mode based on context
    if (selectedWords.length > 0 && playMode !== 'selection') {
      onPlayModeChange('selection');
    }
    
    onPlayingChange(!isPlaying);
  };

  const getPlayDuration = () => {
    if (playMode === 'selection' && selectedWords.length > 0) {
      const allWords = transcript.flatMap(p => p.words);
      const selectedWordObjects = selectedWords
        .map(id => allWords.find(w => w.id === id))
        .filter(Boolean) as TranscriptWord[];
      
      if (selectedWordObjects.length === 0) return sourceVideo.duration;
      
      const startTime = Math.min(...selectedWordObjects.map(w => w.startTime));
      const endTime = Math.max(...selectedWordObjects.map(w => w.endTime));
      return endTime - startTime;
    }
    
    if (playMode === 'lane' && activeLane.length > 0) {
      // Return total duration of all clips for sequential playback
      return activeLane.reduce((total, clip) => total + (clip.endTime - clip.startTime), 0);
    }
    
    return sourceVideo.duration;
  };

  const getCumulativeTime = () => {
    if (playMode === 'lane' && activeLane.length > 0) {
      // Calculate cumulative time across all clips up to current clip + current time within clip
      let cumulativeTime = 0;
      for (let i = 0; i < currentClipIndex; i++) {
        cumulativeTime += activeLane[i].endTime - activeLane[i].startTime;
      }
      return cumulativeTime + currentTime;
    }
    return currentTime;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlayModeLabel = () => {
    switch (playMode) {
      case 'selection': return 'Playing selection';
      case 'lane': return activeLane.length > 0 ? `Playing clip ${currentClipIndex + 1} of ${activeLane.length}` : 'Playing clip lane';
      default: return 'Playing full video';
    }
  };

  return (
    <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4 sm:p-6 flex flex-col h-full">
      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden mb-4 aspect-video">
        {/* Mock video placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
            <div className="text-center text-muted-foreground px-4">
              <div className="text-xs sm:text-sm opacity-60 mb-2">{getPlayModeLabel()}</div>
              <div className="text-xl sm:text-2xl font-mono">
                {formatTime(getCumulativeTime())} / {formatTime(getPlayDuration())}
              </div>
            </div>
        </div>
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
          <Button
            size="lg"
            onClick={handlePlayPause}
            className="rounded-full w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur hover:bg-white/30 touch-manipulation"
          >
            {isPlaying ? 
              <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : 
              <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-0.5 sm:ml-1" />
            }
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3 sm:space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[getCumulativeTime()]}
            max={getPlayDuration()}
            step={0.1}
            onValueChange={([value]) => {
              if (playMode === 'lane' && activeLane.length > 0) {
                // Calculate which clip the seek position falls into
                let cumulativeTime = 0;
                for (let i = 0; i < activeLane.length; i++) {
                  const clipDuration = activeLane[i].endTime - activeLane[i].startTime;
                  if (value <= cumulativeTime + clipDuration) {
                    onClipIndexChange?.(i);
                    onTimeChange(value - cumulativeTime);
                    break;
                  }
                  cumulativeTime += clipDuration;
                }
              } else {
                onTimeChange(value);
              }
            }}
            className="w-full h-8 sm:h-auto touch-manipulation"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(getCumulativeTime())}</span>
            <span>{formatTime(getPlayDuration())}</span>
          </div>
        </div>

        {/* Play Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayPause}
              className="gap-1 sm:gap-2 touch-manipulation"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            
            {/* Play Mode Indicator */}
            <div className={cn(
              "text-xs px-2 py-1 rounded-full border whitespace-nowrap",
              {
                'bg-primary/10 border-primary text-primary': playMode !== 'full',
                'bg-muted border-muted-foreground/20 text-muted-foreground': playMode === 'full'
              }
            )}>
              <span className="hidden sm:inline">{getPlayModeLabel()}</span>
              <span className="sm:hidden">
                {playMode === 'selection' ? 'Selection' : 
                 playMode === 'lane' ? `Clip ${currentClipIndex + 1}/${activeLane.length}` : 'Full'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[80]}
              max={100}
              step={1}
              className="w-16 sm:w-20 touch-manipulation"
            />
          </div>
        </div>

        {/* Active Lane Preview */}
        {playMode === 'lane' && activeLane.length > 0 && (
          <div className="mt-3 sm:mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
            <div className="text-xs text-muted-foreground mb-2">Playing sequence:</div>
            <div className="flex gap-1 sm:gap-2 flex-wrap">
              {activeLane.map((clip, index) => (
                <div
                  key={clip.id}
                  className={cn(
                    "text-xs px-2 py-1 rounded border touch-manipulation",
                    index === currentClipIndex && isPlaying 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-card text-muted-foreground"
                  )}
                >
                  <span className="hidden sm:inline">{clip.text.slice(0, 20)}...</span>
                  <span className="sm:hidden">{clip.text.slice(0, 10)}...</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};