import { PRELOADED_EXAMPLES, type PreloadedExample } from '../lib/examples';

export interface JudgeExamplesOptions {
  onWalkthrough: (example: PreloadedExample) => void;
  onLoadInput: (example: PreloadedExample, mode?: 'image' | 'text') => void;
  onSelectPreview?: (example: PreloadedExample) => void;
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
      <section class="examples-sidebar-card" id="judge-examples-section" aria-labelledby="examples-sidebar-title">
        <div class="examples-sidebar-header">
          <div class="sidebar-badge-row">
            <span class="sidebar-chip">Curated Specimens</span>
          </div>
          <h3 id="examples-sidebar-title" class="sidebar-title">Sample Heirloom Artifacts</h3>
          <p class="sidebar-desc">
            Experience the complete 3D generation flow without uploading an artifact yourself.
          </p>
        </div>

        <div class="sidebar-examples-list">
          ${PRELOADED_EXAMPLES.map((ex) => this.renderItem(ex)).join('')}
        </div>
      </section>
    `;

    this.attachEvents();
  }

  private renderItem(ex: PreloadedExample): string {
    return `
      <article class="sidebar-example-item" data-example-id="${ex.id}">
        <div class="sidebar-item-thumb-row">
          <div class="sidebar-img-wrap">
            <img src="${ex.thumbnailUrl}" alt="${ex.title}" class="sidebar-item-img" loading="lazy" />
          </div>
          <div class="sidebar-item-header">
            <span class="sidebar-item-badge">${ex.badge}</span>
            <h4 class="sidebar-item-title">${ex.title}</h4>
            <span class="sidebar-item-origin">${ex.origin}</span>
          </div>
        </div>
        <p class="sidebar-item-summary">${ex.summary}</p>
        <div class="sidebar-item-actions">
          <button
            type="button"
            class="btn-walkthrough"
            data-action="walkthrough"
            data-id="${ex.id}"
            title="Experience full 3D generation walkthrough with this artifact"
          >
            <svg class="btn-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run Guided 3D Flow
          </button>
          <div class="sidebar-sub-actions">
            <button
              type="button"
              class="btn-load-only"
              data-action="load-image"
              data-id="${ex.id}"
              title="Pre-populate the upload form with this artifact photo"
            >
              Load Photo into Form &rarr;
            </button>
            <button
              type="button"
              class="btn-load-text"
              data-action="load-text"
              data-id="${ex.id}"
              title="Load the curated prompt into description form"
            >
              Load Prompt
            </button>
          </div>
        </div>
      </article>
    `;
  }

  private attachEvents(): void {
    const walkthroughBtns = this.container.querySelectorAll<HTMLButtonElement>(
      'button[data-action="walkthrough"], button[data-action="preview"]'
    );
    walkthroughBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const example = PRELOADED_EXAMPLES.find((e) => e.id === id);
        if (example) {
          if (this.options.onWalkthrough) {
            this.options.onWalkthrough(example);
          } else if (this.options.onSelectPreview) {
            this.options.onSelectPreview(example);
          }
        }
      });
    });

    const imageLoadBtns = this.container.querySelectorAll<HTMLButtonElement>(
      'button[data-action="load-only"], button[data-action="load-image"]'
    );
    imageLoadBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const example = PRELOADED_EXAMPLES.find((e) => e.id === id);
        if (example) {
          this.options.onLoadInput(example, 'image');
        }
      });
    });

    const textLoadBtns = this.container.querySelectorAll<HTMLButtonElement>(
      'button[data-action="load-text"]'
    );
    textLoadBtns.forEach((btn) => {
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
