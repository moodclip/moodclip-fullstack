import React, { useState, useEffect, useRef } from 'react';
import { PipelineData, PipelineStage } from '@/types/pipeline';
import { ProgressTrack } from './ProgressTrack';
import { StagePanel } from './StagePanel';
import { Typewriter } from '@/components/ui/Typewriter';

interface PipelineContainerProps {
  initialData: PipelineData;
}

export const PipelineContainer = ({ initialData }: PipelineContainerProps) => {
  const [pipelineData, setPipelineData] = useState<PipelineData>(initialData);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rippleActive, setRippleActive] = useState(false);

  // Progress simulation for running stages
  useEffect(() => {
    const currentStageData = pipelineData.stages.find(
      stage => stage.id === pipelineData.currentStage
    );
    
    if (currentStageData?.ctaStatus === 'running') {
      const interval = setInterval(() => {
        setPipelineData(prev => {
          const updatedStages = prev.stages.map(stage => 
            stage.id === prev.currentStage && stage.ctaStatus === 'running'
              ? { ...stage, progress: Math.min((stage.progress || 0) + 1, 100) }
              : stage
          );
          
          const currentStage = updatedStages.find(s => s.id === prev.currentStage);
          
          // Auto-advance when progress reaches 100% (except for final stage)
          if (currentStage?.progress === 100 && prev.currentStage < prev.stages.length) {
            setTimeout(() => {
              const nextStage = prev.currentStage + 1;
              const nextStageData = prev.stages.find(s => s.id === nextStage);
              
              setPipelineData(prevData => ({
                ...prevData,
                currentStage: nextStage,
                stages: updateStageStatus(prevData.stages.map(stage => 
                  stage.id === nextStage && nextStageData?.ctaStatus === 'running'
                    ? { ...stage, progress: 0 } // Reset progress for next running stage
                    : stage
                ), nextStage)
              }));
            }, 500); // Small delay for better UX
          }
          
          return { ...prev, stages: updatedStages };
        });
      }, 50); // Update every 50ms for smoother animation

      return () => clearInterval(interval);
    }
  }, [pipelineData.currentStage]);

  const updateStageStatus = (stages: PipelineStage[], currentStage: number): PipelineStage[] => {
    return stages.map(stage => {
      return {
        ...stage,
        status: 
          stage.id < currentStage ? 'completed' :
          stage.id === currentStage ? 'active' : 'upcoming'
      };
    });
  };

  // Create ripple effect on stage interactions
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
    // Allow navigation to any completed stage, current active stage, or Pro stages
    const currentStage = pipelineData.currentStage;
    const targetStage = pipelineData.stages.find(s => s.id === stageId);
    
    // Trigger ripple effect if event provided
    if (event) {
      triggerRipple(event);
    }
    
    if (stageId <= currentStage || targetStage?.ctaStatus === 'pro') {
      // For Pro stages, only change current stage view, don't update progress status
      if (targetStage?.ctaStatus === 'pro') {
        setPipelineData({
          ...pipelineData,
          currentStage: stageId
          // Keep stages array unchanged to preserve progress status
        });
      } else {
        // For non-Pro stages, update progress status as before
        const updatedStages = updateStageStatus(pipelineData.stages, stageId).map(stage => {
          if (stage.id === stageId) {
            // Set previous completed stages to show "Completed" button
            if (stage.id < currentStage) {
              return { ...stage, ctaStatus: 'completed' as const };
            }
          }
          return stage;
        });
        
        setPipelineData({
          ...pipelineData,
          currentStage: stageId,
          stages: updatedStages
        });
      }
    }
  };

  const handleContinue = () => {
    const currentStage = pipelineData.stages.find(s => s.id === pipelineData.currentStage);
    
    // Handle Pro features - show upgrade prompt (placeholder for now)
    if (currentStage?.ctaStatus === 'pro') {
      console.log('Upgrade to Pro clicked for:', currentStage.title);
      // TODO: Show upgrade modal/redirect to pricing
      return;
    }
    
    // Handle retry for failed uploads
    if (currentStage?.ctaStatus === 'failed') {
      setPipelineData(prev => ({
        ...prev,
        stages: prev.stages.map(stage => 
          stage.id === pipelineData.currentStage
            ? { ...stage, ctaStatus: 'running', progress: 0 }
            : stage
        )
      }));
      return;
    }
    
    // Handle completed state - auto advance
    if (currentStage?.ctaStatus === 'completed') {
      const nextStage = Math.min(pipelineData.currentStage + 1, pipelineData.stages.length);
      const updatedStages = updateStageStatus(pipelineData.stages, nextStage);
      
      setPipelineData({
        ...pipelineData,
        currentStage: nextStage,
        stages: updatedStages
      });
      return;
    }
    
    // Normal continuation
    const nextStage = Math.min(pipelineData.currentStage + 1, pipelineData.stages.length);
    const updatedStages = updateStageStatus(pipelineData.stages, nextStage);
    
    setPipelineData({
      ...pipelineData,
      currentStage: nextStage,
      stages: updatedStages
    });
  };

  const currentStageData = pipelineData.stages.find(
    stage => stage.id === pipelineData.currentStage
  );

  if (!currentStageData) return null;

  // Determine background state for contextual styling
  const getBackgroundState = () => {
    if (currentStageData.ctaStatus === 'pro') return 'pro-preview';
    if (currentStageData.ctaStatus === 'running') return 'processing';
    if (currentStageData.status === 'completed') return 'completed';
    return '';
  };

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen w-full flex flex-col items-center justify-start pt-12 sm:pt-16 pb-16 sm:pb-20 px-4 sm:px-8 gap-16 sm:gap-[6.5rem] relative overflow-hidden dark-gradient-bg bg-ripple ${rippleActive ? 'active' : ''}`}
    >
      {/* Background glow */}
      <div className="absolute inset-0 gradient-glow opacity-20" />
      
      {/* Progress Track */}
      <div className="relative z-10 mb-6 sm:mb-10">
        <ProgressTrack 
          stages={pipelineData.stages} 
          onStageClick={(stageId) => handleStageClick(stageId)}
        />
      </div>

      {/* Typewriter Effect - Only on Upload stage */}
      {pipelineData.currentStage === 1 && (
        <div className="relative z-10 mt-2 sm:mt-4">
          <Typewriter
            baseText="Create Me Short Clips from my "
            texts={[
              'Podcast.',
              'YouTube Video.',
              'Webinar.',
              'Tutorial.',
              'Zoom Recording.',
              'Google Meet Call.',
              'Live Stream.'
            ]}
            typingSpeed={80}
            deletingSpeed={40}
            pauseDuration={1800}
            className="max-w-5xl mx-auto"
          />
        </div>
      )}

      {/* Main Stage Panel */}
      <div className="relative z-10" key={currentStageData.id}>
        <StagePanel 
          stage={currentStageData}
          onContinue={handleContinue}
        />
      </div>
    </div>
  );
};
