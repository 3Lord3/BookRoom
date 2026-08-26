import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const fsPath = (layer: string) => fileURLToPath(new URL(`./src/${layer}`, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // Голый импорт слоя ведёт на index.ts, подпути — на каталог слоя
      { find: /^@app$/, replacement: fsPath('app/index.ts') },
      { find: '@app', replacement: fsPath('app') },
      { find: '@pages', replacement: fsPath('pages') },
      { find: '@widgets', replacement: fsPath('widgets') },
      { find: '@features', replacement: fsPath('features') },
      { find: '@entities', replacement: fsPath('entities') },
      { find: '@shared', replacement: fsPath('shared') },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
