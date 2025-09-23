import type { PipelineStage } from '@/types/pipeline';

export const getCtaBackground = (status: string = 'waiting', progress: number = 0) => {
  switch (status) {
    case 'ready':
      return 'linear-gradient(135deg, hsl(320 100% 65%), hsl(280 100% 70%))';
    case 'completed':
      return 'linear-gradient(135deg, hsl(140 60% 55%), hsl(120 65% 60%))';
    case 'failed':
      return 'linear-gradient(135deg, hsl(0 84% 60%), hsl(15 85% 65%))';
    case 'running':
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

export const getButtonText = (stage: PipelineStage) => {
  if (stage.ctaStatus === 'completed') {
    return 'Completed';
  }
  if (stage.ctaStatus === 'failed') {
    return 'Retry';
  }
  const progressForDisplay = stage.displayProgress ?? stage.progress;
  if (stage.ctaStatus === 'running' && progressForDisplay !== undefined) {
    return `${stage.buttonText} ${Math.round(progressForDisplay)}%`;
  }
  return stage.buttonText;
};

export const getStageMessages = (stageId: number) => {
  switch (stageId) {
    case 1:
      return ['Checking File...', 'Uploading...'];
    case 2:
      return [
        'Converting speech to text...',
        'Analyzing audio patterns...',
        'Processing voice recognition...',
        'Synchronizing timestamps...',
        'Finalizing transcription...'
      ];
    case 3:
      return [
        'Scanning for key moments...',
        'Analyzing content highlights...',
        'Detecting engaging segments...',
        'Evaluating clip potential...',
        'Selecting best footage...'
      ];
    case 4:
      return [
        'Generating subtitle text...',
        'Synchronizing with audio...',
        'Formatting caption styles...',
        'Optimizing readability...',
        'Finalizing captions...'
      ];
    case 5:
      return [
        'Reducing background noise...',
        'Enhancing voice clarity...',
        'Balancing audio levels...',
        'Applying sound filters...',
        'Optimizing audio quality...'
      ];
    case 6:
      return [
        'Searching relevant footage...',
        'Matching scene context...',
        'Selecting supplementary clips...',
        'Synchronizing with narrative...',
        'Integrating B-roll footage...'
      ];
    default:
      return [];
  }
};

export const getSubheadingText = (stage: PipelineStage, currentMessageIndex: number) => {
  if (stage.ctaStatus === 'running') {
    const messages = getStageMessages(stage.id);
    return messages.length > 0 ? messages[currentMessageIndex] : stage.description;
  }
  if (stage.ctaStatus === 'pro') {
    return 'Upgrade to Pro to unlock this feature';
  }
  return stage.description;
};
