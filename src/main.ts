import './styles/main.css';
import { App } from './App';

const container = document.getElementById('app');
if (container) {
  const app = new App(container);
  app.render();
}
