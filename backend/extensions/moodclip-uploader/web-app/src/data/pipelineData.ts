import { PipelineData } from '@/types/pipeline';

// Import all stage icons
import uploadIcon from '@/assets/upload-icon.png';
import denoiseIcon from '@/assets/denoise-icon.png';
import analyzeIcon from '@/assets/analyze-icon.png';
import enhanceIcon from '@/assets/enhance-icon.png';
import masterIcon from '@/assets/master-icon.png';
import exportIcon from '@/assets/export-icon.png';

export const initialPipelineData: PipelineData = {
  currentStage: 1,
  stages: [
    {
      id: 1,
      title: "Upload",
      description: "Select your audio file to begin processing",
      buttonText: "Uploading",
      icon: uploadIcon,
      status: 'active',
      ctaStatus: 'ready',
      progress: 0
    },
    {
      id: 2,
      title: "Transcribe",
      description: "Convert speech to text",
      buttonText: "Transcribing",
      icon: denoiseIcon,
      status: 'upcoming',
      ctaStatus: 'waiting',
      progress: 0
    },
    {
      id: 3,
      title: "Find Clips",
      description: "Identify key video segments",
      buttonText: "Finding Clips",
      icon: analyzeIcon,
      status: 'upcoming',
      ctaStatus: 'waiting',
      progress: 0
    },
    {
      id: 4,
      title: "Captions (Pro)",
      description: "Automated subtitles",
      buttonText: "Try captions",
      icon: enhanceIcon,
      status: 'upcoming',
      ctaStatus: 'pro'
    },
    {
      id: 5,
      title: "Enhance audio (Pro)",
      description: "Noise reduction & clarity",
      buttonText: "Enhance audio",
      icon: masterIcon,
      status: 'upcoming',
      ctaStatus: 'pro'
    },
    {
      id: 6,
      title: "Add B-roll (Pro)",
      description: "Visual enhancement",
      buttonText: "Add B-roll",
      icon: exportIcon,
      status: 'upcoming',
      ctaStatus: 'pro'
    },
    {
      id: 7,
      title: "Export",
      description: "Download your processed video file",
      buttonText: "Download Clips",
      icon: exportIcon,
      status: 'upcoming',
      ctaStatus: 'ready'
    }
  ]
};
