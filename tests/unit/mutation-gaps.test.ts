// 뮤테이션 테스트에서 살아남은 변이를 잡기 위해 더한 테스트 (2026-11-10, report/mutation.json)
// 각 테스트는 기존 VT의 기대 결과를 더 정확히 확인한다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../../src/component/function-component';
import { h } from '../../src/component/h';
import type { SetState } from '../../src/component/hooks';
import { useEffect, useMemo, useState } from '../../src/component/hooks';
import { flushSync, RENDER_LIMIT, resetScheduler } from '../../src/component/scheduler';
import { diff } from '../../src/core/diff';
import { domToVNode } from '../../src/core/dom';
import { htmlToVNode, vnodeToHtml } from '../../src/core/html';
import { applyPatch, mountTree, syncEvents } from '../../src/core/patch';
import { h as vh } from '../../src/core/vnode';

afterEach(() => {
  delete (Element.prototype as unknown as { animate?: unknown }).animate;
  vi.restoreAllMocks();
});

describe('[VT-39] vnodeToHtml 출력 모양 (a3, ADR-0018)', () => {
  it('[VT-39][TA2] 공백 노드 자리는 줄바꿈 + 깊이만큼 2칸 들여쓰기, 마지막은 한 단계 덜', () => {
    const v = vh('div', null, ' ', vh('ul', null, ' ', vh('li', null, 'a'), ' '), ' ');
    expect(vnodeToHtml(v)).toBe('<div>\n  <ul>\n    <li>a</li>\n  </ul>\n</div>');
  });
  it('[VT-39][TA14] <pre> 안의 " " 글자와 줄바꿈은 그대로 쓴다', () => {
    const v = vh('div', null, vh('pre', null, ' ', vh('b', null, ' '), ' x'));
    expect(vnodeToHtml(v)).toBe('<div><pre> <b> </b> x</pre></div>');
  });
  it('[VT-39][TA14] <pre>의 첫 글자가 줄바꿈일 때만 하나 더 쓴다', () => {
    expect(vnodeToHtml(vh('pre', null, '\na'))).toBe('<pre>\n\na</pre>');
    expect(vnodeToHtml(vh('pre', null, 'a\n'))).toBe('<pre>a\n</pre>');
    expect(vnodeToHtml(vh('div', null, '\na'))).toBe('<div>\na</div>');
    expect(vnodeToHtml(vh('pre'))).toBe('<pre></pre>');
  });
  it('[VT-39][TA3] 빈 요소(void)는 닫는 태그를 쓰지 않는다', () => {
    for (const t of ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']) {
      expect(vnodeToHtml(vh(t))).toBe(`<${t}>`);
    }
    expect(vnodeToHtml(vh('p'))).toBe('<p></p>');
  });
});

describe('[VT-06] Patch 세부 (ADR-0004 1절, ADR-0015 3절)', () => {
  const mount = (html: string) => {
    document.body.innerHTML = '<section id="f"></section>';
    const f = document.getElementById('f')!;
    const v = htmlToVNode(html)!;
    mountTree(f, v);
    return { f, v };
  };
  it('[VT-06] 사용자가 체크한 체크박스도 checked 속성이 빠지면 꺼진다 (프로퍼티 동기화)', () => {
    const { f, v } = mount('<div><input type="checkbox" checked></div>');
    const box = f.querySelector('input')!;
    box.click();
    box.click(); // 사용자가 만진 상태 (dirty)
    expect(box.checked).toBe(true);
    const n = htmlToVNode('<div><input type="checkbox"></div>')!;
    applyPatch(f, n, diff(v, n));
    expect(box.checked).toBe(false);
    const n2 = htmlToVNode('<div><input type="checkbox" checked></div>')!;
    applyPatch(f, n2, diff(n, n2));
    expect(box.checked).toBe(true);
  });
  it('[VT-06] value 속성이 빠지면 지금 값도 비운다', () => {
    const { f, v } = mount('<div><input value="a"></div>');
    const el = f.querySelector('input')!;
    el.value = '사용자';
    const n = htmlToVNode('<div><input></div>')!;
    applyPatch(f, n, diff(v, n));
    expect(el.value).toBe('');
  });
  it('[VT-17][C9] 이벤트가 사라지면 리스너를 떼어 더는 불리지 않는다', () => {
    document.body.innerHTML = '<button></button>';
    const b = document.querySelector('button')!;
    const fn = vi.fn();
    syncEvents(b, { click: fn });
    b.click();
    syncEvents(b, {});
    b.click();
    syncEvents(b, undefined);
    b.click();
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('[VT-20][HL1] 하이라이트 대상: add·replace는 새 요소, attrs·move는 그 요소, 끄면 아무것도 안 함', () => {
    const lit: string[] = [];
    (Element.prototype as unknown as { animate: unknown }).animate = function (this: Element, frames: unknown, o: { duration: number }) {
      lit.push(`${this.localName}${this.id ? '#' + this.id : ''}:${JSON.stringify(frames)}:${o.duration}`);
    };
    const { f, v } = mount('<div><p key="a" id="a">a</p><p key="b" id="b">b</p><i id="r"></i></div>');
    const n = htmlToVNode('<div><p key="b" id="b" class="x">b</p><p key="a" id="a">a</p><b id="r"></b><span id="n"></span></div>')!;
    const res = diff(v, n);
    applyPatch(f, n, res, { highlight: false });
    expect(lit).toEqual([]);
    const { f: f2, v: v2 } = mount('<div><p key="a" id="a">a</p><p key="b" id="b">b</p><i id="r"></i></div>');
    applyPatch(f2, n, diff(v2, n), { highlight: true });
    const names = lit.map((s) => s.split(':')[0]).sort();
    expect(names).toEqual(expect.arrayContaining(['b#r', 'p#b', 'span#n']));
    expect(lit[0]).toContain('#fff3a3');
    expect(lit[0]).toContain(':600');
  });
});

describe('[VT-19] 스케줄러 경계 (ADR-0009)', () => {
  let box: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    box = document.getElementById('root')!;
    resetScheduler();
  });
  it('[VT-19][B4] 연쇄 재렌더가 정확히 50번이면 오류 없음 (51번째부터 오류)', () => {
    render(
      () => {
        const [n, s] = useState(0);
        useEffect(() => {
          if (n < RENDER_LIMIT) s(n + 1);
        });
        return h('p', null, String(n));
      },
      {},
      box,
    );
    expect(() => flushSync()).not.toThrow();
    expect(box.textContent).toBe(String(RENDER_LIMIT));
  });
  it('[VT-19][B5] effect 연쇄 뒤에 클릭으로 시작하면 카운터가 0부터 다시 센다', () => {
    let start!: () => void;
    render(
      () => {
        const [n, s] = useState(0);
        const [goal, setGoal] = useState(30);
        start = () => setGoal((g) => g + 30);
        useEffect(() => {
          if (n < goal) s(n + 1);
        });
        return h('p', null, String(n));
      },
      {},
      box,
    );
    flushSync();
    expect(() => {
      start();
      flushSync();
    }).not.toThrow();
    expect(box.textContent).toBe('60');
  });
  it('[VT-19][B1] 보통 setter는 경고하지 않고, 렌더 밖 Hook 혼합에서도 console.error 0번', () => {
    const warn = vi.spyOn(console, 'warn');
    const err = vi.spyOn(console, 'error');
    let set!: SetState<number>;
    render(
      () => {
        const [n, s] = useState(0);
        set = s;
        const sq = useMemo(() => n * n, [n]);
        useEffect(() => {}, [n]);
        return h('p', null, String(sq));
      },
      {},
      box,
    );
    set(3);
    flushSync();
    expect(box.textContent).toBe('9');
    expect(warn).not.toHaveBeenCalled();
    expect(err).not.toHaveBeenCalled();
  });
  it('[VT-10][C1] 컴포넌트는 children: []을 받고, mount 직후 lastChanges는 빈 배열', () => {
    let seen: unknown;
    const c = render(
      (p: { children: unknown[] }) => {
        seen = p.children;
        return h('p');
      },
      {},
      box,
    );
    expect(seen).toEqual([]);
    expect(c.lastChanges).toEqual([]);
    expect(domToVNode(box.firstElementChild!).type).toBe('element');
  });
});
