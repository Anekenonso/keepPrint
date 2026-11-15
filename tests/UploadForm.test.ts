import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadForm } from '../src/components/UploadForm';
import type { GenerationInput } from '../src/lib/types';

describe('TS-06: UploadForm Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders mode tabs, dropzone, and submit button', () => {
    const onSubmit = vi.fn();
    const form = new UploadForm(container, { onSubmit });
    form.render();

    expect(container.querySelector('#tab-image')).not.toBeNull();
    expect(container.querySelector('#tab-text')).not.toBeNull();
    expect(container.querySelector('#drop-zone')).not.toBeNull();
    expect(container.querySelector('#submit-btn')).not.toBeNull();
    expect(container.querySelector('#submit-btn')?.textContent?.trim()).toBe('Generate 3D Model');
  });

  it('switches between photo and description panels', () => {
    const onSubmit = vi.fn();
    const form = new UploadForm(container, { onSubmit });
    form.render();

    const tabText = container.querySelector<HTMLButtonElement>('#tab-text')!;
    const imagePanel = container.querySelector<HTMLElement>('#image-panel')!;
    const textPanel = container.querySelector<HTMLElement>('#text-panel')!;

    expect(imagePanel.style.display).toBe('block');
    expect(textPanel.style.display).toBe('none');

    tabText.click();

    expect(imagePanel.style.display).toBe('none');
    expect(textPanel.style.display).toBe('block');
  });

  it('submits clean payload on valid text description (R-02)', () => {
    let submittedPayload: GenerationInput | null = null;
    const form = new UploadForm(container, {
      initialSourceType: 'text',
      onSubmit: (payload) => {
        submittedPayload = payload;
      },
    });
    form.render();

    const promptInput = container.querySelector<HTMLTextAreaElement>('#prompt-input')!;
    promptInput.value = 'Bronze ceremonial vessel with dragon handle';
    promptInput.dispatchEvent(new Event('input'));

    const submitBtn = container.querySelector<HTMLButtonElement>('#submit-btn')!;
    submitBtn.click();

    expect(submittedPayload).not.toBeNull();
    const payload = submittedPayload!;
    expect(payload.sourceType).toBe('text');
    expect(payload.prompt).toBe('Bronze ceremonial vessel with dragon handle');
    expect(payload.images).toBeUndefined();
  });

  it('shows error on empty submit and does not emit payload', () => {
    const onSubmit = vi.fn();
    const form = new UploadForm(container, {
      initialSourceType: 'text',
      onSubmit,
    });
    form.render();

    const submitBtn = container.querySelector<HTMLButtonElement>('#submit-btn')!;
    submitBtn.click();

    expect(onSubmit).not.toHaveBeenCalled();
    const errorEl = container.querySelector<HTMLElement>('#form-error')!;
    expect(errorEl.style.display).toBe('block');
    expect(errorEl.textContent).toContain('description');
  });

  it('handles image file selection and emits clean payload (R-01)', async () => {
    let submittedPayload: GenerationInput | null = null;
    const form = new UploadForm(container, {
      initialSourceType: 'image',
      onSubmit: (payload) => {
        submittedPayload = payload;
      },
    });
    form.render();

    // Mock file input
    const file = new File(['dummy content'], 'heirloom.png', { type: 'image/png' });

    // Mock FileReader
    class MockFileReader {
      public result: string = 'data:image/png;base64,mocked';
      public onload: (() => void) | null = null;
      public readAsDataURL() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    form.handleFiles([file]);

    // Wait for FileReader
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(form.getImages()).toHaveLength(1);
    expect(form.getImages()[0].name).toBe('heirloom.png');
    expect(container.querySelector('.preview-name')?.textContent).toBe('heirloom.png');

    const submitBtn = container.querySelector<HTMLButtonElement>('#submit-btn')!;
    submitBtn.click();

    expect(submittedPayload).not.toBeNull();
    const payload = submittedPayload!;
    expect(payload.sourceType).toBe('image');
    expect(payload.images).toHaveLength(1);
    expect(payload.images?.[0].name).toBe('heirloom.png');

    vi.unstubAllGlobals();
  });

  it('allows removing an uploaded image', async () => {
    const form = new UploadForm(container, { onSubmit: vi.fn() });
    form.render();

    const file = new File(['content'], 'relic.jpg', { type: 'image/jpeg' });
    class MockFileReader {
      public result: string = 'data:image/jpeg;base64,mocked';
      public onload: (() => void) | null = null;
      public readAsDataURL() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    form.handleFiles([file]);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(form.getImages()).toHaveLength(1);

    const removeBtn = container.querySelector<HTMLButtonElement>('.remove-btn')!;
    removeBtn.click();

    expect(form.getImages()).toHaveLength(0);
    expect(container.querySelector('.preview-card')).toBeNull();

    vi.unstubAllGlobals();
  });

  it('rejects more than 4 images', () => {
    const form = new UploadForm(container, { onSubmit: vi.fn() });
    form.render();

    const files = Array.from(
      { length: 5 },
      (_, i) => new File(['content'], `photo-${i}.jpg`, { type: 'image/jpeg' })
    );

    form.handleFiles(files);

    const errorEl = container.querySelector<HTMLElement>('#form-error')!;
    expect(errorEl.textContent).toContain('at most 4 photos');
    expect(form.getImages()).toHaveLength(0);
  });
});
