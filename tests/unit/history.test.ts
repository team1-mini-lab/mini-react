import { describe, expect, it } from 'vitest';
import { History } from '../../src/core/history';

describe('[VT-07] History 저장 (ADR-0008)', () => {
  it('[VT-07][H1] 처음에는 기록 1개, 위치 0, 두 방향 모두 못 감', () => {
    const h = new History('A');
    expect([h.size, h.index, h.canUndo(), h.canRedo()]).toEqual([1, 0, false, false]);
  });
  it('[VT-07][H2] push 2번 → 기록 3개, 위치 2. 넣은 그 객체를 그대로 보관한다', () => {
    const b = { id: 'B' };
    const h = new History<object>({ id: 'A' });
    h.push(b);
    h.push({ id: 'C' });
    expect([h.size, h.index]).toEqual([3, 2]);
    h.undo();
    expect(h.current).toBe(b);
  });
  it('[VT-07][H5] [A, B, C]에서 A로 돌아간 뒤 D를 넣으면 [A, D] (j1)', () => {
    const h = new History('A');
    h.push('B');
    h.push('C');
    h.undo();
    h.undo();
    h.push('D');
    expect([h.size, h.current, h.canRedo()]).toEqual([2, 'D', false]);
    expect(h.undo()).toBe('A');
  });
});

describe('[VT-30] 처음·끝에서 더 이동 (ADR-0008 1절)', () => {
  it('[VT-30] 기록이 하나뿐이면 undo·redo 모두 null, 위치 그대로', () => {
    const h = new History('A');
    expect([h.undo(), h.redo(), h.index]).toEqual([null, null, 0]);
  });
  it('[VT-30] push n회 → undo n회 → 처음, redo n회 → 마지막 (가역성)', () => {
    const h = new History(0);
    for (let i = 1; i <= 5; i++) h.push(i);
    for (let i = 0; i < 5; i++) h.undo();
    expect(h.current).toBe(0);
    for (let i = 0; i < 5; i++) h.redo();
    expect(h.current).toBe(5);
    expect(h.redo()).toBeNull();
  });
});
