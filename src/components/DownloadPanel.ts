import { checkPrintReadiness } from '../lib/validation';
import type { PrintReadiness } from '../lib/types';

export interface DownloadUrls {
  stlUrl?: string;
  threemfUrl?: string;
  glbUrl?: string;
}

export type { PrintReadiness };

export interface DownloadPanelOptions {
  urls: DownloadUrls;
  readiness?: PrintReadiness;
  readinessNotes?: string[];
  onDownload?: (format: 'stl' | '3mf' | 'glb', url: string) => void;
  onReset?: () => void;
  onOpenPrintGuide?: () => void;
}

export class DownloadPanel {
  private container: HTMLElement;
  private options: DownloadPanelOptions;

  constructor(container: HTMLElement, options: DownloadPanelOptions) {
    this.container = container;
    this.options = options;
  }

  public render(): void {
    const { stlUrl, threemfUrl, glbUrl } = this.options.urls;
    const computedReport = checkPrintReadiness({
      hasStl: Boolean(stlUrl),
      hasThreeMf: Boolean(threemfUrl),
      hasGlb: Boolean(glbUrl),
      faceCount: 80000,
    });

    const readiness: PrintReadiness = this.options.readiness || computedReport.readiness;
    const notes = this.options.readinessNotes || computedReport.notes;

    this.container.innerHTML = `
      <div class="download-panel" id="download-panel">
        <div class="readiness-section">
          <div class="readiness-header">
            <h4>Print Readiness</h4>
            <span class="readiness-badge ${readiness === 'good' ? 'badge-good' : 'badge-attention'}">
              ${readiness === 'good' ? '● Good' : '▲ Needs attention'}
            </span>
          </div>
          <ul class="readiness-notes">
            ${notes.map((note) => `<li>${note}</li>`).join('')}
          </ul>
        </div>

        <div class="download-actions">
          ${
            stlUrl
              ? `
            <a
              href="${stlUrl}"
              download="heirloom.stl"
              class="download-btn btn-primary"
              id="download-stl-btn"
              data-format="stl"
            >
              <span class="btn-icon">📦</span> Download STL (Print-Ready)
            </a>
          `
              : `
            <button class="download-btn btn-disabled" disabled id="download-stl-btn">
              STL Unavailable
            </button>
          `
          }

          ${
            threemfUrl
              ? `
            <a
              href="${threemfUrl}"
              download="heirloom.3mf"
              class="download-btn btn-secondary"
              id="download-3mf-btn"
              data-format="3mf"
            >
              <span class="btn-icon">📐</span> Download 3MF (Color & Slices)
            </a>
          `
              : `
            <button class="download-btn btn-disabled" disabled id="download-3mf-btn">
              3MF Unavailable
            </button>
          `
          }

          ${
            glbUrl
              ? `
            <a
              href="${glbUrl}"
              download="heirloom.glb"
              class="download-btn btn-tertiary"
              id="download-glb-btn"
              data-format="glb"
            >
              <span class="btn-icon">🎨</span> Download GLB (Full Color)
            </a>
          `
              : ''
          }

          <button
            type="button"
            class="download-btn btn-outline"
            id="open-guide-btn"
          >
            <span class="btn-icon">📖</span> Slicer &amp; 3D Print Guide
          </button>
        </div>

        ${
          this.options.onReset
            ? `
          <div class="panel-reset-container">
            <button type="button" class="reset-btn" id="reset-flow-btn">
              Create Another Heirloom
            </button>
          </div>
        `
            : ''
        }
      </div>
    `;

    this.attachEvents();
  }

  private attachEvents(): void {
    const downloadBtns = this.container.querySelectorAll<HTMLAnchorElement>('.download-actions a');
    downloadBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const format = btn.getAttribute('data-format') as 'stl' | '3mf' | 'glb';
        const url = btn.getAttribute('href');
        if (url && this.options.onDownload) {
          this.options.onDownload(format, url);
        }
        // If simulated or test URL, prevent default navigation in testing
        if (url && (url.startsWith('#') || url.includes('example.com'))) {
          e.preventDefault();
        }
      });
    });

    const resetBtn = this.container.querySelector<HTMLButtonElement>('#reset-flow-btn');
    resetBtn?.addEventListener('click', () => {
      this.options.onReset?.();
    });

    const guideBtn = this.container.querySelector<HTMLButtonElement>('#open-guide-btn');
    guideBtn?.addEventListener('click', () => {
      this.options.onOpenPrintGuide?.();
    });
  }

  public updateUrls(urls: DownloadUrls, readiness?: PrintReadiness): void {
    this.options.urls = urls;
    if (readiness) {
      this.options.readiness = readiness;
    }
    this.render();
  }
}
