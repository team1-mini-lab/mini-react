import { describe, expect, it, vi } from 'vitest';
import type { Change } from '../../src/core/diff';
import { diff } from '../../src/core/diff';
import type { VElement, VNode, VText } from '../../src/core/vnode';
import { h } from '../../src/core/vnode';
import { stripDom } from '../helpers/strip-dom';

const t = (text: string): VText => ({ type: 'text', text });
const kinds = (cs: Change[]) => cs.map((c) => c.kind);
const list = (...keys: string[]) => h('ul', null, ...keys.map((k) => h('li', { key: k }, k)));

describe('[VT-03] Diff 반환값 (ADR-0005 D)', () => {
  it('[VT-03][D1] 같은 트리 → changes 0개, pairs에 모든 노드', () => {
    const a = h('div', null, h('p', null, 'x'), t(' '));
    const r = diff(a, structuredClone(a));
    expect(r.changes).toEqual([]);
    expect(r.pairs).toHaveLength(4);
  });
  it('[VT-03][D2] 글자 변경 → text 1개, target은 이전 트리의 그 객체', () => {
    const a = h('p', null, '사과');
    const r = diff(a, h('p', null, '딸기'));
    expect(r.changes).toEqual([{ kind: 'text', target: a.children[0], text: '딸기' }]);
    expect((r.changes[0] as { target: VNode }).target).toBe(a.children[0]);
  });
  it('[VT-03][D12] dom 키가 없는 객체끼리도 결과가 같다 (Diff는 dom을 읽지 않는다)', () => {
    const a = list('a', 'b');
    const b = list('b', 'a', 'c');
    const withDom = structuredClone(a);
    (withDom as { dom?: unknown }).dom = { fake: true };
    expect(kinds(diff(stripDom(a), b).changes)).toEqual(kinds(diff(withDom, b).changes));
  });
});

describe('[VT-04] 변경 종류 (ADR-0004 1절)', () => {
  it('[VT-04][D3] 속성 추가·변경·삭제가 섞이면 attrs 1개', () => {
    const r = diff(h('p', { a: '1', b: '2' }), h('p', { a: '9', c: '3' }));
    expect(r.changes).toEqual([{ kind: 'attrs', target: expect.anything(), set: { a: '9', c: '3' }, remove: ['b'] }]);
  });
  it('[VT-04][D13] 빈 ul에 추가 → add 1개 (parent = 이전 ul, before = null)', () => {
    const a = h('ul');
    const r = diff(a, list('a'));
    expect(r.changes).toEqual([{ kind: 'add', parent: a, node: expect.anything(), before: null }]);
  });
  it('[VT-04][D15] 서로 다른 곳에서 추가 1, 삭제 1, 글자 1이 동시에 → 그 셋만', () => {
    const a = h('div', null, list('a', 'b'), h('p', null, 'x'), h('ol'));
    const b = h('div', null, list('a'), h('p', null, 'y'), h('ol', null, h('li', null, 'n')));
    expect(kinds(diff(a, b).changes).sort()).toEqual(['add', 'remove', 'text']);
  });
});

describe('[VT-05] 교체 (ADR-0004 1절 3·4번)', () => {
  it('[VT-05][D4] <p> → <h1>: replace 1개, 자식 기록 없음, pairs에 없음', () => {
    const a = h('div', null, h('p', null, 'x'));
    const r = diff(a, h('div', null, h('h1', null, 'x')));
    expect(kinds(r.changes)).toEqual(['replace']);
    expect(r.pairs.some(([o]) => o === a.children[0])).toBe(false);
  });
  it('[VT-05][D5] 글자 노드 → 태그 노드: replace 1개', () => {
    expect(kinds(diff(h('div', null, 'x'), h('div', null, h('b'))).changes)).toEqual(['replace']);
  });
});

describe('[VT-27][VT-28] 속성 삭제, 같은 트리', () => {
  it('[VT-27][D3] 사라진 속성은 remove에 이름이 들어간다', () => {
    const c = diff(h('p', { title: 't' }), h('p')).changes[0] as Extract<Change, { kind: 'attrs' }>;
    expect(c.remove).toEqual(['title']);
  });
  it('[VT-28][D1] 같은 VNode → changes []', () => expect(diff(list('a'), list('a')).changes).toEqual([]));
});

describe('[VT-36] key 짝짓기 (ADR-0004 2절, FR-09)', () => {
  it('[VT-36][D6] 맨 앞에 사과 추가 → add 1개, before = 이전 바나나', () => {
    const a = list('banana', 'strawberry');
    const r = diff(a, list('apple', 'banana', 'strawberry'));
    expect(r.changes).toHaveLength(1);
    expect(r.changes[0]).toMatchObject({ kind: 'add', before: a.children[0] });
  });
  it('[VT-36][D7] [바나나, 딸기] → [딸기, 바나나]: move 1개', () => {
    expect(kinds(diff(list('b', 's'), list('s', 'b')).changes)).toEqual(['move']);
  });
  it('[VT-36][D8] [A,B,C,D] → [B,C,D,A]: move 3개 (알려진 한계)', () => {
    expect(kinds(diff(list('A', 'B', 'C', 'D'), list('B', 'C', 'D', 'A')).changes)).toEqual(['move', 'move', 'move']);
  });
  it('[VT-36][D9] 같은 부모에 같은 key가 2개 → 경고 후 자리 비교와 같은 결과', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = h('ul', null, h('li', { key: 'a' }, '1'), h('li', { key: 'a' }, '2'));
    const b = h('ul', null, h('li', { key: 'a' }, '2'), h('li', { key: 'a' }, '1'));
    const r = diff(a, b);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(kinds(r.changes)).toEqual(['text', 'text']);
    warn.mockRestore();
  });
  it('[VT-36][D10] key 있는 자식과 없는 자식이 섞인 목록에서 key 항목을 맨 앞에 추가 → key 없는 자식 기록 없음', () => {
    const a = h('ul', null, h('li', null, '고정'), h('li', { key: 'x' }, 'x'));
    const r = diff(a, h('ul', null, h('li', { key: 'n' }, 'n'), h('li', null, '고정'), h('li', { key: 'x' }, 'x')));
    expect(kinds(r.changes)).toEqual(['add']);
  });
  it('[VT-36][D11] 같은 항목의 key a → b: remove + add', () => {
    expect(kinds(diff(list('a'), list('b')).changes)).toEqual(['remove', 'add']);
  });
});

describe('[VT-46] 깊은 중첩 (ADR-0005 D14)', () => {
  it('[VT-46][D14] 100겹 div 안의 가장 깊은 글자 변경 → text 1개, target = 가장 깊은 이전 객체', () => {
    const deep = (text: string) => {
      let v: VElement = h('div', null, text);
      for (let i = 0; i < 99; i++) v = h('div', null, v);
      return v;
    };
    const a = deep('x');
    let leaf: VNode = a;
    while (leaf.type === 'element') leaf = leaf.children[0];
    const r = diff(a, deep('y'));
    expect(r.changes).toEqual([{ kind: 'text', target: leaf, text: 'y' }]);
  });
});
