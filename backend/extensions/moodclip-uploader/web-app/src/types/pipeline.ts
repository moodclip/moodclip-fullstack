export interface PipelineStage {
  id: number;
  title: string;
  description: string;
  buttonText: string;
  icon: string;
  status: 'completed' | 'active' | 'upcoming';
  progress?: number; // 0-100 for running status
  displayProgress?: number; // UI-smoothed progress for gradients
  ctaStatus?: 'ready' | 'running' | 'waiting' | 'completed' | 'failed' | 'pro';
  secondaryButtonText?: string;
}

export interface PipelineData {
  stages: PipelineStage[];
  currentStage: number;
}
