import { useState, useCallback, useRef, useEffect } from 'react';
import { Tag, Plus, Bookmark, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TranscriptParagraph, TranscriptWord, AIClipBubble } from '@/data/clipBuilderData';
import { SearchToggle } from './SearchToggle';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
interface TranscriptSectionProps {
  transcript: TranscriptParagraph[];
  selectedWords: string[];
  onSelectedWordsChange: (wordIds: string[]) => void;
  onAddClip: (text: string, startTime: number, endTime: number) => void;
  activeBubble: AIClipBubble | undefined;
  onDeletedWordsChange?: (deletedWords: Set<string>) => void;
  onSelectionStart?: () => void;
  onSelectionEnd?: () => void;
}
export const TranscriptSection = ({
  transcript,
  selectedWords,
  onSelectedWordsChange,
  onAddClip,
  activeBubble,
  onDeletedWordsChange,
  onSelectionStart,
  onSelectionEnd,
}: TranscriptSectionProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showHooks, setShowHooks] = useState(false);
  const [hooks, setHooks] = useState<Set<string>>(new Set());
  const [deletedWords, setDeletedWords] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<{
    startWordId: string | null;
    isSelecting: boolean;
    wasDragging: boolean;
  }>({
    startWordId: null,
    isSelecting: false,
    wasDragging: false
  });
  const handleWordMouseDown = useCallback((wordId: string, event: React.MouseEvent) => {
    event.preventDefault();

    // Prevent selecting deleted words
    if (deletedWords.has(wordId)) return;

    onSelectionStart?.();

    // Handle clicks on already selected words
    if (selectedWords.includes(wordId)) {
      if (selectedWords.length === 1) {
        // If only one word is selected and clicked, deselect it
        onSelectedWordsChange([]);
        return;
      } else {
        // If multiple words are selected, make this single word the new selection
        selectionRef.current.startWordId = wordId;
        selectionRef.current.isSelecting = true;
        selectionRef.current.wasDragging = false;
        onSelectedWordsChange([wordId]);
        return;
      }
    }
    selectionRef.current.startWordId = wordId;
    selectionRef.current.isSelecting = true;
    selectionRef.current.wasDragging = false;
    onSelectedWordsChange([wordId]);
  }, [onSelectedWordsChange, deletedWords, selectedWords]);
  const handleWordMouseEnter = useCallback((wordId: string) => {
    if (!selectionRef.current.isSelecting || !selectionRef.current.startWordId) return;
    if (deletedWords.has(wordId)) return;

    // Mark as dragging when entering other words during selection
    selectionRef.current.wasDragging = true;

    // Find start and current word positions
    const allWords = transcript.flatMap(p => p.words);
    const startIndex = allWords.findIndex(w => w.id === selectionRef.current.startWordId);
    const currentIndex = allWords.findIndex(w => w.id === wordId);
    if (startIndex === -1 || currentIndex === -1) return;
    const [start, end] = startIndex <= currentIndex ? [startIndex, currentIndex] : [currentIndex, startIndex];

    // Only include non-deleted words and avoid duplicates
    const selectedIds = allWords.slice(start, end + 1).filter(w => !deletedWords.has(w.id)).map(w => w.id).filter((id, index, array) => array.indexOf(id) === index);
    onSelectedWordsChange(selectedIds);
  }, [transcript, onSelectedWordsChange, deletedWords]);
  const handleMouseUp = useCallback(() => {
    selectionRef.current.isSelecting = false;
    onSelectionEnd?.();
  }, [onSelectionEnd]);
  const handleTranscriptClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    // Check if the clicked element is a word span
    const isWordClick = target.tagName === 'SPAN' && target.hasAttribute('data-word-id');

    // Don't clear selection if user was just dragging
    if (selectionRef.current.wasDragging) {
      selectionRef.current.wasDragging = false;
      onSelectionEnd?.();
      return;
    }

    // Clear selection if clicking outside of words
    if (!isWordClick && selectedWords.length > 0) {
      onSelectedWordsChange([]);
      onSelectionEnd?.();
    }
  }, [selectedWords, onSelectedWordsChange, onSelectionEnd]);
  const handleWordDoubleClick = useCallback((wordId: string) => {
    if (deletedWords.has(wordId)) return;

    // Select full sentence
    const allWords = transcript.flatMap(p => p.words);
    const wordIndex = allWords.findIndex(w => w.id === wordId);
    if (wordIndex === -1) return;

    // Find sentence boundaries (simple heuristic)
    let start = wordIndex;
    let end = wordIndex;

    // Go backwards to find sentence start
    while (start > 0 && !allWords[start - 1].text.match(/[.!?]$/)) {
      start--;
    }

    // Go forwards to find sentence end
    while (end < allWords.length - 1 && !allWords[end].text.match(/[.!?]$/)) {
      end++;
    }

    // Only include non-deleted words and avoid duplicates
    const selectedIds = allWords.slice(start, end + 1).filter(w => !deletedWords.has(w.id)).map(w => w.id).filter((id, index, array) => array.indexOf(id) === index);
    onSelectedWordsChange(selectedIds);
  }, [transcript, onSelectedWordsChange, deletedWords]);
  const getSelectedText = () => {
    const allWords = transcript.flatMap(p => p.words);
    return selectedWords.map(id => allWords.find(w => w.id === id)?.text).filter(Boolean).join(' ');
  };
  const getSelectedTimeRange = () => {
    const allWords = transcript.flatMap(p => p.words);
    const selectedWordObjects = selectedWords.map(id => allWords.find(w => w.id === id)).filter(Boolean) as TranscriptWord[];
    if (selectedWordObjects.length === 0) return {
      startTime: 0,
      endTime: 0
    };
    const startTime = Math.min(...selectedWordObjects.map(w => w.startTime));
    const endTime = Math.max(...selectedWordObjects.map(w => w.endTime));
    return {
      startTime,
      endTime
    };
  };
  const handleAddToClip = () => {
    const text = getSelectedText();
    const {
      startTime,
      endTime
    } = getSelectedTimeRange();
    if (text && activeBubble) {
      onAddClip(text, startTime, endTime);
    }
  };
  const handleSaveHook = () => {
    const newHooks = new Set(hooks);
    selectedWords.forEach(id => newHooks.add(id));
    setHooks(newHooks);
    onSelectedWordsChange([]);
    toast({
      title: "Hook saved",
      description: `Saved "${getSelectedText().slice(0, 30)}..." as a hook`
    });
  };
  const handleDeleteWords = () => {
    const newDeletedWords = new Set(deletedWords);
    selectedWords.forEach(id => newDeletedWords.add(id));
    setDeletedWords(newDeletedWords);
    onDeletedWordsChange?.(newDeletedWords);
    onSelectedWordsChange([]);
    toast({
      title: "Words deleted",
      description: "Selected words will be skipped during playback"
    });
  };
  const highlightText = (word: TranscriptWord) => {
    const isSelected = selectedWords.includes(word.id);
    const isDeleted = deletedWords.has(word.id);
    const isHook = hooks.has(word.id) || word.isHook;
    const isHighlightedHook = showHooks && isHook;
    const isActiveBubbleMatch = activeBubble?.clips.some(clip => word.startTime >= clip.startTime && word.endTime <= clip.endTime);
    const isSearchMatch = searchQuery && word.text.toLowerCase().includes(searchQuery.toLowerCase());
    return {
      isSelected,
      isDeleted,
      isHook,
      isHighlightedHook,
      isActiveBubbleMatch,
      isSearchMatch
    };
  };
  const filteredTranscript = searchQuery ? transcript.filter(p => p.words.some(w => w.text.toLowerCase().includes(searchQuery.toLowerCase()))) : transcript;
  return <div ref={containerRef} className="bg-card/50 backdrop-blur border border-border rounded-xl p-4 sm:p-6 flex flex-col max-h-[300px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <h3 className="font-heading text-lg sm:text-xl font-semibold text-foreground">
            Transcript
          </h3>
          
          {/* Selection Toolbar - Mobile optimized */}
          {selectedWords.length > 0 && <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <Button size="sm" onClick={handleAddToClip} disabled={!activeBubble} className="gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm touch-manipulation">
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">Add to clip</span>
                <span className="sm:hidden">Add</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveHook} className="gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm touch-manipulation">
                <Tag className="w-3 h-3" />
                
                <span className="sm:hidden">Hook</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeleteWords} className="gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm touch-manipulation">
                <Trash2 className="w-3 h-3" />
                
                <span className="sm:hidden">Del</span>
              </Button>
            </div>}
        </div>
        
        <div className="flex items-center gap-2">
          <SearchToggle onSearchChange={setSearchQuery} placeholder="Search transcript..." />
          <Button variant="ghost" size="sm" onClick={() => setShowHooks(!showHooks)} className={cn("touch-manipulation", showHooks && "text-primary")}>
            <Tag className="w-4 h-4" />
          </Button>
        </div>
      </div>


      {/* Transcript Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 sm:space-y-4 pr-1 sm:pr-2" onMouseUp={handleMouseUp} onClick={handleTranscriptClick}>
        {filteredTranscript.map(paragraph => <div key={paragraph.id} className="flex gap-2 sm:gap-4">
            {/* Gutter - Reduced on mobile */}
            <div className="flex-shrink-0 w-12 sm:w-16 text-xs text-muted-foreground">
              <div className="sticky top-0">
                <div className="mb-1">{paragraph.timestamp}</div>
                <div className="font-medium">{paragraph.speaker}</div>
                {/* Hook icons */}
                {paragraph.words.some(w => hooks.has(w.id) || w.isHook)}
              </div>
            </div>
            
            {/* Words - Better touch targets */}
            <div className="flex-1 leading-relaxed break-words whitespace-normal">
              {paragraph.words.map((word, index) => {
            const highlight = highlightText(word);
            return <span key={word.id}>
                <span data-word-id={word.id} onMouseDown={e => handleWordMouseDown(word.id, e)} onMouseEnter={() => handleWordMouseEnter(word.id)} onDoubleClick={() => handleWordDoubleClick(word.id)} className={cn("inline-block transition-all duration-200 select-none", {
                'cursor-pointer px-0.5 py-1 sm:py-0.5 rounded touch-manipulation': !highlight.isDeleted && !highlight.isSelected,
                'cursor-pointer px-0.5 py-1 sm:py-0.5 rounded hover:bg-muted/50 hover:underline touch-manipulation': !highlight.isDeleted && !highlight.isSelected,
                'cursor-not-allowed opacity-50 line-through decoration-2 decoration-destructive px-0.5 py-1 sm:py-0.5': highlight.isDeleted,
                'bg-primary text-primary-foreground px-0.5 py-1 sm:py-0.5 rounded cursor-pointer touch-manipulation': highlight.isSelected && !highlight.isDeleted,
                'bg-yellow-200/20 border-b border-yellow-400/50': highlight.isHighlightedHook && !highlight.isDeleted,
                'border-b-2': highlight.isActiveBubbleMatch && activeBubble && !highlight.isDeleted,
                'bg-orange-200/30 border border-orange-400/50 rounded': highlight.isSearchMatch && !highlight.isDeleted && !highlight.isSelected
              })} style={{
                borderBottomColor: highlight.isActiveBubbleMatch && activeBubble && !highlight.isDeleted ? activeBubble.tint : undefined,
                userSelect: highlight.isDeleted ? 'none' : 'auto'
              }}>
                  {word.text}
                </span>
                {index < paragraph.words.length - 1 && ' '}
              </span>;
          })}
            </div>
          </div>)}
        </div>
      </ScrollArea>
    </div>;
};
