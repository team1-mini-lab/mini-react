// 실험 3 · 바로 고치기 (Signals, ADR-0020 2절, LB6). 기존 엔진 변경 없음.
import { describe, expect, it } from 'vitest';
import { effect, signal, startSignals } from '../../src/pages/lab/signals';

describe('[VT-51] 바로 고치기 (ADR-0020)', () => {
  it('[VT-51][LB6] 가격 하나를 바꾸면 둘 다 DOM 수정 1번, Virtual DOM은 전체를 비교하고 Signals는 비교 0번', () => {
    document.body.innerHTML = '<div id="sig-vdom"></div><div id="sig-signal"></div>';
    const s = startSignals(document, { total: 1000 })!;
    const r = s.changeOne(10);
    expect(r.vdom.domWrites).toBe(1);
    expect(r.signal.domWrites).toBe(1);
    expect(r.vdom.compared).toBeGreaterThan(1000);
    expect(r.signal.compared).toBe(0);
    expect(document.querySelectorAll('#sig-signal li')[10].textContent).toBe(document.querySelectorAll('#sig-vdom li')[10].textContent);
  });
  it('[VT-51][LB6] signal은 값을 읽은 effect만 다시 실행하고, 같은 값이면 실행하지 않는다', () => {
    const [a, setA] = signal(1);
    const [b, setB] = signal(1);
    const runs: string[] = [];
    effect(() => runs.push(`a=${a()}`));
    effect(() => runs.push(`b=${b()}`));
    setA(2);
    setA(2);
    setB(5);
    expect(runs).toEqual(['a=1', 'b=1', 'a=2', 'b=5']);
  });
});
