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

    // Verify loading overlay with calm text and spinner is rendered
    const overlay = container.querySelector('#viewer-loading-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain('Loading your 3D heirloom…');
    expect(overlay?.textContent).toContain('Almost ready to inspect and download');
    expect(container.querySelector('.viewer-spinner')).not.toBeNull();
    expect(overlay?.classList.contains('is-loaded')).toBe(false);

    // Simulating model-viewer load event marks overlay as loaded (fades out)
    modelViewerEl?.dispatchEvent(new Event('load'));
    expect(overlay?.classList.contains('is-loaded')).toBe(true);
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

  describe('T-17: Material & Color Preview Controls', () => {
    it('renders material preview toolbar with all finish options', () => {
      const viewer = new ViewerComponent(container, {
        glbUrl: 'https://cdn.example.com/heirloom.glb',
        checkWebGL: () => true,
      });
      viewer.render();

      const toolbar = container.querySelector('.material-preview-toolbar');
      expect(toolbar).not.toBeNull();
      expect(container.querySelector('#mat-btn-original')).not.toBeNull();
      expect(container.querySelector('#mat-btn-clay')).not.toBeNull();
      expect(container.querySelector('#mat-btn-terracotta')).not.toBeNull();
      expect(container.querySelector('#mat-btn-bronze')).not.toBeNull();

      expect(viewer.getMaterialMode()).toBe('original');
      expect(container.querySelector('#mat-btn-original')?.classList.contains('active')).toBe(true);
      expect(container.querySelector('#heirloom-viewer')?.classList.contains('mat-original')).toBe(
        true
      );
    });

    it('toggles finish to White Clay when clay button is clicked', () => {
      const onMaterialChange = vi.fn();
      const viewer = new ViewerComponent(container, {
        glbUrl: 'https://cdn.example.com/heirloom.glb',
        onMaterialChange,
        checkWebGL: () => true,
      });
      viewer.render();

      const clayBtn = container.querySelector<HTMLButtonElement>('#mat-btn-clay')!;
      clayBtn.click();

      expect(viewer.getMaterialMode()).toBe('clay');
      expect(clayBtn.classList.contains('active')).toBe(true);
      expect(clayBtn.getAttribute('aria-pressed')).toBe('true');
      expect(container.querySelector('#mat-btn-original')?.classList.contains('active')).toBe(
        false
      );

      const modelViewerEl = container.querySelector('#heirloom-viewer')!;
      expect(modelViewerEl.classList.contains('mat-clay')).toBe(true);
      expect(modelViewerEl.getAttribute('exposure')).toBe('1.1');
      expect(onMaterialChange).toHaveBeenCalledWith('clay');
    });

    it('switches between finishes and applies PBR factors when model materials exist', () => {
      const setBaseColorFactor = vi.fn();
      const setMetallicFactor = vi.fn();
      const setRoughnessFactor = vi.fn();

      const viewer = new ViewerComponent(container, {
        glbUrl: 'https://cdn.example.com/heirloom.glb',
        checkWebGL: () => true,
      });
      viewer.render();

      // Mock model-viewer internal PBR materials
      const viewerEl = container.querySelector('#heirloom-viewer') as unknown as {
        model?: {
          materials?: Array<{
            pbrMetallicRoughness: {
              setBaseColorFactor: typeof setBaseColorFactor;
              setMetallicFactor: typeof setMetallicFactor;
              setRoughnessFactor: typeof setRoughnessFactor;
            };
          }>;
        };
      };
      viewerEl.model = {
        materials: [
          {
            pbrMetallicRoughness: {
              setBaseColorFactor,
              setMetallicFactor,
              setRoughnessFactor,
            },
          },
        ],
      };

      // Switch to Terracotta
      viewer.setMaterialMode('terracotta');
      expect(viewer.getMaterialMode()).toBe('terracotta');
      expect(setBaseColorFactor).toHaveBeenCalledWith([0.77, 0.36, 0.15, 1.0]);
      expect(setMetallicFactor).toHaveBeenCalledWith(0.05);
      expect(setRoughnessFactor).toHaveBeenCalledWith(0.7);

      // Switch to Bronze
      viewer.setMaterialMode('bronze');
      expect(viewer.getMaterialMode()).toBe('bronze');
      expect(setBaseColorFactor).toHaveBeenCalledWith([0.65, 0.48, 0.28, 1.0]);
      expect(setMetallicFactor).toHaveBeenCalledWith(0.85);
      expect(setRoughnessFactor).toHaveBeenCalledWith(0.3);

      // Switch back to Original
      viewer.setMaterialMode('original');
      expect(viewer.getMaterialMode()).toBe('original');
      expect(setBaseColorFactor).toHaveBeenCalledWith([1.0, 1.0, 1.0, 1.0]);
    });

    it('honors initialMaterial configuration option', () => {
      const viewer = new ViewerComponent(container, {
        glbUrl: 'https://cdn.example.com/heirloom.glb',
        initialMaterial: 'terracotta',
        checkWebGL: () => true,
      });
      viewer.render();

      expect(viewer.getMaterialMode()).toBe('terracotta');
      expect(container.querySelector('#mat-btn-terracotta')?.classList.contains('active')).toBe(
        true
      );
      expect(
        container.querySelector('#heirloom-viewer')?.classList.contains('mat-terracotta')
      ).toBe(true);
    });
  });
});
