import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveLastJob,
  loadLastJob,
  clearLastJob,
  hasLastJob,
  KEEPPRINT_LAST_JOB_KEY,
} from '../src/lib/storage';
import { App } from '../src/App';
import type { Job } from '../src/lib/types';

vi.mock('@google/model-viewer', () => ({}));

describe('T-14: Local Persistence of Last Job for Demo Resilience', () => {
  let mockStorage: Storage;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    mockStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      length: 0,
      key: vi.fn(() => null),
    };
  });

  const sampleJob: Job = {
    id: 'task_heirloom_999',
    status: 'succeeded',
    sourceType: 'image',
    glbUrl: 'https://cdn.lux3d.ai/models/heirloom.glb',
    retopoGlbUrl: 'https://cdn.lux3d.ai/models/heirloom_retopo.glb',
    stlUrl: 'https://cdn.lux3d.ai/exports/heirloom.stl',
    threemfUrl: 'https://cdn.lux3d.ai/exports/heirloom.3mf',
    createdAt: 1731650000000,
  };

  describe('saveLastJob', () => {
    it('saves a valid job to storage and returns true', () => {
      const success = saveLastJob(sampleJob, { storage: mockStorage });
      expect(success).toBe(true);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        KEEPPRINT_LAST_JOB_KEY,
        expect.stringContaining('task_heirloom_999')
      );
      expect(store[KEEPPRINT_LAST_JOB_KEY]).toBeDefined();
    });

    it('returns false gracefully when storage throws (e.g. quota exceeded)', () => {
      const failingStorage = {
        ...mockStorage,
        setItem: vi.fn(() => {
          throw new Error('QuotaExceededError');
        }),
      };

      const success = saveLastJob(sampleJob, { storage: failingStorage });
      expect(success).toBe(false);
    });
  });

  describe('loadLastJob', () => {
    it('returns null when storage is empty', () => {
      const loaded = loadLastJob({ storage: mockStorage });
      expect(loaded).toBeNull();
    });

    it('loads and restores the exact saved job', () => {
      saveLastJob(sampleJob, { storage: mockStorage });
      const loaded = loadLastJob({ storage: mockStorage });

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe(sampleJob.id);
      expect(loaded?.stlUrl).toBe(sampleJob.stlUrl);
      expect(loaded?.threemfUrl).toBe(sampleJob.threemfUrl);
      expect(loaded?.glbUrl).toBe(sampleJob.glbUrl);
      expect(loaded?.retopoGlbUrl).toBe(sampleJob.retopoGlbUrl);
      expect(loaded?.createdAt).toBe(sampleJob.createdAt);
    });

    it('returns null and clears storage when corrupted non-JSON data is stored', () => {
      store[KEEPPRINT_LAST_JOB_KEY] = 'INVALID_JSON_CORRUPTED';
      const loaded = loadLastJob({ storage: mockStorage });
      expect(loaded).toBeNull();
    });

    it('returns null and cleans up when stored JSON does not match Job schema', () => {
      store[KEEPPRINT_LAST_JOB_KEY] = JSON.stringify({
        invalid: true,
        randomField: 'no id or status',
      });

      const loaded = loadLastJob({ storage: mockStorage });
      expect(loaded).toBeNull();
      // Verifies corrupted entry is cleared
      expect(mockStorage.removeItem).toHaveBeenCalledWith(KEEPPRINT_LAST_JOB_KEY);
    });
  });

  describe('clearLastJob and hasLastJob', () => {
    it('clears stored job cleanly', () => {
      saveLastJob(sampleJob, { storage: mockStorage });
      expect(hasLastJob({ storage: mockStorage })).toBe(true);

      const cleared = clearLastJob({ storage: mockStorage });
      expect(cleared).toBe(true);
      expect(hasLastJob({ storage: mockStorage })).toBe(false);
      expect(loadLastJob({ storage: mockStorage })).toBeNull();
    });
  });

  describe('App Integration with Local Persistence', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    it('shows restore banner when previous job exists in storage', () => {
      saveLastJob(sampleJob, { storage: mockStorage });

      const app = new App(container, {
        storage: mockStorage,
        checkWebGL: () => true,
      });
      app.render();

      const banner = container.querySelector('#restore-banner');
      expect(banner).not.toBeNull();
      expect(banner?.textContent).toContain('previously generated heirloom model is available');

      const restoreBtn = container.querySelector('#restore-job-btn');
      expect(restoreBtn).not.toBeNull();
    });

    it('restores previous model to result screen when user clicks restore button', () => {
      saveLastJob(sampleJob, { storage: mockStorage });

      const app = new App(container, {
        storage: mockStorage,
        checkWebGL: () => true,
      });
      app.render();

      const restoreBtn = container.querySelector<HTMLButtonElement>('#restore-job-btn');
      restoreBtn?.click();

      expect(app.getState()).toBe('result');
      expect(app.getCurrentJob()?.id).toBe(sampleJob.id);
      expect(container.querySelector('#download-panel')).not.toBeNull();
      expect(container.querySelector('#download-stl-btn')).not.toBeNull();
    });

    it('dismisses banner and removes stored job when user clicks dismiss', () => {
      saveLastJob(sampleJob, { storage: mockStorage });

      const app = new App(container, {
        storage: mockStorage,
        checkWebGL: () => true,
      });
      app.render();

      const dismissBtn = container.querySelector<HTMLButtonElement>('#dismiss-job-btn');
      expect(dismissBtn).not.toBeNull();
      dismissBtn?.click();

      expect(container.querySelector('#restore-banner')).toBeNull();
      expect(hasLastJob({ storage: mockStorage })).toBe(false);
    });

    it('auto-restores immediately when autoRestoreLastJob option is enabled', () => {
      saveLastJob(sampleJob, { storage: mockStorage });

      const app = new App(container, {
        storage: mockStorage,
        autoRestoreLastJob: true,
        checkWebGL: () => true,
      });
      app.render();

      expect(app.getState()).toBe('result');
      expect(app.getCurrentJob()?.id).toBe(sampleJob.id);
    });
  });
});
