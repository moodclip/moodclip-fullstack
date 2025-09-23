import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRive } from '@rive-app/react-canvas';

import { Button } from '@/components/ui/button';
import uploaderAnimation from '@/assets/uploader.riv';
import type { PipelineStage } from '@/types/pipeline';
import {
  getButtonText,
  getCtaBackground,
  getStageMessages,
  getSubheadingText,
} from './StagePanel.utils';

const NonUploadStage = lazy(() => import('./StagePanel.NonUpload'));

const preloadAsset = (id: string, href: string, as: string, type?: string) => {
  if (typeof document === 'undefined') return;
  if (document.head.querySelector(`link[data-preload-id="${id}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.href = href;
  link.setAttribute('data-preload-id', id);
  link.crossOrigin = 'anonymous';
  if (type) link.type = type;
  document.head.appendChild(link);
};

if (typeof window !== 'undefined') {
  preloadAsset('uploader-riv', uploaderAnimation, 'fetch', 'application/octet-stream');
  const idle = (window as typeof window & { requestIdleCallback?: (cb: IdleRequestCallback) => number }).requestIdleCallback;
  const warmNonUpload = () => {
    void import('./StagePanel.NonUpload');
  };
  if (typeof idle === 'function') {
    idle(() => warmNonUpload());
  } else {
    window.setTimeout(warmNonUpload, 1200);
  }
}

export interface StagePanelProps {
  stage: PipelineStage;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onLaunchBuilder?: () => void;
  builderReady?: boolean;
}

const NonUploadStageFallback = () => (
  <div
    className="pipeline-focus-card w-[52rem] max-w-[94vw] min-h-[44rem] mx-auto px-16 py-14 animate-pulse"
    aria-hidden="true"
  >
    <div className="flex justify-center mb-14">
      <div className="w-56 h-56 rounded-full bg-muted/20" />
    </div>
    <div className="space-y-6 text-center">
      <div className="h-12 bg-muted/20 rounded-full mx-auto w-3/4" />
      <div className="h-6 bg-muted/10 rounded-full mx-auto w-2/3" />
      <div className="pt-6 flex flex-col items-center gap-6">
        <div className="h-14 bg-muted/10 rounded-full w-60" />
        <div className="h-12 bg-muted/10 rounded-full w-52" />
      </div>
    </div>
  </div>
);

export const StagePanel = ({
  stage,
  onPrimaryAction,
  onSecondaryAction,
  onLaunchBuilder,
  builderReady,
}: StagePanelProps) => {
  const navigate = useNavigate();
  const [currentSubheading, setCurrentSubheading] = useState(0);
  const stageMessages = getStageMessages(stage.id);

  const { RiveComponent } = useRive({
    src: uploaderAnimation,
    autoplay: true,
  });

  useEffect(() => {
    if (stage.ctaStatus === 'running' && stageMessages.length > 0) {
      const interval = window.setInterval(() => {
        setCurrentSubheading((prev) => (prev + 1) % stageMessages.length);
      }, 2000);
      return () => window.clearInterval(interval);
    }
    setCurrentSubheading(0);
  }, [stage.ctaStatus, stageMessages.length]);

  const isUploadStage = stage.id === 1;
  const gradientProgress = stage.displayProgress ?? stage.progress ?? 0;
  const disablePrimary = !onPrimaryAction || stage.ctaStatus === 'running';

  const uploadPrimaryClasses = 'max-w-lg font-semibold text-2xl px-20 py-8 rounded-[3.75rem]';
  const pipelinePrimaryClasses = 'max-w-sm font-semibold text-xl px-12 py-6 rounded-[2.75rem]';
  const primaryButtonClasses = `w-full ${isUploadStage ? uploadPrimaryClasses : pipelinePrimaryClasses} text-white border-0 transition-all duration-500 ease-out hover:scale-105 disabled:opacity-60`;

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
    const uploadSecondaryClasses = 'max-w-lg font-semibold text-xl px-20 py-6 rounded-[3.75rem]';
    const pipelineSecondaryClasses = 'max-w-sm font-semibold text-xl px-12 py-6 rounded-[2.75rem]';
    return (
      <Button
        onClick={onSecondaryAction}
        variant="outline"
        size="lg"
        className={`w-full ${isUploadStage ? uploadSecondaryClasses : pipelineSecondaryClasses} border-2 transition-all duration-500 ease-out hover:scale-105`}
      >
        {stage.secondaryButtonText}
      </Button>
    );
  };

  if (isUploadStage) {
    return (
      <div className="flex flex-col items-center text-center gap-3 sm:gap-5 animate-slide-fade-in">
        <div className="w-[68rem] max-w-[98vw] h-[38rem] sm:h-[42rem] flex items-center justify-center">
          <RiveComponent className="w-full h-full" />
        </div>

        <div className="flex flex-col items-center gap-3">
          {renderPrimaryButton()}
          {renderSecondaryButton()}
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<NonUploadStageFallback />}>
      <NonUploadStage
        stage={stage}
        currentSubheading={currentSubheading}
        onPrimaryAction={onPrimaryAction}
        onSecondaryAction={onSecondaryAction}
        onLaunchBuilder={onLaunchBuilder}
        builderReady={builderReady}
        onNavigateToBuilder={() => navigate('/build-clip')}
      />
    </Suspense>
  );
};
