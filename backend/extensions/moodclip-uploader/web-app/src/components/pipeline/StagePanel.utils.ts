import type { PipelineStage } from '@/types/pipeline';

const CTA_PRIMARY_START = 'hsl(323 100% 63%)';
const CTA_PRIMARY_END = 'hsl(282 69% 60%)';
const CTA_PRIMARY_TRACK_START = 'hsl(223 30% 18%)';
const CTA_PRIMARY_TRACK_END = 'hsl(224 28% 12%)';
const CTA_SUCCESS_START = 'hsl(138 73% 58%)';
const CTA_SUCCESS_END = 'hsl(138 73% 48%)';
const CTA_FAILURE_START = 'hsl(0 84% 60%)';
const CTA_FAILURE_END = 'hsl(15 85% 65%)';

const clampProgress = (value: number) => {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

export const getCtaBackground = (status: string = 'waiting', progress: number = 0) => {
  const clampedProgress = clampProgress(progress);

  switch (status) {
    case 'ready':
      return `linear-gradient(135deg, ${CTA_PRIMARY_START}, ${CTA_PRIMARY_END})`;
    case 'completed':
      return `linear-gradient(135deg, ${CTA_SUCCESS_START}, ${CTA_SUCCESS_END})`;
    case 'failed':
      return `linear-gradient(135deg, ${CTA_FAILURE_START}, ${CTA_FAILURE_END})`;
    case 'running':
      return `linear-gradient(90deg,
        ${CTA_PRIMARY_START} 0%,
        ${CTA_PRIMARY_END} ${clampedProgress}%,
        ${CTA_PRIMARY_TRACK_START} ${clampedProgress}%,
        ${CTA_PRIMARY_TRACK_END} 100%)`;
    case 'pro':
      return `linear-gradient(135deg, ${CTA_PRIMARY_END}, ${CTA_PRIMARY_START})`;
    case 'waiting':
    default:
      return `linear-gradient(135deg, ${CTA_PRIMARY_TRACK_START}, ${CTA_PRIMARY_TRACK_END})`;
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
