export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export type SourceType = 'image' | 'text';

export type QualityMode = 'turbo' | 'ultra';

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
  qualityMode?: QualityMode;
}

export type PrintReadiness = 'good' | 'attention';

export interface BoundingBoxMm {
  width: number;
  depth: number;
  height: number;
}

export interface ModelPrintMetadata {
  hasStl: boolean;
  hasThreeMf: boolean;
  hasGlb?: boolean;
  fileSizeBytes?: number;
  faceCount?: number;
  dimensionsMm?: BoundingBoxMm;
}

export interface PrintReadinessCheckItem {
  id: string;
  name: string;
  passed: boolean;
  status: 'pass' | 'warning' | 'fail';
  message: string;
}

export interface PrintReadinessReport {
  readiness: PrintReadiness;
  score: number;
  checks: PrintReadinessCheckItem[];
  notes: string[];
  recommendation: string;
}
