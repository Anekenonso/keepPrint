import { z } from 'zod';
import type { Job } from './types';

export const KEEPPRINT_LAST_JOB_KEY = 'keepprint_last_job_v1';

export const jobStorageSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['pending', 'running', 'succeeded', 'failed']),
  sourceType: z.enum(['image', 'text']),
  previewUrl: z.string().optional(),
  glbUrl: z.string().optional(),
  retopoGlbUrl: z.string().optional(),
  stlUrl: z.string().optional(),
  threemfUrl: z.string().optional(),
  error: z.string().optional(),
  progressMessage: z.string().optional(),
  createdAt: z.number().int().positive(),
});

export interface StorageOptions {
  storage?: Storage;
  storageKey?: string;
}

function getStorage(customStorage?: Storage): Storage | null {
  if (customStorage) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
  return null;
}

export function saveLastJob(job: Job, options?: StorageOptions): boolean {
  const store = getStorage(options?.storage);
  if (!store) return false;

  const key = options?.storageKey || KEEPPRINT_LAST_JOB_KEY;
  try {
    const serialized = JSON.stringify(job);
    store.setItem(key, serialized);
    return true;
  } catch (err) {
    console.warn('[keepprint/storage] Failed to save last job:', err);
    return false;
  }
}

export function loadLastJob(options?: StorageOptions): Job | null {
  const store = getStorage(options?.storage);
  if (!store) return null;

  const key = options?.storageKey || KEEPPRINT_LAST_JOB_KEY;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const result = jobStorageSchema.safeParse(parsed);
    if (result.success) {
      return result.data as Job;
    } else {
      console.warn('[keepprint/storage] Invalid stored job schema, clearing:', result.error);
      store.removeItem(key);
      return null;
    }
  } catch (err) {
    console.warn('[keepprint/storage] Failed to load stored job:', err);
    return null;
  }
}

export function clearLastJob(options?: StorageOptions): boolean {
  const store = getStorage(options?.storage);
  if (!store) return false;

  const key = options?.storageKey || KEEPPRINT_LAST_JOB_KEY;
  try {
    store.removeItem(key);
    return true;
  } catch (err) {
    console.warn('[keepprint/storage] Failed to clear stored job:', err);
    return false;
  }
}

export function hasLastJob(options?: StorageOptions): boolean {
  return loadLastJob(options) !== null;
}
