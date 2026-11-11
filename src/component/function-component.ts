// FunctionComponent와 render (SDD_final_phase2 2.2, ADR-0015 2절, CON-05~CON-08)
// 화면 반영은 Phase 1 core의 diff·applyPatch·mountTree를 수정 없이 쓴다 (C-08, FR-22).
import type { Change } from '../core/diff';
import { diff } from '../core/diff';
import { applyPatch, mountTree } from '../core/patch';
import type { VElement } from '../core/vnode';
import type { HookHost, HookSlot } from './current';
import { isBusy, setBusy, setCurrent } from './current';
import { HookOrderError, TooManyRendersError } from './errors';
import type { Component } from './h';

export interface RenderOptions {
  /** Patch와 effect가 끝난 뒤 불린다. 테스트 페이지가 변경 로그를 쓰는 데 쓴다 */
  onCommit?: (c: FunctionComponent<never>) => void;
}

export class FunctionComponent<P extends object = Record<string, unknown>> implements HookHost {
  hooks: HookSlot[] = [];
  hookIndex = 0;
  renderCount = 0;
  lastChanges: Change[] = [];
  private vnode: VElement | null = null;

  constructor(
    private fn: Component<P>,
    private props: P,
    private container: Element,
    private opts: RenderOptions = {},
  ) {}

  /** 지금 실제 DOM에 그려진 트리 (dom이 채워진 객체) */
  get tree(): VElement | null {
    return this.vnode;
  }

  /** 1~3단계: 함수 실행 + Hook 개수 검사. 실패하면 Diff·Patch로 가지 않는다 (HR6) */
  private renderTree(): VElement {
    setCurrent(this);
    this.hookIndex = 0;
    let next: VElement;
    try {
      next = this.fn({ ...this.props, children: [] });
    } finally {
      setCurrent(null);
    }
    if (typeof next !== 'object' || next === null || next.type !== 'element') {
      throw new TypeError('컴포넌트는 VElement 하나를 반환해야 합니다');
    }
    if (this.renderCount > 0 && this.hookIndex !== this.hooks.length) {
      throw new HookOrderError(`Hook 개수가 ${this.hooks.length}개에서 ${this.hookIndex}개로 바뀌었습니다`); // HR4
    }
    return next;
  }

  private busy(work: () => void): void {
    const prev = isBusy();
    setBusy(true); // ADR-0009 3절: mount·update 모두 렌더링·effect 동안 표시
    try {
      work();
    } finally {
      setBusy(prev);
    }
  }

  mount(): void {
    this.busy(() => {
      const next = this.renderTree();
      mountTree(this.container, next); // C1: 한 번 부착 + dom·events 기록
      this.vnode = next;
      this.lastChanges = [];
      this.renderCount += 1;
      this.runEffects();
    });
    this.opts.onCommit?.(this as unknown as FunctionComponent<never>);
  }

  update(): void {
    if (!this.vnode) return this.mount();
    this.busy(() => {
      const next = this.renderTree();
      const result = diff(this.vnode!, next);
      this.lastChanges = result.changes;
      // 변경 0개여도 부른다: dom·events를 새 트리로 넘겨야 다음 클릭이 최신 핸들러를 부른다 (C2, C8)
      // 실패하면 applyPatch 안에서 recoverPatch(t3)가 컨테이너를 다시 그린다 (C10)
      applyPatch(this.container, next, result, { highlight: true, highlightExcludeTags: ['input', 'textarea'] });
      this.vnode = next;
      this.renderCount += 1;
      this.runEffects();
    });
    this.opts.onCommit?.(this as unknown as FunctionComponent<never>);
  }

  /**
   * 7단계: Patch 직후 동기 실행 (K10). 실제 리액트와 같은 순서로 두 단계로 나눈다 (ADR-0010 3절, 2026-11-11):
   * ① 실행할 칸의 이전 정리 함수를 모두 부른다 (g1, K11) → ② 같은 칸의 effect를 모두 실행한다 (K15).
   * 두 단계 모두 칸마다 오류를 따로 잡는다 (K14). 무한 루프 오류(B4)만 밖으로 내보낸다.
   */
  private runEffects(): void {
    const due = this.hooks.filter((s): s is Extract<HookSlot, { kind: 'effect' }> => s.kind === 'effect' && s.shouldRun);
    for (const s of due) {
      s.shouldRun = false;
      const f = s.cleanup;
      s.cleanup = undefined;
      if (f) this.guard(f, '정리 함수');
    }
    for (const s of due) {
      this.guard(() => {
        const r = s.effect();
        if (typeof r === 'function') s.cleanup = r;
      }, 'effect');
    }
  }

  private guard(work: () => void, what: string): void {
    try {
      work();
    } catch (err) {
      if (err instanceof TooManyRendersError) throw err; // B4: 무한 루프는 숨기지 않는다
      console.error(`[effect] ${what} 실행 중 오류가 나서 이것만 건너뜁니다:`, err);
    }
  }

}

export function render<P extends object>(fn: Component<P>, props: P, container: Element, opts?: RenderOptions): FunctionComponent<P> {
  const c = new FunctionComponent(fn, props, container, opts);
  c.mount();
  return c;
}
