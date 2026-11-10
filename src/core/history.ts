/**
 * State History 모듈 (ADR-0008, j1 선형 기록)
 */

export class History<T> {
  private stack: T[] = [];
  private currentIdx = -1;
  private limit: number;

  constructor(initialState: T, limit = 100) {
    this.limit = limit;
    this.stack.push(initialState);
    this.currentIdx = 0;
  }

  get current(): T {
    return this.stack[this.currentIdx];
  }

  get index(): number {
    return this.currentIdx;
  }

  get size(): number {
    return this.stack.length;
  }

  /**
   * push: 새 상태 추가
   * 현재 위치 이후의 모든 분기 기록은 잘라낸다 (j1 선형 기록)
   */
  push(state: T): void {
    // 현재 인덱스 뒤쪽 삭제
    this.stack = this.stack.slice(0, this.currentIdx + 1);
    this.stack.push(state);

    // 용량 초과 시 앞에서 제거
    if (this.stack.length > this.limit) {
      this.stack.shift();
    } else {
      this.currentIdx++;
    }
  }

  canUndo(): boolean {
    return this.currentIdx > 0;
  }

  canRedo(): boolean {
    return this.currentIdx < this.stack.length - 1;
  }

  undo(): T | null {
    if (!this.canUndo()) {
      return null;
    }
    this.currentIdx--;
    return this.current;
  }

  redo(): T | null {
    if (!this.canRedo()) {
      return null;
    }
    this.currentIdx++;
    return this.current;
  }

  goTo(idx: number): T | null {
    if (idx < 0 || idx >= this.stack.length) {
      return null;
    }
    this.currentIdx = idx;
    return this.current;
  }
}
