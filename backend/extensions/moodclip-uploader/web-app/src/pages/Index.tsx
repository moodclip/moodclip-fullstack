import { PipelineContainer } from '@/components/pipeline/PipelineContainer';
import { initialPipelineData } from '@/data/pipelineData';

const Index = () => {
  return <PipelineContainer initialData={initialPipelineData} />;
};

export default Index;
