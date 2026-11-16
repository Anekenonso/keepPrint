import '@google/model-viewer';

export type MaterialPreviewMode = 'original' | 'clay' | 'terracotta' | 'bronze';

export interface ViewerOptions {
  glbUrl?: string;
  posterUrl?: string;
  altText?: string;
  autoRotate?: boolean;
  cameraControls?: boolean;
  initialMaterial?: MaterialPreviewMode;
  onMaterialChange?: (mode: MaterialPreviewMode) => void;
  checkWebGL?: () => boolean;
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export class ViewerComponent {
  private container: HTMLElement;
  private options: ViewerOptions;
  private glbUrl: string | null = null;
  private posterUrl: string | null = null;
  private altText: string;
  private autoRotate: boolean;
  private cameraControls: boolean;
  private currentMaterial: MaterialPreviewMode;
  private checkWebGL: () => boolean;

  constructor(container: HTMLElement, options?: ViewerOptions) {
    this.container = container;
    this.options = options || {};
    this.glbUrl = options?.glbUrl || null;
    this.posterUrl = options?.posterUrl || null;
    this.altText = options?.altText || 'Interactive 3D model of family heirloom';
    this.autoRotate = options?.autoRotate ?? true;
    this.cameraControls = options?.cameraControls ?? true;
    this.currentMaterial = options?.initialMaterial || 'original';
    this.checkWebGL = options?.checkWebGL ?? isWebGLAvailable;
  }

  public render(): void {
    const webGLSupported = this.checkWebGL();

    if (!webGLSupported) {
      this.container.innerHTML = `
        <div class="viewer-fallback" role="region" aria-label="3D model viewer fallback">
          <div class="fallback-icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21 16-9 5-9-5V8l9-5 9 5v8Z"/><path d="M12 21V12"/><path d="M3.27 6.96 12 12l8.73-5.04"/></svg>
          </div>
          <h4>3D Interactive Preview Unavailable</h4>
          <p>Your browser does not have WebGL enabled. Your printable 3D files are ready for download below.</p>
        </div>
      `;
      return;
    }

    if (!this.glbUrl) {
      this.container.innerHTML = `
        <div class="viewer-empty" role="region" aria-label="3D model viewer placeholder">
          <div class="empty-icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6m0-6-6 6"/></svg>
          </div>
          <p>No 3D model loaded yet. Create your heirloom model above.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div class="viewer-container" role="region" aria-label="${this.altText}">
        <div class="material-preview-toolbar" role="toolbar" aria-label="3D model finish previews">
          <span class="material-toolbar-title">Preview Finish:</span>
          <div class="material-options">
            <button
              type="button"
              class="mat-btn ${this.currentMaterial === 'original' ? 'active' : ''}"
              data-material="original"
              id="mat-btn-original"
              aria-pressed="${this.currentMaterial === 'original'}"
              title="Original full-color photographic scan"
            >
              <span class="mat-swatch swatch-original"></span> Full Color
            </button>
            <button
              type="button"
              class="mat-btn ${this.currentMaterial === 'clay' ? 'active' : ''}"
              data-material="clay"
              id="mat-btn-clay"
              aria-pressed="${this.currentMaterial === 'clay'}"
              title="White matte clay finish (simulates unpainted PLA print)"
            >
              <span class="mat-swatch swatch-clay"></span> White Clay
            </button>
            <button
              type="button"
              class="mat-btn ${this.currentMaterial === 'terracotta' ? 'active' : ''}"
              data-material="terracotta"
              id="mat-btn-terracotta"
              aria-pressed="${this.currentMaterial === 'terracotta'}"
              title="Warm terracotta ceramic finish"
            >
              <span class="mat-swatch swatch-terracotta"></span> Terracotta
            </button>
            <button
              type="button"
              class="mat-btn ${this.currentMaterial === 'bronze' ? 'active' : ''}"
              data-material="bronze"
              id="mat-btn-bronze"
              aria-pressed="${this.currentMaterial === 'bronze'}"
              title="Antique bronze metallic finish"
            >
              <span class="mat-swatch swatch-bronze"></span> Bronze
            </button>
          </div>
        </div>

        <model-viewer
          id="heirloom-viewer"
          src="${this.glbUrl}"
          ${this.posterUrl ? `poster="${this.posterUrl}"` : ''}
          alt="${this.altText}"
          class="mat-${this.currentMaterial}"
          ${this.autoRotate ? 'auto-rotate' : ''}
          ${this.cameraControls ? 'camera-controls' : ''}
          touch-action="pan-y"
          shadow-intensity="1"
          exposure="1"
          interaction-prompt="auto"
          ar
          ar-modes="webxr scene-viewer quick-look"
        >
          <div slot="progress-bar" class="viewer-loading-bar"></div>
        </model-viewer>
        <div class="viewer-controls-hint">
          <span>Rotate: Drag / Swipe</span> &bull; <span>Zoom: Pinch / Scroll</span>
        </div>
      </div>
    `;

    this.attachEvents();
    if (this.currentMaterial !== 'original') {
      this.applyMaterialToModel(this.currentMaterial);
    }
  }

  private attachEvents(): void {
    const matButtons = this.container.querySelectorAll<HTMLButtonElement>('.mat-btn');
    matButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-material') as MaterialPreviewMode;
        if (mode) {
          this.setMaterialMode(mode);
        }
      });
    });

    const viewerEl = this.container.querySelector<HTMLElement>('#heirloom-viewer');
    viewerEl?.addEventListener('load', () => {
      if (this.currentMaterial !== 'original') {
        this.applyMaterialToModel(this.currentMaterial);
      }
    });
  }

  public setMaterialMode(mode: MaterialPreviewMode): void {
    this.currentMaterial = mode;

    const buttons = this.container.querySelectorAll<HTMLButtonElement>('.mat-btn');
    buttons.forEach((btn) => {
      const isCurrent = btn.getAttribute('data-material') === mode;
      btn.classList.toggle('active', isCurrent);
      btn.setAttribute('aria-pressed', String(isCurrent));
    });

    this.applyMaterialToModel(mode);

    if (this.options.onMaterialChange) {
      this.options.onMaterialChange(mode);
    }
  }

  public getMaterialMode(): MaterialPreviewMode {
    return this.currentMaterial;
  }

  private applyMaterialToModel(mode: MaterialPreviewMode): void {
    const viewerEl = this.container.querySelector<HTMLElement>('#heirloom-viewer');
    if (!viewerEl) return;

    viewerEl.classList.remove('mat-original', 'mat-clay', 'mat-terracotta', 'mat-bronze');
    viewerEl.classList.add(`mat-${mode}`);

    if (mode === 'clay') {
      viewerEl.setAttribute('exposure', '1.1');
    } else if (mode === 'bronze') {
      viewerEl.setAttribute('exposure', '1.2');
    } else {
      viewerEl.setAttribute('exposure', '1.0');
    }

    const anyViewer = viewerEl as unknown as {
      model?: {
        materials?: Array<{
          pbrMetallicRoughness?: {
            setBaseColorFactor?: (color: [number, number, number, number]) => void;
            setMetallicFactor?: (val: number) => void;
            setRoughnessFactor?: (val: number) => void;
          };
        }>;
      };
    };

    if (anyViewer.model?.materials) {
      anyViewer.model.materials.forEach((mat) => {
        const pbr = mat.pbrMetallicRoughness;
        if (!pbr) return;

        if (mode === 'clay') {
          pbr.setBaseColorFactor?.([0.92, 0.92, 0.92, 1.0]);
          pbr.setMetallicFactor?.(0.0);
          pbr.setRoughnessFactor?.(0.85);
        } else if (mode === 'terracotta') {
          pbr.setBaseColorFactor?.([0.77, 0.36, 0.15, 1.0]);
          pbr.setMetallicFactor?.(0.05);
          pbr.setRoughnessFactor?.(0.7);
        } else if (mode === 'bronze') {
          pbr.setBaseColorFactor?.([0.65, 0.48, 0.28, 1.0]);
          pbr.setMetallicFactor?.(0.85);
          pbr.setRoughnessFactor?.(0.3);
        } else {
          pbr.setBaseColorFactor?.([1.0, 1.0, 1.0, 1.0]);
          pbr.setMetallicFactor?.(0.0);
          pbr.setRoughnessFactor?.(0.5);
        }
      });
    }
  }

  public setModelUrl(url: string, posterUrl?: string): void {
    this.glbUrl = url;
    if (posterUrl) {
      this.posterUrl = posterUrl;
    }
    this.render();
  }

  public getModelUrl(): string | null {
    return this.glbUrl;
  }
}
