import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  envPrefix: ['VITE_', 'AHOLO_'],
  resolve: {
    alias: {
      'node:path': path.resolve(__dirname, 'src/lib/shims/node-path.ts'),
      'node:fs/promises': path.resolve(__dirname, 'src/lib/shims/node-fs-promises.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
