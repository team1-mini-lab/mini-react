// L2 아키텍처 규칙 (SDD_final_common 3.4)
import tseslint from 'typescript-eslint';

const DOM_WRITE = "CallExpression[callee.property.name=/^(appendChild|removeChild|replaceWith|replaceChildren|insertBefore|remove|setAttribute|removeAttribute)$/]";

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'archive'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/core/patch.ts', 'src/core/dom.ts', 'src/pages/**'],
    rules: {
      'no-restricted-syntax': ['error',
        { selector: DOM_WRITE, message: '실제 영역 DOM 변경은 core/patch.ts의 applyPatch·recoverPatch·mountTree로만 한다 (SDD_final_phase1 2.1).' },
        { selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML|textContent|nodeValue)$/]", message: 'innerHTML 등 직접 대입 금지. 코드 읽기는 core/html.ts의 <template>에서만 (SDD_final_phase1 3.3).' },
      ],
    },
  },
  {
    files: ['src/core/html.ts'],
    rules: { 'no-restricted-syntax': 'off' }, // <template>.innerHTML 한 곳 (화면 밖 파싱)
  },
  {
    files: ['src/core/diff.ts'],
    rules: {
      'no-restricted-syntax': ['error', { selector: "MemberExpression[property.name=/^(dom|events)$/]", message: 'Diff는 dom·events를 읽지 않는다 (ADR-0004 dom 규칙 5, ADR-0015 3절).' }],
    },
  },
);
