// 의존 방향 규칙 (SDD_final_common 3.4, SDD_final_phase1 2.1)
module.exports = {
  forbidden: [
    { name: 'core-is-independent', severity: 'error', from: { path: '^src/core' }, to: { path: '^src/(component|pages)' } },
    { name: 'component-not-pages', severity: 'error', from: { path: '^src/component' }, to: { path: '^src/pages' } },
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'no-ui-framework', severity: 'error', from: {}, to: { path: 'node_modules/(react|react-dom|vue|preact|svelte)/' } },
  ],
  options: { doNotFollow: { path: 'node_modules' }, tsPreCompilationDeps: true },
};
