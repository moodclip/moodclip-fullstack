import { memo } from 'react';

import { Button } from '@/components/ui/button';

import {
  getButtonText,
  getCtaBackground,
  getSubheadingText,
} from './StagePanel.utils';
import type { StagePanelProps } from './StagePanel';

interface NonUploadStageProps extends StagePanelProps {
  currentSubheading: number;
  onNavigateToBuilder: () => void;
}

const StagePanelNonUploadComponent = ({
  stage,
  onPrimaryAction,
  onSecondaryAction,
  onLaunchBuilder,
  builderReady,
  currentSubheading,
  onNavigateToBuilder,
}: NonUploadStageProps) => {
  const gradientProgress = stage.displayProgress ?? stage.progress ?? 0;
  const disablePrimary = !onPrimaryAction || stage.ctaStatus === 'running';

  const primaryButtonClasses = 'w-full max-w-sm font-semibold text-xl px-12 py-6 rounded-[2.75rem] text-white border-0 transition-all duration-500 ease-out hover:scale-105 disabled:opacity-60';
  const secondaryButtonClasses = 'w-full max-w-sm font-semibold text-xl px-12 py-6 rounded-[2.75rem] border-2 transition-all duration-500 ease-out hover:scale-105';

  const renderPrimaryButton = () => (
    <Button
      onClick={onPrimaryAction}
      disabled={disablePrimary}
      size="lg"
      className={primaryButtonClasses}
      style={{ background: getCtaBackground(stage.ctaStatus, gradientProgress) }}
    >
      {getButtonText(stage)}
    </Button>
  );

  const renderSecondaryButton = () => {
    if (!stage.secondaryButtonText || !onSecondaryAction) return null;
    return (
      <Button
        onClick={onSecondaryAction}
        variant="outline"
        size="lg"
        className={secondaryButtonClasses}
      >
        {stage.secondaryButtonText}
      </Button>
    );
  };

  const renderBuilderButton = () => {
    if (stage.id !== 3) return null;
    if (builderReady && onLaunchBuilder) {
      return (
        <Button
          onClick={onLaunchBuilder}
          variant="outline"
          size="lg"
          className={secondaryButtonClasses}
        >
          Build clips
        </Button>
      );
    }

    if (stage.ctaStatus === 'completed' || stage.ctaStatus === 'ready') {
      return (
        <Button
          onClick={onNavigateToBuilder}
          variant="outline"
          size="lg"
          className={secondaryButtonClasses}
        >
          Build clips
        </Button>
      );
    }

    return null;
  };

  return (
    <div className="pipeline-focus-card w-[52rem] max-w-[94vw] min-h-[44rem] mx-auto px-16 py-14 transition-smooth animate-slide-fade-in">
      <div className="flex justify-center mb-14">
        <div className="w-56 h-56 flex items-center justify-center gradient-glow rounded-full">
          <img
            src={stage.icon}
            alt={`${stage.title} icon`}
            className="w-48 h-48 object-contain filter drop-shadow-2xl transition-smooth hover:scale-110"
          />
        </div>
      </div>

      <div className="text-center space-y-9">
        <div>
          <h2 className="font-heading text-6xl sm:text-7xl font-semibold mb-5 text-foreground">{stage.title}</h2>
          <p
            className={`text-2xl sm:text-[1.65rem] text-muted-foreground/80 transition-smooth ${stage.ctaStatus === 'running' ? 'animate-pulse' : ''}`}
          >
            {getSubheadingText(stage, currentSubheading)}
          </p>
        </div>

        <div className="pt-6 flex flex-col items-center gap-5">
          {renderPrimaryButton()}
          {renderSecondaryButton()}
          {renderBuilderButton()}

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

export default memo(StagePanelNonUploadComponent);
