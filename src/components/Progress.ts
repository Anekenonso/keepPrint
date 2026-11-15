export type ProgressStage = 'upload' | 'generate' | 'retopo' | 'export' | 'complete';

export interface ProgressStepInfo {
  id: ProgressStage;
  label: string;
}

export const PROGRESS_STEPS: ProgressStepInfo[] = [
  { id: 'upload', label: 'Upload heirloom data' },
  { id: 'generate', label: 'Generate 3D mesh' },
  { id: 'retopo', label: 'Optimize topology & printability' },
  { id: 'export', label: 'Export STL & 3MF models' },
];

export interface ProgressComponentOptions {
  onCancel?: () => void;
  onRetry?: () => void;
}

export class ProgressComponent {
  private container: HTMLElement;
  private options: ProgressComponentOptions;
  private currentStage: ProgressStage = 'upload';
  private currentMessage: string = 'Preparing heirloom data...';
  private errorMessage: string | null = null;

  constructor(container: HTMLElement, options?: ProgressComponentOptions) {
    this.container = container;
    this.options = options || {};
  }

  public render(): void {
    const isError = Boolean(this.errorMessage);
    const stageIndex = PROGRESS_STEPS.findIndex((s) => s.id === this.currentStage);
    const progressPercent = isError
      ? 0
      : this.currentStage === 'complete'
        ? 100
        : Math.round(((stageIndex + 1) / (PROGRESS_STEPS.length + 1)) * 100);

    this.container.innerHTML = `
      <div class="progress-card ${isError ? 'progress-error-card' : ''}">
        <div class="progress-header">
          <h3>${isError ? 'Generation Paused' : 'Crafting Your 3D Heirloom'}</h3>
          <p class="progress-message" id="progress-message">
            ${isError ? this.errorMessage : this.currentMessage}
          </p>
        </div>

        ${
          !isError
            ? `
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <div class="progress-steps-list">
            ${PROGRESS_STEPS.map((step, idx) => {
              const isPast = stageIndex > idx || this.currentStage === 'complete';
              const isCurrent = stageIndex === idx && this.currentStage !== 'complete';
              const stateClass = isPast
                ? 'step-completed'
                : isCurrent
                  ? 'step-active'
                  : 'step-pending';
              const icon = isPast ? '✓' : isCurrent ? '●' : '○';

              return `
                <div class="step-item ${stateClass}" data-step="${step.id}">
                  <span class="step-icon">${icon}</span>
                  <span class="step-label">${step.label}</span>
                </div>
              `;
            }).join('')}
          </div>
        `
            : `
          <div class="error-action-container">
            <p class="error-help">Please verify your input or check network connectivity.</p>
            <button type="button" class="retry-btn" id="retry-btn">Try Again</button>
          </div>
        `
        }

        ${
          !isError && this.options.onCancel
            ? `
          <div class="cancel-container">
            <button type="button" class="cancel-btn" id="cancel-btn">Cancel Generation</button>
          </div>
        `
            : ''
        }
      </div>
    `;

    this.attachEvents();
  }

  private attachEvents(): void {
    const cancelBtn = this.container.querySelector<HTMLButtonElement>('#cancel-btn');
    cancelBtn?.addEventListener('click', () => {
      this.options.onCancel?.();
    });

    const retryBtn = this.container.querySelector<HTMLButtonElement>('#retry-btn');
    retryBtn?.addEventListener('click', () => {
      this.options.onRetry?.();
    });
  }

  public updateStage(stage: ProgressStage, message?: string): void {
    this.currentStage = stage;
    this.errorMessage = null;
    if (message) {
      this.currentMessage = message;
    }
    this.render();
  }

  public setMessage(message: string): void {
    this.currentMessage = message;
    const msgEl = this.container.querySelector<HTMLElement>('#progress-message');
    if (msgEl) {
      msgEl.textContent = message;
    }
  }

  public showError(message: string): void {
    this.errorMessage = message;
    this.render();
  }

  public getCurrentStage(): ProgressStage {
    return this.currentStage;
  }

  public getCurrentMessage(): string {
    return this.errorMessage || this.currentMessage;
  }
}
