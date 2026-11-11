// Phase 2 오류 (SDD_final_phase2 2.4 ①, ADR-0009·0010)

/** 컴포넌트 밖(핸들러·effect·최상위)이나 자식 컴포넌트에서 Hook을 부름 (HR1~HR3) */
export class HookCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HookCallError';
  }
}

/** 재렌더에서 Hook 개수나 종류가 달라짐 (HR4, HR5) */
export class HookOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HookOrderError';
  }
}

/** 렌더링·effect 안의 연쇄 재렌더가 50회를 넘음 (B4). effect 격리(K14)에 잡히지 않고 밖으로 나간다 */
export class TooManyRendersError extends Error {
  constructor() {
    super('Too many re-renders');
    this.name = 'TooManyRendersError';
  }
}
