export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export type SourceType = 'image' | 'text';

export interface Job {
  id: string;
  status: JobStatus;
  sourceType: SourceType;
  previewUrl?: string;
  glbUrl?: string;
  retopoGlbUrl?: string;
  stlUrl?: string;
  threemfUrl?: string;
  error?: string;
  progressMessage?: string;
  createdAt: number;
}

export interface ImageInputItem {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  file?: File;
}

export interface GenerationInput {
  sourceType: SourceType;
  prompt?: string;
  images?: ImageInputItem[];
}
