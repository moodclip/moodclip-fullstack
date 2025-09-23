import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Typewriter } from '@/components/ui/Typewriter';
import { fetchProjectStatus } from '@/lib/api';
import { useClaimTokensOnAuth } from '@/hooks/useClaimTokens';
import { readGlobalProjectId } from '@/lib/project-id';
import type { ClipStatus, ProjectStatusResponse } from '@/types/backend';
import type { PipelineData, PipelineStage } from '@/types/pipeline';
import { ProgressTrack } from './ProgressTrack';
import { StagePanel } from './StagePanel';

interface PipelineContainerProps {
  initialData: PipelineData;
}

const POLL_INTERVAL_MS = 2500;

const sanitizeProgress = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  const scaled = numeric <= 1 ? numeric * 100 : numeric;
  return Math.max(0, Math.min(100, Math.round(scaled)));
};

const computeClipProgress = (clips?: ClipStatus[]): number | undefined => {
  if (!clips || clips.length === 0) return undefined;
  const total = clips.length;
  if (total === 0) return undefined;
  const completed = clips.filter((clip) => clip.status === 'completed').length;
  const ratio = (completed / total) * 100;
  return Math.max(0, Math.min(100, Math.round(ratio)));
};

const includesAny = (value: string, tokens: string[]): boolean => {
  if (!value) return false;
  return tokens.some((token) => value.includes(token));
};

const readGlobalVideoId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const w = window as typeof window & { __mc_project?: unknown };
    if (typeof w.__mc_project === 'string' && w.__mc_project.trim()) {
      return w.__mc_project.trim();
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hashId = hash.get('pid');
    if (hashId && hashId.trim()) return hashId.trim();
  } catch (error) {
    console.debug('[moodclip] failed to read global video id', error);
  }
  return null;
};

const createBasePipeline = (blueprints: PipelineStage[]): PipelineData => ({
  currentStage: 1,
  stages: blueprints.map((stage) => ({
    ...stage,
    status: stage.id === 1 ? 'active' : 'upcoming',
    ctaStatus:
      stage.ctaStatus === 'pro'
        ? 'pro'
        : stage.id === 1
          ? 'ready'
          : stage.id === 7 && stage.ctaStatus === 'ready'
            ? 'ready'
            : 'waiting',
    progress: stage.id === 1 ? 0 : undefined,
  })),
});

const canShowManualStage = (
  stageId: number | null,
  unlockedStage: number,
  stages: PipelineStage[],
): number | null => {
  if (!stageId) return null;
  const target = stages.find((stage) => stage.id === stageId);
  if (!target) return null;
  if (target.ctaStatus === 'pro') return stageId;
  if (stageId <= unlockedStage) return stageId;
  if (stageId > 3) return stageId;
  return null;
};

interface BuildContext {
  blueprints: PipelineStage[];
  status?: ProjectStatusResponse;
  maxUnlockedStage: number;
  activeVideoId: string | null;
}

interface BuildResult {
  pipeline: PipelineData;
  unlockedStage: number;
  observedStage: number;
}

const buildPipelineFromStatus = ({
  blueprints,
  status,
  maxUnlockedStage,
  activeVideoId,
}: BuildContext): BuildResult => {
  const base = createBasePipeline(blueprints);
  if (!status || !status.project) {
    return {
      pipeline: {
        ...base,
        currentStage: Math.max(1, Math.min(maxUnlockedStage, 3)),
      },
      unlockedStage: maxUnlockedStage,
      observedStage: 1,
    };
  }

  const project = status.project;
  const clipStatuses = status.clipStatuses ?? [];
  const normalizedStage = String(project.stage || project.status || '').toLowerCase();
  const aiReady = Boolean(project.aiReady);
  const uploadProgress = sanitizeProgress(project.progress);
  const clipProgress = computeClipProgress(clipStatuses);
  const isFailure = includesAny(normalizedStage, ['fail', 'error']);

  let observedStage = 1;
  const isTranscribing = includesAny(normalizedStage, ['transcrib']);
  const isClipStage = includesAny(normalizedStage, ['find', 'clip', 'ai', 'render']);
  const isCompletedStage = includesAny(normalizedStage, ['complete', 'finished', 'ready']);

  if (aiReady || isCompletedStage || (isClipStage && maxUnlockedStage >= 2) || (clipProgress !== undefined && clipProgress > 0)) {
    observedStage = 3;
  } else if (isTranscribing) {
    observedStage = 2;
  }

  let effectiveStage = Math.max(observedStage, maxUnlockedStage);
  effectiveStage = Math.min(effectiveStage, 3);

  const stages = base.stages.map((stage) => ({ ...stage }));

  const uploadStage = stages.find((stage) => stage.id === 1)!;
  const uploadStarted = Boolean(activeVideoId) || uploadProgress !== undefined || includesAny(normalizedStage, ['upload', 'initial']);

  if (isFailure) {
    uploadStage.status = 'completed';
    uploadStage.ctaStatus = 'failed';
    uploadStage.progress = uploadProgress ?? 100;
    effectiveStage = Math.max(1, effectiveStage);
  } else if (effectiveStage > 1) {
    uploadStage.status = 'completed';
    uploadStage.ctaStatus = 'completed';
    uploadStage.progress = 100;
  } else {
    uploadStage.status = 'active';
    uploadStage.ctaStatus = uploadStarted ? 'running' : 'ready';
    uploadStage.progress = uploadStarted ? uploadProgress ?? 0 : undefined;
  }

  const transcribeStage = stages.find((stage) => stage.id === 2)!;
  if (effectiveStage > 1) {
    transcribeStage.status = effectiveStage > 2 ? 'completed' : 'active';
    transcribeStage.ctaStatus = effectiveStage > 2 ? 'completed' : 'running';
    transcribeStage.progress = effectiveStage > 2 ? 100 : uploadProgress;
  } else {
    transcribeStage.status = 'upcoming';
    transcribeStage.ctaStatus = 'waiting';
    transcribeStage.progress = undefined;
  }

  const clipsStage = stages.find((stage) => stage.id === 3)!;
  if (effectiveStage >= 3) {
    const clipStageDone = aiReady || isCompletedStage || (clipProgress !== undefined && clipProgress >= 100);
    clipsStage.status = clipStageDone ? 'completed' : 'active';
    clipsStage.ctaStatus = clipStageDone ? 'completed' : 'running';
    clipsStage.progress = clipStageDone ? 100 : clipProgress;
    effectiveStage = 3;
  } else {
    clipsStage.status = 'upcoming';
    clipsStage.ctaStatus = 'waiting';
    clipsStage.progress = effectiveStage === 2 ? clipProgress : undefined;
  }

  const pipeline: PipelineData = {
    currentStage: effectiveStage,
    stages,
  };

  return {
    pipeline,
    unlockedStage: Math.max(maxUnlockedStage, effectiveStage),
    observedStage,
  };
};

export const PipelineContainer = ({ initialData }: PipelineContainerProps) => {
  useClaimTokensOnAuth();

  const navigate = useNavigate();
  const stageBlueprints = useMemo(
    () => initialData.stages.map((stage) => ({ ...stage })),
    [initialData.stages],
  );

  const [pipelineData, setPipelineData] = useState<PipelineData>(() => createBasePipeline(stageBlueprints));
  const [manualStageId, setManualStageId] = useState<number | null>(null);
  const [maxUnlockedStage, setMaxUnlockedStage] = useState<number>(1);
  const [autoStageId, setAutoStageId] = useState<number>(1);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(() => readGlobalProjectId());
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rippleActive, setRippleActive] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncVideoId = () => {
      const nextId = readGlobalProjectId();
      setActiveVideoId((prev) => (prev === nextId ? prev : nextId));
    };

    syncVideoId();
    window.addEventListener('hashchange', syncVideoId);
    const interval = window.setInterval(syncVideoId, 2000);

    return () => {
      window.removeEventListener('hashchange', syncVideoId);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setPipelineData(createBasePipeline(stageBlueprints));
    setManualStageId(null);
    setAutoStageId(1);
    setMaxUnlockedStage(1);
    setLastUpdatedAt(null);
  }, [activeVideoId, stageBlueprints]);

  const shouldPoll = Boolean(activeVideoId);

  const statusQuery = useQuery<ProjectStatusResponse>({
    queryKey: ['project-status', activeVideoId],
    queryFn: ({ signal }) => {
      if (!activeVideoId) throw new Error('Missing video id for status query');
      return fetchProjectStatus(activeVideoId, { signal });
    },
    enabled: shouldPoll,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!statusQuery.data || !activeVideoId) return;

    const result = buildPipelineFromStatus({
      blueprints: stageBlueprints,
      status: statusQuery.data,
      maxUnlockedStage,
      activeVideoId,
    });

    const allowedManualStage = canShowManualStage(manualStageId, result.unlockedStage, result.pipeline.stages);
    const nextPipeline: PipelineData = {
      ...result.pipeline,
      currentStage: allowedManualStage ?? result.pipeline.currentStage,
    };

    setPipelineData(nextPipeline);
    setAutoStageId(result.pipeline.currentStage);
    if (result.unlockedStage !== maxUnlockedStage) {
      setMaxUnlockedStage(result.unlockedStage);
    }
    if (allowedManualStage !== manualStageId) {
      setManualStageId(allowedManualStage);
    }

    setLastUpdatedAt(new Date());

    console.debug('[moodclip] status poll', {
      videoId: activeVideoId,
      stage: statusQuery.data.project?.stage ?? statusQuery.data.project?.status ?? null,
      observedStage: result.observedStage,
      unlockedStage: result.unlockedStage,
      fetchedAt: new Date().toISOString(),
    });
  }, [statusQuery.data, activeVideoId, stageBlueprints, manualStageId, maxUnlockedStage]);

  const triggerRipple = (event: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    containerRef.current.style.setProperty('--ripple-x', `${x}%`);
    containerRef.current.style.setProperty('--ripple-y', `${y}%`);

    setRippleActive(true);
    setTimeout(() => setRippleActive(false), 800);
  };

  const handleStageClick = (stageId: number, event?: React.MouseEvent) => {
    if (event) triggerRipple(event);

    const targetStage = pipelineData.stages.find((stage) => stage.id === stageId);
    if (!targetStage) return;

    const allowed =
      stageId <= maxUnlockedStage ||
      targetStage.ctaStatus === 'pro' ||
      stageId === pipelineData.currentStage ||
      stageId > 3;

    if (!allowed) return;

    setManualStageId(stageId);
    setPipelineData((prev) => ({ ...prev, currentStage: stageId }));
  };

  const handleContinue = () => {
    const currentStage = pipelineData.stages.find((stage) => stage.id === pipelineData.currentStage);
    if (!currentStage) return;

    if (currentStage.ctaStatus === 'pro') {
      console.log('Upgrade to Pro clicked for:', currentStage.title);
      return;
    }

    if (currentStage.ctaStatus === 'failed') {
      setPipelineData((prev) => ({
        ...prev,
        stages: prev.stages.map((stage) =>
          stage.id === pipelineData.currentStage
            ? { ...stage, ctaStatus: 'running', progress: 0 }
            : stage,
        ),
      }));
      return;
    }

    const nextStage = Math.min(pipelineData.currentStage + 1, pipelineData.stages.length);
    setManualStageId(nextStage);
    setPipelineData((prev) => ({ ...prev, currentStage: nextStage }));
  };

  const currentStageData = pipelineData.stages.find((stage) => stage.id === pipelineData.currentStage);
  if (!currentStageData) return null;

  const builderReady = Boolean(
    statusQuery.data?.project?.aiReady ||
      (statusQuery.data?.clipStatuses ?? []).some((clip) =>
        clip.status === 'completed' || Boolean(clip.url),
      ),
  );

  const handleLaunchBuilder = () => {
    if (!activeVideoId) return;
    navigate(`/build-clip?videoId=${encodeURIComponent(activeVideoId)}`);
  };

  const getBackgroundState = () => {
    if (currentStageData.ctaStatus === 'pro') return 'pro-preview';
    if (currentStageData.ctaStatus === 'running') return 'processing';
    if (currentStageData.status === 'completed') return 'completed';
    return '';
  };

  return (
    <div
      ref={containerRef}
      className={`min-h-screen w-full flex flex-col items-center justify-start pt-12 sm:pt-16 pb-16 sm:pb-20 px-4 sm:px-8 gap-12 sm:gap-[5.5rem] relative overflow-hidden dark-gradient-bg bg-ripple ${rippleActive ? 'active' : ''}`}
      data-background-state={getBackgroundState()}
    >
      <div className="absolute inset-0 gradient-glow opacity-20" />

      <div className="relative z-10 mb-6 sm:mb-10 w-full">
        <ProgressTrack stages={pipelineData.stages} onStageClick={handleStageClick} autoStageId={autoStageId} />
      </div>

      {pipelineData.currentStage === 1 && (
        <div className="relative z-10">
          <Typewriter
            baseText="Create Me Short Clips from my "
            texts={[
              'Podcast.',
              'YouTube Video.',
              'Webinar.',
              'Tutorial.',
              'Zoom Recording.',
              'Google Meet Call.',
              'Live Stream.',
            ]}
            typingSpeed={80}
            deletingSpeed={40}
            pauseDuration={1800}
            className="max-w-5xl mx-auto"
          />
        </div>
      )}

      <div className="relative z-10 w-full flex flex-col items-center gap-4" key={currentStageData.id}>
        {lastUpdatedAt && (
          <span className="text-sm text-muted-foreground">
            Last updated {lastUpdatedAt.toLocaleTimeString()}
          </span>
        )}
        <StagePanel
          stage={currentStageData}
          onPrimaryAction={handleContinue}
          onLaunchBuilder={builderReady ? handleLaunchBuilder : undefined}
          builderReady={builderReady}
        />
      </div>
    </div>
  );
};
