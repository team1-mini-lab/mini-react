// 지금 렌더링 중인 컴포넌트와 실행 상태 (SDD_final_phase2 7장 1번 해소: 순환 import를 끊는 작은 모듈)
// hooks·scheduler·function-component·h가 모두 이 모듈만 읽고, 서로를 직접 import하지 않는다.

export type HookSlot =
  | { kind: 'state'; value: unknown; setter: (next: unknown) => void }
  | { kind: 'effect'; deps?: unknown[]; effect: () => void | (() => void); cleanup?: () => void; shouldRun: boolean }
  | { kind: 'memo'; deps: unknown[]; value: unknown };

/** hooks·scheduler가 아는 컴포넌트의 모습 (FunctionComponent가 구현한다) */
export interface HookHost {
  hooks: HookSlot[];
  hookIndex: number;
  renderCount: number;
  update(): void;
}

let current: HookHost | null = null;
let renderingChild = 0; // > 0 이면 자식 컴포넌트 실행 중 (HR3)
let busy = false; // 렌더링 또는 effect 실행 중 (ADR-0009 3절, mount·update 모두)

export const getCurrent = (): HookHost | null => current;
export const setCurrent = (c: HookHost | null): void => {
  current = c;
};
export const isRenderingChild = (): boolean => renderingChild > 0;
export const enterChild = (): void => {
  renderingChild += 1;
};
export const exitChild = (): void => {
  renderingChild -= 1;
};
export const isBusy = (): boolean => busy;
export const setBusy = (b: boolean): void => {
  busy = b;
};
