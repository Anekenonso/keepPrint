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
  isPreparing?: boolean;
  exportError?: string;
  onDownload?: (format: 'stl' | '3mf' | 'glb', url: string) => void;
  onReset?: () => void;
  onOpenPrintGuide?: () => void;
  onRetryExport?: () => void;
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
    });

    const readiness: PrintReadiness = this.options.readiness || computedReport.readiness;
    const notes = this.options.readinessNotes || computedReport.notes;
    const isPreparing = Boolean(this.options.isPreparing && !stlUrl);

    this.container.innerHTML = `
      <div class="download-panel" id="download-panel">
        <div class="readiness-section">
          <div class="readiness-header">
            <h4>Print Readiness</h4>
            <span class="readiness-badge ${
              isPreparing
                ? 'badge-preparing'
                : readiness === 'good'
                  ? 'badge-good'
                  : 'badge-attention'
            }">
              <span class="badge-dot ${isPreparing ? 'pulse' : ''}" aria-hidden="true"></span>
              ${isPreparing ? 'Preparing Slicer Files...' : readiness === 'good' ? 'Good' : 'Needs attention'}
            </span>
          </div>
          <ul class="readiness-notes">
            ${
              isPreparing
                ? `<li><svg class="spinner-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Converting mesh into manifold STL and 3MF in background...</span></li>
                   <li><svg class="note-check-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg><span>Full-color 3D preview is active and interactive above.</span></li>`
                : notes
                    .map(
                      (note) =>
                        `<li><svg class="note-check-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg><span>${note}</span></li>`
                    )
                    .join('')
            }
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
              : isPreparing
                ? `
            <button class="download-btn btn-preparing" disabled id="download-stl-btn">
              <svg class="spinner-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <span>Preparing STL (Print-Ready)...</span>
            </button>
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
              <svg class="btn-svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 22 17"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              <span>Download 3MF (Color & Slices)</span>
            </a>
          `
              : isPreparing
                ? `
            <button class="download-btn btn-preparing" disabled id="download-3mf-btn">
              <svg class="spinner-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <span>Preparing 3MF (Color & Slices)...</span>
            </button>
          `
                : `
            <button class="download-btn btn-disabled" disabled id="download-3mf-btn">
              3MF Unavailable
            </button>
          `
          }

          ${
            (!stlUrl || !threemfUrl) && !isPreparing
              ? `
            <button type="button" class="download-btn btn-outline" id="retry-export-btn">
              <svg class="btn-svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
              <span>Retry Slicer Export</span>
            </button>
          `
              : ''
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

        <p class="print-disclaimer">
          Notice: This is an AI-generated reconstruction. Always inspect layer lines and wall thicknesses in your slicer before physical printing.
        </p>

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

    const retryBtn = this.container.querySelector<HTMLButtonElement>('#retry-export-btn');
    retryBtn?.addEventListener('click', () => {
      this.options.onRetryExport?.();
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

  public updateUrls(urls: DownloadUrls, readiness?: PrintReadiness, isPreparing?: boolean): void {
    this.options.urls = urls;
    if (readiness) {
      this.options.readiness = readiness;
    }
    if (typeof isPreparing === 'boolean') {
      this.options.isPreparing = isPreparing;
    } else if (urls.stlUrl || urls.threemfUrl) {
      this.options.isPreparing = false;
    }
    this.render();
  }
}
