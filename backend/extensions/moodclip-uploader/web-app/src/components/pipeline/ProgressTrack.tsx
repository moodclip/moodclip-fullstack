import type { MouseEvent } from 'react';
import { Check, Crown } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PipelineStage } from '@/types/pipeline';

interface ProgressTrackProps {
  stages: PipelineStage[];
  onStageClick: (stageId: number, event?: MouseEvent<HTMLButtonElement>) => void;
  autoStageId?: number;
}

// Stage labels mapping
const stageLabels = [
  'Uploading',
  'Transcribing', 
  'Finding clips',
  'Captions',
  'Audio',
  'B-roll'
];

const isProStage = (index: number) => index >= 3; // Stages 4, 5, 6 are Pro

export const ProgressTrack = ({ stages, onStageClick, autoStageId }: ProgressTrackProps) => {
  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto">
      {/* Progress Track */}
      <div className="flex items-center justify-center w-full max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between w-full max-w-5xl">
          {stages.slice(0, 6).map((stage, index) => {
            const stageNumber = stage.id;
            let effectiveStatus = stage.status;

            if (autoStageId) {
              if (stageNumber < autoStageId && effectiveStatus !== 'completed') {
                effectiveStatus = 'completed';
              } else if (stageNumber === autoStageId && effectiveStatus === 'upcoming') {
                effectiveStatus = 'active';
              }
            }

            const isCurrent = autoStageId === stageNumber && effectiveStatus !== 'completed';

            return (
              <div key={stage.id} className="flex items-center">
                {/* Stage Dot with Label */}
                <div className="flex flex-col items-center min-w-0">
                  <button
                    onClick={(event) => onStageClick(stage.id, event)}
                    className={cn(
                      "relative w-6 h-6 rounded-full border-[3px] transition-smooth focus:outline-none focus:ring-4 focus:ring-primary/40 hover:scale-110 mb-3",
                      {
                        'stage-dot-completed': effectiveStatus === 'completed',
                        'stage-dot-active pulse-glow': effectiveStatus === 'active',
                        'stage-dot-upcoming': effectiveStatus === 'upcoming'
                      }
                    )}
                    title={stageLabels[index]}
                    aria-label={`Stage ${stage.id}: ${stageLabels[index]}`}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {effectiveStatus === 'completed' && (
                      <Check className="w-4 h-4 text-white absolute inset-0 m-auto" strokeWidth={3} />
                    )}
                  </button>

                  {/* Stage Label */}
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span 
                      className={cn(
                        "text-sm md:text-lg font-semibold transition-smooth",
                        {
                          'text-[#24D77E]': effectiveStatus === 'completed',
                          'text-[#A020F0]': effectiveStatus === 'active', 
                          'text-[#A0A0A0]': effectiveStatus === 'upcoming'
                        }
                      )}
                    >
                      {stageLabels[index]}
                    </span>
                    {isProStage(index) && (
                      <Crown className="w-5 h-5 text-[#A020F0]" />
                    )}
                  </div>
                </div>

                {/* Connecting Line - Dotted */}
                {index < 5 && (
                  <div className="relative flex-1 h-0.5 mx-4 md:mx-6 overflow-hidden">
                    {/* Background dotted line */}
                    <div 
                      className="absolute inset-0 border-t-2 border-dotted border-muted"
                      style={{ borderImage: 'none' }}
                    />
                    
                    {/* Animated progress line - dotted */}
                    <div
                      className={cn(
                        'absolute inset-0 transition-all duration-500 ease-out border-t-2 border-dotted motion-reduce:transition-none',
                        {
                          'border-[#24D77E] w-full': effectiveStatus === 'completed',
                          'border-[#A020F0] animate-[progress-fill_1s_ease-out] motion-reduce:w-full': effectiveStatus === 'active',
                          'w-0 border-transparent': effectiveStatus === 'upcoming',
                        },
                      )}
                      style={{ borderImage: 'none' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
