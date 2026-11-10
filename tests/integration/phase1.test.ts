import { describe, it, expect } from 'vitest';
import { diff } from '../../src/core/diff';
import { domToVNode } from '../../src/core/dom';
import { htmlToVNode, vnodeToHtml } from '../../src/core/html';
import { applyPatch } from '../../src/core/patch';
import { History } from '../../src/core/history';
import { equalScreen } from '../../src/core/vnode';

describe('[Phase 1 종합 통합 테스트] TA1, TA2, VT-47, VT-48, VT-49', () => {
  it('무수정 왕복 시 changes가 0개이다 (VT-39, TA1)', () => {
    const originalHtml = `<div id="app">
  <h1>장바구니</h1>
  <ul>
    <li key="b">바나나</li>
  </ul>
</div>`;

    const vnode = htmlToVNode(originalHtml);
    expect(vnode).not.toBeNull();
    const serialized = vnodeToHtml(vnode!);
    const secondVnode = htmlToVNode(serialized);

    const { changes } = diff(vnode!, secondVnode!);
    expect(changes).toHaveLength(0);
  });

  it('뒤로가기 / 앞으로가기 시 실제 영역과 VDOM이 완벽히 동기화된다 (VT-49)', () => {
    const container = document.createElement('div');
    container.id = 'real-area';
    const app = document.createElement('div');
    app.innerHTML = '<p>버전1</p>';
    container.appendChild(app);
    document.body.appendChild(container);

    // 0번 기록
    const v0 = domToVNode(app, { recordDom: true });
    const history = new History(v0);

    // 버전 2로 Patch
    const v1 = htmlToVNode('<div><p>버전2</p></div>')!;
    const diff1 = diff(history.current, v1);
    applyPatch(diff1);
    history.push(v1);

    expect(container.querySelector('p')?.textContent).toBe('버전2');

    // 뒤로가기: 현재 실제 그려진 트리(v1)를 이전으로 하여 prev(v0)로 diff -> patch
    const currentOnScreen = history.current; // v1
    const prev = history.undo()!; // 이동 후 current는 v0가 됨
    const diffUndo = diff(currentOnScreen, prev);
    applyPatch(diffUndo);
    expect(container.querySelector('p')?.textContent).toBe('버전1');

    // 앞으로가기: 현재 실제 그려진 트리(v0)를 이전으로 하여 next(v1)로 diff -> patch
    const currentOnScreen2 = history.current; // v0
    const next = history.redo()!; // 이동 후 current는 v1이 됨
    const diffRedo = diff(currentOnScreen2, next);
    applyPatch(diffRedo);
    expect(container.querySelector('p')?.textContent).toBe('버전2');

    container.remove();
  });
});
