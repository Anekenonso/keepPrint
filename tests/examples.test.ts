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
        expect(ex.thumbnailUrl).toMatch(/\.(jpg|jpeg|png|svg|webp)$/);
        expect(ex.sourceUrl).toMatch(/^https?:\/\//);
        expect(ex.imageInputs.length).toBeGreaterThan(0);
        expect(ex.result.status).toBe('succeeded');
        expect(ex.result.glbUrl).toContain('qhsmodel.kujiale.com');
        expect(ex.result.stlUrl).toContain('.stl');
        expect(ex.result.threemfUrl).toContain('.3mf');
        expect(ex.meta.aholoTaskId).toBeGreaterThan(0);
      }
    });

    it('retrieves an example by id with getExampleById', () => {
      const benin = getExampleById('benin-ivory-mask');
      expect(benin).toBeDefined();
      expect(benin?.title).toBe('Benin Ivory Mask of Queen Idia');

      const nok = getExampleById('nok-terracotta-figure');
      expect(nok).toBeDefined();
      expect(nok?.title).toBe('Nok Terracotta Seated Figure');

      expect(getExampleById('unknown-item')).toBeUndefined();
    });
  });

  describe('JudgeExamples Component', () => {
    it('renders both example items with title and action buttons', () => {
      const onWalkthrough = vi.fn();
      const onLoadInput = vi.fn();

      const component = new JudgeExamples(container, {
        onWalkthrough,
        onLoadInput,
      });
      component.render();

      const items = container.querySelectorAll('.sidebar-example-item');
      expect(items).toHaveLength(2);

      expect(container.textContent).toContain('Benin Ivory Mask of Queen Idia');
      expect(container.textContent).toContain('Nok Terracotta Seated Figure');
      expect(container.textContent).toContain('Run Guided 3D Flow');
    });

    it('triggers onWalkthrough when clicking Run Guided 3D Flow', () => {
      const onWalkthrough = vi.fn();
      const onLoadInput = vi.fn();

      const component = new JudgeExamples(container, {
        onWalkthrough,
        onLoadInput,
      });
      component.render();

      const walkthroughBtn = container.querySelector<HTMLButtonElement>(
        'button[data-action="walkthrough"][data-id="benin-ivory-mask"]'
      );
      expect(walkthroughBtn).not.toBeNull();
      walkthroughBtn?.click();

      expect(onWalkthrough).toHaveBeenCalledTimes(1);
      expect(onWalkthrough.mock.calls[0][0].id).toBe('benin-ivory-mask');
    });

    it('triggers onLoadInput with image mode when clicking Load Photo', () => {
      const onWalkthrough = vi.fn();
      const onLoadInput = vi.fn();

      const component = new JudgeExamples(container, {
        onWalkthrough,
        onLoadInput,
      });
      component.render();

      const loadPhotoBtn = container.querySelector<HTMLButtonElement>(
        'button[data-action="load-image"][data-id="nok-terracotta-figure"]'
      );
      expect(loadPhotoBtn).not.toBeNull();
      loadPhotoBtn?.click();

      expect(onLoadInput).toHaveBeenCalledTimes(1);
      expect(onLoadInput.mock.calls[0][0].id).toBe('nok-terracotta-figure');
      expect(onLoadInput.mock.calls[0][1]).toBe('image');
    });

    it('triggers onLoadInput with text mode when clicking Load Prompt', () => {
      const onWalkthrough = vi.fn();
      const onLoadInput = vi.fn();

      const component = new JudgeExamples(container, {
        onWalkthrough,
        onLoadInput,
      });
      component.render();

      const loadPromptBtn = container.querySelector<HTMLButtonElement>(
        'button[data-action="load-text"][data-id="benin-ivory-mask"]'
      );
      expect(loadPromptBtn).not.toBeNull();
      loadPromptBtn?.click();

      expect(onLoadInput).toHaveBeenCalledTimes(1);
      expect(onLoadInput.mock.calls[0][0].id).toBe('benin-ivory-mask');
      expect(onLoadInput.mock.calls[0][1]).toBe('text');
    });
  });

  describe('End-to-End Judge Flow in App', () => {
    it('allows judges to experience guided 3D flow for Benin ivory mask and download STL/3MF', async () => {
      const app = new App(container, {
        checkWebGL: () => true,
        transitionDelayMs: 0,
      });
      app.render();

      expect(app.getState()).toBe('upload');

      // Click Run Guided 3D Flow for Benin ivory mask
      const beninWalkthroughBtn = container.querySelector<HTMLButtonElement>(
        'button[data-action="walkthrough"][data-id="benin-ivory-mask"]'
      );
      expect(beninWalkthroughBtn).not.toBeNull();
      beninWalkthroughBtn?.click();

      // App should transition through progress to result state
      await vi.waitFor(() => {
        expect(app.getState()).toBe('result');
      });

      // Model viewer should show the real Aholo-generated GLB for Benin Ivory Mask
      const viewer = container.querySelector('model-viewer');
      expect(viewer).not.toBeNull();
      expect(viewer?.getAttribute('src')).toContain(
        '24dcf9a49f5149c8928040eb476adaf3/textured.glb'
      );

      // Downloads should be ready for STL and 3MF
      const stlBtn = container.querySelector<HTMLAnchorElement>('#download-stl-btn');
      const threemfBtn = container.querySelector<HTMLAnchorElement>('#download-3mf-btn');
      expect(stlBtn?.getAttribute('href')).toContain('.stl');
      expect(threemfBtn?.getAttribute('href')).toContain('.3mf');

      // Example banner should be displayed
      expect(container.querySelector('#example-result-banner')?.textContent).toContain(
        'Benin Ivory Mask of Queen Idia'
      );

      // Clicking Try Another Heirloom should return to upload state
      const backBtn = container.querySelector<HTMLButtonElement>('#back-to-examples-btn');
      backBtn?.click();
      expect(app.getState()).toBe('upload');
    });

    it('loads sample photo into upload form when clicking Load Photo into Form', () => {
      const app = new App(container, {
        checkWebGL: () => true,
      });
      app.render();

      const loadPhotoBtn = container.querySelector<HTMLButtonElement>(
        'button[data-action="load-image"][data-id="benin-ivory-mask"]'
      );
      expect(loadPhotoBtn).not.toBeNull();
      loadPhotoBtn?.click();

      const previewImgs = container.querySelectorAll<HTMLImageElement>('.preview-img');
      expect(previewImgs.length).toBeGreaterThan(0);
      expect(previewImgs[0].src).toContain('benin-ivory-mask.jpg');
    });

    it('loads sample prompt into upload form when clicking Load Prompt', () => {
      const app = new App(container, {
        checkWebGL: () => true,
      });
      app.render();

      const loadPromptBtn = container.querySelector<HTMLButtonElement>(
        'button[data-action="load-text"][data-id="nok-terracotta-figure"]'
      );
      expect(loadPromptBtn).not.toBeNull();
      loadPromptBtn?.click();

      const promptInput = container.querySelector<HTMLTextAreaElement>('#prompt-input');
      expect(promptInput?.value).toContain('Nok culture');
    });
  });
});
