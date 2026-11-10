import { describe, it, expect } from 'vitest';
import { h, equalScreen, equalTree } from '../../src/core/vnode';

describe('[VT-01] VNode 생성 및 비교 모듈', () => {
  it('h()로 element를 생성하면 올바른 속성과 자식을 갖는다', () => {
    const v = h('div', { id: 'test', class: 'box', key: 'k1' }, '안녕', h('span', null, '세상'));
    expect(v.type).toBe('element');
    expect(v.tag).toBe('div');
    expect(v.attrs).toEqual({ id: 'test', class: 'box' });
    expect(v.key).toBe('k1');
    expect(v.children).toHaveLength(2);
    expect(v.children[0]).toEqual({ type: 'text', text: '안녕' });
  });

  it('equalScreen은 화면 5대 키만 비교하고 key나 dom은 무시한다', () => {
    const a = h('div', { id: 'x', key: '1' }, '글자');
    const b = h('div', { id: 'x', key: '2' }, '글자');
    expect(equalScreen(a, b)).toBe(true);
    expect(equalTree(a, b)).toBe(false); // key가 다르므로 equalTree는 false
  });
});
