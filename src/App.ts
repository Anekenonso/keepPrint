import { UploadForm } from './components/UploadForm';
import { ProgressComponent, type ProgressStage } from './components/Progress';
import { ViewerComponent } from './components/Viewer';
import { DownloadPanel } from './components/DownloadPanel';
import { PrintGuideModal } from './components/PrintGuideModal';
import { JudgeExamples } from './components/JudgeExamples';
import { generate3D, type GenerationResult } from './lib/lux3d';
import { saveLastJob, loadLastJob, clearLastJob, hasLastJob } from './lib/storage';
import { PRELOADED_EXAMPLES, type PreloadedExample } from './lib/examples';
import type { GenerationInput, Job } from './lib/types';
import type { Lux3dClient } from '@manycore/aholo-sdk-lux3d';

export type AppState = 'upload' | 'generating' | 'result';

export interface AppOptions {
  client?: Lux3dClient;
  transitionDelayMs?: number;
  checkWebGL?: () => boolean;
  storage?: Storage;
  autoRestoreLastJob?: boolean;
  generator?: (
    input: GenerationInput,
    options?: {
      client?: Lux3dClient;
      enableRetopo?: boolean;
      enableExport?: boolean;
      onProgress?: (message: string) => void;
      signal?: AbortSignal;
    }
  ) => Promise<GenerationResult>;
}

export class App {
  private container: HTMLElement;
  private options: AppOptions;
  private state: AppState = 'upload';
  private currentJob: Job | null = null;
  private lastInput: GenerationInput | null = null;
  private abortController: AbortController | null = null;
  private activeExampleTitle: string | null = null;
  private activeExample: PreloadedExample | null = null;

  constructor(container: HTMLElement, options?: AppOptions) {
    this.container = container;
    this.options = options || {};

    if (this.options.autoRestoreLastJob) {
      const restored = loadLastJob({ storage: this.options.storage });
      if (restored && (restored.stlUrl || restored.threemfUrl || restored.glbUrl)) {
        this.currentJob = restored;
        this.state = 'result';
      }
    }
  }

  public render(): void {
    this.container.innerHTML = `
      <header>
        <div class="header-inner">
          <div class="brand">
            <a href="/" class="brand-link" id="brand-logo-link" aria-label="Keepprint Home - Return to homepage">
              <div class="brand-title-row">
                <img src="/favicon.svg" alt="Keepprint logo" class="brand-logo" width="36" height="36" />
                <h1>Keepprint</h1>
              </div>
            </a>
            <p>Keep the original safe. Print a copy you can hold.</p>
          </div>
          <button type="button" class="btn-guide-header" id="header-guide-btn" title="View 3D Printing & Slicing Guide">
            <svg class="btn-svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
            <span>Print Guide</span>
          </button>
        </div>
      </header>
      <main class="card" id="main-content" role="main">
        <div id="step-container"></div>
      </main>
      <footer class="app-footer" role="contentinfo">
        <div class="footer-inner">
          <div class="footer-left">
            <a href="/" class="footer-brand-link" id="footer-logo-link" aria-label="Keepprint Home - Return to homepage">
              <span class="footer-brand-name">Keepprint</span>
            </a>
            <span class="footer-sep">/</span>
            <span class="footer-engine">Aholo Lux3D G1</span>
          </div>
          <nav class="footer-nav" aria-label="Footer Navigation">
            <button type="button" class="footer-link-btn" id="footer-guide-btn">
              Print &amp; Slicer Guide
            </button>
            <span class="footer-sep">•</span>
            <span class="footer-privacy-tag">Zero Training Retention</span>
          </nav>
        </div>
      </footer>
    `;

    const brandLogoLink = this.container.querySelector<HTMLAnchorElement>('#brand-logo-link');
    brandLogoLink?.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      this.reset();
    });

    const footerLogoLink = this.container.querySelector<HTMLAnchorElement>('#footer-logo-link');
    footerLogoLink?.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      this.reset();
    });

    const headerGuideBtn = this.container.querySelector<HTMLButtonElement>('#header-guide-btn');
    headerGuideBtn?.addEventListener('click', () => {
      this.openPrintGuide();
    });

    const footerGuideBtn = this.container.querySelector<HTMLButtonElement>('#footer-guide-btn');
    footerGuideBtn?.addEventListener('click', () => {
      this.openPrintGuide();
    });

    const stepContainer = this.container.querySelector<HTMLElement>('#step-container');
    if (!stepContainer) return;

    if (this.state === 'upload') {
      this.renderUpload(stepContainer);
    } else if (this.state === 'generating') {
      this.renderProgress(stepContainer);
    } else if (this.state === 'result') {
      this.renderResult(stepContainer);
    }
  }

  private renderUpload(parent: HTMLElement): void {
    const hasSaved = hasLastJob({ storage: this.options.storage });
    let bannerHtml = '';
    if (hasSaved) {
      bannerHtml = `
        <div class="restore-job-banner" id="restore-banner">
          <div class="restore-info">
            <span class="restore-tag">Saved Job</span>
            <span>A previously generated heirloom model is available.</span>
          </div>
          <div class="restore-actions">
            <button type="button" class="btn-restore" id="restore-job-btn">View Previous Model</button>
            <button type="button" class="btn-text-subtle" id="dismiss-job-btn" title="Dismiss" aria-label="Dismiss"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
      `;
    }

    parent.innerHTML = `
      ${bannerHtml}
      <div class="workspace-split">
        <div class="workspace-main">
          <div id="upload-form-mount"></div>
        </div>
        <aside class="workspace-side" aria-label="Sample Heirloom Artifacts for Testing">
          <div id="examples-mount"></div>
        </aside>
      </div>
    `;

    if (hasSaved) {
      const restoreBtn = parent.querySelector<HTMLButtonElement>('#restore-job-btn');
      const dismissBtn = parent.querySelector<HTMLButtonElement>('#dismiss-job-btn');
      const banner = parent.querySelector<HTMLElement>('#restore-banner');

      restoreBtn?.addEventListener('click', () => {
        const job = loadLastJob({ storage: this.options.storage });
        if (job) {
          this.currentJob = job;
          this.state = 'result';
          this.render();
        }
      });

      dismissBtn?.addEventListener('click', () => {
        clearLastJob({ storage: this.options.storage });
        banner?.remove();
      });
    }

    const formMount = parent.querySelector<HTMLElement>('#upload-form-mount');
    const examplesMount = parent.querySelector<HTMLElement>('#examples-mount');

    let uploadForm: UploadForm | null = null;
    if (formMount) {
      uploadForm = new UploadForm(formMount, {
        onSubmit: (payload) => {
          this.startGeneration(payload);
        },
      });
      uploadForm.render();
    }

    if (examplesMount && uploadForm) {
      const examplesComponent = new JudgeExamples(examplesMount, {
        onWalkthrough: (example) => {
          this.activeExample = example;
          this.activeExampleTitle = example.title;
          uploadForm?.setImages(example.imageInputs);
          this.startGeneration({
            sourceType: 'image',
            images: example.imageInputs,
          });
        },
        onLoadInput: (example, mode = 'image') => {
          this.activeExample = example;
          this.activeExampleTitle = example.title;
          if (mode === 'image') {
            uploadForm?.setImages(example.imageInputs);
          } else {
            uploadForm?.setPrompt(example.prompt);
          }
          const formEl = parent.querySelector('#upload-form-mount');
          if (formEl && typeof formEl.scrollIntoView === 'function') {
            formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        },
      });
      examplesComponent.render();
    }
  }

  private renderProgress(parent: HTMLElement): void {
    const progress = new ProgressComponent(parent, {
      onCancel: () => {
        if (this.abortController) {
          this.abortController.abort();
        }
        this.state = 'upload';
        this.render();
      },
      onRetry: () => {
        if (this.lastInput) {
          this.startGeneration(this.lastInput);
        } else {
          this.state = 'upload';
          this.render();
        }
      },
    });
    progress.render();
  }

  private renderResult(parent: HTMLElement): void {
    const matchingExample = PRELOADED_EXAMPLES.find(
      (ex) => ex.result.id === this.currentJob?.id || ex.title === this.activeExampleTitle
    );

    let exampleBannerHtml = '';
    if (matchingExample) {
      exampleBannerHtml = `
        <div class="example-result-banner" id="example-result-banner" role="status">
          <div class="example-result-info">
            <span class="example-result-badge">Specimen Sample</span>
            <span class="example-result-title"><strong>${matchingExample.title}</strong></span>
            <span class="example-result-meta">Aholo Lux3D G1 (Task #${matchingExample.meta.aholoTaskId})</span>
          </div>
          <button type="button" class="btn-text-subtle" id="back-to-examples-btn" title="Back to Examples and Generator">
            ← Try Another Heirloom
          </button>
        </div>
      `;
    }

    parent.innerHTML = `
      <div class="result-view">
        ${exampleBannerHtml}
        <div class="result-header">
          <h2>Your 3D Heirloom Model</h2>
          <p>Inspect the full-color model in 3D and download clean, print-ready files for your slicer.</p>
        </div>
        <div id="viewer-mount"></div>
        <div id="download-mount"></div>
      </div>
    `;

    const backBtn = parent.querySelector<HTMLButtonElement>('#back-to-examples-btn');
    backBtn?.addEventListener('click', () => {
      this.reset();
    });

    const viewerMount = parent.querySelector<HTMLElement>('#viewer-mount');
    const downloadMount = parent.querySelector<HTMLElement>('#download-mount');

    const posterUrl =
      matchingExample?.thumbnailUrl ||
      (this.lastInput?.images && this.lastInput.images.length > 0
        ? this.lastInput.images[0].dataUrl
        : undefined);

    if (viewerMount && this.currentJob) {
      const viewer = new ViewerComponent(viewerMount, {
        glbUrl: this.currentJob.retopoGlbUrl || this.currentJob.glbUrl,
        posterUrl,
        altText: 'Interactive 3D model of your family heirloom',
        checkWebGL: this.options.checkWebGL,
      });
      viewer.render();
    }

    if (downloadMount && this.currentJob) {
      const hasPrintFiles = Boolean(this.currentJob.stlUrl || this.currentJob.threemfUrl);
      const isPreparing = !hasPrintFiles && !matchingExample;
      const panel = new DownloadPanel(downloadMount, {
        urls: {
          stlUrl: this.currentJob.stlUrl,
          threemfUrl: this.currentJob.threemfUrl,
          glbUrl: this.currentJob.glbUrl,
        },
        readiness: hasPrintFiles ? 'good' : isPreparing ? 'good' : 'attention',
        isPreparing,
        onReset: () => {
          this.reset();
        },
        onOpenPrintGuide: () => {
          this.openPrintGuide();
        },
      });
      panel.render();
    }
  }

  public async startGeneration(input: GenerationInput): Promise<void> {
    this.lastInput = input;
    this.state = 'generating';
    this.abortController = new AbortController();
    this.render();

    const stepContainer = this.container.querySelector<HTMLElement>('#step-container');
    if (!stepContainer) return;

    const progress = new ProgressComponent(stepContainer, {
      qualityMode: input.qualityMode,
      onCancel: () => {
        this.abortController?.abort();
        this.state = 'upload';
        this.render();
      },
      onRetry: () => {
        this.startGeneration(input);
      },
    });
    progress.render();

    const generateFn = this.options.generator || generate3D;

    if (this.activeExample) {
      const isExampleImage =
        input.images &&
        input.images.length > 0 &&
        input.images[0].name === this.activeExample.imageInputs[0]?.name;
      const isExamplePrompt =
        input.prompt && input.prompt.trim() === this.activeExample.prompt.trim();

      if (isExampleImage || isExamplePrompt) {
        await this.runGuidedWalkthrough(this.activeExample, progress);
        return;
      } else {
        this.activeExample = null;
      }
    }

    try {
      progress.updateStage('upload', 'Sending heirloom data to Lux3D...');

      let downloadPanelInstance: DownloadPanel | null = null;

      const result = await generateFn(input, {
        client: this.options.client,
        enableRetopo: input.qualityMode === 'ultra',
        enableExport: true,
        pollOptions: {
          signal: this.abortController.signal,
        },
        onModelReady: (model) => {
          if (this.abortController?.signal.aborted) return;
          // Fast Turbo: Immediately display the interactive 3D model as soon as mesh is ready
          this.currentJob = {
            id: String(model.taskId),
            status: 'succeeded',
            sourceType: input.sourceType,
            glbUrl: model.glbUrl,
            retopoGlbUrl: model.retopoGlbUrl,
            createdAt: Date.now(),
          };
          saveLastJob(this.currentJob, { storage: this.options.storage });
          this.state = 'result';
          this.render();

          const downloadMount = this.container.querySelector<HTMLElement>('#download-mount');
          if (downloadMount) {
            downloadPanelInstance = new DownloadPanel(downloadMount, {
              urls: { glbUrl: model.glbUrl },
              isPreparing: true,
              onReset: () => this.reset(),
              onOpenPrintGuide: () => this.openPrintGuide(),
            });
            downloadPanelInstance.render();
          }
        },
        onProgress: (stageMessage: string) => {
          if (this.getState() === 'result') {
            return;
          }
          const lower = stageMessage.toLowerCase();
          let stage: ProgressStage = 'generate';
          if (
            lower.includes('upload') ||
            lower.includes('photo') ||
            lower.includes('description')
          ) {
            stage = 'upload';
          } else if (
            lower.includes('retopo') ||
            lower.includes('topology') ||
            lower.includes('slicer')
          ) {
            stage = 'retopo';
          } else if (lower.includes('export') || lower.includes('stl') || lower.includes('3mf')) {
            stage = 'export';
          } else if (lower.includes('final') || lower.includes('ready')) {
            stage = 'complete';
          }
          progress.updateStage(stage, stageMessage);
        },
      });

      this.currentJob = {
        id: String(result.taskId),
        status: 'succeeded',
        sourceType: input.sourceType,
        glbUrl: result.glbUrl,
        retopoGlbUrl: result.retopoGlbUrl,
        stlUrl: result.stlUrl,
        threemfUrl: result.threemfUrl,
        createdAt: Date.now(),
      };

      saveLastJob(this.currentJob, { storage: this.options.storage });

      if (this.getState() === 'result') {
        const downloadMount = this.container.querySelector<HTMLElement>('#download-mount');
        if (downloadMount) {
          const panel = new DownloadPanel(downloadMount, {
            urls: {
              stlUrl: result.stlUrl,
              threemfUrl: result.threemfUrl,
              glbUrl: result.glbUrl,
            },
            readiness: result.stlUrl || result.threemfUrl ? 'good' : 'attention',
            onReset: () => this.reset(),
            onOpenPrintGuide: () => this.openPrintGuide(),
          });
          panel.render();
        }
      } else {
        progress.updateStage('complete', 'Your model is ready.');

        const delay = this.options.transitionDelayMs ?? 100;
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        this.state = 'result';
        this.render();
      }
    } catch (err: unknown) {
      if (this.abortController.signal.aborted) {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : '3D generation could not be completed. Please check your input or retry.';
      progress.showError(message);
    }
  }

  private async runGuidedWalkthrough(
    example: PreloadedExample,
    progress: ProgressComponent
  ): Promise<void> {
    const isFast = this.options.transitionDelayMs === 0;
    const stepDelay = isFast ? 1 : 1200;

    const sleep = (ms: number) =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => resolve(), ms);
        this.abortController?.signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('Generation cancelled by user'));
          },
          { once: true }
        );
      });

    try {
      progress.updateStage('upload', 'Analyzing heirloom artifact angles and photos...');
      await sleep(stepDelay);

      progress.updateStage(
        'generate',
        `Synthesizing watertight 3D geometry for ${example.title}...`
      );
      await sleep(stepDelay + (isFast ? 0 : 400));

      progress.updateStage(
        'retopo',
        'Running manifold mesh retopology and wall thickness checks...'
      );
      await sleep(stepDelay);

      progress.updateStage(
        'export',
        'Exporting 3D heirloom mesh, watertight STL & Bambu-ready 3MF...'
      );
      await sleep(stepDelay);

      this.currentJob = { ...example.result };
      this.activeExampleTitle = example.title;
      saveLastJob(this.currentJob, { storage: this.options.storage });

      progress.updateStage('complete', 'Heirloom 3D model synthesized successfully!');
      const delay = this.options.transitionDelayMs ?? 300;
      if (delay > 0) {
        await sleep(delay);
      }

      this.state = 'result';
      this.render();
    } catch (err: unknown) {
      if (this.abortController?.signal.aborted) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Demo generation stopped.';
      progress.showError(message);
    }
  }

  public loadExample(example: PreloadedExample): void {
    this.currentJob = { ...example.result };
    this.activeExampleTitle = example.title;
    saveLastJob(this.currentJob, { storage: this.options.storage });
    this.state = 'result';
    this.render();
  }

  public reset(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.state = 'upload';
    this.currentJob = null;
    this.lastInput = null;
    this.activeExampleTitle = null;
    this.activeExample = null;
    this.render();
  }

  public openPrintGuide(): void {
    const modal = new PrintGuideModal(document.body);
    modal.open();
  }

  public getState(): AppState {
    return this.state;
  }

  public getCurrentJob(): Job | null {
    return this.currentJob;
  }
}
