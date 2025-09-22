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
      <h2 className="text-3xl md:text-4xl font-bold leading-tight">
        <span className="text-foreground">Create Me </span>
        <span className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
          Short Clips
        </span>
        <br />
        <span className="text-foreground">from my </span>
        <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {currentText}
        </span>
        <span 
          className={`inline-block w-0.5 h-8 md:h-10 ml-1 bg-primary transition-opacity duration-100 ${
            showCursor ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </h2>
    </div>
  );
};