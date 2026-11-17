export interface PrintGuideModalOptions {
  onClose?: () => void;
}

export class PrintGuideModal {
  private container: HTMLElement;
  private options: PrintGuideModalOptions;
  private modalElement: HTMLElement | null = null;
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;

  constructor(container: HTMLElement = document.body, options?: PrintGuideModalOptions) {
    this.container = container;
    this.options = options || {};
  }

  public open(): void {
    if (this.modalElement) {
      return; // Already open
    }

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.id = 'print-guide-modal-backdrop';
    modal.setAttribute('role', 'presentation');

    modal.innerHTML = `
      <div
        class="modal-dialog card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-guide-title"
        id="print-guide-modal"
      >
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-badge">3D Print Guide</span>
            <h2 id="print-guide-title">How to Slice & Print Your Heirloom</h2>
            <p class="modal-subtitle">Practical slicer settings to ensure your replica looks, feels, and endures like the original.</p>
          </div>
          <button type="button" class="btn-close-modal" id="modal-close-icon-btn" aria-label="Close guide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="modal-content">
          <div class="guide-grid">
            <div class="guide-card">
              <div class="guide-card-header">
                <h3>1. Slicer &amp; Orientation</h3>
              </div>
              <p>
                Open <strong>PrusaSlicer</strong>, <strong>Bambu Studio</strong>, or <strong>Cura</strong> and import your downloaded <code>.stl</code> or <code>.3mf</code> file.
              </p>
              <ul>
                <li>Rotate the model so its flattest base rests squarely on the build plate.</li>
                <li>Avoid orienting delicate thin features horizontally across layer lines.</li>
              </ul>
            </div>

            <div class="guide-card">
              <div class="guide-card-header">
                <h3>2. Infill &amp; Wall Strength</h3>
              </div>
              <p>
                Heirlooms feel best when they have authentic physical weight in your hands:
              </p>
              <ul>
                <li><strong>Infill:</strong> 15%–20% <em>Gyroid</em> or <em>Grid</em> infill for durable internal support.</li>
                <li><strong>Walls:</strong> 3 or 4 perimeters (approx 1.2–1.6mm thickness) for solid structural feel.</li>
              </ul>
            </div>

            <div class="guide-card">
              <div class="guide-card-header">
                <h3>3. Organic / Tree Supports</h3>
              </div>
              <p>
                Protect intricate heirloom surface textures from scarring:
              </p>
              <ul>
                <li>Enable <strong>Tree / Organic Supports</strong> rather than standard block supports.</li>
                <li>Set overhang threshold to <strong>45°–50°</strong>. Tree supports break away cleanly without damaging delicate carvings.</li>
              </ul>
            </div>

            <div class="guide-card">
              <div class="guide-card-header">
                <h3>4. Material &amp; Finishing</h3>
              </div>
              <p>
                Match your printing material to the heritage of the object:
              </p>
              <ul>
                <li><strong>Wood Artifacts:</strong> Wood-filled PLA (can be stained and sanded).</li>
                <li><strong>Ceramics / Stone:</strong> Matte PLA or Marble PLA for a calm, non-reflective finish.</li>
                <li><strong>Metal Ornaments:</strong> Silk Bronze PLA or SLA resin for high-detail jewelry.</li>
              </ul>
            </div>
          </div>

          <div class="guide-preservation-note">
            <svg class="preservation-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div>
              <strong>Heirloom Preservation Reminder:</strong>
              <p>Your replica allows distant relatives to hold, display, and celebrate family history while the original heirloom stays safe at home.</p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-primary" id="modal-close-action-btn">
            Got it, Close Guide
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(modal);
    this.modalElement = modal;

    // Attach close events
    const closeIconBtn = modal.querySelector<HTMLButtonElement>('#modal-close-icon-btn');
    const closeActionBtn = modal.querySelector<HTMLButtonElement>('#modal-close-action-btn');

    closeIconBtn?.addEventListener('click', () => this.close());
    closeActionBtn?.addEventListener('click', () => this.close());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.close();
      }
    });

    this.keydownListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    window.addEventListener('keydown', this.keydownListener);

    // Focus close button for accessibility
    closeActionBtn?.focus();
  }

  public close(): void {
    if (!this.modalElement) {
      return;
    }

    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }

    this.modalElement.remove();
    this.modalElement = null;

    if (this.options.onClose) {
      this.options.onClose();
    }
  }

  public isOpen(): boolean {
    return this.modalElement !== null;
  }
}
