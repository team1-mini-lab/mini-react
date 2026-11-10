import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../../src/component/function-component';
import { h } from '../../src/component/h';
import { useState } from '../../src/component/hooks';
import { flushSync, resetScheduler } from '../../src/component/scheduler';
import * as diffMod from '../../src/core/diff';
import { domToVNode } from '../../src/core/dom';
import * as patchMod from '../../src/core/patch';
import type { VElement, VNode } from '../../src/core/vnode';
import { equalScreen } from '../../src/core/vnode';
import { countMutations } from '../helpers/count-mutations';

vi.mock('../../src/core/diff', async (orig) => {
  const m = await orig<typeof import('../../src/core/diff')>();
  return { ...m, diff: vi.fn(m.diff) };
});
vi.mock('../../src/core/patch', async (orig) => {
  const m = await orig<typeof import('../../src/core/patch')>();
  return { ...m, applyPatch: vi.fn(m.applyPatch), mountTree: vi.fn(m.mountTree) };
});

let box: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  box = document.getElementById('root')!;
  resetScheduler();
  vi.clearAllMocks();
});
afterEach(() => vi.restoreAllMocks());

const allDom = (v: VNode): boolean => !!v.dom && (v.type === 'text' || v.children.every(allDom));

/** 버튼을 누르면 count가 1 오르는 루트 */
function counter() {
  let set!: (n: number | ((p: number) => number)) => void;
  const App = () => {
    const [n, setN] = useState(0);
    set = setN;
    return h('div', null, h('p', null, `count ${n}`), h('button', { onClick: () => setN((p) => p + 1) }, '+'));
  };
  const c = render(App, {}, box);
  return { c, set: (x: number | ((p: number) => number)) => set(x), button: () => box.querySelector('button')! };
}

describe('[VT-10] FunctionComponent mount / update (ADR-0015 2절)', () => {
  it('[VT-10][C1] mount: 컨테이너에 한 번 붙이고 모든 VNode에 dom이 있다', () => {
    const { c } = counter();
    expect(patchMod.mountTree).toHaveBeenCalledTimes(1);
    expect(box.children).toHaveLength(1);
    expect(allDom(c.tree!)).toBe(true);
    expect(c.renderCount).toBe(1);
  });
  it('[VT-10][C2] 화면이 같은 update도 applyPatch를 부르고 changes는 0개', () => {
    const { c } = counter();
    c.update();
    expect(patchMod.applyPatch).toHaveBeenCalledTimes(1);
    expect(c.lastChanges).toEqual([]);
    expect(c.renderCount).toBe(2);
  });
  it('[VT-10][C3] setter 한 번 → diff 1번, applyPatch 1번, 화면 갱신', () => {
    const { set } = counter();
    set(5);
    flushSync();
    expect(diffMod.diff).toHaveBeenCalledTimes(1);
    expect(patchMod.applyPatch).toHaveBeenCalledTimes(1);
    expect(box.querySelector('p')!.textContent).toBe('count 5');
  });
});

describe('[VT-17] Phase 1 엔진으로 갱신 (FR-22, ADR-0015 3절)', () => {
  it('[VT-17][C8] 클릭마다 새로 만든 핸들러가 불린다 (클로저가 최신 값을 본다)', () => {
    const { button } = counter();
    for (let i = 0; i < 3; i++) {
      button().click();
      flushSync();
    }
    expect(box.querySelector('p')!.textContent).toBe('count 3');
  });
  it('[VT-17][C9] 핸들러만 바뀐 재렌더: changes 0개, DOM 기록 0건, addEventListener·removeEventListener 0회', async () => {
    let tick!: () => void;
    const App = () => {
      const [n, setN] = useState(0);
      tick = () => setN(n + 1);
      return h('div', null, h('button', { onClick: () => n }, 'x'));
    };
    const c = render(App, {}, box);
    const add = vi.spyOn(EventTarget.prototype, 'addEventListener');
    const remove = vi.spyOn(EventTarget.prototype, 'removeEventListener');
    const muts = await countMutations(box, () => {
      tick();
      flushSync();
    });
    expect(c.lastChanges).toEqual([]);
    expect(muts).toBe(0);
    expect(add).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
  it('[VT-17][C10] dom이 빠진 객체가 있으면 recoverPatch로 다시 그리고, 화면이 새 트리와 같다', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { c, set } = counter();
    delete ((c.tree!.children[0] as VElement).children[0] as { dom?: unknown }).dom;
    set(9);
    flushSync();
    expect(err).toHaveBeenCalledTimes(1);
    expect(equalScreen(domToVNode(box.firstElementChild!), c.tree!)).toBe(true);
    expect(box.querySelector('p')!.textContent).toBe('count 9');
    // 다시 그린 뒤에도 클릭이 동작한다 (events 복구)
    box.querySelector('button')!.click();
    flushSync();
    expect(box.querySelector('p')!.textContent).toBe('count 10');
  });
  it('[VT-17] 컴포넌트가 VElement가 아닌 값을 돌려주면 TypeError', () => {
    expect(() => render(() => null as unknown as VElement, {}, box)).toThrow(TypeError);
  });
});
