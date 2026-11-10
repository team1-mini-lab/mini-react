import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FunctionComponent } from '../../src/component/function-component';
import { render } from '../../src/component/function-component';
import { HookCallError, HookOrderError } from '../../src/component/errors';
import { h } from '../../src/component/h';
import type { SetState } from '../../src/component/hooks';
import { depsChanged, useEffect, useMemo, useState } from '../../src/component/hooks';
import { flushSync, resetScheduler } from '../../src/component/scheduler';
import type { VElement } from '../../src/core/vnode';

let box: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  box = document.getElementById('root')!;
  resetScheduler();
});
afterEach(() => vi.restoreAllMocks());

const mount = (App: () => VElement): FunctionComponent<object> => render(App, {}, box);
const text = () => box.firstElementChild!.textContent;

describe('[VT-12] useState 초기값 (ADR-0010)', () => {
  it('[VT-12][K1] 초기값과 초기화 함수 모두 받는다. 초기화 함수는 한 번만 부른다', () => {
    const init = vi.fn(() => 'b');
    let set!: SetState<number>;
    mount(() => {
      const [a, setA] = useState(1);
      const [b] = useState(init);
      set = setA;
      return h('p', null, `${a}${b}`);
    });
    expect(text()).toBe('1b');
    set(2);
    flushSync();
    expect(text()).toBe('2b');
    expect(init).toHaveBeenCalledTimes(1);
  });
  it('[VT-12][K6] 재렌더해도 setter는 같은 함수다', () => {
    const setters: unknown[] = [];
    const c = mount(() => {
      const [, s] = useState(0);
      setters.push(s);
      return h('p');
    });
    c.update();
    c.update();
    expect(new Set(setters).size).toBe(1);
  });
});

describe('[VT-13] setter (FR-14, FR-17)', () => {
  it('[VT-13][K2] setter → 재렌더 후 값이 유지된다', () => {
    let set!: SetState<string>;
    const c = mount(() => {
      const [v, s] = useState('a');
      set = s;
      return h('p', null, v);
    });
    set('b');
    flushSync();
    c.update();
    expect(text()).toBe('b');
  });
  it('[VT-13][K3] 여러 상태가 서로 섞이지 않는다', () => {
    let setB!: SetState<number>;
    mount(() => {
      const [a] = useState(1);
      const [b, sb] = useState(10);
      const [c] = useState(100);
      setB = sb;
      return h('p', null, `${a}-${b}-${c}`);
    });
    setB(20);
    flushSync();
    expect(text()).toBe('1-20-100');
  });
  it('[VT-13][K4] Object.is로 같은 값이면 재렌더하지 않는다', () => {
    let set!: SetState<number>;
    const c = mount(() => {
      const [v, s] = useState(NaN);
      set = s;
      return h('p', null, String(v));
    });
    set(NaN);
    flushSync();
    expect(c.renderCount).toBe(1);
  });
  it('[VT-13][K5] 함수형 업데이트는 직전 값을 받아 누적된다', () => {
    let set!: SetState<number>;
    mount(() => {
      const [v, s] = useState(0);
      set = s;
      return h('p', null, String(v));
    });
    set((p) => p + 1);
    set((p) => p + 1);
    set((p) => p * 10);
    flushSync();
    expect(text()).toBe('20');
  });
});

describe('[VT-14] useEffect (FR-18, FR-19, f1·g1)', () => {
  function withEffects(log: string[]) {
    let set!: SetState<number>;
    let setOther!: SetState<number>;
    const c = mount(() => {
      const [n, s] = useState(0);
      const [o, so] = useState(0);
      set = s;
      setOther = so;
      useEffect(() => {
        log.push('every');
      });
      useEffect(() => {
        log.push('once');
      }, []);
      useEffect(() => {
        log.push(`n=${n}`);
      }, [n]);
      return h('p', null, `${n}/${o}`);
    });
    return { c, set: (v: number) => (set(v), flushSync()), other: (v: number) => (setOther(v), flushSync()) };
  }
  it('[VT-14][K7] deps 생략은 매 렌더 실행', () => {
    const log: string[] = [];
    const t = withEffects(log);
    t.other(1);
    t.other(2);
    expect(log.filter((x) => x === 'every')).toHaveLength(3);
  });
  it('[VT-14][K8] []는 처음 한 번만', () => {
    const log: string[] = [];
    const t = withEffects(log);
    t.set(1);
    t.other(1);
    expect(log.filter((x) => x === 'once')).toHaveLength(1);
  });
  it('[VT-14][K9] deps 값이 바뀔 때만', () => {
    const log: string[] = [];
    const t = withEffects(log);
    t.other(5);
    t.set(1);
    t.other(6);
    expect(log.filter((x) => x.startsWith('n='))).toEqual(['n=0', 'n=1']);
  });
  it('[VT-14][K10] effect는 Patch가 끝난 뒤 실행되어 바뀐 DOM을 본다', () => {
    const seen: string[] = [];
    let set!: SetState<string>;
    mount(() => {
      const [v, s] = useState('a');
      set = s;
      useEffect(() => {
        seen.push(box.textContent ?? '');
      });
      return h('p', null, v);
    });
    set('b');
    flushSync();
    expect(seen).toEqual(['a', 'b']);
  });
  it('[VT-14][K11] 다시 실행되기 직전에 이전 cleanup을 부른다', () => {
    const log: string[] = [];
    let set!: SetState<number>;
    mount(() => {
      const [n, s] = useState(0);
      set = s;
      useEffect(() => {
        log.push(`run ${n}`);
        return () => log.push(`clean ${n}`);
      }, [n]);
      return h('p');
    });
    set(1);
    flushSync();
    set(2);
    flushSync();
    expect(log).toEqual(['run 0', 'clean 0', 'run 1', 'clean 1', 'run 2']);
  });
  it('[VT-14][K14] effect 하나가 실패해도 console.error 후 나머지는 실행된다', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ran: string[] = [];
    mount(() => {
      useEffect(() => {
        throw new Error('boom');
      });
      useEffect(() => {
        ran.push('second');
      });
      return h('p');
    });
    expect(err).toHaveBeenCalledTimes(1);
    expect(ran).toEqual(['second']);
  });
});

describe('[VT-15] useMemo (FR-20)', () => {
  it('[VT-15][K12] 같은 deps로 여러 번 재렌더해도 factory는 1번', () => {
    const factory = vi.fn(() => 42);
    const c = mount(() => {
      const v = useMemo(factory, [1, 'a']);
      return h('p', null, String(v));
    });
    for (let i = 0; i < 5; i++) c.update();
    expect(factory).toHaveBeenCalledTimes(1);
  });
  it('[VT-15][K13] deps가 바뀌면 다시 계산해 화면에 반영한다', () => {
    let set!: SetState<number>;
    const factory = vi.fn((n: number) => n * n);
    mount(() => {
      const [n, s] = useState(2);
      set = s;
      const sq = useMemo(() => factory(n), [n]);
      return h('p', null, String(sq));
    });
    set(3);
    flushSync();
    expect(text()).toBe('9');
    expect(factory).toHaveBeenCalledTimes(2);
  });
  it('[VT-15] depsChanged: 길이·Object.is 비교', () => {
    expect(depsChanged([1, NaN], [1, NaN])).toBe(false);
    expect(depsChanged([0], [-0])).toBe(true);
    expect(depsChanged([1], [1, 2])).toBe(true);
    expect(depsChanged(undefined, [])).toBe(true);
  });
});

describe('[VT-16] Hook 규칙 (FR-21, ADR-0010)', () => {
  it('[VT-16][HR1] 이벤트 핸들러 안에서 Hook → HookCallError', () => {
    let caught: unknown;
    mount(() =>
      h('button', {
        onClick: () => {
          try {
            useState(0);
          } catch (e) {
            caught = e;
          }
        },
      }),
    );
    box.querySelector('button')!.click();
    expect(caught).toBeInstanceOf(HookCallError);
    expect(() => useState(0)).toThrow(HookCallError); // 최상위
  });
  it('[VT-16][HR2] effect 안에서 Hook → HookCallError (effect 격리로 console.error)', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    mount(() => {
      useEffect(() => {
        useState(0);
      });
      return h('p');
    });
    expect(err.mock.calls[0][1]).toBeInstanceOf(HookCallError);
  });
  it('[VT-16][HR3] 자식 컴포넌트 안에서 Hook → HookCallError, 루트 hooks는 그대로', () => {
    const Child = () => {
      useState(1);
      return h('span');
    };
    let c: FunctionComponent<object> | undefined;
    expect(() => {
      c = mount(() => {
        useState('root');
        return h('div', null, h(Child, null));
      });
    }).toThrow(HookCallError);
    expect(c).toBeUndefined();
  });
  it('[VT-16][HR4] 재렌더에서 Hook 개수가 줄거나 늘면 HookOrderError', () => {
    let mode = 0;
    const c = mount(() => {
      useState(0);
      if (mode !== 1) useState(1);
      if (mode === 2) useState(2);
      return h('p');
    });
    mode = 1;
    expect(() => c.update()).toThrow(HookOrderError);
    mode = 2;
    expect(() => c.update()).toThrow(HookOrderError);
  });
  it('[VT-16][HR5] 재렌더에서 Hook 종류 순서가 바뀌면 HookOrderError', () => {
    let swap = false;
    const c = mount(() => {
      if (swap) useMemo(() => 1, []);
      else useState(0);
      return h('p');
    });
    swap = true;
    expect(() => c.update()).toThrow(HookOrderError);
  });
  it('[VT-16][HR6] HookOrderError가 나면 Diff·Patch로 가지 않고 이전 DOM이 그대로', () => {
    let bad = false;
    let set!: SetState<string>;
    const c = mount(() => {
      const [v, s] = useState('a');
      set = s;
      if (bad) useState(0);
      return h('p', null, v);
    });
    const p = box.querySelector('p');
    bad = true;
    set('b');
    expect(() => flushSync()).toThrow(HookOrderError);
    expect(box.querySelector('p')).toBe(p);
    expect(text()).toBe('a');
    expect(c.renderCount).toBe(1);
  });
});
