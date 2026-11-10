import { describe, it, expect } from 'vitest';
import { diff } from '../../src/core/diff';
import { h } from '../../src/core/vnode';

describe('[VT-03][VT-04][VT-36] Diff 알고리즘 검증', () => {
  it('동일한 VDOM 비교 시 changes가 0개이다 (VT-28)', () => {
    const a = h('div', { id: 'x' }, h('p', null, '안녕'));
    const b = h('div', { id: 'x' }, h('p', null, '안녕'));
    const { changes, pairs } = diff(a, b);
    expect(changes).toHaveLength(0);
    expect(pairs.length).toBeGreaterThan(0);
  });

  it('글자만 바뀌면 text 변경 1개 산출 (VT-04)', () => {
    const a = h('p', null, '사과');
    const b = h('p', null, '딸기');
    const { changes } = diff(a, b);
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe('text');
  });

  it('태그가 바뀌면 replace 1개 산출 (VT-05)', () => {
    const a = h('p', null, '내용');
    const b = h('h1', null, '내용');
    const { changes } = diff(a, b);
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe('replace');
  });

  it('key 목록 맨 앞에 항목 추가 시 add 1개만 산출 (D6, VT-36)', () => {
    const a = h('ul', null, h('li', { key: 'b' }, '바나나'));
    const b = h('ul', null, h('li', { key: 'a' }, '사과'), h('li', { key: 'b' }, '바나나'));
    const { changes } = diff(a, b);
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe('add');
    if (changes[0].kind === 'add') {
      expect((changes[0].before as any)?.key).toBe('b');
    }
  });

  it('key 목록 순서 교환 시 move 1개 산출 (D7)', () => {
    const a = h('ul', null, h('li', { key: 'a' }, 'A'), h('li', { key: 'b' }, 'B'));
    const b = h('ul', null, h('li', { key: 'b' }, 'B'), h('li', { key: 'a' }, 'A'));
    const { changes } = diff(a, b);
    expect(changes.some((c) => c.kind === 'move')).toBe(true);
  });
});
