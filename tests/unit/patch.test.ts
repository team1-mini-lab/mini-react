import { afterEach, describe, expect, it, vi } from 'vitest';
import { diff } from '../../src/core/diff';
import { domToVNode } from '../../src/core/dom';
import { htmlToVNode } from '../../src/core/html';
import { applyPatch } from '../../src/core/patch';
import type { VElement, VNode } from '../../src/core/vnode';
import { equalScreen } from '../../src/core/vnode';
import { countMutations } from '../helpers/count-mutations';

/** 틀(#real-area) + 루트를 그리고 기록함 모드로 변환 (첫 로드와 같은 상태) */
function mount(html: string) {
  document.body.innerHTML = `<section id="real-area">${html}</section>`;
  const frame = document.getElementById('real-area')!;
  return { frame, current: domToVNode(frame.firstElementChild!, { recordDom: true }) };
}
const next = (code: string) => htmlToVNode(code)!;
const screenOf = (frame: Element) => domToVNode(frame.firstElementChild!);
const allDom = (v: VNode): boolean => !!v.dom && (v.type === 'text' || v.children.every(allDom));
const patch = (frame: Element, a: VNode, b: VNode, opts = {}) => applyPatch(frame, b, diff(a, b), opts);
afterEach(() => vi.restoreAllMocks());

describe('[VT-06] Patch 결과 (ADR-0005)', () => {
  it('[VT-06][P1] 글자 하나만 바꾸면 바뀌지 않은 요소는 같은 요소 객체', () => {
    const { frame, current } = mount('<div><h1>a</h1><p>b</p></div>');
    const h1 = frame.querySelector('h1');
    const b = next('<div><h1>a</h1><p>c</p></div>');
    patch(frame, current, b);
    expect(frame.querySelector('h1')).toBe(h1);
    expect(frame.querySelector('p')!.textContent).toBe('c');
  });
  it('[VT-06][P9] Patch 후 실제 영역이 새 트리와 FR-01 기준으로 같다', () => {
    const { frame, current } = mount('<div><ul><li key="a">a</li><li key="b">b</li></ul></div>');
    const b = next('<div><ul><li key="b" class="x">B</li><li key="c">c</li></ul><p>n</p></div>');
    patch(frame, current, b);
    expect(equalScreen(screenOf(frame), b)).toBe(true);
  });
  it('[VT-06][P2] 바나나 입력칸에 3 → 맨 앞에 사과 추가 → 3이 바나나 옆에 그대로', () => {
    const { frame, current } = mount('<ul><li key="b">바나나 <input value="1"></li></ul>');
    (frame.querySelector('input') as HTMLInputElement).value = '3';
    patch(frame, current, next('<ul><li key="a">사과 <input value="1"></li><li key="b">바나나 <input value="1"></li></ul>'));
    const inputs = frame.querySelectorAll('input');
    expect((inputs[1] as HTMLInputElement).value).toBe('3');
    expect(inputs[1].parentElement!.textContent).toContain('바나나');
  });
  it('[VT-06] value 속성이 바뀌면 지금 값도 바꾸고, 같으면 건드리지 않는다 (ADR-0004 1절)', () => {
    const { frame, current } = mount('<div><input value="a"><input type="checkbox"></div>');
    const [text, box] = frame.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const b = next('<div><input value="z"><input type="checkbox" checked></div>');
    patch(frame, current, b);
    expect(text.value).toBe('z');
    expect(box.checked).toBe(true);
    const c = next('<div><input value="z"><input type="checkbox"></div>');
    patch(frame, b, c);
    expect(box.checked).toBe(false);
  });
});

describe('[VT-20] 조작 횟수 (NFR-01)', () => {
  it('[VT-20][P3] 요소 100개 중 1개 변경 → changes 1개, DOM 기록 1건', async () => {
    const items = (j: number) => Array.from({ length: 100 }, (_, i) => `<li key="${i}">${i === 50 ? j : i}</li>`).join('');
    const { frame, current } = mount(`<ul>${items(50)}</ul>`);
    const b = next(`<ul>${items(999)}</ul>`);
    const res = diff(current, b);
    expect(res.changes).toHaveLength(1);
    expect(await countMutations(frame, () => applyPatch(frame, b, res))).toBe(1);
  });
  it('[VT-20][HL2] 하이라이트를 켜도 DOM 기록 수는 같다 (class·style을 건드리지 않음)', async () => {
    const { frame, current } = mount('<ul><li>a</li><li>b</li></ul>');
    const b = next('<ul><li>a</li><li>c</li></ul>');
    const res = diff(current, b);
    const anim = vi.fn();
    (Element.prototype as unknown as { animate: unknown }).animate = anim;
    const n = await countMutations(frame, () => applyPatch(frame, b, res, { highlight: true }));
    delete (Element.prototype as unknown as { animate?: unknown }).animate;
    expect(n).toBe(1);
  });
  it('[VT-20][HL1] 글자 하나 바꾸면 그 글자의 부모 요소만 강조한다', () => {
    const { frame, current } = mount('<div><p>a</p><p>b</p></div>');
    const target = frame.querySelectorAll('p')[1];
    const calls: Element[] = [];
    (Element.prototype as unknown as { animate: unknown }).animate = function (this: Element) {
      calls.push(this);
    };
    patch(frame, current, next('<div><p>a</p><p>c</p></div>'), { highlight: true });
    delete (Element.prototype as unknown as { animate?: unknown }).animate;
    expect(calls).toEqual([target]);
  });
});

describe('[VT-29] 같은 내용으로 Patch', () => {
  it('[VT-29] 변경이 없으면 DOM 기록 0건', async () => {
    const { frame, current } = mount('<div><p>a</p></div>');
    const b = next('<div><p>a</p></div>');
    expect(await countMutations(frame, () => patch(frame, current, b))).toBe(0);
  });
});

describe('[VT-31] 실패 복구 t3 (ADR-0005 6절)', () => {
  it('[VT-31][R1] dom이 빠진 객체가 있어도 오류가 밖으로 나가지 않고, 새 트리와 같아지며 console.error 1회', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { frame, current } = mount('<div><p>a</p><p>b</p></div>');
    delete ((current as VElement).children[1] as { dom?: unknown }).dom;
    const b = next('<div><p>a</p><p>c</p></div>');
    const r = patch(frame, current, b);
    expect(r.recovered).toBe(true);
    expect(err).toHaveBeenCalledTimes(1);
    expect(equalScreen(screenOf(frame), b)).toBe(true);
    expect(allDom(b)).toBe(true);
  });
  it('[VT-31][R2] R1 직후 다시 Patch하면 복구 없이 성공', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { frame, current } = mount('<div><p>a</p><p>b</p></div>');
    delete ((current as VElement).children[1] as { dom?: unknown }).dom;
    const b = next('<div><p>a</p><p>c</p></div>');
    patch(frame, current, b);
    const c = next('<div><p>a</p><p>d</p></div>');
    expect(patch(frame, b, c).recovered).toBe(false);
    expect(equalScreen(screenOf(frame), c)).toBe(true);
  });
});

describe('[VT-43] 주석과 삭제 (ADR-0005 P4·P5)', () => {
  it('[VT-43][P4] 실제 영역에 주석이 있을 때 둘째 항목 글자 변경 → 둘째 항목만 바뀜', () => {
    const { frame, current } = mount('<ul><!-- 메모 --><li>a</li><li>b</li></ul>');
    const [l1, l2] = frame.querySelectorAll('li');
    patch(frame, current, next('<ul><li>a</li><li>B</li></ul>'));
    const after = frame.querySelectorAll('li');
    expect([after[0], after[1]]).toEqual([l1, l2]);
    expect(l1.textContent).toBe('a');
    expect(l2.textContent).toBe('B');
  });
  it('[VT-43][P5] [A,B,C,D] → [A]: B·C·D 삭제, A는 같은 요소 객체', () => {
    const { frame, current } = mount('<ul><li key="A">A</li><li key="B">B</li><li key="C">C</li><li key="D">D</li></ul>');
    const a = frame.querySelector('li');
    patch(frame, current, next('<ul><li key="A">A</li></ul>'));
    expect(frame.querySelectorAll('li')).toHaveLength(1);
    expect(frame.querySelector('li')).toBe(a);
  });
});

describe('[VT-44] 적용 순서 (ADR-0005 5절)', () => {
  it('[VT-44][P6] [A(p), B] → [B, A(h1)]: 오류 없이 적용', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { frame, current } = mount('<div><p key="a">사과</p><span key="b">바나나</span></div>');
    const b = next('<div><span key="b">바나나</span><h1 key="a">사과</h1></div>');
    expect(patch(frame, current, b).recovered).toBe(false);
    expect(err).not.toHaveBeenCalled();
    expect(Array.from(frame.firstElementChild!.children).map((e) => e.localName)).toEqual(['span', 'h1']);
  });
});

describe('[VT-45] dom 이어받기 (ADR-0005 P7·P8)', () => {
  it('[VT-45][P7] Patch 후 새 트리의 모든 객체에 dom이 있다', () => {
    const { frame, current } = mount('<div><p>a</p></div>');
    const b = next('<div><p>a</p><ul><li>n</li></ul></div>');
    patch(frame, current, b);
    expect(allDom(b)).toBe(true);
  });
  it('[VT-45][P8] Patch를 연속 3번 해도 매번 성공', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { frame, current } = mount('<div><p>0</p></div>');
    let prev = current;
    for (const n of ['1', '2', '3']) {
      const b = next(`<div><p>${n}</p><b key="${n}">${n}</b></div>`);
      expect(patch(frame, prev, b).recovered).toBe(false);
      prev = b;
    }
    expect(err).not.toHaveBeenCalled();
  });
});

describe('[VT-46] 견고성 (ADR-0005 P10~P12, TA10)', () => {
  it('[VT-46][P10] 빈 ul에 추가 → Patch → 다시 비우기 → Patch', () => {
    const { frame, current } = mount('<ul></ul>');
    const b = next('<ul><li key="a">a</li></ul>');
    patch(frame, current, b);
    expect(equalScreen(screenOf(frame), b)).toBe(true);
    const c = next('<ul></ul>');
    patch(frame, b, c);
    expect(equalScreen(screenOf(frame), c)).toBe(true);
  });
  it('[VT-46][P11] 1,000겹 (TBD-09) 중첩의 가장 깊은 글자만 바뀌고 나머지 요소는 같은 객체', () => {
    const deep = (x: string) => '<div>'.repeat(1000) + x + '</div>'.repeat(1000);
    const { frame, current } = mount(deep('x'));
    const outer = frame.querySelectorAll('div')[500];
    patch(frame, current, next(deep('y')));
    expect(frame.querySelectorAll('div')[500]).toBe(outer);
    expect(frame.textContent).toBe('y');
  });
  it('[VT-46][P12] 추가·삭제·글자 수정이 동시에 → FR-01 기준 같음, 바뀌지 않은 요소는 같은 객체', () => {
    const { frame, current } = mount('<div><ul><li key="a">a</li><li key="b">b</li></ul><p>x</p><h2>고정</h2></div>');
    const h2 = frame.querySelector('h2');
    const b = next('<div><ul><li key="a">a</li><li key="c">c</li></ul><p>y</p><h2>고정</h2></div>');
    patch(frame, current, b);
    expect(equalScreen(screenOf(frame), b)).toBe(true);
    expect(frame.querySelector('h2')).toBe(h2);
  });
  it('[VT-46][TA10] 루트 div → section 교체 후 다시 Patch', () => {
    const { frame, current } = mount('<div><p>a</p></div>');
    const b = next('<section><p>a</p></section>');
    patch(frame, current, b);
    const c = next('<section><p>b</p></section>');
    expect(patch(frame, b, c).recovered).toBe(false);
    expect(frame.firstElementChild!.localName).toBe('section');
    expect(frame.textContent).toBe('b');
  });
});
