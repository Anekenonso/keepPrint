import { PRELOADED_EXAMPLES, type PreloadedExample } from '../lib/examples';

export interface JudgeExamplesOptions {
  onSelectPreview: (example: PreloadedExample) => void;
  onLoadInput: (example: PreloadedExample, mode: 'image' | 'text') => void;
}

export class JudgeExamples {
  private container: HTMLElement;
  private options: JudgeExamplesOptions;

  constructor(container: HTMLElement, options: JudgeExamplesOptions) {
    this.container = container;
    this.options = options;
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="examples-strip" id="judge-examples-section" role="region" aria-label="Sample heirlooms for judge testing">
        <div class="examples-strip-header">
          <span class="examples-strip-icon">⚖️</span>
          <span class="examples-strip-title">Try Sample Heirlooms:</span>
        </div>
        <div class="examples-strip-list">
          ${PRELOADED_EXAMPLES.map((ex) => this.renderItem(ex)).join('')}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderItem(ex: PreloadedExample): string {
    return `
      <div class="example-strip-item" data-example-id="${ex.id}">
        <button
          type="button"
          class="example-strip-link"
          data-action="preview"
          data-id="${ex.id}"
          title="Instant 3D Preview: ${ex.title}"
        >
          <img src="${ex.thumbnailUrl}" alt="${ex.title}" class="strip-thumb" />
          <div class="strip-text">
            <span class="strip-name">${ex.title}</span>
            <span class="strip-action">Instant 3D Preview &rarr;</span>
          </div>
        </button>
        <div class="strip-load-actions">
          <button
            type="button"
            class="btn-strip-load"
            data-action="load-image"
            data-id="${ex.id}"
            title="Load photo into form"
          >
            Photo
          </button>
          <button
            type="button"
            class="btn-strip-load"
            data-action="load-text"
            data-id="${ex.id}"
            title="Load prompt into form"
          >
            Prompt
          </button>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    const previewButtons = this.container.querySelectorAll<HTMLButtonElement>(
      'button[data-action="preview"]'
    );
    previewButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const example = PRELOADED_EXAMPLES.find((e) => e.id === id);
        if (example) {
          this.options.onSelectPreview(example);
        }
      });
    });

    const loadImageButtons = this.container.querySelectorAll<HTMLButtonElement>(
      'button[data-action="load-image"]'
    );
    loadImageButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const example = PRELOADED_EXAMPLES.find((e) => e.id === id);
        if (example) {
          this.options.onLoadInput(example, 'image');
        }
      });
    });

    const loadTextButtons = this.container.querySelectorAll<HTMLButtonElement>(
      'button[data-action="load-text"]'
    );
    loadTextButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const example = PRELOADED_EXAMPLES.find((e) => e.id === id);
        if (example) {
          this.options.onLoadInput(example, 'text');
        }
      });
    });
  }
}
