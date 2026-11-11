// 협력적 스케줄링: Diff를 시간 단위로 나눠 실행한다 (ADR-0020, 제안).
// 정해진 시간(budgetMs)만 일하고 메인 스레드를 양보한 뒤, 다음 기회에 멈춘 노드부터 이어서 한다.
// 실제 DOM에 반영하는 Commit(applyPatch)은 나누지 않는다. 호출하는 쪽이 done 뒤에 한 번에 한다.
import type { DiffResult } from './diff';
import { diffSteps } from './diff';
import type { VNode } from './vnode';

export interface SliceOptions {
  /** 한 번에 일할 시간(ms). 기본 5 */
  budgetMs?: number;
  /** 시계. 테스트에서 가짜 시계를 넣는다 */
  now?: () => number;
  /** 다음 조각 예약. 기본은 MessageChannel(없으면 setTimeout 0) */
  schedule?: (run: () => void) => void;
}

export interface DiffTask {
  /** 끝나면 DiffResult, 취소되면 null */
  readonly done: Promise<DiffResult | null>;
  cancel(): void;
  /** 지금까지 실행한 조각 수 */
  readonly slices: number;
  /** 가장 길었던 조각 하나의 실행 시간(ms) = 메인 스레드를 연속으로 잡은 최대 시간 */
  readonly longestSliceMs: number;
}

function defaultSchedule(run: () => void): void {
  if (typeof MessageChannel !== 'undefined') {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => {
      ch.port1.close();
      run();
    };
    ch.port2.postMessage(null);
  } else {
    setTimeout(run, 0);
  }
}

export function diffSliced(oldV: VNode, newV: VNode, opts: SliceOptions = {}): DiffTask {
  const budget = opts.budgetMs ?? 5;
  const now = opts.now ?? (() => performance.now());
  const schedule = opts.schedule ?? defaultSchedule;
  const { out, steps } = diffSteps(oldV, newV);
  let stopped = false;
  let slices = 0;
  let longest = 0;
  let settle!: (r: DiffResult | null) => void;
  let fail!: (e: unknown) => void;
  const done = new Promise<DiffResult | null>((res, rej) => {
    settle = res;
    fail = rej;
  });

  const work = (): void => {
    if (stopped) return;
    slices += 1;
    const start = now();
    let finished = false;
    let elapsed = 0;
    try {
      // 시간이 남아 있는 동안 노드를 하나씩 처리한다 (최소 1개는 처리해서 반드시 앞으로 간다)
      do {
        if (steps.next().done) {
          finished = true;
          elapsed = now() - start;
          break;
        }
        elapsed = now() - start;
      } while (elapsed < budget);
    } catch (e) {
      stopped = true;
      fail(e);
      return;
    }
    longest = Math.max(longest, elapsed);
    if (finished) {
      stopped = true;
      settle(out);
    } else {
      schedule(work); // 양보: 브라우저가 입력·그리기를 처리한 뒤 이어서 한다
    }
  };

  schedule(work);
  return {
    done,
    cancel() {
      if (stopped) return;
      stopped = true;
      settle(null);
    },
    get slices() {
      return slices;
    },
    get longestSliceMs() {
      return longest;
    },
  };
}
