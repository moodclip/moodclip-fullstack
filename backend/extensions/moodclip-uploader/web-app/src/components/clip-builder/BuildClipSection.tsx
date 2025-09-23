import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Play, Pause, Plus, X, GripVertical } from 'lucide-react';
import type { AIClipBubble, ClipChip } from '@/data/clipBuilderData';
import { ProgressBar } from './ProgressBar';
import { cn } from '@/lib/utils';

interface BuildClipSectionProps {
  activeBubble: AIClipBubble | undefined;
  bubbles: AIClipBubble[];
  onBubbleClick: (bubbleId: string) => void;
  onCreateBubble: () => void;
  onDeleteChip: (chipId: string) => void;
  onReorderChips: (chips: ClipChip[]) => void;
  onPlayAll: () => void;
  totalDuration: string;
  isPlaying: boolean;
  currentClipIndex?: number;
  currentTime?: number;
  onBubbleRename?: (bubbleId: string, newName: string) => void;
  onExport: () => void;
}

export const BuildClipSection = ({
  activeBubble,
  bubbles,
  onBubbleClick,
  onCreateBubble,
  onDeleteChip,
  onReorderChips,
  onPlayAll,
  totalDuration,
  isPlaying,
  currentClipIndex = 0,
  currentTime = 0,
  onBubbleRename,
  onExport,
}: BuildClipSectionProps) => {
  const [draggedChip, setDraggedChip] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [renamingBubbleId, setRenamingBubbleId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleDragStart = (e: React.DragEvent, chipId: string) => {
    setDraggedChip(chipId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedChip && targetIndex !== dragOverIndex) {
      setDragOverIndex(targetIndex);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedChip || !activeBubble) return;

    const chips = [...activeBubble.clips];
    const draggedIndex = chips.findIndex(c => c.id === draggedChip);
    
    if (draggedIndex !== -1) {
      const [removed] = chips.splice(draggedIndex, 1);
      chips.splice(targetIndex, 0, removed);
      onReorderChips(chips);
    }
    
    setDraggedChip(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedChip(null);
    setDragOverIndex(null);
  };

  const handleBubbleDoubleClick = (bubble: AIClipBubble, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingBubbleId(bubble.id);
    setRenameValue(bubble.name);
  };

  const handleRenameSubmit = (bubbleId: string) => {
    if (onBubbleRename && renameValue.trim()) {
      onBubbleRename(bubbleId, renameValue.trim());
    }
    setRenamingBubbleId(null);
    setRenameValue('');
  };

  const handleRenameCancel = () => {
    setRenamingBubbleId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, bubbleId: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(bubbleId);
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  // Create visual order for drag preview
  const getVisualOrder = () => {
    if (!activeBubble || !draggedChip || dragOverIndex === null) {
      return activeBubble?.clips || [];
    }

    const chips = [...activeBubble.clips];
    const draggedIndex = chips.findIndex(c => c.id === draggedChip);
    
    if (draggedIndex !== -1) {
      const [removed] = chips.splice(draggedIndex, 1);
      chips.splice(dragOverIndex, 0, removed);
    }
    
    return chips;
  };

  const totalClips = bubbles.reduce((sum, bubble) => sum + bubble.clips.length, 0);

  return (
    <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <h2 className="font-heading text-xl sm:text-2xl font-semibold text-foreground">
            Build a Clip
          </h2>
          <div className="text-sm text-muted-foreground">
            Total: {totalClips} clips • {totalDuration}
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onPlayAll}
            disabled={!activeBubble?.clips.length}
            className="gap-1 sm:gap-2 flex-1 sm:flex-none"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="hidden sm:inline">Play All</span>
            <span className="sm:hidden">Play</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            Clear
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 flex-1 sm:flex-none"
            onClick={onExport}
          >
            Export
          </Button>
        </div>
      </div>

      {/* AI Clip Bubbles */}
      <div className="flex items-center gap-2 sm:gap-3 mb-6 flex-wrap">
        {bubbles.map((bubble) => (
          renamingBubbleId === bubble.id ? (
            <Input
              key={bubble.id}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => handleRenameSubmit(bubble.id)}
              onKeyDown={(e) => handleRenameKeyDown(e, bubble.id)}
              autoFocus
              className="px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium border-2 min-h-[36px] w-auto min-w-[80px] max-w-[150px]"
              style={{
                borderColor: bubble.tint,
                backgroundColor: bubble.id === activeBubble?.id ? bubble.tint : 'transparent',
                color: bubble.id === activeBubble?.id ? 'white' : 'inherit'
              }}
            />
          ) : (
            <button
              key={bubble.id}
              onClick={() => onBubbleClick(bubble.id)}
              onDoubleClick={(e) => handleBubbleDoubleClick(bubble, e)}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium border-2 transition-all duration-200 hover:scale-105 min-h-[36px] touch-manipulation",
                bubble.id === activeBubble?.id
                  ? "border-current text-white shadow-lg"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
              style={{
                backgroundColor: bubble.id === activeBubble?.id ? bubble.tint : 'transparent',
                borderColor: bubble.tint
              }}
            >
              {bubble.name}
            </button>
          )
        ))}
        
        <button
          onClick={onCreateBubble}
          className="px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium border-2 border-dashed border-muted-foreground/50 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-all duration-200 hover:scale-105 gap-2 flex items-center min-h-[36px] touch-manipulation"
        >
          <Plus className="w-3 h-3" />
          <span className="hidden sm:inline">New clip</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Clip Lane */}
      <div className="min-h-[120px] bg-muted/20 rounded-lg p-4 border border-border/50">
        {!activeBubble?.clips.length ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            No clips in this workspace. Select text from the transcript to add clips.
          </div>
        ) : (
          <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-2">
            {getVisualOrder().map((chip, index) => (
                <div
                  key={chip.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, chip.id)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "group relative bg-card border border-border rounded-lg p-3 max-w-md hover:shadow-md transition-all duration-200",
                    draggedChip === chip.id && "opacity-50 scale-95 rotate-2 shadow-lg cursor-grabbing",
                    draggedChip && draggedChip !== chip.id && "cursor-pointer",
                    !draggedChip && "cursor-grab hover:cursor-grab"
                  )}
                >
                <div className="flex items-start gap-2">
                  {/* Drag Handle */}
                  <div className="flex-shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground mb-2 line-clamp-2">
                      {chip.text}
                    </p>
                    
                    {/* Quick-trim handles */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button 
                          className="text-xs px-1 py-0.5 bg-muted/50 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle left trim -1s
                          }}
                        >
                          ←1s
                        </button>
                        <button 
                          className="text-xs px-1 py-0.5 bg-muted/50 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle left trim -0.2s
                          }}
                        >
                          ←0.2s
                        </button>
                      </div>
                      
                      <Badge variant="secondary" className="text-xs">
                        {chip.duration}
                      </Badge>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button 
                          className="text-xs px-1 py-0.5 bg-muted/50 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle right trim +0.2s
                          }}
                        >
                          0.2s→
                        </button>
                        <button 
                          className="text-xs px-1 py-0.5 bg-muted/50 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle right trim +1s
                          }}
                        >
                          1s→
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onDeleteChip(chip.id)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Progress indicator when playing this specific clip */}
                {isPlaying && currentClipIndex === index && (
                  <ProgressBar 
                    currentTime={currentTime}
                    duration={chip.endTime - chip.startTime}
                    startTime={chip.startTime}
                    color={activeBubble!.tint}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
