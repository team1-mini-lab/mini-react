// 실험 2 · 보이는 것만 그리기 (가상 스크롤, ADR-0020 2절). 기존 h·diff·applyPatch를 그대로 쓴다.
// 데이터가 아무리 많아도 화면에 보이는 줄만 Virtual DOM으로 만들고, 스크롤하면 그 줄들만 비교·Patch한다.
import { diff } from '../../core/diff';
import { applyPatch, mountTree } from '../../core/patch';
import type { VElement } from '../../core/vnode';
import { h } from '../../core/vnode';

export const ROW_H = 28;
const NAMES = ['무선 이어폰', '텀블러', '노트북 거치대', '기계식 키보드', '백팩', '운동화', '전기포트', '모니터', '머그컵', '보조배터리'];
const row = (i: number) => h('li', { key: String(i) }, `${NAMES[i % NAMES.length]} ${i + 1} · ${(10000 + ((i * 7919) % 90000)).toLocaleString()}원`);

/** 전체 높이는 total줄만큼 잡고, start부터 count줄만 그린다 */
export function windowView(total: number, start: number, count: number): VElement {
  const end = Math.min(total, start + count);
  return h(
    'div',
    { class: 'vspace', style: `height:${total * ROW_H}px` },
    h('ul', { class: 'vrows', style: `transform:translateY(${start * ROW_H}px)` }, ...Array.from({ length: end - start }, (_, k) => row(start + k))),
  );
}

export function fullView(total: number): VElement {
  return h('div', null, h('ul', { class: 'vrows' }, ...Array.from({ length: total }, (_, i) => row(i))));
}

export interface VirtualStats { dataRows: number; domRows: number; changes: number; ms: number }

export function startVirtual(doc: Document = document, opts: { total?: number; viewportRows?: number } = {}) {
  const box = doc.getElementById('virt-root');
  if (!box) return null;
  const total = opts.total ?? 100_000;
  const rows = () => opts.viewportRows ?? Math.ceil((box.clientHeight || 300) / ROW_H) + 4; // 위아래 여유 4줄
  let start = 0;
  let current = windowView(total, start, rows());
  mountTree(box, current);
  const show = (s: VirtualStats, which: 'win' | 'full') => {
    const el = doc.getElementById(which === 'win' ? 'virt-win' : 'virt-full');
    if (el) el.querySelector('.big')!.textContent = which === 'win' ? `${s.domRows}줄` : `${s.domRows.toLocaleString()}줄`;
    const ms = doc.getElementById(which === 'win' ? 'virt-win-ms' : 'virt-full-ms');
    if (ms) ms.textContent = which === 'win' ? `스크롤 한 번: 바뀐 노드 ${s.changes}개 · ${s.ms.toFixed(1)}ms` : `처음 그리는 데 ${s.ms.toFixed(0)}ms`;
  };
  const countRows = () => box.querySelectorAll('li').length;

  function onScroll(): VirtualStats | null {
    const next = Math.floor(box!.scrollTop / ROW_H);
    if (next === start) return null;
    start = next;
    const t0 = performance.now();
    const view = windowView(total, start, rows());
    const r = diff(current, view);
    applyPatch(box!, view, r);
    current = view;
    const s = { dataRows: total, domRows: countRows(), changes: r.changes.length, ms: performance.now() - t0 };
    show(s, 'win');
    return s;
  }
  box.addEventListener('scroll', onScroll);
  show({ dataRows: total, domRows: countRows(), changes: 0, ms: 0 }, 'win');

  /** 비교용: 전부 그려 보기 (별도 상자에 그리고 시간을 잰다) */
  function drawAll(target: Element): VirtualStats {
    const t0 = performance.now();
    mountTree(target, fullView(total));
    const s = { dataRows: total, domRows: target.querySelectorAll('li').length, changes: total, ms: performance.now() - t0 };
    show(s, 'full');
    return s;
  }
  doc.getElementById('virt-draw-all')?.addEventListener('click', () => {
    const t = doc.getElementById('virt-all-root');
    if (t) drawAll(t);
  });
  return { onScroll, drawAll, get start() { return start; }, countRows };
}
