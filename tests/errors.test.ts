import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@google/model-viewer', () => ({}));

import { App } from '../src/App';
import { UploadForm } from '../src/components/UploadForm';
import { ProgressComponent } from '../src/components/Progress';
import { ViewerComponent } from '../src/components/Viewer';
import { DownloadPanel } from '../src/components/DownloadPanel';

describe('TS-11: Error, Empty, and Loading States (R-08)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('UploadForm Error and Empty Paths', () => {
    it('displays user-facing error message when submitting empty description', () => {
      const form = new UploadForm(container, {
        initialSourceType: 'text',
        onSubmit: vi.fn(),
      });
      form.render();

      const submitBtn = container.querySelector<HTMLButtonElement>('#submit-btn')!;
      submitBtn.click();

      const errorEl = container.querySelector<HTMLElement>('#form-error');
      expect(errorEl?.style.display).toBe('block');
      expect(errorEl?.textContent).toContain('description');
    });

    it('displays user-facing error message when submitting empty photo input', () => {
      const form = new UploadForm(container, {
        initialSourceType: 'image',
        onSubmit: vi.fn(),
      });
      form.render();

      const submitBtn = container.querySelector<HTMLButtonElement>('#submit-btn')!;
      submitBtn.click();

      const errorEl = container.querySelector<HTMLElement>('#form-error');
      expect(errorEl?.style.display).toBe('block');
      expect(errorEl?.textContent).toContain('at least one photo');
    });

    it('displays user-facing error message when file exceeds size limit (B-01)', () => {
      const form = new UploadForm(container, { onSubmit: vi.fn() });
      form.render();

      const oversizedFile = new File(['content'], 'heavy.jpg', { type: 'image/jpeg' });
      Object.defineProperty(oversizedFile, 'size', { value: 20 * 1024 * 1024 }); // 20 MB

      form.handleFiles([oversizedFile]);

      const errorEl = container.querySelector<HTMLElement>('#form-error');
      expect(errorEl?.style.display).toBe('block');
      expect(errorEl?.textContent).toContain('under 10MB');
    });

    it('displays user-facing error message when unsupported file format is uploaded', () => {
      const form = new UploadForm(container, { onSubmit: vi.fn() });
      form.render();

      const pdfFile = new File(['content'], 'heirloom.pdf', { type: 'application/pdf' });
      form.handleFiles([pdfFile]);

      const errorEl = container.querySelector<HTMLElement>('#form-error');
      expect(errorEl?.style.display).toBe('block');
      expect(errorEl?.textContent).toContain('JPEG, PNG, or WebP');
    });
  });

  describe('Progress Component Error and Recovery Paths', () => {
    it('displays user-friendly failure message without raw stack traces (B-03)', () => {
      const progress = new ProgressComponent(container);
      progress.render();

      const userError =
        '3D generation could not be completed for this heirloom. Please try with a clearer photo or different description.';
      progress.showError(userError);

      const errorCard = container.querySelector('.progress-error-card');
      expect(errorCard).not.toBeNull();
      expect(container.querySelector('#progress-message')?.textContent?.trim()).toBe(userError);
      expect(container.textContent).not.toContain('at Error'); // No stack trace
      expect(container.querySelector('#retry-btn')).not.toBeNull();
    });

    it('displays actionable timeout message (B-04)', () => {
      const progress = new ProgressComponent(container);
      progress.render();

      progress.showError(
        'Generation timed out while waiting for 3D model. Please check your connection or retry.'
      );

      expect(container.querySelector('#progress-message')?.textContent).toContain('timed out');
      expect(container.querySelector('#retry-btn')).not.toBeNull();
    });
  });

  describe('Viewer Empty and WebGL Fallback Paths', () => {
    it('renders informative placeholder when model has not been generated', () => {
      const viewer = new ViewerComponent(container, { checkWebGL: () => true });
      viewer.render();

      expect(container.querySelector('.viewer-empty')).not.toBeNull();
      expect(container.textContent).toContain('No 3D model loaded yet');
    });

    it('renders non-crashing fallback notice when WebGL is disabled (B-05)', () => {
      const viewer = new ViewerComponent(container, {
        glbUrl: 'https://cdn.example.com/model.glb',
        checkWebGL: () => false,
      });
      viewer.render();

      expect(container.querySelector('model-viewer')).toBeNull();
      const fallback = container.querySelector('.viewer-fallback');
      expect(fallback).not.toBeNull();
      expect(fallback?.textContent).toContain('WebGL');
      expect(fallback?.textContent).toContain('files are ready for download');
    });
  });

  describe('DownloadPanel Missing Files and Attention States', () => {
    it('shows disabled buttons with unavailable status when export links are absent', () => {
      const panel = new DownloadPanel(container, {
        urls: {},
        readiness: 'attention',
      });
      panel.render();

      const stlBtn = container.querySelector<HTMLButtonElement>('#download-stl-btn')!;
      const threemfBtn = container.querySelector<HTMLButtonElement>('#download-3mf-btn')!;

      expect(stlBtn.disabled).toBe(true);
      expect(stlBtn.textContent).toContain('Unavailable');
      expect(threemfBtn.disabled).toBe(true);
      expect(threemfBtn.textContent).toContain('Unavailable');

      const badge = container.querySelector('.readiness-badge');
      expect(badge?.classList.contains('badge-attention')).toBe(true);
      expect(badge?.textContent).toContain('Needs attention');
    });
  });

  describe('App Error Pipeline Integration', () => {
    it('shows error state when generation fails and allows retry', async () => {
      let attempt = 0;
      const failingGenerator = vi.fn().mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          throw new Error('Network timeout during Lux3D processing');
        }
        return {
          taskId: 1234,
          status: 'succeeded',
          sourceType: 'text',
          glbUrl: 'https://cdn.example.com/model.glb',
          outputs: [],
        };
      });

      const app = new App(container, {
        generator: failingGenerator,
        transitionDelayMs: 0,
        checkWebGL: () => true,
      });
      app.render();

      // Submit prompt
      const tabText = container.querySelector<HTMLButtonElement>('#tab-text')!;
      tabText.click();
      const promptInput = container.querySelector<HTMLTextAreaElement>('#prompt-input')!;
      promptInput.value = 'Ceremonial silver goblet';
      promptInput.dispatchEvent(new Event('input'));
      const submitBtn = container.querySelector<HTMLButtonElement>('#submit-btn')!;
      submitBtn.click();

      // Wait for failure
      await new Promise((r) => setTimeout(r, 20));

      expect(container.querySelector('.progress-error-card')).not.toBeNull();
      expect(container.querySelector('#progress-message')?.textContent).toContain(
        'Network timeout during Lux3D processing'
      );

      // Click retry
      const retryBtn = container.querySelector<HTMLButtonElement>('#retry-btn')!;
      expect(retryBtn).not.toBeNull();
      retryBtn.click();

      await new Promise((r) => setTimeout(r, 20));
      expect(attempt).toBe(2);
      expect(app.getState()).toBe('result');
    });
  });
});
