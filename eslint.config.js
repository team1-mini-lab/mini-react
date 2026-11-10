// SDD 8.4 — "실제 영역을 바꾸는 코드는 patch.ts 한 곳" 등 설계 규칙
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', 'dist/', 'coverage/'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/core/patch.ts', 'src/core/dom.ts', 'src/pages/phase1/preview.ts'],
    rules: {
      'no-restricted-syntax': ['error',
        { selector: 'CallExpression[callee.property.name=/^(appendChild|removeChild|replaceWith|replaceChildren|insertBefore|remove|setAttribute|removeAttribute)$/]',
          message: 'DOM 변경은 core/patch.ts의 applyPatch를 통해서만 한다 (SDD 2장). 미리보기는 pages/phase1/preview.ts.' },
        { selector: 'AssignmentExpression[left.property.name=/^(innerHTML|outerHTML|textContent|nodeValue)$/]',
          message: 'innerHTML 등 직접 대입 금지 (SDD 3장). 코드 읽기는 core/html.ts의 <template>에서만.' },
      ],
    },
  },
  {
    files: ['src/core/diff.ts'],
    rules: {
      'no-restricted-syntax': ['error',
        { selector: "MemberExpression[property.name='dom']",
          message: 'Diff는 dom을 읽지 않는다 (ADR-0004 dom 규칙 5).' },
      ],
    },
  },
);
