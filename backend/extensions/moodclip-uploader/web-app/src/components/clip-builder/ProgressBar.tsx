interface ProgressBarProps {
  currentTime: number;
  duration: number;
  color: string;
  startTime?: number; // Add start time to calculate relative progress
}

export const ProgressBar = ({ currentTime, duration, color, startTime = 0 }: ProgressBarProps) => {
  // Calculate progress relative to the clip's start time
  const relativeTime = Math.max(0, currentTime - startTime);
  const progress = duration > 0 ? Math.min((relativeTime / duration) * 100, 100) : 0;
  
  return (
    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-muted rounded-b-lg overflow-hidden">
      <div 
        className="h-full transition-all duration-100 ease-linear"
        style={{ 
          width: `${progress}%`,
          backgroundColor: color
        }}
      />
    </div>
  );
};