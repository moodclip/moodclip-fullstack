import React, { useState, useEffect } from 'react';

interface TypewriterProps {
  texts: string[];
  baseText?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  className?: string;
}

export const Typewriter = ({
  texts,
  baseText = "",
  typingSpeed = 100,
  deletingSpeed = 50,
  pauseDuration = 2000,
  className = ""
}: TypewriterProps) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const targetText = texts[currentTextIndex];
    
    const timeout = setTimeout(() => {
      if (isDeleting) {
        // Deleting characters
        setCurrentText(prev => prev.slice(0, -1));
        
        if (currentText === '') {
          setIsDeleting(false);
          setCurrentTextIndex(prev => (prev + 1) % texts.length);
        }
      } else {
        // Typing characters
        setCurrentText(targetText.slice(0, currentText.length + 1));
        
        if (currentText === targetText) {
          setTimeout(() => setIsDeleting(true), pauseDuration);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentText, currentTextIndex, isDeleting, texts, typingSpeed, deletingSpeed, pauseDuration]);

  // Cursor blinking effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className={`font-heading text-center ${className}`}>
      <h2 className="text-5xl md:text-6xl xl:text-7xl font-bold leading-tight tracking-tight">
        <span className="text-foreground">Create Me </span>
        <span className="bg-gradient-to-r from-[#FF7AC8] via-[#F05ED2] to-[#9E55FF] bg-clip-text text-transparent">
          Short Clips
        </span>
        <br />
        <span className="text-foreground">from my </span>
        <span className="bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(300_95%_70%)] to-[hsl(var(--accent))] bg-clip-text text-transparent">
          {currentText}
        </span>
        <span
          className={`inline-block w-1 h-10 md:h-14 xl:h-16 ml-3 bg-primary transition-opacity duration-100 ${
            showCursor ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </h2>
    </div>
  );
};
