import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const fsPath = (layer: string) => fileURLToPath(new URL(`./src/${layer}`, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@app': fsPath('app'),
      '@pages': fsPath('pages'),
      '@widgets': fsPath('widgets'),
      '@features': fsPath('features'),
      '@entities': fsPath('entities'),
      '@shared': fsPath('shared'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
