import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchToggleProps {
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

export const SearchToggle = ({ onSearchChange, placeholder = "Search..." }: SearchToggleProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        handleCollapse();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setSearchQuery('');
    onSearchChange('');
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange(value);
  };

  const handleBlur = () => {
    if (!searchQuery) {
      handleCollapse();
    }
  };

  return (
    <div className="relative flex items-center">
      {!isExpanded ? (
        <button
          onClick={handleExpand}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-md hover:bg-muted/50"
        >
          <Search className="w-4 h-4" />
        </button>
      ) : (
        <div className="flex items-center animate-scale-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onBlur={handleBlur}
              className="pl-9 pr-3 w-48 animate-scale-in"
            />
          </div>
        </div>
      )}
    </div>
  );
};