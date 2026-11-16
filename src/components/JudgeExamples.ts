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
      <section class="examples-section" id="judge-examples-section" aria-labelledby="examples-title">
        <div class="examples-header">
          <div class="examples-title-row">
            <span class="examples-badge-chip">⚖️ Judge & Demo Testing</span>
            <span class="examples-count-pill">2 Preloaded Heirlooms</span>
          </div>
          <h3 id="examples-title" class="examples-title">Preloaded Heirloom Models for Immediate Evaluation</h3>
          <p class="examples-subtitle">
            Inspect live 3D models and print-ready downloads right away without waiting 6–12 minutes for cloud GPU queues, or test-drive the generation form with curated sample data.
          </p>
        </div>

        <div class="examples-grid">
          ${PRELOADED_EXAMPLES.map((ex) => this.renderCard(ex)).join('')}
        </div>
      </section>
    `;

    this.attachEvents();
  }

  private renderCard(ex: PreloadedExample): string {
    return `
      <article class="example-card" data-example-id="${ex.id}">
        <div class="example-thumbnail-wrap">
          <img src="${ex.thumbnailUrl}" alt="${ex.title}" class="example-thumbnail" loading="lazy" />
          <span class="example-category-badge badge-${ex.category}">${ex.badge}</span>
        </div>
        <div class="example-content">
          <div class="example-origin">${ex.origin}</div>
          <h4 class="example-name">${ex.title}</h4>
          <p class="example-summary">${ex.summary}</p>
          <div class="example-meta-tags">
            <span class="meta-tag">⚡ Aholo G1 Mesh</span>
            <span class="meta-tag">🧊 Watertight STL</span>
            <span class="meta-tag">📦 Slicer 3MF</span>
          </div>
          <div class="example-actions">
            <button
              type="button"
              class="btn-example-preview"
              data-action="preview"
              data-id="${ex.id}"
              title="Instantly view the interactive 3D model and test downloads"
            >
              <span class="btn-icon">⚡</span> Instant 3D Preview (No Wait)
            </button>
            <div class="example-secondary-actions">
              <button
                type="button"
                class="btn-example-load"
                data-action="load-image"
                data-id="${ex.id}"
                title="Load sample photo into generator form"
              >
                <span class="btn-icon">📷</span> Load Photo
              </button>
              <button
                type="button"
                class="btn-example-load-subtle"
                data-action="load-text"
                data-id="${ex.id}"
                title="Load sample description into generator form"
              >
                <span class="btn-icon">✍️</span> Load Prompt
              </button>
            </div>
          </div>
        </div>
      </article>
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
