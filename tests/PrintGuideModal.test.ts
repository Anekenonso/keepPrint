import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrintGuideModal } from '../src/components/PrintGuideModal';
import { DownloadPanel } from '../src/components/DownloadPanel';
import { App } from '../src/App';

vi.mock('@google/model-viewer', () => ({}));

describe('T-15: Short Print-Guide Modal Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
  });

  it('renders modal dialog with accessible attributes and practical slicing tips', () => {
    const modal = new PrintGuideModal(container);
    modal.open();

    expect(modal.isOpen()).toBe(true);

    const dialog = container.querySelector('#print-guide-modal');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('print-guide-title');

    const title = container.querySelector('#print-guide-title');
    expect(title?.textContent).toContain('How to Slice & Print Your Heirloom');

    // Verify all 4 practical heirloom print sections
    const content = container.textContent || '';
    expect(content).toContain('1. Slicer & Orientation');
    expect(content).toContain('2. Infill & Wall Strength');
    expect(content).toContain('3. Organic / Tree Supports');
    expect(content).toContain('4. Material & Finishing');
    expect(content).toContain('Heirloom Preservation Reminder');
  });

  it('closes when the top close icon button is clicked', () => {
    const onClose = vi.fn();
    const modal = new PrintGuideModal(container, { onClose });
    modal.open();

    const closeIcon = container.querySelector<HTMLButtonElement>('#modal-close-icon-btn');
    expect(closeIcon).not.toBeNull();
    closeIcon?.click();

    expect(modal.isOpen()).toBe(false);
    expect(container.querySelector('#print-guide-modal')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the bottom action button is clicked', () => {
    const onClose = vi.fn();
    const modal = new PrintGuideModal(container, { onClose });
    modal.open();

    const closeAction = container.querySelector<HTMLButtonElement>('#modal-close-action-btn');
    expect(closeAction).not.toBeNull();
    closeAction?.click();

    expect(modal.isOpen()).toBe(false);
    expect(container.querySelector('#print-guide-modal')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop outside the dialog is clicked', () => {
    const modal = new PrintGuideModal(container);
    modal.open();

    const backdrop = container.querySelector<HTMLElement>('#print-guide-modal-backdrop');
    expect(backdrop).not.toBeNull();

    // Click backdrop
    backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(modal.isOpen()).toBe(false);
    expect(container.querySelector('#print-guide-modal')).toBeNull();
  });

  it('closes when the Escape key is pressed', () => {
    const modal = new PrintGuideModal(container);
    modal.open();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(modal.isOpen()).toBe(false);
    expect(container.querySelector('#print-guide-modal')).toBeNull();
  });

  it('does not duplicate modal when open() is called multiple times', () => {
    const modal = new PrintGuideModal(container);
    modal.open();
    modal.open();

    const dialogs = container.querySelectorAll('#print-guide-modal');
    expect(dialogs.length).toBe(1);
  });

  it('integrates with DownloadPanel via onOpenPrintGuide callback', () => {
    const onOpenPrintGuide = vi.fn();
    const panel = new DownloadPanel(container, {
      urls: {
        stlUrl: 'https://cdn.example.com/test.stl',
        threemfUrl: 'https://cdn.example.com/test.3mf',
      },
      onOpenPrintGuide,
    });
    panel.render();

    const guideBtn = container.querySelector<HTMLButtonElement>('#open-guide-btn');
    expect(guideBtn).not.toBeNull();
    expect(guideBtn?.textContent).toContain('Slicer & 3D Print Guide');

    guideBtn?.click();
    expect(onOpenPrintGuide).toHaveBeenCalledTimes(1);
  });

  it('opens PrintGuideModal when header guide button in App is clicked', () => {
    const app = new App(container, { checkWebGL: () => true });
    app.render();

    const headerBtn = container.querySelector<HTMLButtonElement>('#header-guide-btn');
    expect(headerBtn).not.toBeNull();
    expect(headerBtn?.textContent).toContain('Print Guide');

    headerBtn?.click();

    const dialog = document.querySelector('#print-guide-modal');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('How to Slice & Print Your Heirloom');
  });
});
