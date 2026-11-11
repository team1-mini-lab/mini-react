// Vite + Vitest 설정 (ADR-0011). UI 프레임워크 플러그인 없음 (CON-01).
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const root = import.meta.dirname;

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        phase1: resolve(root, 'src/pages/phase1/index.html'),
        phase2: resolve(root, 'src/pages/phase2/index.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/component/**'],
      thresholds: { statements: 90 },
    },
  },
});
