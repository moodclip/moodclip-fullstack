import { PipelineStage } from '@/types/pipeline';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRive } from '@rive-app/react-canvas';
import uploaderAnimation from '@/assets/uploader.riv';

interface StagePanelProps {
  stage: PipelineStage;
  onContinue: () => void;
}

// Helper to get dynamic gradient background based on status and progress
const getCtaBackground = (status: string = 'waiting', progress: number = 0) => {
  switch (status) {
    case 'ready':
      return 'linear-gradient(135deg, hsl(320 100% 65%), hsl(280 100% 70%))';
    case 'completed':
      return 'linear-gradient(135deg, hsl(140 60% 55%), hsl(120 65% 60%))';
    case 'failed':
      return 'linear-gradient(135deg, hsl(0 84% 60%), hsl(15 85% 65%))';
    case 'running':
      // Left-to-right fill: filled portion (accent) + empty portion (muted)
      return `linear-gradient(90deg, 
        hsl(320 100% 65%) 0%, 
        hsl(280 100% 70%) ${progress}%, 
        hsl(220 20% 15%) ${progress}%, 
        hsl(220 15% 12%) 100%)`;
    case 'pro':
      return 'linear-gradient(135deg, hsl(280 100% 65%), hsl(320 100% 70%))';
    case 'waiting':
    default:
      return 'linear-gradient(135deg, hsl(220 20% 15%), hsl(220 15% 12%))';
  }
};

// Helper to get dynamic button text with percentage
const getButtonText = (stage: PipelineStage) => {
  if (stage.ctaStatus === 'completed') {
    return 'Completed';
  }
  if (stage.ctaStatus === 'failed') {
    return 'Retry';
  }
  if (stage.ctaStatus === 'running' && stage.progress !== undefined) {
    return `${stage.buttonText} ${Math.round(stage.progress)}%`;
  }
  return stage.buttonText;
};

// Helper to get stage-specific messages
const getStageMessages = (stageId: number) => {
  switch (stageId) {
    case 1: // Upload
      return [
        "Checking File...",
        "Uploading..."
      ];
    case 2: // Transcribe
      return [
        "Converting speech to text...",
        "Analyzing audio patterns...", 
        "Processing voice recognition...",
        "Synchronizing timestamps...",
        "Finalizing transcription..."
      ];
    case 3: // Find Clips
      return [
        "Scanning for key moments...",
        "Analyzing content highlights...",
        "Detecting engaging segments...",
        "Evaluating clip potential...",
        "Selecting best footage..."
      ];
    case 4: // Captions
      return [
        "Generating subtitle text...",
        "Synchronizing with audio...",
        "Formatting caption styles...",
        "Optimizing readability...",
        "Finalizing captions..."
      ];
    case 5: // Audio Enhancement
      return [
        "Reducing background noise...",
        "Enhancing voice clarity...",
        "Balancing audio levels...",
        "Applying sound filters...",
        "Optimizing audio quality..."
      ];
    case 6: // B-Roll
      return [
        "Searching relevant footage...",
        "Matching scene context...",
        "Selecting supplementary clips...",
        "Synchronizing with narrative...",
        "Integrating B-roll footage..."
      ];
    default:
      return [];
  }
};

// Helper to get subheading text based on stage status
const getSubheadingText = (stage: PipelineStage, currentMessageIndex: number) => {
  if (stage.ctaStatus === 'running') {
    const messages = getStageMessages(stage.id);
    return messages.length > 0 ? messages[currentMessageIndex] : stage.description;
  }
  if (stage.ctaStatus === 'pro') {
    return 'Upgrade to Pro to unlock this feature';
  }
  return stage.description;
};

export const StagePanel = ({ stage, onContinue }: StagePanelProps) => {
  const navigate = useNavigate();
  const [currentSubheading, setCurrentSubheading] = useState(0);
  const stageMessages = getStageMessages(stage.id);

  // Rive animation for upload stage
  const { RiveComponent } = useRive({
    src: uploaderAnimation,
    autoplay: true,
  });

  useEffect(() => {
    // Only rotate messages when stage is running and has messages
    if (stage.ctaStatus === 'running' && stageMessages.length > 0) {
      const interval = setInterval(() => {
        setCurrentSubheading((prev) => (prev + 1) % stageMessages.length);
      }, 2000);

      return () => clearInterval(interval);
    } else {
      // Reset to first message when not running
      setCurrentSubheading(0);
    }
  }, [stage.ctaStatus, stage.id, stageMessages.length]);

  // Key prop forces re-render with animation when stage changes
  const stageKey = `stage-${stage.id}`;
  const isUploadStage = stage.id === 1;

  if (isUploadStage) {
    return (
      <div key={stageKey} className="flex flex-col items-center text-center gap-8 sm:gap-10 animate-slide-fade-in">
        <div className="w-[42rem] max-w-[94vw] h-[28rem] sm:h-[30rem] flex items-center justify-center">
          <RiveComponent className="w-full h-full" />
        </div>

        <div className="space-y-6 sm:space-y-8 max-w-[42rem] mx-auto">
          <h2 className="font-heading text-6xl font-semibold text-foreground">
            {stage.title}
          </h2>
          <p className={`text-2xl text-muted-foreground/80 transition-smooth ${stage.ctaStatus === 'running' ? 'animate-pulse' : ''}`}>
            {getSubheadingText(stage, currentSubheading)}
          </p>

          <div className="pt-4 flex flex-col items-center gap-6">
            <Button 
              onClick={onContinue}
              size="lg"
              className="w-full max-w-xs font-semibold text-xl px-10 py-6 rounded-3xl text-white border-0 transition-all duration-500 ease-out hover:scale-105"
              style={{
                background: getCtaBackground(stage.ctaStatus, stage.progress)
              }}
            >
              {getButtonText(stage)}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={stageKey}
      className="pipeline-focus-card w-[40rem] max-w-[95vw] min-h-[40rem] mx-auto px-14 py-14 transition-smooth animate-slide-fade-in"
    >
      {/* Stage Icon */}
      <div className="flex justify-center mb-14">
        <div className="w-48 h-48 flex items-center justify-center gradient-glow rounded-full">
          <img 
            src={stage.icon} 
            alt={`${stage.title} icon`}
            className="w-40 h-40 object-contain filter drop-shadow-2xl transition-smooth hover:scale-110"
          />
        </div>
      </div>

      {/* Stage Content */}
      <div className="text-center space-y-10">
        <div>
          <h2 className="font-heading text-6xl font-semibold mb-6 text-foreground">
            {stage.title}
          </h2>
          {/* Dynamic thinking subheading */}
          <p className={`text-2xl text-muted-foreground/80 transition-smooth ${stage.ctaStatus === 'running' ? 'animate-pulse' : ''}`}>
            {getSubheadingText(stage, currentSubheading)}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="pt-6 flex flex-col items-center gap-6">
          <Button 
            onClick={onContinue}
            size="lg"
            className="w-full max-w-xs font-semibold text-xl px-10 py-6 rounded-3xl text-white border-0 transition-all duration-500 ease-out hover:scale-105"
            style={{
              background: getCtaBackground(stage.ctaStatus, stage.progress)
            }}
          >
            {getButtonText(stage)}
          </Button>

          {/* Build Clips Button - Show for "Find Clips" stage when completed or available */}
          {stage.id === 3 && (stage.ctaStatus === 'completed' || stage.ctaStatus === 'ready') && (
            <Button 
              onClick={() => navigate('/build-clip')}
              variant="outline"
              size="lg"
              className="w-full max-w-xs font-semibold text-xl px-10 py-6 rounded-3xl border-2 transition-all duration-500 ease-out hover:scale-105"
            >
              Build clips
            </Button>
          )}

          {/* Upgrade CTA for Export stage */}
          {stage.id === 7 && (
            <div className="text-center space-y-2">
              <button className="text-lg text-primary font-medium hover:text-primary/80 transition-colors underline">
                Upgrade to Pro →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
