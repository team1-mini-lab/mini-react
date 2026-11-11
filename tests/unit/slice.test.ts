// 협력적 스케줄링 (ADR-0020): Diff를 나눠 실행해도 결과는 동기 Diff와 같아야 한다.
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { diff } from '../../src/core/diff';
import { diffSliced } from '../../src/core/slice';
import type { VElement, VNode } from '../../src/core/vnode';
import { h } from '../../src/core/vnode';

afterEach(() => vi.restoreAllMocks());

/** 테스트용 스케줄러: 예약된 조각을 직접 하나씩 돌린다 */
function manual() {
  const queue: (() => void)[] = [];
  return { schedule: (run: () => void) => queue.push(run), queue, drain: () => { while (queue.length) queue.shift()!(); } };
}
/** 부를 때마다 1ms씩 가는 시계 */
const ticking = () => { let t = 0; return () => (t += 1); };

const text = fc.constantFrom('', ' ', 'a', 'b', '사과').map((t): VNode => ({ type: 'text', text: t }));
const { tree } = fc.letrec<{ node: VNode; tree: VElement }>((tie) => ({
  node: fc.oneof({ depthSize: 'small' }, text, tie('tree')),
  tree: fc
    .record({
      tag: fc.constantFrom('div', 'p', 'li'),
      key: fc.option(fc.constantFrom('a', 'b', 'c', 'd'), { nil: undefined }),
      cls: fc.option(fc.constantFrom('x', 'y'), { nil: undefined }),
      children: fc.array(tie('node'), { maxLength: 4 }),
    })
    .map(({ tag, key, cls, children }) => {
      const v = h(tag, cls ? { class: cls } : null, ...children);
      if (key) v.key = key;
      return v;
    }),
}));

describe('[VT-50] Diff 시간 분할 (ADR-0020)', () => {
  it('[VT-50][SL1] 아무 두 트리나 나눠서 Diff해도 동기 Diff와 변경 목록·짝 목록이 같다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fc.assert(
      fc.asyncProperty(tree, tree, fc.integer({ min: 0, max: 3 }), async (a, b, budget) => {
        const m = manual();
        const task = diffSliced(a, b, { budgetMs: budget, now: ticking(), schedule: m.schedule });
        m.drain();
        expect(await task.done).toEqual(diff(a, b));
      }),
      { numRuns: 300 },
    );
  });
  it('[VT-50][SL2] 시간이 다 되면 양보하고, 다음 조각에서 이어서 끝까지 간다', async () => {
    const list = (v: number) => h('ul', null, ...Array.from({ length: 200 }, (_, i) => h('li', { key: String(i) }, `${i}-${v}`)));
    const a = list(0);
    const b = list(1);
    const m = manual();
    const task = diffSliced(a, b, { budgetMs: 10, now: ticking(), schedule: m.schedule });
    expect(m.queue).toHaveLength(1); // 바로 실행하지 않고 예약만 한다
    m.drain();
    const r = await task.done;
    expect(task.slices).toBeGreaterThan(10);
    expect(task.longestSliceMs).toBeLessThanOrEqual(10);
    expect(r!.changes).toHaveLength(200);
  });
  it('[VT-50][SL3] 도중에 취소하면 null로 끝나고 더 이상 예약하지 않는다', async () => {
    const big = h('ul', null, ...Array.from({ length: 100 }, (_, i) => h('li', null, String(i))));
    const m = manual();
    const task = diffSliced(big, structuredClone(big), { budgetMs: 1, now: ticking(), schedule: m.schedule });
    m.queue.shift()!(); // 첫 조각
    task.cancel();
    m.drain();
    expect(await task.done).toBeNull();
    expect(task.slices).toBe(1);
    expect(m.queue).toHaveLength(0);
  });
  it('[VT-50][SL4] 기본 스케줄러(MessageChannel)로도 끝까지 가고 결과가 같다', async () => {
    const a = h('div', null, h('p', null, 'a'), h('ul', null, h('li', { key: 'x' }, '1')));
    const b = h('div', null, h('p', null, 'b'), h('ul', null, h('li', { key: 'y' }, '2'), h('li', { key: 'x' }, '1')));
    expect(await diffSliced(a, b, { budgetMs: 0 }).done).toEqual(diff(a, b));
  });
});
