// 성능 실험실 페이지 (ADR-0020). 시간이 아니라 결과 화면과 DOM 노드 수로 판정한다.
import { beforeEach, describe, expect, it } from 'vitest';
import { domToVNode } from '../../src/core/dom';
import { equalScreen } from '../../src/core/vnode';
import { buildList, startLab } from '../../src/pages/lab/main';

const page = () => {
  document.body.innerHTML = '<div id="lab-root"></div><pre id="lab-result"></pre>';
  const q: (() => void)[] = [];
  let t = 0;
  const lab = startLab(document, { slice: { budgetMs: 5, now: () => (t += 1), schedule: (r) => q.push(r) } });
  const drain = () => { while (q.length) q.shift()!(); };
  return { lab, q, drain, root: () => document.getElementById('lab-root')!.firstElementChild! };
};
let p: ReturnType<typeof page>;
beforeEach(() => { p = page(); });

describe('[VT-51] 성능 실험실 (ADR-0020, TBD-12·TBD-14)', () => {
  it('[VT-51][LB1] 동기와 협력적 스케줄링은 같은 화면, 같은 DOM 수정 수. 협력적은 여러 조각으로 나뉜다', async () => {
    const s = await p.lab.update('sync');
    p.lab.reset(1000, 'all');
    const pending = p.lab.update('sliced');
    p.drain();
    const c = (await pending)!;
    expect(equalScreen(domToVNode(p.root()), buildList(1000, 1, 'all'))).toBe(true);
    expect([c.modified, c.created]).toEqual([s!.modified, s!.created]);
    expect(c.modified).toBe(1000);
    expect(c.slices).toBeGreaterThan(1);
  });
  it('[VT-51][LB2] 1개만 바꾸면 Patch는 수정 1, 통째 교체는 노드를 전부 새로 만든다', async () => {
    p.lab.reset(1000, 'one');
    const patch = (await p.lab.update('sync'))!;
    const replace = (await p.lab.update('replace'))!;
    expect([patch.modified, patch.created]).toEqual([1, 0]);
    expect(replace.created).toBe(1 + 1000 * 2); // ul + (li + 글자) × 1000
    expect(equalScreen(domToVNode(p.root()), buildList(1000, 2, 'one'))).toBe(true);
  });
  it('[VT-51][LB3] 협력적 실행 도중 새 업데이트가 오면 앞의 작업은 버리고 최신 상태로 끝난다', async () => {
    const first = p.lab.update('sliced');
    p.q.shift()!(); // 첫 조각만 실행
    const second = p.lab.update('sliced');
    p.drain();
    expect(await first).toBeNull();
    expect((await second)!.modified).toBe(1000);
    expect(equalScreen(domToVNode(p.root()), buildList(1000, 2, 'all'))).toBe(true);
  });
  it('[VT-51][LB4] 전부 바꾸면 Patch도 모든 노드를 고친다 (Virtual DOM은 만능이 아님)', async () => {
    const r = (await p.lab.update('sync'))!;
    expect(r.modified).toBe(1000);
    expect(r.longestMs).toBeGreaterThanOrEqual(0);
  });
});
