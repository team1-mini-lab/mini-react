// 성능 실험실 (ADR-0020, 제안). 같은 목록 변경을 세 방식으로 적용해 비교한다.
//   sync    : Diff 전체 → Patch (지금 엔진 그대로)
//   sliced  : Diff를 5ms씩 나눠 실행(협력적 스케줄링) → Patch는 한 번에
//   replace : Diff 없이 목록을 통째로 다시 만든다 (innerHTML과 같은 방식)
// 시간 값은 기계마다 달라 보여 주기만 한다. 테스트는 노드 수·결과 화면으로 판정한다.
import { diff } from '../../core/diff';
import { applyPatch, mountTree } from '../../core/patch';
import type { DiffTask, SliceOptions } from '../../core/slice';
import { diffSliced } from '../../core/slice';
import type { VElement } from '../../core/vnode';
import { h } from '../../core/vnode';

export type Mode = 'sync' | 'sliced' | 'replace';
export type Scope = 'one' | 'all';

export interface RunResult {
  mode: Mode;
  n: number;
  scope: Scope;
  diffMs: number; // sliced는 양보한 시간까지 포함한 전체 시간
  commitMs: number;
  longestMs: number; // 메인 스레드를 연속으로 잡은 가장 긴 시간
  slices: number;
  modified: number; // 글자·속성만 바꾼 노드 수
  created: number; // 새로 만든 노드 수 (하위 노드 포함)
  removed: number; // 떼어 낸 노드 수 (하위 노드 포함)
}

/** 목록: version이 바뀌면 scope에 따라 첫 항목만 또는 전부 글자가 바뀐다 */
export function buildList(n: number, version: number, scope: Scope): VElement {
  return h('ul', { id: 'lab-list' }, ...Array.from({ length: n }, (_, i) => h('li', { key: String(i) }, `항목 ${i} · v${scope === 'all' || i === 0 ? version : 0}`)));
}

const subtree = (node: Node): number => {
  let k = 1;
  node.childNodes.forEach((c) => (k += subtree(c)));
  return k;
};

export function countRecords(records: MutationRecord[]): Pick<RunResult, 'modified' | 'created' | 'removed'> {
  let modified = 0;
  let created = 0;
  let removed = 0;
  for (const r of records) {
    if (r.type === 'characterData' || r.type === 'attributes') modified += 1;
    r.addedNodes.forEach((x) => (created += subtree(x)));
    r.removedNodes.forEach((x) => (removed += subtree(x)));
  }
  return { modified, created, removed };
}

export function startLab(doc: Document = document, opts: { slice?: SliceOptions } = {}) {
  const root = doc.getElementById('lab-root')!;
  const out = doc.getElementById('lab-result');
  const inputLag = doc.getElementById('lab-lag');
  const now = () => performance.now();
  let n = 1000;
  let scope: Scope = 'all';
  let version = 0;
  let current = buildList(n, 0, scope);
  let task: DiffTask | null = null;
  let maxLag = 0;
  mountTree(root, current);

  const show = (r: RunResult) => {
    if (!out) return;
    const name = { sync: 'Patch (동기)', sliced: 'Patch (협력적 스케줄링)', replace: '통째 교체' }[r.mode];
    out.textContent = [
      `${name} · 항목 ${r.n.toLocaleString()}개 · ${r.scope === 'all' ? '전부 변경' : '1개만 변경'}`,
      `메인 스레드 최장 연속 점유 ${r.longestMs.toFixed(1)}ms ${r.longestMs >= 50 ? '⚠ Long Task(50ms 이상)' : ''}`,
      `Diff ${r.diffMs.toFixed(1)}ms${r.mode === 'sliced' ? ` (${r.slices}조각으로 나눔, 양보 시간 포함)` : ''} · Commit ${r.commitMs.toFixed(1)}ms`,
      `DOM: 수정 ${r.modified.toLocaleString()} · 새로 만듦 ${r.created.toLocaleString()} · 떼어 냄 ${r.removed.toLocaleString()}`,
    ].join('\n');
  };

  async function update(mode: Mode): Promise<RunResult | null> {
    version += 1;
    const next = buildList(n, version, scope);
    const mo = new MutationObserver(() => {});
    mo.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
    const t0 = now();
    let diffMs = 0;
    let commitMs = 0;
    let longestMs = 0;
    let slices = 1;
    if (mode === 'replace') {
      mountTree(root, next);
      commitMs = longestMs = now() - t0;
    } else if (mode === 'sync') {
      const r = diff(current, next);
      const t1 = now();
      applyPatch(root, next, r);
      diffMs = t1 - t0;
      commitMs = now() - t1;
      longestMs = now() - t0;
    } else {
      task?.cancel(); // 앞선 작업이 남아 있으면 버리고 최신 상태로 다시 시작한다
      const t = (task = diffSliced(current, next, opts.slice));
      const r = await t.done;
      if (!r) {
        mo.disconnect();
        return null;
      }
      const t1 = now();
      applyPatch(root, next, r);
      diffMs = t1 - t0;
      commitMs = now() - t1;
      longestMs = Math.max(t.longestSliceMs, commitMs);
      slices = t.slices;
      task = null;
    }
    const counts = countRecords(mo.takeRecords());
    mo.disconnect();
    current = next;
    const res: RunResult = { mode, n, scope, diffMs, commitMs, longestMs, slices, ...counts };
    show(res);
    return res;
  }

  function reset(size: number, sc: Scope): void {
    task?.cancel();
    task = null;
    n = size;
    scope = sc;
    version = 0;
    current = buildList(n, 0, scope);
    mountTree(root, current);
  }

  // 입력 반응성: 키 입력 이벤트가 생긴 시각부터 처리될 때까지 걸린 시간
  doc.getElementById('lab-input')?.addEventListener('input', (e) => {
    const lag = now() - e.timeStamp;
    maxLag = Math.max(maxLag, lag);
    if (inputLag) inputLag.textContent = `이번 입력 지연 ${lag.toFixed(0)}ms · 최대 ${maxLag.toFixed(0)}ms`;
  });

  // 자동 업데이트: 3초 동안 계속 목록을 바꾼다. 그동안 입력칸에 타이핑해 보면 차이를 느낄 수 있다
  let timer: ReturnType<typeof setInterval> | null = null;
  function auto(mode: Mode): void {
    if (timer) clearInterval(timer);
    maxLag = 0;
    const until = now() + 3000;
    timer = setInterval(() => {
      if (now() > until && timer) {
        clearInterval(timer);
        timer = null;
        return;
      }
      void update(mode);
    }, 30);
  }

  const val = (id: string) => (doc.getElementById(id) as HTMLSelectElement | null)?.value;
  const mode = () => (val('lab-mode') ?? 'sync') as Mode;
  doc.getElementById('lab-run')?.addEventListener('click', () => void update(mode()));
  doc.getElementById('lab-auto')?.addEventListener('click', () => auto(mode()));
  doc.getElementById('lab-size')?.addEventListener('change', () => reset(Number(val('lab-size')), (val('lab-scope') ?? 'all') as Scope));
  doc.getElementById('lab-scope')?.addEventListener('change', () => reset(Number(val('lab-size')), (val('lab-scope') ?? 'all') as Scope));

  // Long Task 관찰 (Chrome 등 지원 브라우저만)
  const lt = doc.getElementById('lab-longtask');
  try {
    let count = 0;
    new PerformanceObserver((list) => {
      count += list.getEntries().length;
      if (lt) lt.textContent = `브라우저가 기록한 Long Task ${count}회`;
    }).observe({ type: 'longtask', buffered: false });
  } catch {
    if (lt) lt.textContent = '이 브라우저는 Long Task 기록을 지원하지 않습니다 (Chrome에서 확인)';
  }

  return { update, reset, get current() { return current; } };
}
