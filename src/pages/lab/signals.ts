// 실험 3 · 바로 고치기 (Signals 방식, ADR-0020 2절). 기존 엔진은 쓰지도 바꾸지도 않는 별도 데모.
// 값(signal)을 읽는 화면 칸(effect)을 처음 한 번 실행할 때 연결을 기억해 두고,
// 값이 바뀌면 연결된 칸만 바로 고친다 → 비교(Diff)가 없다.
import { diff } from '../../core/diff';
import { applyPatch, mountTree } from '../../core/patch';
import { h } from '../../core/vnode';

type Run = () => void;
let running: Run | null = null;

/** 값 상자. 읽을 때 "지금 실행 중인 칸"을 구독자로 기억한다 */
export function signal<T>(value: T): [() => T, (next: T) => void] {
  const subs = new Set<Run>();
  const get = () => {
    if (running) subs.add(running);
    return value;
  };
  const set = (next: T) => {
    if (Object.is(next, value)) return;
    value = next;
    [...subs].forEach((run) => run());
  };
  return [get, set];
}

/** 화면 칸. 처음 한 번 실행하면서 어떤 값을 읽는지 연결을 만든다 */
export function effect(fn: () => void): void {
  const run = () => {
    const prev = running;
    running = run;
    try {
      fn();
    } finally {
      running = prev;
    }
  };
  run();
}

const label = (i: number, price: number) => `상품 ${i + 1} · ${price.toLocaleString()}원`;

export interface CompareStats { compared: number; domWrites: number }

export function startSignals(doc: Document = document, opts: { total?: number } = {}) {
  const vRoot = doc.getElementById('sig-vdom');
  const sRoot = doc.getElementById('sig-signal');
  if (!vRoot || !sRoot) return null;
  const total = opts.total ?? 1000;
  const prices = Array.from({ length: total }, (_, i) => 10000 + ((i * 7919) % 90000));

  // 왼쪽: 지금 엔진(Virtual DOM). 값이 바뀌면 새 트리를 만들어 전체를 비교한다
  const build = () => h('ul', { class: 'vrows' }, ...prices.map((p, i) => h('li', { key: String(i) }, label(i, p))));
  let tree = build();
  mountTree(vRoot, tree);

  // 오른쪽: Signals. 칸마다 자기 가격 값과 연결해 둔다
  const ul = doc.createElement('ul');
  ul.className = 'vrows';
  const setters = prices.map((p, i) => {
    const [price, setPrice] = signal(p);
    const li = doc.createElement('li');
    const text = doc.createTextNode('');
    li.appendChild(text);
    ul.appendChild(li);
    effect(() => {
      text.nodeValue = label(i, price()); // 이 칸은 이 가격만 읽는다 → 연결 기억
    });
    return setPrice;
  });
  sRoot.replaceChildren(ul);

  const writes = (root: Element, work: () => void) => {
    const mo = new MutationObserver(() => {});
    mo.observe(root, { subtree: true, characterData: true, childList: true, attributes: true });
    work();
    const n = mo.takeRecords().length;
    mo.disconnect();
    return n;
  };
  const show = (id: string, s: CompareStats) => {
    const card = doc.getElementById(id);
    if (!card) return;
    card.querySelector('.ms')!.textContent = `비교 ${s.compared.toLocaleString()}`;
    card.querySelector('.dom')!.textContent = `DOM 수정 ${s.domWrites}`;
  };

  /** 가격 하나를 바꾼다. 두 방식의 "비교한 노드 수"와 "DOM 수정 수"를 돌려준다 */
  function changeOne(i = Math.floor(total / 2)): { vdom: CompareStats; signal: CompareStats } {
    prices[i] += 500;
    let compared = 0;
    const vWrites = writes(vRoot!, () => {
      const next = build();
      const r = diff(tree, next);
      compared = r.pairs.length; // 짝을 지어 비교한 노드 수
      applyPatch(vRoot!, next, r);
      tree = next;
    });
    const sWrites = writes(sRoot!, () => setters[i](prices[i]));
    const res = { vdom: { compared, domWrites: vWrites }, signal: { compared: 0, domWrites: sWrites } };
    show('sig-card-vdom', res.vdom);
    show('sig-card-signal', res.signal);
    // 바뀐 줄을 두 목록 모두 가운데로 스크롤하고 노랗게 표시한다
    for (const root of [vRoot!, sRoot!]) {
      const li = root.querySelectorAll('li')[i] as HTMLElement | undefined;
      if (!li) continue;
      root.scrollTop = li.offsetTop - root.clientHeight / 2;
      root.querySelectorAll('li.picked').forEach((x) => x.classList.remove('picked'));
      li.classList.add('picked');
    }
    const what = doc.getElementById('sig-what');
    if (what) what.textContent = `바뀐 줄: 상품 ${i + 1} → ${prices[i].toLocaleString()}원`;
    return res;
  }
  doc.getElementById('sig-run')?.addEventListener('click', () => changeOne(Math.floor(Math.random() * total)));
  return { changeOne };
}
