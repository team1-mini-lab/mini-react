// Diff (SDD_final_phase1 4장, ADR-0004·0005). 두 VNode 트리만 비교하는 순수 함수.
// dom·events는 읽지 않는다 (D12). 변경 목록의 순서 = Patch 적용 순서 (C2).
import type { Attrs, VElement, VNode, VText } from './vnode';

export type Change =
  | { kind: 'add'; parent: VElement; node: VNode; before: VNode | null }
  | { kind: 'remove'; target: VNode }
  | { kind: 'replace'; target: VNode; node: VNode }
  | { kind: 'text'; target: VText; text: string }
  | { kind: 'attrs'; target: VElement; set: Attrs; remove: string[] }
  | { kind: 'move'; target: VNode; parent: VElement; before: VNode | null };

export type Pair = readonly [oldNode: VNode, newNode: VNode];

export interface DiffResult {
  changes: Change[];
  pairs: Pair[];
}

export function diff(oldV: VNode, newV: VNode): DiffResult {
  const { out, steps } = diffSteps(oldV, newV);
  while (!steps.next().done); // 동기: 끝까지 한 번에
  return out;
}

/**
 * Diff를 노드 하나씩 진행하는 단계(generator)로 돌려준다 (ADR-0020).
 * `diff()`는 이것을 끝까지 한 번에 돌리고, `core/slice.ts`의 `diffSliced()`는 시간을 나눠 돌린다.
 * 두 방식이 같은 코드를 쓰므로 변경 목록이 항상 같다 (SL1).
 */
export function diffSteps(oldV: VNode, newV: VNode): { out: DiffResult; steps: Generator<void, void, void> } {
  const out: DiffResult = { changes: [], pairs: [] };
  return { out, steps: diffNode(oldV, newV, out) };
}

function* diffNode(o: VNode, n: VNode, out: DiffResult): Generator<void, void, void> {
  yield; // 노드 하나 = 작업 단위 하나 (여기서 멈췄다가 이어서 할 수 있다)
  // 4.2 노드 하나 비교: type → tag → text → attrs
  if (o.type !== n.type || (o.type === 'element' && o.tag !== (n as VElement).tag)) {
    out.changes.push({ kind: 'replace', target: o, node: n }); // D4·D5, pairs 제외, 자식 비교 안 함
    return;
  }
  out.pairs.push([o, n]);
  if (o.type === 'text') {
    if (o.text !== (n as VText).text) out.changes.push({ kind: 'text', target: o, text: (n as VText).text });
    return;
  }
  const ne = n as VElement;
  const set: Attrs = {};
  const remove: string[] = [];
  for (const [k, v] of Object.entries(ne.attrs)) if (o.attrs[k] !== v) set[k] = v;
  for (const k of Object.keys(o.attrs)) if (!Object.prototype.hasOwnProperty.call(ne.attrs, k)) remove.push(k);
  if (Object.keys(set).length || remove.length) out.changes.push({ kind: 'attrs', target: o, set, remove });
  yield* diffChildren(o, ne, out);
}

function hasDuplicateKeys(list: VNode[]): boolean {
  const seen = new Set<string>();
  for (const c of list) {
    if (c.type !== 'element' || c.key === undefined) continue;
    if (seen.has(c.key)) return true;
    seen.add(c.key);
  }
  return false;
}

function* diffChildren(op: VElement, np: VElement, out: DiffResult): Generator<void, void, void> {
  const oc = op.children;
  const nc = np.children;
  const match = new Map<VNode, VNode>(); // 새 자식 → 짝 이전 자식

  if (hasDuplicateKeys(oc) || hasDuplicateKeys(nc)) {
    // D9: 경고 후 그 부모의 자식 전체를 자리 비교
    console.warn(`[diff] <${op.tag}>의 자식에 같은 key가 있어 자리 순서로 비교합니다`);
    for (let i = 0; i < Math.min(oc.length, nc.length); i++) match.set(nc[i], oc[i]);
  } else {
    // 1차 짝짓기: key 있는 자식은 key로, 없는 자식끼리는 그들 사이의 순서로 (D10, D11)
    const keyMap = new Map<string, VNode>();
    const unkeyed: VNode[] = [];
    for (const c of oc) {
      if (c.type === 'element' && c.key !== undefined) keyMap.set(c.key, c);
      else unkeyed.push(c);
    }
    let u = 0;
    for (const c of nc) {
      if (c.type === 'element' && c.key !== undefined) {
        const o = keyMap.get(c.key);
        if (o) {
          match.set(c, o);
          keyMap.delete(c.key);
        }
      } else if (u < unkeyed.length) {
        match.set(c, unkeyed[u++]);
      }
    }
  }

  // ① 짝 없는 이전 자식 삭제
  const used = new Set(match.values());
  for (const o of oc) if (!used.has(o)) out.changes.push({ kind: 'remove', target: o });

  // ② 삭제 후 남은 이전 자식 순서를 흉내 내며 ③ 앞에서부터 자리 맞추기 → 자신 → 자식
  const working: (VNode | null)[] = oc.filter((o) => used.has(o));
  for (let i = 0; i < nc.length; i++) {
    const c = nc[i];
    const cursor = (working[i] ?? null) as VNode | null; // 그 순간 그 자리의 이전 객체 (B2)
    const po = match.get(c);
    if (!po) {
      out.changes.push({ kind: 'add', parent: op, node: c, before: cursor });
      working.splice(i, 0, null); // 자리표시
      continue;
    }
    if (working[i] !== po) {
      out.changes.push({ kind: 'move', target: po, parent: op, before: cursor });
      working.splice(working.indexOf(po), 1);
      working.splice(i, 0, po);
    }
    yield* diffNode(po, c, out);
  }
}
