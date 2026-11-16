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
            <div class="brand-title-row">
              <img src="/favicon.svg" alt="Keepprint logo" class="brand-logo" width="36" height="36" />
              <h1>Keepprint</h1>
            </div>
            <p>Keep the original safe. Print a copy you can hold.</p>
          </div>
          <button type="button" class="btn-guide-header" id="header-guide-btn" title="View 3D Printing & Slicing Guide">
            <span class="guide-icon">📖</span> Print Guide
          </button>
        </div>
      </header>
      <main class="card" id="main-content" role="main">
        <div id="step-container"></div>
      </main>
    `;

    const headerGuideBtn = this.container.querySelector<HTMLButtonElement>('#header-guide-btn');
    headerGuideBtn?.addEventListener('click', () => {
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
            <span class="restore-icon">✨</span>
            <span>A previously generated heirloom model is available.</span>
          </div>
          <div class="restore-actions">
            <button type="button" class="btn-restore" id="restore-job-btn">View Previous Model</button>
            <button type="button" class="btn-text-subtle" id="dismiss-job-btn" title="Dismiss">✕</button>
          </div>
        </div>
      `;
    }

    parent.innerHTML = `
      ${bannerHtml}
      <div id="examples-mount"></div>
      <div id="upload-form-mount"></div>
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
        onSelectPreview: (example) => {
          this.loadExample(example);
        },
        onLoadInput: (example, mode) => {
          if (mode === 'image') {
            uploadForm?.setImages(example.imageInputs);
          } else {
            uploadForm?.setPrompt(example.prompt);
          }
          const target = formMount || examplesMount;
          if (target && typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            <span class="example-result-badge">⚖️ Judge & Demo Sample</span>
            <span class="example-result-title"><strong>${matchingExample.title}</strong></span>
            <span class="example-result-meta">• Generated with Aholo Lux3D G1 (Task #${matchingExample.meta.aholoTaskId})</span>
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

    if (viewerMount && this.currentJob) {
      const viewer = new ViewerComponent(viewerMount, {
        glbUrl: this.currentJob.retopoGlbUrl || this.currentJob.glbUrl,
        altText: 'Interactive 3D model of your family heirloom',
        checkWebGL: this.options.checkWebGL,
      });
      viewer.render();
    }

    if (downloadMount && this.currentJob) {
      const panel = new DownloadPanel(downloadMount, {
        urls: {
          stlUrl: this.currentJob.stlUrl,
          threemfUrl: this.currentJob.threemfUrl,
          glbUrl: this.currentJob.glbUrl,
        },
        readiness: this.currentJob.stlUrl || this.currentJob.threemfUrl ? 'good' : 'attention',
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

    try {
      progress.updateStage('upload', 'Sending heirloom data to Lux3D...');

      const result = await generateFn(input, {
        client: this.options.client,
        enableRetopo: true,
        enableExport: true,
        pollOptions: {
          signal: this.abortController.signal,
        },
        onProgress: (stageMessage: string) => {
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

      progress.updateStage('complete', 'Your model is ready.');

      const delay = this.options.transitionDelayMs ?? 100;
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      this.state = 'result';
      this.render();
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

  public loadExample(example: PreloadedExample): void {
    this.currentJob = { ...example.result };
    this.activeExampleTitle = example.title;
    saveLastJob(this.currentJob, { storage: this.options.storage });
    this.state = 'result';
    this.render();
  }

  public reset(): void {
    this.state = 'upload';
    this.currentJob = null;
    this.lastInput = null;
    this.activeExampleTitle = null;
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
