import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Typewriter } from '@/components/ui/Typewriter';
import {
  claimPendingUploads,
  fetchProjectStatus,
  markUploadReady,
  requestUploadUrl,
  uploadToSignedUrl,
} from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import { useClaimTokensOnAuth } from '@/hooks/useClaimTokens';
import type { ClipStatus, ProjectStatusResponse } from '@/types/backend';
import type { PipelineData, PipelineStage } from '@/types/pipeline';
import { ProgressTrack } from './ProgressTrack';
import { StagePanel } from './StagePanel';
import type { UploadController } from '@/lib/api';

interface PipelineContainerProps {
  initialData: PipelineData;
}

const POLL_INTERVAL_MS = 2500;
const MAX_MARK_ATTEMPTS = 15;
const MARK_RETRY_BASE_DELAY_MS = 800;
const MARK_RETRY_MAX_DELAY_MS = 5000;

const readErrorStatus = (error: unknown): number | null => {
  if (!error) return null;
  const maybeStatus = (error as { status?: unknown })?.status;
  if (typeof maybeStatus === 'number') return maybeStatus;
  if (error instanceof Error) {
    const match = error.message?.match(/(\d{3})$/);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    buttonText: stage.id === 1 ? 'Upload' : stage.buttonText,
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
    displayProgress: stage.id === 1 ? 0 : stage.displayProgress,
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
  const uploadStarted =
    uploadProgress !== undefined || includesAny(normalizedStage, ['upload', 'initial']);

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

  uploadStage.buttonText = uploadStage.ctaStatus === 'running' ? 'Uploading' : 'Upload';
  uploadStage.displayProgress =
    uploadStage.ctaStatus === 'running'
      ? uploadStage.progress ?? 0
      : uploadStage.ctaStatus === 'completed'
        ? 100
        : 0;

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
  const [activeVideoId, setActiveVideoId] = useState<string | null>(() => readGlobalVideoId());
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rippleActive, setRippleActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<UploadController | null>(null);
  const bootstrapFrameRef = useRef<number | null>(null);
  const bootstrapStartRef = useRef<number | null>(null);
  const hasRealProgressRef = useRef(false);
  const dragDepthRef = useRef(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const mapProgressToDisplay = (percent: number) => {
    const clamped = Math.max(0, Math.min(100, percent));
    return 30 + (clamped / 100) * 70;
  };

  const updateUploadStage = (mutator: (stage: PipelineStage) => PipelineStage) => {
    setPipelineData((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => (stage.id === 1 ? mutator(stage) : stage)),
    }));
  };

  const stopBootstrap = () => {
    if (bootstrapFrameRef.current !== null) {
      cancelAnimationFrame(bootstrapFrameRef.current);
      bootstrapFrameRef.current = null;
    }
    bootstrapStartRef.current = null;
  };

  const startBootstrap = () => {
    stopBootstrap();
    hasRealProgressRef.current = false;
    bootstrapStartRef.current = performance.now();

    const tick = (now: number) => {
      if (hasRealProgressRef.current) return;
      const start = bootstrapStartRef.current ?? now;
      const elapsed = now - start;
      const duration = 600;
      const normalized = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - normalized, 3);
      const progress = Math.min(30, eased * 30);

      updateUploadStage((stage) => {
        if (stage.ctaStatus !== 'running') return stage;
        const nextDisplay = Math.max(stage.displayProgress ?? 0, progress);
        return { ...stage, displayProgress: nextDisplay };
      });

      if (!hasRealProgressRef.current && normalized < 1) {
        bootstrapFrameRef.current = requestAnimationFrame(tick);
      }
    };

    bootstrapFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncVideoId = () => {
      const nextId = readGlobalVideoId();
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
    const handleWindowDragOver = (event: DragEvent) => {
      event.preventDefault();
    };
    const handleWindowDrop = (event: DragEvent) => {
      event.preventDefault();
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  const shouldContinuePolling = (data?: ProjectStatusResponse): boolean => {
    if (!data?.project) return true;
    const normalized = String(data.project.stage || data.project.status || '').toLowerCase();
    const projectTerminal =
      normalized.includes('fail') ||
      normalized.includes('error') ||
      normalized.includes('complete') ||
      normalized.includes('ready');

    if (!projectTerminal) return true;

    const hasActiveClips = (data.clipStatuses ?? []).some((clip) => {
      const state = String(clip.status || '').toLowerCase();
      return state === 'queued' || state === 'rendering' || state === 'processing' || state === 'running';
    });

    return hasActiveClips;
  };

  const shouldPoll = Boolean(activeVideoId);

  const statusQuery = useQuery<ProjectStatusResponse>({
    queryKey: ['project-status', activeVideoId],
    queryFn: ({ signal }) => {
      if (!activeVideoId) throw new Error('Missing video id for status query');
      return fetchProjectStatus(activeVideoId, { signal });
    },
    enabled: shouldPoll,
    refetchInterval: (data) => (shouldContinuePolling(data as ProjectStatusResponse | undefined) ? POLL_INTERVAL_MS : false),
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
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

    if (import.meta.env.DEV) {
      console.debug('[moodclip] status poll', {
        videoId: activeVideoId,
        stage: statusQuery.data.project?.stage ?? statusQuery.data.project?.status ?? null,
        observedStage: result.observedStage,
        unlockedStage: result.unlockedStage,
        fetchedAt: new Date().toISOString(),
      });
    }
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
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetUploadState = () => {
    stopBootstrap();
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
    setIsUploading(false);
    hasRealProgressRef.current = false;
  };

  const setGlobalProjectId = (videoId: string) => {
    if (typeof window === 'undefined') return;
    (window as typeof window & { __mc_project?: string }).__mc_project = videoId;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    params.set('pid', videoId);
    const nextHash = params.toString();
    window.location.hash = nextHash;
  };

  const beginUpload = async (file: File) => {
    if (!file) return;
    if (isUploading) {
      resetUploadState();
    }

    setUploadError(null);
    setManualStageId(1);
    updateUploadStage((stage) => ({
      ...stage,
      ctaStatus: 'running',
      status: 'active',
      buttonText: 'Uploading',
      progress: 0,
      displayProgress: 0,
      secondaryButtonText: undefined,
    }));
    setIsUploading(true);
    startBootstrap();

    try {
      const authed = await isLoggedIn().catch(() => false);
      const uploadInfo = await requestUploadUrl(file, { storeClaimToken: authed });
      setGlobalProjectId(uploadInfo.videoId);
      setActiveVideoId(uploadInfo.videoId);
      const controller = uploadToSignedUrl(uploadInfo.url, file, (percent) => {
        if (!hasRealProgressRef.current && percent > 0) {
          hasRealProgressRef.current = true;
          stopBootstrap();
        }
        updateUploadStage((stage) => {
          if (stage.ctaStatus !== 'running') return stage;
          const realProgress = Math.max(0, Math.min(100, percent));
          const display = mapProgressToDisplay(realProgress);
          return {
            ...stage,
            progress: realProgress,
            displayProgress: Math.max(stage.displayProgress ?? 0, display),
          };
        });
      });

      uploadControllerRef.current = controller;
      await controller.promise;

      if (authed) {
        await claimPendingUploads();
      }
      stopBootstrap();
      updateUploadStage((stage) => ({
        ...stage,
        progress: 100,
        displayProgress: 100,
        buttonText: 'Finalizing',
      }));

      let markSuccess = false;
      let markError: unknown = null;
      for (let attempt = 0; attempt < MAX_MARK_ATTEMPTS && !markSuccess; attempt += 1) {
        const attemptNumber = attempt + 1;
        try {
          await markUploadReady(uploadInfo.videoId, attemptNumber);
          markSuccess = true;
        } catch (error) {
          markError = error;
          const status = readErrorStatus(error);
          const backoff = Math.min(MARK_RETRY_MAX_DELAY_MS, MARK_RETRY_BASE_DELAY_MS * attemptNumber);

          if (status === 409) {
            console.info('[moodclip] Source not visible yet, retrying mark', {
              videoId: uploadInfo.videoId,
              attempt: attemptNumber,
            });
            await delay(backoff);
            continue;
          }

          if (status && status >= 500) {
            console.warn('[moodclip] Mark upload failed, server error – retrying', {
              videoId: uploadInfo.videoId,
              attempt: attemptNumber,
              status,
            });
            await delay(backoff);
            continue;
          }

          break;
        }
      }

      if (!markSuccess) {
        throw markError ?? new Error('mark_failed');
      }

      updateUploadStage((stage) => ({
        ...stage,
        ctaStatus: 'completed',
        status: 'completed',
        buttonText: 'Upload',
        progress: 100,
        displayProgress: 100,
        secondaryButtonText: 'Upload another',
      }));
    } catch (error) {
      console.error('[moodclip] upload failed', error);
      const status = readErrorStatus(error);
      let message = 'Upload failed. Please try again.';
      if (status === 409) {
        message = 'We are still receiving your file. Please try again in a few seconds.';
      } else if (error instanceof Error && error.message) {
        message = error.message;
      }
      setUploadError(message);
      updateUploadStage((stage) => ({
        ...stage,
        ctaStatus: 'failed',
        status: 'active',
        buttonText: 'Upload',
        progress: 0,
        displayProgress: 0,
        secondaryButtonText: 'Try again',
      }));
    } finally {
      resetUploadState();
      resetFileInput();
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void beginUpload(file);
    }
  };

  const openFilePicker = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleSecondaryUpload = () => {
    if (isUploading) return;
    updateUploadStage((stage) => ({
      ...stage,
      ctaStatus: 'ready',
      status: 'active',
      buttonText: 'Upload',
      progress: 0,
      displayProgress: 0,
      secondaryButtonText: undefined,
    }));
    openFilePicker();
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void beginUpload(file);
    }
  };


  useEffect(() => {
    return () => {
      resetUploadState();
    };
  }, []);


  const currentStageData = pipelineData.stages.find((stage) => stage.id === pipelineData.currentStage);
  if (!currentStageData) return null;

  const builderReady = Boolean(
    statusQuery.data?.project?.aiReady ||
      (statusQuery.data?.clipStatuses ?? []).some((clip) => clip.status === 'completed'),
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
      className={`min-h-screen w-full flex flex-col items-center justify-start pt-10 sm:pt-12 pb-14 sm:pb-[4.5rem] px-6 sm:px-12 gap-10 sm:gap-16 relative overflow-hidden dark-gradient-bg bg-ripple ${rippleActive ? 'active' : ''}`}
      data-background-state={getBackgroundState()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-3xl m-4">
          <div className="text-center space-y-2">
            <p className="text-2xl font-semibold">Drop your file to start uploading</p>
            <p className="text-sm text-muted-foreground">We'll handle the rest.</p>
          </div>
        </div>
      )}

      <div className="absolute inset-0 gradient-glow opacity-20" />

      <div className="relative z-10 mb-6 sm:mb-10 w-full">
        <ProgressTrack stages={pipelineData.stages} onStageClick={handleStageClick} autoStageId={autoStageId} />
      </div>

      {pipelineData.currentStage === 1 && (
        <div className="relative z-10 w-full max-w-6xl px-4 -mt-2 sm:-mt-4">
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
            className="max-w-6xl mx-auto"
          />
        </div>
      )}

      <div className="relative z-10 w-full flex flex-col items-center gap-5" key={currentStageData.id}>
        {lastUpdatedAt && (
          <span className="text-sm text-muted-foreground">
            Last updated {lastUpdatedAt.toLocaleTimeString()}
          </span>
        )}
        {uploadError && pipelineData.currentStage === 1 && (
          <span className="text-sm text-destructive">{uploadError}</span>
        )}
        <StagePanel
          stage={currentStageData}
          onPrimaryAction={
            currentStageData.id === 1 ? openFilePicker : handleContinue
          }
          onSecondaryAction={
            currentStageData.id === 1 && currentStageData.ctaStatus !== 'running'
              ? handleSecondaryUpload
              : undefined
          }
          onLaunchBuilder={builderReady ? handleLaunchBuilder : undefined}
          builderReady={builderReady}
        />
      </div>
    </div>
  );
};
