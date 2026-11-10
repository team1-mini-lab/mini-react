import { describe, expect, it } from 'vitest';
import { HookCallError } from '../../src/component/errors';
import { render } from '../../src/component/function-component';
import { h, normalizeChildren } from '../../src/component/h';
import { useState } from '../../src/component/hooks';
import type { VElement } from '../../src/core/vnode';

describe('[VT-11] h() 확장 (ADR-0015 1절)', () => {
  it('[VT-11][C4][TD2] 컴포넌트에 준 key는 반환된 루트 요소에 붙고, props에는 없다', () => {
    let seen: Record<string, unknown> = {};
    const Item = (p: { label: string }) => {
      seen = p as unknown as Record<string, unknown>;
      return h('li', null, p.label);
    };
    const v = h(Item, { key: 7, label: 'a' });
    expect(v.key).toBe('7');
    expect('key' in seen).toBe(false);
    expect(seen.label).toBe('a');
  });
  it('[VT-11][C5] 문자열·숫자는 글자 노드, null·undefined·boolean은 건너뛰고, 배열은 펼친다', () => {
    const v = h('p', null, 'a', 1, null, undefined, false, true, ['b', ['c']], h('b'));
    expect(v.children.map((c) => (c.type === 'text' ? c.text : `<${c.tag}>`))).toEqual(['a', '1', 'b', 'c', '<b>']);
    expect(normalizeChildren([0])).toEqual([{ type: 'text', text: '0' }]);
  });
  it('[VT-11][C6] 자식 컴포넌트는 h() 안에서 바로 실행되어 VElement만 남는다 (props 전달)', () => {
    const Child = ({ n }: { n: number }) => h('span', null, `값 ${n}`);
    const v = h('div', null, h(Child, { n: 3 }), h(Child, { n: 4 }), h(Child, { n: 5 }));
    expect(v.children.every((c) => c.type === 'element' && c.tag === 'span')).toBe(true);
    expect((v.children[2] as VElement).children[0]).toEqual({ type: 'text', text: '값 5' });
  });
  it('[VT-11][C6] 컴포넌트가 VElement가 아닌 값을 돌려주면 TypeError', () => {
    const Bad = () => 'x' as unknown as VElement;
    expect(() => h(Bad, null)).toThrow(TypeError);
  });
  it('[VT-11][C7] onClick → events.click, 태그는 소문자, true는 빈 문자열, false·null은 뺀다', () => {
    const fn = () => {};
    const v = h('BUTTON', { onClick: fn, disabled: false, checked: true, title: null, 'data-n': 2, key: 'k' });
    expect(v.tag).toBe('button');
    expect(v.events).toEqual({ click: fn });
    expect(v.attrs).toEqual({ checked: '', 'data-n': '2' });
    expect(v.key).toBe('k');
  });
  it('[VT-11][C7] 이벤트가 없으면 events 키 자체가 없다 (ADR-0001)', () => {
    expect('events' in h('p', { title: 't' })).toBe(false);
  });
  it('[VT-11][C11] 문자열 on* props는 attrs에도 events에도 넣지 않는다 (반례 9, ADR-0002 s2)', () => {
    const v = h('a', { onclick: 'alert(1)', onMouseOver: 'x', href: '/a' });
    expect(v.attrs).toEqual({ href: '/a' });
    expect('events' in v).toBe(false);
  });
  it('[VT-11][HR3] State는 루트만: 자식이 useState를 부르면 HookCallError, 자식은 props만 쓴다 (FR-15, CON-06)', () => {
    document.body.innerHTML = '<div id="r"></div>';
    const Shown = ({ n }: { n: number }) => h('b', null, String(n));
    const Stateful = () => (useState(0), h('i'));
    const ok = render(() => h('p', null, h(Shown, { n: useState(7)[0] })), {}, document.getElementById('r')!);
    expect(document.getElementById('r')!.textContent).toBe('7');
    expect(ok.hooks).toHaveLength(1);
    expect(() => render(() => h('p', null, h(Stateful, null)), {}, document.getElementById('r')!)).toThrow(HookCallError);
  });
});
