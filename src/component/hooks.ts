// Hooks (SDD_final_phase2 2.4, ADR-0010)
import type { HookSlot } from './current';
import { getCurrent, isRenderingChild } from './current';
import { HookCallError, HookOrderError } from './errors';
import { scheduleUpdate } from './scheduler';

export type SetState<T> = (next: T | ((prev: T) => T)) => void;

/** 길이가 다르거나 Object.is로 다른 칸이 하나라도 있으면 true. 어느 한쪽이 없으면 true */
export function depsChanged(prev: unknown[] | undefined, next: unknown[] | undefined): boolean {
  if (!prev || !next) return true;
  if (prev.length !== next.length) return true;
  return prev.some((p, i) => !Object.is(p, next[i]));
}

/** 공통 호출 검사 (2.4 ①). 다음 칸 번호와, 재렌더면 그 칸을 돌려준다 */
function take<K extends HookSlot['kind']>(kind: K) {
  const c = getCurrent();
  if (!c) throw new HookCallError('Hook은 컴포넌트가 렌더링하는 동안에만 부를 수 있습니다 (핸들러·effect·최상위 금지)');
  if (isRenderingChild()) throw new HookCallError('Hook은 루트 컴포넌트에서만 쓸 수 있습니다. 자식은 props만 받습니다 (CON-06)');
  const i = c.hookIndex++;
  const slot = c.hooks[i];
  if (c.renderCount > 0) {
    if (!slot) throw new HookOrderError(`Hook 개수가 늘었습니다 (${i + 1}번째 Hook이 처음 보입니다)`);
    if (slot.kind !== kind) throw new HookOrderError(`${i + 1}번째 Hook 종류가 ${slot.kind}에서 ${kind}로 바뀌었습니다`);
  }
  return { c, i, slot: slot as Extract<HookSlot, { kind: K }> | undefined };
}

export function useState<T>(initial: T | (() => T)): [T, SetState<T>] {
  const { c, i, slot } = take('state');
  if (slot) return [slot.value as T, slot.setter as SetState<T>]; // K2, K6
  const s: Extract<HookSlot, { kind: 'state' }> = {
    kind: 'state',
    value: typeof initial === 'function' ? (initial as () => T)() : initial, // K1
    setter: () => {},
  };
  s.setter = (next: unknown) => {
    const v = typeof next === 'function' ? (next as (p: unknown) => unknown)(s.value) : next; // K5
    if (Object.is(s.value, v)) return; // K4
    s.value = v;
    scheduleUpdate(c); // K2, B1
  };
  c.hooks[i] = s;
  return [s.value as T, s.setter as SetState<T>];
}

export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void {
  const { c, i, slot } = take('effect');
  if (!slot) {
    c.hooks[i] = { kind: 'effect', deps, effect, shouldRun: true };
    return;
  }
  slot.effect = effect; // 최신 클로저
  // f1: 생략 = 매번 (K7), [] = 처음 한 번 (K8), 값 목록 = 바뀔 때만 (K9)
  if (deps === undefined || depsChanged(slot.deps, deps)) {
    slot.deps = deps;
    slot.shouldRun = true;
  }
}

export function useMemo<T>(factory: () => T, deps: unknown[]): T {
  const { c, i, slot } = take('memo');
  if (slot && !depsChanged(slot.deps, deps)) return slot.value as T; // K12
  const value = factory();
  c.hooks[i] = { kind: 'memo', deps, value };
  return value;
}
