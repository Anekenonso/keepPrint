import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressComponent } from '../src/components/Progress';

describe('TS-07: Progress Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders initial stage text and step list (R-03)', () => {
    const progress = new ProgressComponent(container);
    progress.render();

    expect(container.querySelector('h3')?.textContent).toBe('Crafting Your 3D Heirloom');
    expect(container.querySelector('#progress-message')?.textContent?.trim()).toBe(
      'Preparing heirloom data...'
    );

    const stepItems = container.querySelectorAll('.step-item');
    expect(stepItems).toHaveLength(4);
  });

  it('updates stage and shows correct stage text (TS-07)', () => {
    const progress = new ProgressComponent(container);
    progress.render();

    progress.updateStage('generate', 'Generating 3D heirloom mesh in Lux3D...');

    const msgEl = container.querySelector('#progress-message');
    expect(msgEl?.textContent?.trim()).toBe('Generating 3D heirloom mesh in Lux3D...');
    expect(progress.getCurrentStage()).toBe('generate');

    const activeStep = container.querySelector('.step-active');
    expect(activeStep?.getAttribute('data-step')).toBe('generate');

    const completedStep = container.querySelector('.step-completed');
    expect(completedStep?.getAttribute('data-step')).toBe('upload');
  });

  it('progresses through retopology and export stages', () => {
    const progress = new ProgressComponent(container);
    progress.render();

    progress.updateStage('retopo', 'Optimizing topology for 3D slicer...');
    expect(container.querySelector('.step-active')?.getAttribute('data-step')).toBe('retopo');

    progress.updateStage('export', 'Generating STL and 3MF files...');
    expect(container.querySelector('.step-active')?.getAttribute('data-step')).toBe('export');

    progress.updateStage('complete', 'Your model is ready.');
    expect(container.querySelectorAll('.step-completed')).toHaveLength(4);
  });

  it('renders mode-aware timing hint for Turbo (Usually 1–3 minutes)', () => {
    const progress = new ProgressComponent(container, { qualityMode: 'turbo' });
    progress.render();

    const hint = container.querySelector('.progress-hint');
    expect(hint?.textContent).toContain('Fast mode usually takes 1–3 minutes');
    expect(hint?.textContent).not.toContain('25–45 seconds');
  });

  it('renders mode-aware timing hint for Ultra (Usually 5–8 minutes)', () => {
    const progress = new ProgressComponent(container, { qualityMode: 'ultra' });
    progress.render();

    const hint = container.querySelector('.progress-hint');
    expect(hint?.textContent).toContain('Detailed mode usually takes 5–8 minutes');
    expect(hint?.textContent).not.toContain('Fast mode');
  });

  it('shows user-facing error state and retry button on failure', () => {
    const onRetry = vi.fn();
    const progress = new ProgressComponent(container, { onRetry });
    progress.render();

    progress.showError('Generation timed out. Please check your connection.');

    expect(container.querySelector('h3')?.textContent).toBe('Generation Paused');
    expect(container.querySelector('#progress-message')?.textContent?.trim()).toBe(
      'Generation timed out. Please check your connection.'
    );

    const retryBtn = container.querySelector<HTMLButtonElement>('#retry-btn');
    expect(retryBtn).not.toBeNull();
    retryBtn?.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('triggers onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    const progress = new ProgressComponent(container, { onCancel });
    progress.render();

    const cancelBtn = container.querySelector<HTMLButtonElement>('#cancel-btn');
    expect(cancelBtn).not.toBeNull();
    cancelBtn?.click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
