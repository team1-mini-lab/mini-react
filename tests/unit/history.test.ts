import { describe, it, expect } from 'vitest';
import { History } from '../../src/core/history';

describe('[VT-07][VT-08][VT-09][VT-30] State History 모듈 검증', () => {
  it('초기 상태가 0번 인덱스로 적재된다', () => {
    const history = new History('상태0');
    expect(history.current).toBe('상태0');
    expect(history.index).toBe(0);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it('push 시 새로운 상태가 쌓이고 undo/redo가 동작한다', () => {
    const history = new History('상태0');
    history.push('상태1');
    history.push('상태2');

    expect(history.current).toBe('상태2');
    expect(history.canUndo()).toBe(true);

    expect(history.undo()).toBe('상태1');
    expect(history.undo()).toBe('상태0');
    expect(history.undo()).toBeNull(); // 첫 위치에서 이동 불가 (VT-30)

    expect(history.redo()).toBe('상태1');
    expect(history.redo()).toBe('상태2');
    expect(history.redo()).toBeNull();
  });

  it('중간 상태에서 새 push 시 분기 뒤쪽 기록이 잘려나간다 (j1 선형 기록)', () => {
    const history = new History('상태0');
    history.push('상태1');
    history.push('상태2');

    history.undo(); // 상태1로 이동
    history.push('상태3'); // 분기 생성

    expect(history.current).toBe('상태3');
    expect(history.size).toBe(3); // 상태0, 상태1, 상태3
    expect(history.redo()).toBeNull(); // 상태2는 지워졌음
  });
});
