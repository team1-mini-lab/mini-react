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
const NAMES = ['삼성전자', 'SK하이닉스', 'LG에너지솔루션', '현대차', 'NAVER', '카카오', '셀트리온', '기아', 'POSCO홀딩스', 'KB금융'];

/** 실시간 시세판: 종목 n개. version(시세 갱신 회차)이 바뀌면 scope에 따라 첫 종목만 또는 전 종목 가격이 바뀐다 */
export function buildList(n: number, version: number, scope: Scope): VElement {
  return h('ul', { id: 'lab-list' }, ...Array.from({ length: n }, (_, i) => {
    const v = scope === 'all' || i === 0 ? version : 0;
    const base = 10000 + ((i * 7919) % 90000);
    const move = (((i + 1) * (v + 3) * 37) % 41) - 20; // -20 ~ +20 (‰)
    const price = Math.round((base * (1000 + move)) / 1000) + v * 10; // 회차마다 반드시 값이 달라진다
    const name = `${NAMES[i % NAMES.length]}${i >= NAMES.length ? ` ${Math.floor(i / NAMES.length)}` : ''}`;
    return h('li', { key: String(i) }, `${name} · ${price.toLocaleString()}원 ${move >= 0 ? '▲' : '▼'}${(Math.abs(move) / 10).toFixed(1)}%`);
  }));
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
  const initial = (name: string, fallback: string) => (doc.querySelector(`.seg[data-name="${name}"] .on`) as HTMLElement | null)?.dataset.v ?? fallback;
  let n = Number(initial('size', '1000'));
  let scope = initial('scope', 'all') as Scope;
  let version = 0;
  let current = buildList(n, 0, scope);
  let task: DiffTask | null = null;
  let maxLag = 0;
  mountTree(root, current);

  const show = (r: RunResult) => {
    const card = doc.getElementById(`card-${r.mode}`);
    if (card) {
      const slow = r.longestMs >= 50;
      const fill = card.querySelector<HTMLElement>('.fill');
      if (fill) {
        fill.style.width = `${Math.min(100, (r.longestMs / 100) * 100)}%`; // 막대 끝 = 100ms, 빨간 선 = 50ms
        fill.classList.toggle('slow', slow);
      }
      const ms = card.querySelector('.ms');
      if (ms) {
        ms.textContent = `${r.longestMs.toFixed(0)}ms${slow ? ' 멈춤' : ''}`;
        ms.classList.toggle('slow', slow);
      }
      const dom = card.querySelector('.dom');
      if (dom) dom.textContent = r.created ? `새로 만든 노드 ${r.created.toLocaleString()}` : `DOM 수정 ${r.modified.toLocaleString()}`;
    }
    if (!out) return;
    const name = { sync: '부분 렌더링 · 동기식', sliced: '부분 렌더링 · 분할식', replace: '전체 렌더링' }[r.mode];
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
    const num = doc.getElementById('lab-lag-num');
    if (num) {
      num.textContent = maxLag.toFixed(0);
      num.classList.toggle('slow', maxLag >= 50);
    }
    if (inputLag) inputLag.textContent = `입력 지연 (최대) · 방금 ${lag.toFixed(0)}ms`;
  });

  // 자동 업데이트: 3초 동안 계속 목록을 바꾼다. 그동안 입력칸에 타이핑해 보면 차이를 느낄 수 있다
  let timer: ReturnType<typeof setInterval> | null = null;
  function auto(mode: Mode): void {
    if (timer) clearInterval(timer);
    maxLag = 0;
    worst = 0;
    measuring = true;
    if (n < 10000) {
      reset(10000, 'all'); // 차이가 보이도록 1만 개·전부 변경으로 맞춘다
      doc.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', ['10000', 'all'].includes((b as HTMLElement).dataset.v ?? '')));
    }
    const until = now() + 3000;
    timer = setInterval(() => {
      if (now() > until && timer) {
        clearInterval(timer);
        timer = null;
        measuring = false;
        return;
      }
      void update(mode);
    }, 30);
  }

  // 세 방식을 같은 출발 상태에서 차례로 실행해 카드에 나란히 보여 준다
  async function compare(): Promise<RunResult[]> {
    const results: RunResult[] = [];
    for (const m of ['replace', 'sync', 'sliced'] as Mode[]) {
      reset(n, scope);
      const r = await update(m);
      if (r) results.push(r);
    }
    const v = doc.getElementById('lab-verdict');
    const [sy, sl] = [results.find((r) => r.mode === 'sync'), results.find((r) => r.mode === 'sliced')];
    if (v && sy && sl) {
      v.textContent = sy.longestMs >= 50 && sl.longestMs < 50
        ? `결론: 분할식으로 하면 화면이 멈추는 시간이 ${sy.longestMs.toFixed(0)}ms → ${sl.longestMs.toFixed(0)}ms. 대신 끝나는 데는 조금 더 걸림`
        : `이 크기에선 셋 다 50ms 안에 끝남 → 나눌 필요 없음. 1만 종목으로 해 보세요`;
    }
    return results;
  }

  const pick = (name: string, v: string) => {
    doc.querySelectorAll(`.seg[data-name="${name}"] button`).forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.v === v));
  };
  doc.querySelectorAll<HTMLElement>('.seg button').forEach((b) =>
    b.addEventListener('click', () => {
      const name = (b.parentElement as HTMLElement).dataset.name;
      if (name === 'size') reset(Number(b.dataset.v), scope);
      if (name === 'scope') reset(n, b.dataset.v as Scope);
      pick(name ?? '', b.dataset.v ?? '');
    }),
  );
  const runBtn = doc.getElementById('lab-compare') as HTMLButtonElement | null;
  runBtn?.addEventListener('click', async () => {
    runBtn.disabled = true;
    await compare();
    runBtn.disabled = false;
  });
  doc.querySelectorAll<HTMLElement>('[data-auto]').forEach((b) => b.addEventListener('click', () => {
    auto(b.dataset.auto as Mode);
  }));

  // 움직이는 공: requestAnimationFrame으로 매 프레임 자바스크립트가 위치를 옮긴다.
  // 메인 스레드가 바쁘면 프레임이 밀려 공이 멈춘다 → 멈춘 시간을 잰다 (CSS 애니메이션은 따로 돌 수 있어서 쓰지 않음)
  const ball = doc.getElementById('lab-ball');
  const stutter = doc.getElementById('lab-stutter');
  let worst = 0;
  let measuring = false;
  if (ball && typeof requestAnimationFrame === 'function') {
    let last = now();
    let x = 0;
    let dir = 1;
    const tick = () => {
      const t = now();
      const gap = t - last;
      last = t;
      if (measuring && gap > worst) {
        worst = gap;
        if (stutter) {
          stutter.textContent = `${worst.toFixed(0)}ms`;
          stutter.classList.toggle('slow', worst >= 50);
        }
      }
      const width = (ball.parentElement?.clientWidth ?? 300) - 34;
      x += dir * gap * 0.35;
      if (x > width) { x = width; dir = -1; }
      if (x < 0) { x = 0; dir = 1; }
      ball.style.transform = `translateX(${x}px)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Long Task 관찰 (Chrome 등 지원 브라우저만)
  const lt = doc.getElementById('lab-longtask');
  try {
    let count = 0;
    new PerformanceObserver((list) => {
      count += list.getEntries().length;
      if (lt) lt.textContent = `브라우저가 기록한 멈춤(Long Task) ${count}회`;
    }).observe({ type: 'longtask', buffered: false });
  } catch {
    if (lt) lt.textContent = '';
  }

  return { update, reset, compare, get current() { return current; } };
}
