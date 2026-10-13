import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';

import { demoMentionItems } from './src/data/mention-items.ts';

function mentionSearchDemo(): Plugin {
  const install = (server: { middlewares: ViteDevServer['middlewares'] }) => {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (
        url.pathname !== '/api/playground/mentions' ||
        request.method !== 'GET'
      ) {
        next();
        return;
      }

      const keyword = (url.searchParams.get('q') ?? '').trim().toLowerCase();
      const timer = setTimeout(() => {
        if (response.destroyed) return;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        if (keyword === 'error') {
          response.statusCode = 503;
          response.end(JSON.stringify({ message: '演示搜索失败' }));
          return;
        }
        response.end(
          JSON.stringify(
            demoMentionItems.filter((item) =>
              `${item.label} ${item.description}`
                .toLowerCase()
                .includes(keyword),
            ),
          ),
        );
      }, 180);
      response.once('close', () => clearTimeout(timer));
    });
  };

  return {
    name: 'playground-mention-search',
    configureServer: install,
    configurePreviewServer: install,
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), mentionSearchDemo()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5174,
  },
});
