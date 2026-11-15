import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@google/model-viewer', () => {
  return {};
});

import { ViewerComponent, isWebGLAvailable } from '../src/components/Viewer';

describe('TS-08: Viewer Component & WebGL Handling', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders model-viewer with src and controls when WebGL is available (TS-08, R-06)', () => {
    const viewer = new ViewerComponent(container, {
      glbUrl: 'https://cdn.example.com/heirloom.glb',
      altText: '3D family heirloom gold pocket watch',
      checkWebGL: () => true,
    });
    viewer.render();

    const modelViewerEl = container.querySelector('model-viewer');
    expect(modelViewerEl).not.toBeNull();
    expect(modelViewerEl?.getAttribute('src')).toBe('https://cdn.example.com/heirloom.glb');
    expect(modelViewerEl?.getAttribute('alt')).toBe('3D family heirloom gold pocket watch');
    expect(modelViewerEl?.hasAttribute('camera-controls')).toBe(true);
    expect(modelViewerEl?.hasAttribute('auto-rotate')).toBe(true);
  });

  it('updates model URL dynamically without error', () => {
    const viewer = new ViewerComponent(container, {
      glbUrl: 'https://cdn.example.com/raw.glb',
      checkWebGL: () => true,
    });
    viewer.render();

    let modelViewerEl = container.querySelector('model-viewer');
    expect(modelViewerEl?.getAttribute('src')).toBe('https://cdn.example.com/raw.glb');

    viewer.setModelUrl('https://cdn.example.com/retopo-clean.glb');
    modelViewerEl = container.querySelector('model-viewer');
    expect(modelViewerEl?.getAttribute('src')).toBe('https://cdn.example.com/retopo-clean.glb');
    expect(viewer.getModelUrl()).toBe('https://cdn.example.com/retopo-clean.glb');
  });

  it('displays empty state placeholder when no GLB URL is set', () => {
    const viewer = new ViewerComponent(container, {
      checkWebGL: () => true,
    });
    viewer.render();

    expect(container.querySelector('model-viewer')).toBeNull();
    const emptyEl = container.querySelector('.viewer-empty');
    expect(emptyEl).not.toBeNull();
    expect(container.textContent).toContain('No 3D model loaded yet');
  });

  it('renders fallback message with no crash when WebGL is unavailable (B-05)', () => {
    const viewer = new ViewerComponent(container, {
      glbUrl: 'https://cdn.example.com/heirloom.glb',
      checkWebGL: () => false,
    });

    expect(() => viewer.render()).not.toThrow();

    expect(container.querySelector('model-viewer')).toBeNull();
    const fallbackEl = container.querySelector('.viewer-fallback');
    expect(fallbackEl).not.toBeNull();
    expect(fallbackEl?.textContent).toContain('WebGL enabled');
    expect(fallbackEl?.textContent).toContain('printable 3D files are ready for download');
  });

  it('isWebGLAvailable safely detects WebGL environment', () => {
    // In default JSDOM without canvas WebGL support, it returns false safely without throwing
    expect(typeof isWebGLAvailable()).toBe('boolean');
  });
});
