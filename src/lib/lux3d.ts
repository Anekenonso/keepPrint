import {
  createLux3dClient,
  Lux3dClient,
  LUX3D_STATUS_SUCCESS,
  LUX3D_STATUS_FAILED,
  LUX3D_STATUS_CANCELED,
  type TaskOutput,
  type Lux3dTaskResult,
  type WaitForLux3dTaskOptions,
} from '@manycore/aholo-sdk-lux3d';
import type { GenerationInput, SourceType } from './types';
import { validateGenerationInput } from './validation';

export interface Lux3dConfig {
  apiKey?: string;
  region?: 'cn' | 'com';
}

export interface GenerationResult {
  taskId: number;
  status: 'succeeded' | 'failed';
  sourceType: SourceType;
  glbUrl?: string;
  stlUrl?: string;
  threemfUrl?: string;
  zipUrl?: string;
  outputs: TaskOutput[];
  error?: string;
}

export function getAholoConfig(overrides?: Lux3dConfig): { apiKey: string; region: 'cn' | 'com' } {
  let envApiKey = '';
  let envRegion: 'cn' | 'com' = 'com';

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    envApiKey =
      (import.meta.env.AHOLO_API_KEY as string) ||
      (import.meta.env.VITE_AHOLO_API_KEY as string) ||
      '';
    if (import.meta.env.VITE_AHOLO_REGION === 'cn') {
      envRegion = 'cn';
    }
  }

  if (!envApiKey && typeof process !== 'undefined' && process.env) {
    envApiKey = process.env.AHOLO_API_KEY || process.env.VITE_AHOLO_API_KEY || '';
    if (process.env.VITE_AHOLO_REGION === 'cn') {
      envRegion = 'cn';
    }
  }

  const apiKey = overrides?.apiKey || envApiKey;
  const region = overrides?.region || envRegion;

  return { apiKey, region };
}

export function createClient(config?: Lux3dConfig): Lux3dClient {
  const { apiKey, region } = getAholoConfig(config);
  return createLux3dClient({
    apiKey,
    region,
  });
}

export function extractModelUrls(outputs: TaskOutput[] | undefined): {
  glbUrl?: string;
  stlUrl?: string;
  threemfUrl?: string;
  zipUrl?: string;
} {
  if (!outputs || !Array.isArray(outputs)) {
    return {};
  }

  let glbUrl: string | undefined;
  let stlUrl: string | undefined;
  let threemfUrl: string | undefined;
  let zipUrl: string | undefined;

  for (const item of outputs) {
    const url = item?.content;
    if (!url || typeof url !== 'string' || url === 'NOT_REQUESTED') {
      continue;
    }

    const lower = url.toLowerCase();
    if (lower.endsWith('.glb') || lower.includes('.glb?')) {
      glbUrl = url;
    } else if (lower.endsWith('.stl') || lower.includes('.stl?')) {
      stlUrl = url;
    } else if (lower.endsWith('.3mf') || lower.includes('.3mf?')) {
      threemfUrl = url;
    } else if (lower.endsWith('.zip') || lower.includes('.zip?')) {
      zipUrl = url;
    }
  }

  // Fallback: If no explicit extension matched GLB, check if standard 2nd slot in G1 has a valid URL
  if (!glbUrl && outputs.length > 1 && outputs[1]?.content?.startsWith('http')) {
    glbUrl = outputs[1].content;
  } else if (
    !glbUrl &&
    outputs[0]?.content?.startsWith('http') &&
    !outputs[0].content.endsWith('.zip')
  ) {
    glbUrl = outputs[0].content;
  }

  return { glbUrl, stlUrl, threemfUrl, zipUrl };
}

export async function createImageTo3dTask(
  params: { img: string } | { imgs: string[] },
  client: Lux3dClient
): Promise<number> {
  try {
    if ('imgs' in params && params.imgs.length > 1) {
      return await client.imgTo3d.create({
        imgs: params.imgs,
        version: 'G1',
      });
    }

    const singleImg = 'img' in params ? params.img : params.imgs[0];
    return await client.imgTo3d.create({
      img: singleImg,
      version: 'G1',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown network error';
    throw new Error(`Failed to start 3D image generation: ${message}`);
  }
}

export async function createTextTo3dTask(
  params: { prompt: string },
  client: Lux3dClient
): Promise<number> {
  try {
    return await client.textTo3d.create({
      prompt: params.prompt,
      version: 'G1',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown network error';
    throw new Error(`Failed to start 3D text generation: ${message}`);
  }
}

export async function pollTask(
  taskId: number,
  client: Lux3dClient,
  options?: WaitForLux3dTaskOptions & { onProgress?: (result: Lux3dTaskResult) => void }
): Promise<Lux3dTaskResult> {
  try {
    const result = await client.tasks.waitFor(taskId, {
      intervalMs: options?.intervalMs ?? 3000,
      timeoutMs: options?.timeoutMs ?? 600000, // 10 min default
      signal: options?.signal,
    });

    if (options?.onProgress) {
      options.onProgress(result);
    }

    if (result.status === LUX3D_STATUS_FAILED) {
      throw new Error(
        '3D generation could not be completed for this heirloom. Please try with a clearer photo or different description.'
      );
    }

    if (result.status === LUX3D_STATUS_CANCELED) {
      throw new Error('Generation task was canceled.');
    }

    if (result.status !== LUX3D_STATUS_SUCCESS) {
      throw new Error(
        `Generation ended with unexpected status (${result.status}). Please try again.`
      );
    }

    return result;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'PollingTimeoutError' || error.message.toLowerCase().includes('timeout')) {
        throw new Error(
          'Generation timed out while waiting for 3D model. Please check your connection or retry.'
        );
      }
      throw error;
    }
    throw new Error('Unexpected error during task polling.');
  }
}

export async function generate3D(
  input: GenerationInput,
  options?: {
    client?: Lux3dClient;
    config?: Lux3dConfig;
    pollOptions?: WaitForLux3dTaskOptions;
    onProgress?: (message: string) => void;
  }
): Promise<GenerationResult> {
  const validation = validateGenerationInput(input);
  if (!validation.success) {
    throw new Error(validation.errors.join(' '));
  }

  const client = options?.client ?? createClient(options?.config);

  let taskId: number;
  if (input.sourceType === 'image') {
    options?.onProgress?.('Uploading heirloom photo to Lux3D...');
    const images = input.images || [];
    const imgUrls = images.map((img) => img.dataUrl || img.name);
    taskId = await createImageTo3dTask(
      imgUrls.length > 1 ? { imgs: imgUrls } : { img: imgUrls[0] },
      client
    );
  } else {
    options?.onProgress?.('Submitting heirloom description to Lux3D...');
    taskId = await createTextTo3dTask({ prompt: input.prompt || '' }, client);
  }

  options?.onProgress?.('Generating 3D heirloom mesh...');
  const taskResult = await pollTask(taskId, client, options?.pollOptions);

  options?.onProgress?.('Finalizing 3D model assets...');
  const urls = extractModelUrls(taskResult.outputs);

  return {
    taskId,
    status: 'succeeded',
    sourceType: input.sourceType,
    glbUrl: urls.glbUrl,
    stlUrl: urls.stlUrl,
    threemfUrl: urls.threemfUrl,
    zipUrl: urls.zipUrl,
    outputs: taskResult.outputs || [],
  };
}
