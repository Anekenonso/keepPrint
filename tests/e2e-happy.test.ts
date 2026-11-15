import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@google/model-viewer', () => ({}));

import { App } from '../src/App';
import type { GenerationResult } from '../src/lib/lux3d';

describe('TS-10: End-to-End Happy Path User Flow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('completes the full flow from input upload to 3D model view and file downloads', async () => {
    const mockGenerator = vi.fn().mockImplementation(async (_input, options) => {
      options?.onProgress?.('Uploading heirloom photo to Lux3D...');
      await new Promise((r) => setTimeout(r, 10));

      options?.onProgress?.('Generating 3D heirloom mesh in Lux3D...');
      await new Promise((r) => setTimeout(r, 10));

      options?.onProgress?.('Running retopology for slicer print-readiness...');
      await new Promise((r) => setTimeout(r, 10));

      options?.onProgress?.('Exporting printable STL and 3MF files...');
      await new Promise((r) => setTimeout(r, 10));

      const result: GenerationResult = {
        taskId: 88888,
        status: 'succeeded',
        sourceType: 'text',
        glbUrl: 'https://cdn.example.com/raw.glb',
        retopoGlbUrl: 'https://cdn.example.com/heirloom-retopo.glb',
        stlUrl: 'https://cdn.example.com/heirloom.stl',
        threemfUrl: 'https://cdn.example.com/heirloom.3mf',
        zipUrl: 'https://cdn.example.com/bundle.zip',
        outputs: [
          { content: 'https://cdn.example.com/bundle.zip' },
          { content: 'https://cdn.example.com/heirloom-retopo.glb' },
          { content: 'https://cdn.example.com/heirloom.stl' },
          { content: 'https://cdn.example.com/heirloom.3mf' },
        ],
      };
      return result;
    });

    const app = new App(container, {
      generator: mockGenerator,
      transitionDelayMs: 0,
      checkWebGL: () => true,
    });
    app.render();

    // 1. Initial State: Upload Form
    expect(app.getState()).toBe('upload');
    expect(container.querySelector('h1')?.textContent).toBe('Keepprint');
    expect(container.querySelector('#drop-zone')).not.toBeNull();
    expect(container.querySelector('#tab-text')).not.toBeNull();

    // 2. Switch to description tab and input text
    const tabText = container.querySelector<HTMLButtonElement>('#tab-text')!;
    tabText.click();

    const promptInput = container.querySelector<HTMLTextAreaElement>('#prompt-input')!;
    promptInput.value = '18th-century antique brass oil lamp with filigree engravings';
    promptInput.dispatchEvent(new Event('input'));

    // 3. Submit generation
    const submitBtn = container.querySelector<HTMLButtonElement>('#submit-btn')!;
    submitBtn.click();

    // 4. In Progress State
    expect(app.getState()).toBe('generating');
    const progressEl = container.querySelector('.progress-card');
    expect(progressEl).not.toBeNull();

    // Wait for async generation pipeline and transition timeout
    await new Promise((resolve) => setTimeout(resolve, 600));

    // 5. Result State
    expect(app.getState()).toBe('result');
    expect(app.getCurrentJob()).not.toBeNull();
    expect(app.getCurrentJob()?.status).toBe('succeeded');

    // Verify 3D Model Viewer is present
    const modelViewer = container.querySelector('model-viewer');
    expect(modelViewer).not.toBeNull();
    expect(modelViewer?.getAttribute('src')).toBe('https://cdn.example.com/heirloom-retopo.glb');

    // Verify Download links are present and correct
    const stlLink = container.querySelector<HTMLAnchorElement>('#download-stl-btn');
    const threemfLink = container.querySelector<HTMLAnchorElement>('#download-3mf-btn');

    expect(stlLink).not.toBeNull();
    expect(stlLink?.getAttribute('href')).toBe('https://cdn.example.com/heirloom.stl');
    expect(stlLink?.getAttribute('download')).toBe('heirloom.stl');

    expect(threemfLink).not.toBeNull();
    expect(threemfLink?.getAttribute('href')).toBe('https://cdn.example.com/heirloom.3mf');
    expect(threemfLink?.getAttribute('download')).toBe('heirloom.3mf');

    // Verify print-readiness badge
    const badge = container.querySelector('.readiness-badge');
    expect(badge?.textContent).toContain('Good');

    // 6. Reset to create another heirloom
    const resetBtn = container.querySelector<HTMLButtonElement>('#reset-flow-btn');
    expect(resetBtn).not.toBeNull();
    resetBtn?.click();

    expect(app.getState()).toBe('upload');
    expect(container.querySelector('#drop-zone')).not.toBeNull();
  });
});
