// 스케줄러와 Batching (SDD_final_phase2 2.5, ADR-0009, TBD-05)
import type { HookHost } from './current';
import { getCurrent, isBusy } from './current';
import { TooManyRendersError } from './errors';

export const RENDER_LIMIT = 50;

let pending: HookHost | null = null;
let queued = false;
let chain = 0; // 렌더링·effect 안에서 이어진 재렌더 횟수

export function scheduleUpdate(c: HookHost): void {
  if (getCurrent() !== null) {
    console.warn('렌더링 도중 setState가 호출되었습니다. 다음 차례로 미룹니다.'); // B6
  }
  if (isBusy()) {
    chain += 1;
    if (chain > RENDER_LIMIT) {
      chain = 0;
      pending = null;
      queued = false;
      throw new TooManyRendersError(); // B4
    }
  } else {
    chain = 0; // 클릭·타이머 등 바깥에서 시작 (B5)
  }
  pending = c;
  if (!queued) {
    queued = true;
    queueMicrotask(flush); // b1: 한 차례에 update 1번
  }
}

function flush(): void {
  if (!queued) return;
  queued = false;
  const target = pending;
  pending = null;
  target?.update();
}

/** 예약된 update를 지금 실행한다. effect가 다시 예약하면 그것까지 (50회 한계 안에서) 실행한다 (B3) */
export function flushSync(): void {
  while (queued) flush();
}

/** 테스트 도우미: 남은 예약을 버린다 */
export function resetScheduler(): void {
  pending = null;
  queued = false;
  chain = 0;
}
