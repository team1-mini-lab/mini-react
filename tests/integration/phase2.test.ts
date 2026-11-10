// Phase 2 Todo 페이지 통합 테스트 (SDD_final_phase2 3장, 6.2). 클릭·입력 뒤에는 꼭 flushSync() (B3 규칙).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, resetScheduler } from '../../src/component/scheduler';
import { domToVNode } from '../../src/core/dom';
import type { VNode } from '../../src/core/vnode';
import { equalScreen } from '../../src/core/vnode';
import { startPhase2 } from '../../src/pages/phase2/main';

type Page = ReturnType<typeof startPhase2>;
let page: Page;
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const $$ = (sel: string) => Array.from(document.querySelectorAll(sel));
const items = () => $$('#todo-list li.todo') as HTMLLIElement[];
const input = () => $<HTMLInputElement>('#todo-text');
const typeText = (v: string) => {
  input().value = v;
  input().dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
};
const click = (el: Element) => {
  (el as HTMLElement).click();
  flushSync();
};

beforeEach(() => {
  resetScheduler();
  document.body.innerHTML = '<div id="app-root"></div><p id="effect-count"></p><pre id="change-log"></pre>';
  page = startPhase2(document);
});
afterEach(() => {
  delete (Element.prototype as unknown as { animate?: unknown }).animate;
  vi.restoreAllMocks();
});

/** 반례 8: h()의 글자는 공백 규칙을 거치지 않으므로, 비교 전에 두 쪽 모두 같은 공백 규칙을 적용한다 */
function ws(v: VNode): VNode | null {
  if (v.type === 'text') {
    const t = v.text.replace(/[ \t\n\r\f]+/g, ' ');
    return t.trim() === '' ? null : { type: 'text', text: t };
  }
  return { ...v, children: v.children.map(ws).filter((c): c is VNode => c !== null) };
}
const screenMatches = () => equalScreen(ws(domToVNode($('#app-root').firstElementChild!))!, ws(page.component.tree!)!);

describe('[VT-13] 상태 변경 → 재렌더 → 화면 갱신 (FR-14, FR-17)', () => {
  it('[VT-13][TD1] 첫 항목 삭제 → li 삭제 1건, 나머지 li는 같은 요소 객체 (key)', () => {
    const [, second, third] = items();
    click($('#todo-list li.todo .remove'));
    const kinds = page.component.lastChanges.map((c) => c.kind);
    expect(kinds.filter((k) => k === 'remove')).toHaveLength(1);
    expect(kinds).not.toContain('add');
    expect(kinds).not.toContain('replace');
    expect(items()).toEqual([second, third]);
  });
  it('[VT-13][TD3] 추가하면 입력칸 value가 실제로 비워진다', () => {
    typeText('우유 사기');
    click($('#add'));
    expect(input().value).toBe('');
    expect(items().at(-1)!.textContent).toContain('우유 사기');
  });
  it('[VT-13][TD4] 타이핑으로 재렌더돼도 커서가 끝으로 튀지 않는다', () => {
    const el = input();
    el.value = 'abc';
    el.setSelectionRange(1, 1);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    expect(el.value).toBe('abc');
    expect(el.selectionStart).toBe(1);
  });
  it('[VT-13][TD5] 체크박스 checked가 상태와 같다 (껐다 켜기)', () => {
    const box = () => items()[0].querySelector('input') as HTMLInputElement;
    click(box());
    expect(box().checked).toBe(true);
    expect(items()[0].className).toContain('done');
    click(box());
    expect(box().checked).toBe(false);
    expect(items()[0].className).not.toContain('done');
  });
  it('[VT-13][TD6] "3개 한 번에 추가" → 렌더 1번에 3개', () => {
    const before = page.component.renderCount;
    click($('#add-three'));
    expect(page.component.renderCount).toBe(before + 1);
    expect(items()).toHaveLength(6);
  });
  it('[VT-13][TD9] 두 곳의 남은 개수가 늘 같다 (Header, DebugPanel)', () => {
    const nums = () => [$('#remaining').textContent!.match(/남은 일 (\d+)/)![1], $('#debug-remaining').textContent!.match(/(\d+)/)![1]];
    expect(nums()).toEqual(['2', '2']);
    click(items()[0].querySelector('input')!);
    expect(nums()).toEqual(['1', '1']);
    click($('#add-three'));
    expect(nums()).toEqual(['4', '4']);
  });
});

describe('[VT-15][VT-14] Todo의 useMemo·useEffect (FR-18~FR-20)', () => {
  it('[VT-15][TD7] 타이핑에는 filteredTodos를 다시 계산하지 않고, 필터를 바꾸면 계산한다', () => {
    const m = page.counters.memoRuns;
    typeText('a');
    typeText('ab');
    expect(page.counters.memoRuns).toBe(m);
    click($('[data-filter="done"]'));
    expect(page.counters.memoRuns).toBe(m + 1);
    expect(items().map((li) => li.textContent)).toEqual([expect.stringContaining('운동하기')]);
  });
  it('[VT-14][TD8] 제목 effect는 남은 개수가 바뀔 때만 실행된다', () => {
    const e = page.counters.effectRuns;
    expect(document.title).toBe('할 일 2개 남음');
    typeText('x');
    expect(page.counters.effectRuns).toBe(e);
    click(items()[0].querySelector('input')!);
    expect(page.counters.effectRuns).toBe(e + 1);
    expect(document.title).toBe('할 일 1개 남음');
  });
});

describe('[VT-17] Phase 1 엔진 연동 (FR-22)', () => {
  it('[VT-17][TD10] 하이라이트: 체크한 줄은 반짝이고, 타이핑할 때 입력칸은 반짝이지 않는다', () => {
    const lit: Element[] = [];
    (Element.prototype as unknown as { animate: unknown }).animate = function (this: Element) {
      lit.push(this);
    };
    typeText('a');
    expect(lit.some((el) => el.localName === 'input')).toBe(false);
    lit.length = 0;
    const li = items()[0];
    click(li.querySelector('input')!);
    expect(lit).toContain(li);
  });
  it('[VT-17][TD11] 변경 로그는 formatChange 한 줄 요약이다 (VNode JSON 아님)', () => {
    click(items()[0].querySelector('.remove')!);
    const log = $('#change-log').textContent!;
    expect(log.split('\n').length).toBe(page.component.lastChanges.length);
    expect(log).not.toMatch(/[{}]/);
    expect(log).toMatch(/삭제/);
  });
  it('[VT-17] L4 불변식 3: 여러 조작 뒤에도 실제 DOM과 지금 트리가 같다 (공백 규칙 적용 후, 반례 8)', () => {
    const ops = [
      () => typeText('  두 칸  공백  '),
      () => click($('#add')),
      () => click(items()[1].querySelector('input')!),
      () => click($('[data-filter="active"]')),
      () => click($('#add-three')),
      () => click(items()[0].querySelector('.remove')!),
      () => click($('[data-filter="all"]')),
    ];
    for (const op of ops) {
      op();
      expect(screenMatches()).toBe(true);
    }
  });
  it('[VT-11] TodoItem을 3번 이상 재사용한다 (FR-13)', () => {
    expect(items().length).toBeGreaterThanOrEqual(3);
    expect(items().every((li) => li.querySelector('.toggle') && li.querySelector('.remove'))).toBe(true);
  });
});
