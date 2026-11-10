import { describe, expect, it } from 'vitest';
import { equalScreen, equalTree, h } from '../../src/core/vnode';

describe('[VT-01] VNode 모양 (ADR-0001)', () => {
  it('[VT-01] h()는 소문자 tag, attrs {}, children []를 만들고 key를 attrs에서 뺀다', () => {
    const v = h('LI', { key: 'a', class: 'x' }, '사과');
    expect(v).toEqual({ type: 'element', tag: 'li', attrs: { class: 'x' }, key: 'a', children: [{ type: 'text', text: '사과' }] });
    expect(h('p')).toEqual({ type: 'element', tag: 'p', attrs: {}, children: [] });
    expect('key' in h('p')).toBe(false);
  });
});

describe('[VT-22] 두 비교 함수는 다르다 (ADR-0004 6절)', () => {
  it('[VT-22] equalScreen은 key를 보지 않고, equalTree는 key를 본다', () => {
    const a = h('ul', null, h('li', { key: 'a' }, 'x'));
    const b = h('ul', null, h('li', { key: 'b' }, 'x'));
    expect(equalScreen(a, b)).toBe(true);
    expect(equalTree(a, b)).toBe(false);
  });
  it('[VT-22] 둘 다 dom·events를 보지 않는다', () => {
    const a = h('p', null, 'x');
    const b = h('p', null, 'x');
    (a as { dom?: Node }).dom = document.createElement('p');
    (b as { events?: object }).events = { click: () => {} };
    expect(equalScreen(a, b)).toBe(true);
    expect(equalTree(a, b)).toBe(true);
  });
});
