import '@google/model-viewer';

export interface ViewerOptions {
  glbUrl?: string;
  posterUrl?: string;
  altText?: string;
  autoRotate?: boolean;
  cameraControls?: boolean;
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
  private glbUrl: string | null = null;
  private posterUrl: string | null = null;
  private altText: string;
  private autoRotate: boolean;
  private cameraControls: boolean;
  private checkWebGL: () => boolean;

  constructor(container: HTMLElement, options?: ViewerOptions) {
    this.container = container;
    this.glbUrl = options?.glbUrl || null;
    this.posterUrl = options?.posterUrl || null;
    this.altText = options?.altText || 'Interactive 3D model of family heirloom';
    this.autoRotate = options?.autoRotate ?? true;
    this.cameraControls = options?.cameraControls ?? true;
    this.checkWebGL = options?.checkWebGL ?? isWebGLAvailable;
  }

  public render(): void {
    const webGLSupported = this.checkWebGL();

    if (!webGLSupported) {
      this.container.innerHTML = `
        <div class="viewer-fallback" role="region" aria-label="3D model viewer fallback">
          <div class="fallback-icon">🧊</div>
          <h4>3D Interactive Preview Unavailable</h4>
          <p>Your browser does not have WebGL enabled. Your printable 3D files are ready for download below.</p>
        </div>
      `;
      return;
    }

    if (!this.glbUrl) {
      this.container.innerHTML = `
        <div class="viewer-empty" role="region" aria-label="3D model viewer placeholder">
          <div class="empty-icon">🏛️</div>
          <p>No 3D model loaded yet. Create your heirloom model above.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div class="viewer-container" role="region" aria-label="${this.altText}">
        <model-viewer
          id="heirloom-viewer"
          src="${this.glbUrl}"
          ${this.posterUrl ? `poster="${this.posterUrl}"` : ''}
          alt="${this.altText}"
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
