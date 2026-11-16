import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@google/model-viewer', () => ({}));

import { PRELOADED_EXAMPLES, getExampleById } from '../src/lib/examples';
import { JudgeExamples } from '../src/components/JudgeExamples';
import { App } from '../src/App';

describe('TS-11: Preloaded Examples for Judge & Demo Testing', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('Preloaded Examples Data Integrity', () => {
    it('contains exactly 2 curated heirloom examples', () => {
      expect(PRELOADED_EXAMPLES).toHaveLength(2);
    });

    it('has complete specifications and valid 3D assets for both examples', () => {
      for (const ex of PRELOADED_EXAMPLES) {
        expect(ex.id).toBeTruthy();
        expect(ex.title).toBeTruthy();
        expect(ex.origin).toBeTruthy();
        expect(ex.badge).toBeTruthy();
        expect(ex.summary).toBeTruthy();
        expect(ex.prompt).toBeTruthy();
        expect(ex.thumbnailUrl).toMatch(/\.(svg|png|webp)$/);
        expect(ex.imageInputs.length).toBeGreaterThan(0);
        expect(ex.result.status).toBe('succeeded');
        expect(ex.result.glbUrl).toContain('qhsmodel.kujiale.com');
        expect(ex.result.stlUrl).toContain('.stl');
        expect(ex.result.threemfUrl).toContain('.3mf');
        expect(ex.meta.aholoTaskId).toBeGreaterThan(0);
      }
    });

    it('retrieves an example by id with getExampleById', () => {
      const ashanti = getExampleById('ashanti-stool');
      expect(ashanti).toBeDefined();
      expect(ashanti?.title).toBe('Ashanti Carved Wooden Stool');

      const compass = getExampleById('brass-compass');
      expect(compass).toBeDefined();
      expect(compass?.title).toBe("Grandfather's Brass Maritime Compass");

      expect(getExampleById('unknown-item')).toBeUndefined();
    });
  });

  describe('JudgeExamples Component', () => {
    it('renders both example cards with title, origin, and action buttons', () => {
      const onSelectPreview = vi.fn();
      const onLoadInput = vi.fn();

      const component = new JudgeExamples(container, {
        onSelectPreview,
        onLoadInput,
      });
      component.render();

      const cards = container.querySelectorAll('.example-card');
      expect(cards).toHaveLength(2);

      expect(container.textContent).toContain('Ashanti Carved Wooden Stool');
      expect(container.textContent).toContain("Grandfather's Brass Maritime Compass");
      expect(container.textContent).toContain('Instant 3D Preview (No Wait)');
    });

    it('triggers onSelectPreview when clicking Instant 3D Preview', () => {
      const onSelectPreview = vi.fn();
      const onLoadInput = vi.fn();

      const component = new JudgeExamples(container, {
        onSelectPreview,
        onLoadInput,
      });
      component.render();

      const previewBtn = container.querySelector<HTMLButtonElement>(
        'button[data-action="preview"][data-id="ashanti-stool"]'
      );
      expect(previewBtn).not.toBeNull();
      previewBtn?.click();

      expect(onSelectPreview).toHaveBeenCalledTimes(1);
      expect(onSelectPreview.mock.calls[0][0].id).toBe('ashanti-stool');
    });

    it('triggers onLoadInput with image mode when clicking Load Photo', () => {
      const onSelectPreview = vi.fn();
      const onLoadInput = vi.fn();

      const component = new JudgeExamples(container, {
        onSelectPreview,
        onLoadInput,
      });
      component.render();

      const loadPhotoBtn = container.querySelector<HTMLButtonElement>(
        'button[data-action="load-image"][data-id="brass-compass"]'
      );
      expect(loadPhotoBtn).not.toBeNull();
      loadPhotoBtn?.click();

      expect(onLoadInput).toHaveBeenCalledTimes(1);
      expect(onLoadInput.mock.calls[0][0].id).toBe('brass-compass');
      expect(onLoadInput.mock.calls[0][1]).toBe('image');
    });

    it('triggers onLoadInput with text mode when clicking Load Prompt', () => {
      const onSelectPreview = vi.fn();
      const onLoadInput = vi.fn();

      const component = new JudgeExamples(container, {
        onSelectPreview,
        onLoadInput,
      });
      component.render();

      const loadPromptBtn = container.querySelector<HTMLButtonElement>(
        'button[data-action="load-text"][data-id="ashanti-stool"]'
      );
      expect(loadPromptBtn).not.toBeNull();
      loadPromptBtn?.click();

      expect(onLoadInput).toHaveBeenCalledTimes(1);
      expect(onLoadInput.mock.calls[0][0].id).toBe('ashanti-stool');
      expect(onLoadInput.mock.calls[0][1]).toBe('text');
    });
  });

  describe('End-to-End Judge Flow in App', () => {
    it('allows judges to instantly preview Ashanti stool and download STL/3MF without waiting', () => {
      const app = new App(container, {
        checkWebGL: () => true,
      });
      app.render();

      expect(app.getState()).toBe('upload');

      // Click Instant 3D Preview for Ashanti stool
      const ashantiPreviewBtn = container.querySelector<HTMLButtonElement>(
        'button[data-action="preview"][data-id="ashanti-stool"]'
      );
      expect(ashantiPreviewBtn).not.toBeNull();
      ashantiPreviewBtn?.click();

      // App should transition immediately to result state
      expect(app.getState()).toBe('result');

      // Model viewer should show the real Aholo-generated GLB
      const viewer = container.querySelector('model-viewer');
      expect(viewer).not.toBeNull();
      expect(viewer?.getAttribute('src')).toContain(
        '31d7f2d14d16446ebb80545720abdf22/textured.glb'
      );

      // Downloads should be ready for STL and 3MF
      const stlBtn = container.querySelector<HTMLAnchorElement>('#download-stl-btn');
      const threemfBtn = container.querySelector<HTMLAnchorElement>('#download-3mf-btn');
      expect(stlBtn?.getAttribute('href')).toContain('.stl');
      expect(threemfBtn?.getAttribute('href')).toContain('.3mf');

      // Example banner should be displayed
      expect(container.querySelector('#example-result-banner')?.textContent).toContain(
        'Ashanti Carved Wooden Stool'
      );

      // Clicking Try Another Heirloom should return to upload state
      const backBtn = container.querySelector<HTMLButtonElement>('#back-to-examples-btn');
      backBtn?.click();
      expect(app.getState()).toBe('upload');
    });

    it('loads sample prompt into upload form when clicking Load Prompt', () => {
      const app = new App(container, {
        checkWebGL: () => true,
      });
      app.render();

      const loadPromptBtn = container.querySelector<HTMLButtonElement>(
        'button[data-action="load-text"][data-id="brass-compass"]'
      );
      expect(loadPromptBtn).not.toBeNull();
      loadPromptBtn?.click();

      const promptInput = container.querySelector<HTMLTextAreaElement>('#prompt-input');
      expect(promptInput?.value).toContain('Vintage brass pocket compass');
    });
  });
});
