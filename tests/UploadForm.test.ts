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

  describe('T-16: Multi-Image Support (Up to 4 Photos)', () => {
    it('supports uploading multiple photos with angle badges and count display', async () => {
      let submittedPayload: GenerationInput | null = null;
      const form = new UploadForm(container, {
        initialSourceType: 'image',
        onSubmit: (payload) => {
          submittedPayload = payload;
        },
      });
      form.render();

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

      const files = [
        new File(['front'], 'heirloom_front.jpg', { type: 'image/jpeg' }),
        new File(['back'], 'heirloom_back.jpg', { type: 'image/jpeg' }),
        new File(['side'], 'heirloom_side.jpg', { type: 'image/jpeg' }),
      ];

      form.handleFiles(files);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(form.getImages()).toHaveLength(3);

      const countEl = container.querySelector('.previews-count');
      expect(countEl?.textContent).toContain('Uploaded Photos (3/4)');

      const badges = container.querySelectorAll('.angle-badge');
      expect(badges).toHaveLength(3);
      expect(badges[0].textContent).toBe('Front / Main');
      expect(badges[1].textContent).toBe('Back Angle');
      expect(badges[2].textContent).toBe('Side View');

      // Add more card should be visible since < 4
      const addMore = container.querySelector('#add-more-btn');
      expect(addMore).not.toBeNull();
      expect(addMore?.textContent).toContain('Add Angle (4/4)');

      const submitBtn = container.querySelector<HTMLButtonElement>('#submit-btn')!;
      submitBtn.click();

      expect(submittedPayload).not.toBeNull();
      const payload = submittedPayload!;
      expect(payload.images).toHaveLength(3);
      expect(payload.images?.map((img) => img.name)).toEqual([
        'heirloom_front.jpg',
        'heirloom_back.jpg',
        'heirloom_side.jpg',
      ]);

      vi.unstubAllGlobals();
    });

    it('hides add-more button when exactly 4 photos are uploaded', async () => {
      const form = new UploadForm(container, { onSubmit: vi.fn() });
      form.render();

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

      const files = Array.from(
        { length: 4 },
        (_, i) => new File([`img${i}`], `angle-${i + 1}.jpg`, { type: 'image/jpeg' })
      );

      form.handleFiles(files);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(form.getImages()).toHaveLength(4);
      expect(container.querySelector('#add-more-btn')).toBeNull();
      expect(container.querySelector('.previews-count')?.textContent).toContain(
        'Uploaded Photos (4/4)'
      );

      vi.unstubAllGlobals();
    });

    it('re-indexes angle badges when an image in the middle is removed', async () => {
      const form = new UploadForm(container, { onSubmit: vi.fn() });
      form.render();

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

      const files = [
        new File(['f1'], 'front.jpg', { type: 'image/jpeg' }),
        new File(['f2'], 'back.jpg', { type: 'image/jpeg' }),
        new File(['f3'], 'side.jpg', { type: 'image/jpeg' }),
      ];

      form.handleFiles(files);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(form.getImages()).toHaveLength(3);

      // Remove the 2nd photo ("Back Angle")
      const removeButtons = container.querySelectorAll<HTMLButtonElement>('.remove-btn');
      removeButtons[1].click();

      expect(form.getImages()).toHaveLength(2);
      expect(form.getImages()[0].name).toBe('front.jpg');
      expect(form.getImages()[1].name).toBe('side.jpg');

      const badges = container.querySelectorAll('.angle-badge');
      expect(badges[0].textContent).toBe('Front / Main');
      expect(badges[1].textContent).toBe('Back Angle'); // Now re-indexed to 2nd position

      vi.unstubAllGlobals();
    });

    it('renders quality mode cards with Fast Turbo selected by default', () => {
      const onSubmit = vi.fn();
      const form = new UploadForm(container, { onSubmit });
      form.render();

      const turboRadio = container.querySelector<HTMLInputElement>('#quality-turbo')!;
      const ultraRadio = container.querySelector<HTMLInputElement>('#quality-ultra')!;

      expect(turboRadio).not.toBeNull();
      expect(ultraRadio).not.toBeNull();
      expect(turboRadio.checked).toBe(true);
      expect(ultraRadio.checked).toBe(false);
      expect(form.getQualityMode()).toBe('turbo');

      // Verify honest, calibrated timing copy (no ~60s or ~3-4 min claims)
      expect(container.textContent).toContain('Usually 1–3 minutes');
      expect(container.textContent).toContain('Usually 5–8 minutes');
      expect(container.textContent).not.toContain('~60s');
      expect(container.textContent).not.toContain('~3–4 min');
      expect(container.textContent).not.toContain('Instant');
    });

    it('allows toggling quality mode to ultra and includes it in submitted payload', () => {
      let submittedPayload: GenerationInput | null = null;
      const form = new UploadForm(container, {
        initialSourceType: 'text',
        onSubmit: (payload) => {
          submittedPayload = payload;
        },
      });
      form.render();

      const promptInput = container.querySelector<HTMLTextAreaElement>('#prompt-input')!;
      promptInput.value = 'Intricate silver filigree pendant';
      promptInput.dispatchEvent(new Event('input'));

      const ultraRadio = container.querySelector<HTMLInputElement>('#quality-ultra')!;
      ultraRadio.checked = true;
      ultraRadio.dispatchEvent(new Event('change'));

      expect(form.getQualityMode()).toBe('ultra');

      const submitBtn = container.querySelector<HTMLButtonElement>('#submit-btn')!;
      submitBtn.click();

      expect(submittedPayload).not.toBeNull();
      const finalPayload = submittedPayload as unknown as GenerationInput;
      expect(finalPayload.qualityMode).toBe('ultra');
    });
  });
});
