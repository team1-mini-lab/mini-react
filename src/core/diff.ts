/**
 * Diff 모듈 (ADR-0004, ADR-0005)
 * 
 * - Diff는 순수 함수이며 dom 속성을 절대 읽지 않는다. (규칙 5, D12)
 * - 순서 판단은 Diff가 이전 트리의 순서를 기준으로 직접 수행한다 (A1)
 * - 위치는 index 번호가 아닌 기준 노드(before: VNode | null)로 표현한다 (B2)
 * - 변경 목록(changes)과 dom을 복사할 짝 목록(pairs)을 분리하여 반환한다 (D1)
 */

import { Attrs, VElement, VNode, VText } from './vnode';

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
  const changes: Change[] = [];
  const pairs: Pair[] = [];

  diffNode(oldV, newV, null, changes, pairs);

  return { changes, pairs };
}

function diffNode(
  oldV: VNode,
  newV: VNode,
  parent: VElement | null,
  changes: Change[],
  pairs: Pair[]
): void {
  // 1. type 불일치 (text ↔ element) -> replace (D5)
  if (oldV.type !== newV.type) {
    changes.push({ kind: 'replace', target: oldV, node: newV });
    return;
  }

  // 2. 둘 다 텍스트 노드인 경우
  if (oldV.type === 'text' && newV.type === 'text') {
    if (oldV.text !== newV.text) {
      changes.push({ kind: 'text', target: oldV, text: newV.text });
    }
    // 글자가 같든 바뀌었든 실제 노드 참조는 유지
    pairs.push([oldV, newV]);
    return;
  }

  // 3. 둘 다 엘리먼트 노드인 경우
  const oldEl = oldV as VElement;
  const newEl = newV as VElement;

  // tag 불일치 -> replace (D4)
  if (oldEl.tag !== newEl.tag) {
    changes.push({ kind: 'replace', target: oldEl, node: newEl });
    return;
  }

  // tag 일치 -> 유지 및 속성 비교
  pairs.push([oldEl, newEl]);

  // attrs 비교
  const setAttrs: Attrs = {};
  const removeAttrs: string[] = [];

  for (const [k, v] of Object.entries(newEl.attrs)) {
    if (oldEl.attrs[k] !== v) {
      setAttrs[k] = v;
    }
  }

  for (const k of Object.keys(oldEl.attrs)) {
    if (!(k in newEl.attrs)) {
      removeAttrs.push(k);
    }
  }

  if (Object.keys(setAttrs).length > 0 || removeAttrs.length > 0) {
    changes.push({
      kind: 'attrs',
      target: oldEl,
      set: setAttrs,
      remove: removeAttrs,
    });
  }

  // 자식들 비교 (C2 순서)
  diffChildren(oldEl, newEl, changes, pairs);
}

/**
 * 자식 목록 비교 알고리즘 (ADR-0005 5절 C2)
 * 부모마다:
 *  1. 삭제 (remove)
 *  2. 새 자식을 앞에서부터 [자리맞추기(move/add) -> 자신의변경 -> 자식재귀]
 */
function diffChildren(
  oldParent: VElement,
  newParent: VElement,
  changes: Change[],
  pairs: Pair[]
): void {
  const oldChildren = oldParent.children;
  const newChildren = newParent.children;

  // 1. key 중복 확인 및 keyMap 구성 (D9)
  const oldKeyMap = new Map<string, { node: VNode; index: number }>();
  let hasDuplicateKey = false;

  for (let i = 0; i < oldChildren.length; i++) {
    const child = oldChildren[i];
    if (child.type === 'element' && child.key !== undefined) {
      if (oldKeyMap.has(child.key)) {
        console.warn(`[Diff] 중복 key 감지: "${child.key}". 해당 부모는 인덱스 비교로 전환합니다.`);
        hasDuplicateKey = true;
        break;
      }
      oldKeyMap.set(child.key, { node: child, index: i });
    }
  }

  // 2. 짝짓기 (매칭)
  const matchedOldIndices = new Set<number>();
  const newToOldMatch = new Map<number, number>(); // newIndex -> oldIndex

  if (!hasDuplicateKey) {
    // 2-1. key 매칭
    for (let ni = 0; ni < newChildren.length; ni++) {
      const nc = newChildren[ni];
      if (nc.type === 'element' && nc.key !== undefined) {
        const match = oldKeyMap.get(nc.key);
        if (match) {
          newToOldMatch.set(ni, match.index);
          matchedOldIndices.add(match.index);
        }
      }
    }

    // 2-2. non-key 매칭 (순서대로 1:1)
    let lastOldIdx = 0;
    for (let ni = 0; ni < newChildren.length; ni++) {
      if (newToOldMatch.has(ni)) continue;
      const nc = newChildren[ni];
      const isKeyed = nc.type === 'element' && nc.key !== undefined;
      if (isKeyed) continue; // 새 노드인데 key가 매칭 안 된 경우 -> add 대상

      while (lastOldIdx < oldChildren.length) {
        if (!matchedOldIndices.has(lastOldIdx)) {
          const oc = oldChildren[lastOldIdx];
          const ocKeyed = oc.type === 'element' && oc.key !== undefined;
          if (!ocKeyed) {
            newToOldMatch.set(ni, lastOldIdx);
            matchedOldIndices.add(lastOldIdx);
            lastOldIdx++;
            break;
          }
        }
        lastOldIdx++;
      }
    }
  } else {
    // 중복 key 시 단순 index 매칭
    const minLen = Math.min(oldChildren.length, newChildren.length);
    for (let i = 0; i < minLen; i++) {
      newToOldMatch.set(i, i);
      matchedOldIndices.add(i);
    }
  }

  // 3. 단계 1: 짝 없는 이전 자식 삭제 (remove)
  for (let oi = 0; oi < oldChildren.length; oi++) {
    if (!matchedOldIndices.has(oi)) {
      changes.push({ kind: 'remove', target: oldChildren[oi] });
    }
  }

  // 4. 단계 2: 새 자식 순회하며 [자리맞추기 -> 자체변경 -> 자식재귀]
  // 현재 이전 트리의 순서를 시뮬레이션하기 위한 리스트
  const simulatedOldList: VNode[] = oldChildren.filter((_, idx) => matchedOldIndices.has(idx));

  for (let ni = 0; ni < newChildren.length; ni++) {
    const nc = newChildren[ni];
    const oldIdx = newToOldMatch.get(ni);

    if (oldIdx === undefined) {
      // 신규 추가 (add)
      // 기준 dict: 그 순간 그 자리에 있는 시뮬레이션 노드, 없으면 null (끝)
      const beforeNode = simulatedOldList[ni] ?? null;
      changes.push({
        kind: 'add',
        parent: oldParent,
        node: nc,
        before: beforeNode,
      });
      simulatedOldList.splice(ni, 0, nc);
    } else {
      const oc = oldChildren[oldIdx];
      const currentPosInSim = simulatedOldList.indexOf(oc);

      // 자리 맞추기 (move)
      if (currentPosInSim !== ni) {
        const beforeNode = simulatedOldList[ni] ?? null;
        changes.push({
          kind: 'move',
          target: oc,
          parent: oldParent,
          before: beforeNode,
        });
        simulatedOldList.splice(currentPosInSim, 1);
        simulatedOldList.splice(ni, 0, oc);
      }

      // 자체 변경 및 자식 재귀
      diffNode(oc, nc, oldParent, changes, pairs);
    }
  }
}
