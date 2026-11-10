// SDD 8.4 — 2장 의존 방향(pages → component → core)을 기계 규칙으로
module.exports = {
  forbidden: [
    { name: 'core-is-independent', severity: 'error',
      comment: 'core는 component·pages를 모른다 (SDD 2장)',
      from: { path: '^src/core' }, to: { path: '^src/(component|pages)' } },
    { name: 'component-not-pages', severity: 'error',
      comment: 'component는 pages를 모른다 (SDD 2장)',
      from: { path: '^src/component' }, to: { path: '^src/pages' } },
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'no-ui-framework', severity: 'error',
      comment: 'UI 프레임워크 의존 금지 (VT-23)',
      from: {}, to: { path: 'node_modules/(react|react-dom|vue|preact|svelte)/' } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
