// Vite + Vitest 설정 (ADR-0011). UI 프레임워크 플러그인 없음 (CON-01).
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const root = import.meta.dirname;

export default defineConfig({
  // GitHub Pages는 https://<org>.github.io/mini-react/ 아래에서 열리므로, 배포 빌드만 경로 앞에 저장소 이름을 붙인다
  base: process.env.PAGES_BASE ?? '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        phase1: resolve(root, 'src/pages/phase1/index.html'),
        phase2: resolve(root, 'src/pages/phase2/index.html'),
        lab: resolve(root, 'src/pages/lab/index.html'),
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
