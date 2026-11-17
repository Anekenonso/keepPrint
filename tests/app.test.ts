import { describe, it, expect } from 'vitest';
import { App } from '../src/App';
import { PRELOADED_EXAMPLES } from '../src/lib/examples';

describe('App Shell', () => {
  it('renders app shell with header and tagline', () => {
    const container = document.createElement('div');
    const app = new App(container);
    app.render();

    expect(container.querySelector('h1')?.textContent).toBe('Keepprint');
    expect(container.textContent).toContain('Keep the original safe. Print a copy you can hold.');
  });

  it('renders brand logo link with proper accessibility attributes', () => {
    const container = document.createElement('div');
    const app = new App(container);
    app.render();

    const logoLink = container.querySelector<HTMLAnchorElement>('#brand-logo-link');
    expect(logoLink).not.toBeNull();
    expect(logoLink?.getAttribute('href')).toBe('/');
    expect(logoLink?.getAttribute('aria-label')).toContain('Keepprint Home');
  });

  it('clicking logo returns to homepage and resets state when viewing results', () => {
    const container = document.createElement('div');
    const app = new App(container);
    app.render();

    // Put app in result state using a preloaded example
    app.loadExample(PRELOADED_EXAMPLES[0]);

    expect(app.getState()).toBe('result');
    expect(app.getCurrentJob()).not.toBeNull();

    // Click brand logo
    const logoLink = container.querySelector<HTMLAnchorElement>('#brand-logo-link')!;
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    logoLink.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(app.getState()).toBe('upload');
    expect(app.getCurrentJob()).toBeNull();
    expect(container.querySelector('#heirloom-form')).not.toBeNull();
  });

  it('clicking footer brand link also returns to homepage', () => {
    const container = document.createElement('div');
    const app = new App(container);
    app.render();

    app.loadExample(PRELOADED_EXAMPLES[0]);
    expect(app.getState()).toBe('result');

    const footerLink = container.querySelector<HTMLAnchorElement>('#footer-logo-link')!;
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    footerLink.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(app.getState()).toBe('upload');
  });

  it('allows native new-tab navigation when Meta or Ctrl is pressed', () => {
    const container = document.createElement('div');
    const app = new App(container);
    app.render();

    const logoLink = container.querySelector<HTMLAnchorElement>('#brand-logo-link')!;
    const metaClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      metaKey: true,
    });
    logoLink.dispatchEvent(metaClick);

    // Meta+click should NOT be prevented
    expect(metaClick.defaultPrevented).toBe(false);
  });
});
