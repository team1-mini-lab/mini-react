// 실험 2 · 보이는 것만 그리기 (ADR-0020 2절, LB5). 기존 diff·applyPatch만 쓴다.
import { describe, expect, it } from 'vitest';
import { startVirtual } from '../../src/pages/lab/virtual';

describe('[VT-51] 가상 스크롤 (ADR-0020)', () => {
  it('[VT-51][LB5] 데이터 1만 개여도 DOM은 보이는 줄만, 3줄 스크롤하면 바뀐 노드는 몇 개뿐', () => {
    document.body.innerHTML = '<div id="virt-root"></div><div id="virt-all-root"></div>';
    const v = startVirtual(document, { total: 10_000, viewportRows: 12 })!;
    expect(v.countRows()).toBe(12);
    const box = document.getElementById('virt-root')!;
    box.scrollTop = 28 * 3;
    const s = v.onScroll()!;
    expect(v.start).toBe(3);
    expect(s.domRows).toBe(12);
    expect(s.changes).toBeLessThanOrEqual(3 + 3 + 1); // 위 3줄 삭제 + 아래 3줄 추가 + 위치 속성 1
    expect(box.querySelector('li')!.textContent).toContain(' 4 ·');
    const all = v.drawAll(document.getElementById('virt-all-root')!);
    expect(all.domRows).toBe(10_000);
  });
});
