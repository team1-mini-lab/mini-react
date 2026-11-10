import { describe, it, expect } from 'vitest';
import { diff } from '../../src/core/diff';
import { domToVNode } from '../../src/core/dom';
import { applyPatch, recoverPatch } from '../../src/core/patch';
import { h } from '../../src/core/vnode';

describe('[VT-06][VT-31][R1] Patch 엔진 검증', () => {
  it('글자 수정 Patch가 실제 DOM을 올바르게 업데이트한다', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>사과</p>';
    document.body.appendChild(root);

    const oldV = domToVNode(root, { recordDom: true });
    const newV = h('div', null, h('p', null, '딸기'));

    const res = diff(oldV, newV);
    applyPatch(res);

    expect(root.querySelector('p')?.textContent).toBe('딸기');
    root.remove();
  });

  it('key 목록 맨 앞 추가 시 기존 input 값 보존 (P2)', () => {
    const root = document.createElement('div');
    root.innerHTML = '<ul><li key="b">바나나 <input class="qty" value="3" /></li></ul>';
    document.body.appendChild(root);

    const oldV = domToVNode(root, { recordDom: true });
    // input 요소에 사용자 입력 시뮬레이션
    const inputEl = root.querySelector('input')!;
    inputEl.value = '99';

    const newV = h(
      'div',
      null,
      h(
        'ul',
        null,
        h('li', { key: 'a' }, '사과'),
        h('li', { key: 'b' }, '바나나', h('input', { class: 'qty', value: '3' }))
      )
    );

    const res = diff(oldV, newV);
    applyPatch(res);

    // 바나나 항목의 input 값이 '99'로 그대로 유지되어야 함
    const inputs = root.querySelectorAll('input');
    expect(inputs).toHaveLength(1);
    expect(inputs[0].value).toBe('99');
    root.remove();
  });

  it('Patch 오류 발생 시 recoverPatch가 안전하게 전체 복구한다 (CF-03, t3, R1)', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>원래내용</p>';
    document.body.appendChild(root);

    const nextTree = h('div', null, h('h1', null, '복구된새내용'));
    recoverPatch(root, nextTree, new Error('고의 에러'));

    expect(root.querySelector('h1')?.textContent).toBe('복구된새내용');
    expect((nextTree as any).dom).toBeDefined();
    root.remove();
  });
});
