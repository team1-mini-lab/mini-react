import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FunctionComponent } from '../../src/component/function-component';
import { render } from '../../src/component/function-component';
import { TooManyRendersError } from '../../src/component/errors';
import { h } from '../../src/component/h';
import type { SetState } from '../../src/component/hooks';
import { useEffect, useState } from '../../src/component/hooks';
import { flushSync, RENDER_LIMIT, resetScheduler } from '../../src/component/scheduler';

let box: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  box = document.getElementById('root')!;
  resetScheduler();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function three() {
  const sets: SetState<number>[] = [];
  const c = render(
    () => {
      const [a, sa] = useState(0);
      const [b, sb] = useState(0);
      const [d, sd] = useState(0);
      sets.push(sa, sb, sd);
      return h('div', null, h('p', null, `${a}${b}${d}`), h('button', { onClick: () => (sa(1), sb(2), sd(3)) }, 'go'));
    },
    {},
    box,
  );
  return c;
}

describe('[VT-19] Batching (TBD-05, ADR-0009)', () => {
  it('[VT-19][B1] 한 클릭 핸들러에서 setter 3번 → 렌더 1번, 화면은 최종 값', async () => {
    const c = three();
    box.querySelector('button')!.click();
    await Promise.resolve(); // microtask 한 번
    expect(c.renderCount).toBe(2);
    expect(box.querySelector('p')!.textContent).toBe('123');
  });
  it('[VT-19][B2] setTimeout 안에서 setter 3번 → 렌더 1번', () => {
    vi.useFakeTimers();
    const c = three();
    setTimeout(() => box.querySelector('button')!.click(), 10);
    vi.advanceTimersByTime(10);
    flushSync();
    expect(c.renderCount).toBe(2);
  });
  it('[VT-19][B3] flushSync 전에는 화면이 그대로, 후에는 갱신', () => {
    const c = three();
    box.querySelector('button')!.click();
    expect(box.querySelector('p')!.textContent).toBe('000');
    flushSync();
    expect(box.querySelector('p')!.textContent).toBe('123');
    expect(c.renderCount).toBe(2);
  });
  it('[VT-19][B4] deps 없는 effect 안에서 계속 setter → 50회를 넘으면 Too many re-renders', () => {
    let c: FunctionComponent<object> | undefined;
    c = render(
      () => {
        const [n, s] = useState(0);
        useEffect(() => s(n + 1));
        return h('p', null, String(n));
      },
      {},
      box,
    );
    expect(() => flushSync()).toThrow(TooManyRendersError);
    expect(() => flushSync()).not.toThrow(); // 멈춘 뒤에는 남은 예약이 없다
    expect(c.renderCount).toBeLessThanOrEqual(RENDER_LIMIT + 1);
    c = undefined;
  });
  it('[VT-19][B5] 사용자가 버튼을 60번 눌러도 오류 없음 (바깥에서 시작하면 0부터)', () => {
    const c = render(
      () => {
        const [n, s] = useState(0);
        return h('button', { onClick: () => s(n + 1) }, String(n));
      },
      {},
      box,
    );
    expect(() => {
      for (let i = 0; i < 60; i++) {
        box.querySelector('button')!.click();
        flushSync();
      }
    }).not.toThrow();
    expect(box.textContent).toBe('60');
    expect(c.renderCount).toBe(61);
  });
  it('[VT-19][B6] 렌더링 본문에서 setter → console.warn 1번, 다음 차례에 반영', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      () => {
        const [n, s] = useState(0);
        if (n === 0) s(1);
        return h('p', null, String(n));
      },
      {},
      box,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(box.textContent).toBe('0');
    flushSync();
    expect(box.textContent).toBe('1');
  });
});
