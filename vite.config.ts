import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.AHOLO_API_KEY || process.env.AHOLO_API_KEY || '';

  return {
    // Only expose VITE_ variables to the client browser bundle.
    // AHOLO_API_KEY is kept strictly server-side.
    envPrefix: ['VITE_'],
    server: {
      proxy: {
        '/api/aholo-global': {
          target: 'https://api.aholo.ai',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/aholo-global/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (apiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
              }
            });
          },
        },
        '/api/aholo-cn': {
          target: 'https://api.aholo.cn',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/aholo-cn/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (apiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
              }
            });
          },
        },
      },
    },
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
  };
});
