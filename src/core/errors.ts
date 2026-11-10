// core 전용 오류 모음. Phase 1은 t3 복구(ADR-0005 6절)를 쓰므로 Patch 오류 클래스가 없다.
// Phase 2 Hook 오류는 component/errors.ts에 둔다 (의존 방향: component → core).
export {};
