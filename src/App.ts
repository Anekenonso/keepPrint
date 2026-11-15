export class App {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    this.container.innerHTML = `
      <header>
        <h1>Keepprint</h1>
        <p>Keep the original safe. Print a copy you can hold.</p>
      </header>
      <main class="card" id="main-content">
        <h2>Preserve your family heirlooms in 3D</h2>
        <p>Turn a photo or description of a personal heirloom into a clean, printable 3D model.</p>
      </main>
    `;
  }
}
