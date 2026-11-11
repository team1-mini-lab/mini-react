// State History (SDD_final_phase1 6장, ADR-0008): 선형 기록 + 지금 위치. DOM을 모른다.
export class History<T> {
  private entries: T[];
  private cursor: number;

  constructor(initial: T) {
    this.entries = [initial];
    this.cursor = 0;
  }

  get current(): T {
    return this.entries[this.cursor];
  }
  get index(): number {
    return this.cursor;
  }
  get size(): number {
    return this.entries.length;
  }

  /** j1: 지금 위치 뒤의 기록을 지우고 추가한다. 같은 객체를 그대로 넣는다(복사하지 않음). */
  push(state: T): void {
    this.entries = this.entries.slice(0, this.cursor + 1);
    this.entries.push(state);
    this.cursor = this.entries.length - 1;
  }

  undo(): T | null {
    if (!this.canUndo()) return null;
    this.cursor -= 1;
    return this.current;
  }

  redo(): T | null {
    if (!this.canRedo()) return null;
    this.cursor += 1;
    return this.current;
  }

  canUndo(): boolean {
    return this.cursor > 0;
  }
  canRedo(): boolean {
    return this.cursor < this.entries.length - 1;
  }
}
