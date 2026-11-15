import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadPanel } from '../src/components/DownloadPanel';

describe('TS-09: DownloadPanel Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders STL and 3MF download links when URLs are provided (TS-09, R-05)', () => {
    const onDownload = vi.fn();
    const panel = new DownloadPanel(container, {
      urls: {
        stlUrl: 'https://cdn.example.com/heirloom.stl',
        threemfUrl: 'https://cdn.example.com/heirloom.3mf',
        glbUrl: 'https://cdn.example.com/heirloom.glb',
      },
      onDownload,
    });
    panel.render();

    const stlBtn = container.querySelector<HTMLAnchorElement>('#download-stl-btn')!;
    const threemfBtn = container.querySelector<HTMLAnchorElement>('#download-3mf-btn')!;
    const glbBtn = container.querySelector<HTMLAnchorElement>('#download-glb-btn')!;

    expect(stlBtn).not.toBeNull();
    expect(stlBtn.getAttribute('href')).toBe('https://cdn.example.com/heirloom.stl');
    expect(stlBtn.getAttribute('download')).toBe('heirloom.stl');

    expect(threemfBtn).not.toBeNull();
    expect(threemfBtn.getAttribute('href')).toBe('https://cdn.example.com/heirloom.3mf');
    expect(threemfBtn.getAttribute('download')).toBe('heirloom.3mf');

    expect(glbBtn).not.toBeNull();
    expect(glbBtn.getAttribute('href')).toBe('https://cdn.example.com/heirloom.glb');
  });

  it('triggers onDownload callback when a download link is clicked', () => {
    const onDownload = vi.fn();
    const panel = new DownloadPanel(container, {
      urls: {
        stlUrl: 'https://cdn.example.com/heirloom.stl',
        threemfUrl: 'https://cdn.example.com/heirloom.3mf',
      },
      onDownload,
    });
    panel.render();

    const stlBtn = container.querySelector<HTMLAnchorElement>('#download-stl-btn')!;
    stlBtn.click();

    expect(onDownload).toHaveBeenCalledWith('stl', 'https://cdn.example.com/heirloom.stl');

    const threemfBtn = container.querySelector<HTMLAnchorElement>('#download-3mf-btn')!;
    threemfBtn.click();

    expect(onDownload).toHaveBeenCalledWith('3mf', 'https://cdn.example.com/heirloom.3mf');
  });

  it('displays print-readiness badge as Good when files are present (R-07)', () => {
    const panel = new DownloadPanel(container, {
      urls: {
        stlUrl: 'https://cdn.example.com/model.stl',
      },
    });
    panel.render();

    const badgeEl = container.querySelector('.readiness-badge');
    expect(badgeEl?.classList.contains('badge-good')).toBe(true);
    expect(badgeEl?.textContent).toContain('Good');
  });

  it('displays print-readiness badge as Needs attention when no print files exist', () => {
    const panel = new DownloadPanel(container, {
      urls: {},
      readiness: 'attention',
    });
    panel.render();

    const badgeEl = container.querySelector('.readiness-badge');
    expect(badgeEl?.classList.contains('badge-attention')).toBe(true);
    expect(badgeEl?.textContent).toContain('Needs attention');

    // Shows disabled buttons
    const disabledStl = container.querySelector<HTMLButtonElement>('#download-stl-btn')!;
    expect(disabledStl.disabled).toBe(true);
    expect(disabledStl.textContent).toContain('Unavailable');
  });

  it('triggers onReset when create another button is clicked', () => {
    const onReset = vi.fn();
    const panel = new DownloadPanel(container, {
      urls: { stlUrl: 'https://cdn.example.com/model.stl' },
      onReset,
    });
    panel.render();

    const resetBtn = container.querySelector<HTMLButtonElement>('#reset-flow-btn');
    expect(resetBtn).not.toBeNull();
    resetBtn?.click();

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
