import { describe, it, expect } from 'vitest';
import { App } from '../src/App';

describe('App Shell', () => {
  it('renders app shell with header and tagline', () => {
    const container = document.createElement('div');
    const app = new App(container);
    app.render();

    expect(container.querySelector('h1')?.textContent).toBe('Keepprint');
    expect(container.textContent).toContain('Keep the original safe. Print a copy you can hold.');
  });
});
