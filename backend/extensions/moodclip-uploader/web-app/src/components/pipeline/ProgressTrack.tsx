import { Check, Crown } from 'lucide-react';
import { PipelineStage } from '@/types/pipeline';
import { cn } from '@/lib/utils';

interface ProgressTrackProps {
  stages: PipelineStage[];
  onStageClick: (stageId: number) => void;
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

export const ProgressTrack = ({ stages, onStageClick }: ProgressTrackProps) => {
  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto">
      {/* Progress Track */}
      <div className="flex items-center justify-center w-full max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between w-full max-w-5xl">
          {stages.slice(0, 6).map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              {/* Stage Dot with Label */}
              <div className="flex flex-col items-center min-w-0">
                <button
                  onClick={() => onStageClick(stage.id)}
                  className={cn(
                    "relative w-6 h-6 rounded-full border-[3px] transition-smooth focus:outline-none focus:ring-4 focus:ring-primary/40 hover:scale-110 mb-3",
                    {
                      'stage-dot-completed': stage.status === 'completed',
                      'stage-dot-active pulse-glow': stage.status === 'active',
                      'stage-dot-upcoming': stage.status === 'upcoming'
                    }
                  )}
                  title={stageLabels[index]}
                  aria-label={`Stage ${stage.id}: ${stageLabels[index]}`}
                >
                  {stage.status === 'completed' && (
                    <Check className="w-4 h-4 text-white absolute inset-0 m-auto" strokeWidth={3} />
                  )}
                </button>
                
                {/* Stage Label */}
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span 
                    className={cn(
                      "text-sm md:text-lg font-semibold transition-smooth",
                      {
                        'text-[#24D77E]': stage.status === 'completed',
                        'text-[#A020F0]': stage.status === 'active', 
                        'text-[#A0A0A0]': stage.status === 'upcoming'
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
                      "absolute inset-0 transition-all duration-500 ease-out border-t-2 border-dotted motion-reduce:transition-none",
                      {
                        'border-[#24D77E] w-full': stage.status === 'completed',
                        'border-[#A020F0] animate-[progress-fill_1s_ease-out] motion-reduce:w-full': 
                          stage.status === 'active' && stages[index + 1]?.status !== 'upcoming',
                        'w-0 border-transparent': stage.status === 'upcoming'
                      }
                    )}
                    style={{ borderImage: 'none' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
