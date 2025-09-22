import { useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { mockClipBuilderData, AIClipBubble, ClipChip } from '@/data/clipBuilderData';
import { BuildClipSection } from '@/components/clip-builder/BuildClipSection';
import { TranscriptSection } from '@/components/clip-builder/TranscriptSection';
import { VideoPlayerSection } from '@/components/clip-builder/VideoPlayerSection';
import { toast } from '@/hooks/use-toast';

const ClipBuilder = () => {
  const navigate = useNavigate();
  const [data] = useState(mockClipBuilderData);
  const [activeBubbleId, setActiveBubbleId] = useState<string>(data.aiMoments[0]?.id || '');
  const [bubbles, setBubbles] = useState<AIClipBubble[]>(data.aiMoments);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playMode, setPlayMode] = useState<'full' | 'selection' | 'lane'>('full');
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [deletedWords, setDeletedWords] = useState<Set<string>>(new Set());

  const activeBubble = bubbles.find(b => b.id === activeBubbleId);

  const handleBubbleClick = useCallback((bubbleId: string) => {
    setActiveBubbleId(bubbleId);
    setSelectedWords([]); // Clear selection when switching bubbles
  }, []);

  const handleAddClip = useCallback((text: string, startTime: number, endTime: number) => {
    if (!activeBubble) return;

    const newChip: ClipChip = {
      id: `clip-${Date.now()}`,
      text,
      startTime,
      endTime, 
      duration: `${Math.round(endTime - startTime)}s`
    };

    setBubbles(prev => prev.map(bubble => 
      bubble.id === activeBubbleId 
        ? { ...bubble, clips: [...bubble.clips, newChip] }
        : bubble
    ));

    setSelectedWords([]);
    toast({
      title: "Clip added",
      description: `Added "${text.slice(0, 30)}..." to ${activeBubble.name}`,
    });
  }, [activeBubble, activeBubbleId]);

  const handleDeleteChip = useCallback((chipId: string) => {
    setBubbles(prev => prev.map(bubble => 
      bubble.id === activeBubbleId
        ? { ...bubble, clips: bubble.clips.filter(c => c.id !== chipId) }
        : bubble
    ));
  }, [activeBubbleId]);

  const handleReorderChips = useCallback((chips: ClipChip[]) => {
    setBubbles(prev => prev.map(bubble =>
      bubble.id === activeBubbleId
        ? { ...bubble, clips: chips }
        : bubble  
    ));
  }, [activeBubbleId]);

  const handleCreateBubble = useCallback(() => {
    const newBubble: AIClipBubble = {
      id: `custom-${Date.now()}`,
      name: `Clip ${String.fromCharCode(65 + bubbles.length - 3)}`, // Start from A after AI Clip 3
      tint: "hsl(320 100% 70%)", // Default purple
      clips: []
    };

    setBubbles(prev => [...prev, newBubble]);
    setActiveBubbleId(newBubble.id);
  }, [bubbles.length]);

  const handleBubbleRename = useCallback((bubbleId: string, newName: string) => {
    setBubbles(prev => prev.map(bubble => 
      bubble.id === bubbleId 
        ? { ...bubble, name: newName }
        : bubble
    ));
  }, []);

  const handlePlayAll = useCallback(() => {
    if (!activeBubble?.clips.length) return;
    
    if (isPlaying && playMode === 'lane') {
      // Pause if already playing
      setIsPlaying(false);
    } else {
      // Start/resume playing
      setPlayMode('lane');
      setCurrentClipIndex(0);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  }, [activeBubble, isPlaying, playMode]);

  const getTotalDuration = () => {
    if (!activeBubble) return '0s';
    const total = activeBubble.clips.reduce((sum, clip) => 
      sum + (clip.endTime - clip.startTime), 0
    );
    return `${Math.round(total)}s`;
  };

  return (
    <div className="min-h-screen animated-gradient-bg">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-1 sm:gap-2 px-2 sm:px-3"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Pipeline</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <h1 className="font-heading text-lg sm:text-xl font-semibold text-foreground">
                Clip Builder
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Build a Clip Section */}
        <BuildClipSection
          activeBubble={activeBubble}
          bubbles={bubbles}
          onBubbleClick={handleBubbleClick}
          onCreateBubble={handleCreateBubble}
          onDeleteChip={handleDeleteChip}
          onReorderChips={handleReorderChips}
          onPlayAll={handlePlayAll}
          totalDuration={getTotalDuration()}
          isPlaying={isPlaying && playMode === 'lane'}
          currentClipIndex={currentClipIndex}
          currentTime={currentTime}
          onBubbleRename={handleBubbleRename}
        />

        {/* Bottom Split Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 min-h-[400px] sm:min-h-[600px]">
          {/* Transcript Section */}
          <TranscriptSection
            transcript={data.transcript}
            selectedWords={selectedWords}
            onSelectedWordsChange={setSelectedWords}
            onAddClip={handleAddClip}
            activeBubble={activeBubble}
            onDeletedWordsChange={setDeletedWords}
          />

          {/* Video Player Section */}
          <VideoPlayerSection
            sourceVideo={data.sourceVideo}
            selectedWords={selectedWords}
            transcript={data.transcript}
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