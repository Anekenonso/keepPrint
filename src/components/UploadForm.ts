import type { GenerationInput, ImageInputItem, QualityMode, SourceType } from '../lib/types';
import {
  validateImageFile,
  validatePrompt,
  validateGenerationInput,
  MAX_IMAGE_COUNT,
} from '../lib/validation';

export interface UploadFormOptions {
  onSubmit: (payload: GenerationInput) => void;
  initialSourceType?: SourceType;
  initialQualityMode?: QualityMode;
}

export class UploadForm {
  private container: HTMLElement;
  private options: UploadFormOptions;
  private sourceType: SourceType;
  private qualityMode: QualityMode;
  private images: ImageInputItem[] = [];
  private promptText: string = '';
  private errorMessage: string | null = null;

  constructor(container: HTMLElement, options: UploadFormOptions) {
    this.container = container;
    this.options = options;
    this.sourceType = options.initialSourceType || 'image';
    this.qualityMode = options.initialQualityMode || 'turbo';
  }

  public render(): void {
    this.container.innerHTML = `
      <form class="upload-form" id="heirloom-form">
        <div class="mode-tabs" role="tablist">
          <button
            type="button"
            class="tab-btn ${this.sourceType === 'image' ? 'active' : ''}"
            id="tab-image"
            role="tab"
            aria-selected="${this.sourceType === 'image'}"
          >
            Upload Photo(s)
          </button>
          <button
            type="button"
            class="tab-btn ${this.sourceType === 'text' ? 'active' : ''}"
            id="tab-text"
            role="tab"
            aria-selected="${this.sourceType === 'text'}"
          >
            Describe Heirloom
          </button>
        </div>

        <div class="tab-content" id="image-panel" style="${
          this.sourceType === 'image' ? 'display: block;' : 'display: none;'
        }">
          <div
            class="drop-zone"
            id="drop-zone"
            tabindex="0"
            role="button"
            aria-label="Upload heirloom photos"
          >
            <div class="drop-zone-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <p class="drop-zone-prompt">Click or drag 1–4 photos here</p>
            <p class="drop-zone-hint">Clear, well-lit photos work best (JPEG, PNG, WebP up to 10MB each)</p>
            <input
              type="file"
              id="file-input"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style="display: none;"
            />
          </div>

          <div class="image-previews" id="image-previews">
            ${this.renderPreviews()}
          </div>
        </div>

        <div class="tab-content" id="text-panel" style="${
          this.sourceType === 'text' ? 'display: block;' : 'display: none;'
        }">
          <label for="prompt-input" class="field-label">
            Describe your heirloom in detail:
          </label>
          <textarea
            id="prompt-input"
            class="prompt-textarea"
            rows="4"
            placeholder="e.g. 19th-century hand-carved mahogany jewelry box with curved lid, brass latch, and floral relief on all sides..."
          >${this.promptText}</textarea>
          <p class="field-hint">Include details about shape, ornaments, dimensions, and materials.</p>
        </div>

        <div
          class="form-error"
          id="form-error"
          role="alert"
          style="${this.errorMessage ? 'display: block;' : 'display: none;'}"
        >
          ${this.errorMessage || ''}
        </div>

        <div class="quality-mode-container">
          <label class="field-label">Generation Speed & Model:</label>
          <div class="quality-mode-cards" role="radiogroup" aria-label="Generation speed and model mode">
            <label class="quality-card ${this.qualityMode === 'turbo' ? 'selected' : ''}" for="quality-turbo">
              <input
                type="radio"
                name="quality-mode"
                id="quality-turbo"
                value="turbo"
                ${this.qualityMode === 'turbo' ? 'checked' : ''}
              />
              <div class="quality-card-content">
                <div class="quality-title-row">
                  <span class="quality-badge fast">
                    <svg class="quality-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    Fast (Turbo)
                  </span>
                  <span class="quality-time">Usually 1–3 minutes</span>
                </div>
                <p class="quality-desc">Recommended for 3D printing. Targeted 80k face mesh with background slicer export.</p>
              </div>
            </label>
            <label class="quality-card ${this.qualityMode === 'ultra' ? 'selected' : ''}" for="quality-ultra">
              <input
                type="radio"
                name="quality-mode"
                id="quality-ultra"
                value="ultra"
                ${this.qualityMode === 'ultra' ? 'checked' : ''}
              />
              <div class="quality-card-content">
                <div class="quality-title-row">
                  <span class="quality-badge ultra">
                    <svg class="quality-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>
                    Detailed (Ultra)
                  </span>
                  <span class="quality-time">Usually 5–8 minutes</span>
                </div>
                <p class="quality-desc">High-detail neural mesh generation for intricate carvings and heritage keepsakes.</p>
              </div>
            </label>
          </div>
        </div>

        <button type="submit" class="submit-btn" id="submit-btn">
          Generate 3D Model
        </button>
      </form>
    `;

    this.attachEvents();
  }

  public getAngleLabel(index: number): string {
    const labels = ['Front / Main', 'Back Angle', 'Side View', 'Top / Detail'];
    return labels[index] || `Angle ${index + 1}`;
  }

  private renderPreviews(): string {
    if (this.images.length === 0) return '';

    const cardsHtml = this.images
      .map(
        (img, index) => `
        <div class="preview-card" data-index="${index}">
          <div class="preview-badge-row">
            <span class="angle-badge">${this.getAngleLabel(index)}</span>
            <button type="button" class="remove-btn" data-index="${index}" aria-label="Remove image">
              &times;
            </button>
          </div>
          <img src="${img.dataUrl || ''}" alt="${img.name}" class="preview-img" />
          <span class="preview-name">${img.name}</span>
        </div>
      `
      )
      .join('');

    const addMoreHtml =
      this.images.length < MAX_IMAGE_COUNT
        ? `
        <div class="add-more-card" id="add-more-btn" role="button" tabindex="0" title="Add another angle photo">
          <svg class="add-more-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          <span class="add-more-text">Add Angle (${this.images.length + 1}/4)</span>
        </div>
      `
        : '';

    return `
      <div class="previews-header">
        <span class="previews-count">Uploaded Photos (${this.images.length}/${MAX_IMAGE_COUNT})</span>
        <span class="previews-hint">Multi-angle photos improve 3D mesh quality</span>
      </div>
      <div class="previews-grid">
        ${cardsHtml}
        ${addMoreHtml}
      </div>
    `;
  }

  private attachEvents(): void {
    const tabImage = this.container.querySelector<HTMLButtonElement>('#tab-image');
    const tabText = this.container.querySelector<HTMLButtonElement>('#tab-text');
    const imagePanel = this.container.querySelector<HTMLElement>('#image-panel');
    const textPanel = this.container.querySelector<HTMLElement>('#text-panel');
    const dropZone = this.container.querySelector<HTMLElement>('#drop-zone');
    const fileInput = this.container.querySelector<HTMLInputElement>('#file-input');
    const promptInput = this.container.querySelector<HTMLTextAreaElement>('#prompt-input');
    const form = this.container.querySelector<HTMLFormElement>('#heirloom-form');

    tabImage?.addEventListener('click', () => {
      this.sourceType = 'image';
      tabImage.classList.add('active');
      tabImage.setAttribute('aria-selected', 'true');
      tabText?.classList.remove('active');
      tabText?.setAttribute('aria-selected', 'false');
      if (imagePanel) imagePanel.style.display = 'block';
      if (textPanel) textPanel.style.display = 'none';
      this.clearError();
    });

    tabText?.addEventListener('click', () => {
      this.sourceType = 'text';
      tabText.classList.add('active');
      tabText.setAttribute('aria-selected', 'true');
      tabImage?.classList.remove('active');
      tabImage?.setAttribute('aria-selected', 'false');
      if (textPanel) textPanel.style.display = 'block';
      if (imagePanel) imagePanel.style.display = 'none';
      this.clearError();
    });

    dropZone?.addEventListener('click', () => fileInput?.click());
    dropZone?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput?.click();
      }
    });

    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone?.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer?.files) {
        this.handleFiles(Array.from(e.dataTransfer.files));
      }
    });

    fileInput?.addEventListener('change', () => {
      if (fileInput.files) {
        this.handleFiles(Array.from(fileInput.files));
        fileInput.value = '';
      }
    });

    promptInput?.addEventListener('input', () => {
      this.promptText = promptInput.value;
      this.clearError();
    });

    this.container.querySelectorAll<HTMLButtonElement>('.remove-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = Number(btn.getAttribute('data-index'));
        this.removeImage(index);
      });
    });

    const addMoreBtn = this.container.querySelector<HTMLElement>('#add-more-btn');
    addMoreBtn?.addEventListener('click', () => fileInput?.click());
    addMoreBtn?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput?.click();
      }
    });

    const qualityInputs = this.container.querySelectorAll<HTMLInputElement>(
      'input[name="quality-mode"]'
    );
    qualityInputs.forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) {
          this.qualityMode = input.value as QualityMode;
          this.container.querySelectorAll('.quality-card').forEach((card) => {
            card.classList.remove('selected');
          });
          input.closest('.quality-card')?.classList.add('selected');
        }
      });
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  public handleFiles(files: File[]): void {
    if (this.images.length + files.length > MAX_IMAGE_COUNT) {
      this.showError(`You can upload at most ${MAX_IMAGE_COUNT} photos.`);
      return;
    }

    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.success) {
        this.showError(validation.error);
        return;
      }
    }

    const readPromises = files.map(
      (file) =>
        new Promise<ImageInputItem>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            // Downscale oversized camera photos (>1600px) client-side to save upload bandwidth
            if (
              typeof Image === 'undefined' ||
              typeof document === 'undefined' ||
              file.size < 600 * 1024
            ) {
              resolve({
                name: file.name,
                size: file.size,
                type: file.type,
                dataUrl,
                file,
              });
              return;
            }

            const img = new Image();
            img.onload = () => {
              const MAX_DIM = 1600;
              let { width, height } = img;
              if (width <= MAX_DIM && height <= MAX_DIM) {
                resolve({
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  dataUrl,
                  file,
                });
                return;
              }

              if (width > height) {
                if (width > MAX_DIM) {
                  height = Math.round((height * MAX_DIM) / width);
                  width = MAX_DIM;
                }
              } else {
                if (height > MAX_DIM) {
                  width = Math.round((width * MAX_DIM) / height);
                  height = MAX_DIM;
                }
              }

              try {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  resolve({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    dataUrl,
                    file,
                  });
                  return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                const compressed = canvas.toDataURL('image/jpeg', 0.88);
                resolve({
                  name: file.name,
                  size: compressed.length,
                  type: 'image/jpeg',
                  dataUrl: compressed,
                  file,
                });
              } catch {
                resolve({
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  dataUrl,
                  file,
                });
              }
            };
            img.onerror = () => {
              resolve({
                name: file.name,
                size: file.size,
                type: file.type,
                dataUrl,
                file,
              });
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readPromises).then((newItems) => {
      this.images.push(...newItems);
      this.clearError();
      this.render();
    });
  }

  public removeImage(index: number): void {
    if (index >= 0 && index < this.images.length) {
      this.images.splice(index, 1);
      this.render();
    }
  }

  public handleSubmit(): void {
    if (this.sourceType === 'text') {
      const promptValidation = validatePrompt(this.promptText);
      if (!promptValidation.success) {
        this.showError(promptValidation.error);
        return;
      }
    }

    const payload: GenerationInput = {
      sourceType: this.sourceType,
      prompt: this.promptText.trim() || undefined,
      images: this.images.length > 0 ? this.images : undefined,
      qualityMode: this.qualityMode,
    };

    const validation = validateGenerationInput(payload);
    if (!validation.success) {
      this.showError(validation.errors[0] || 'Please provide valid heirloom input.');
      return;
    }

    this.clearError();
    this.options.onSubmit(payload);
  }

  public getQualityMode(): QualityMode {
    return this.qualityMode;
  }

  public setQualityMode(mode: QualityMode): void {
    this.qualityMode = mode;
    this.clearError();
    this.render();
  }

  public showError(msg: string): void {
    this.errorMessage = msg;
    const errorEl = this.container.querySelector<HTMLElement>('#form-error');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
  }

  public clearError(): void {
    this.errorMessage = null;
    const errorEl = this.container.querySelector<HTMLElement>('#form-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }

  public getImages(): ImageInputItem[] {
    return [...this.images];
  }

  public getPrompt(): string {
    return this.promptText;
  }

  public setSourceType(type: SourceType): void {
    this.sourceType = type;
    this.clearError();
    this.render();
  }

  public setPrompt(prompt: string): void {
    this.promptText = prompt;
    this.sourceType = 'text';
    this.clearError();
    this.render();
  }

  public setImages(images: ImageInputItem[]): void {
    this.images = [...images];
    this.sourceType = 'image';
    this.clearError();
    this.render();
  }
}
