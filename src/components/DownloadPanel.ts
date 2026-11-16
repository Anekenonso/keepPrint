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
              <svg class="btn-svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              <span>Download STL (Print-Ready)</span>
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
              <svg class="btn-svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              <span>Download 3MF (Color & Slices)</span>
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
              <svg class="btn-svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
              <span>Download GLB (Full Color)</span>
            </a>
          `
              : ''
          }

          <button
            type="button"
            class="download-btn btn-outline"
            id="open-guide-btn"
          >
            <svg class="btn-svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
            <span>Slicer &amp; 3D Print Guide</span>
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
