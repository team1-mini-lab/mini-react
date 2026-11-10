/**
 * Patch 모듈 (ADR-0005, ADR-0013, CF-03 t3)
 * 
 * - 실제 브라우저 DOM을 최소 조작으로 갱신하는 쓰기 전용 모듈
 * - 0단계 확인: 모든 대상의 dom 참조 확인 (ADR-0013)
 * - 1단계: DOM 변경 순차 적용 (C2)
 * - 2단계: 기존 노드의 dom 복사 (D1)
 * - 3단계: 새로 만든 노드의 dom 재귀 기록 (F1: recordDom)
 * - 예외 발생 시 t3 복구 프로토콜 (recoverPatch) 가동
 */

import { vnodeToDom } from './dom';
import { Change, DiffResult } from './diff';
import { VElement, VNode } from './vnode';

export class PatchError extends Error {
  constructor(public change: Change | null, message: string) {
    super(`[PatchError] ${message}`);
    this.name = 'PatchError';
  }
}

export interface PatchApplyResult {
  applied: number;
}

/**
 * applyPatch: DiffResult를 받아 실제 DOM에 변경을 적용하고 새 트리에 dom 참조를 넘김
 */
export function applyPatch(result: DiffResult): PatchApplyResult {
  const { changes, pairs } = result;

  // 0단계: 사전 유효성 검사 (ADR-0013)
  for (const ch of changes) {
    if (ch.kind === 'remove' || ch.kind === 'replace' || ch.kind === 'text') {
      if (!ch.target.dom) {
        throw new PatchError(ch, `${ch.kind} 대상의 dom 참조가 없습니다.`);
      }
    } else if (ch.kind === 'attrs') {
      if (!ch.target.dom) {
        throw new PatchError(ch, 'attrs 대상의 dom 참조가 없습니다.');
      }
    } else if (ch.kind === 'move') {
      if (!ch.target.dom) {
        throw new PatchError(ch, 'move 대상의 dom 참조가 없습니다.');
      }
      if (!ch.parent.dom) {
        throw new PatchError(ch, 'move 부모의 dom 참조가 없습니다.');
      }
      if (ch.before && !ch.before.dom) {
        throw new PatchError(ch, 'move 기준(before) 노드의 dom 참조가 없습니다.');
      }
    } else if (ch.kind === 'add') {
      if (!ch.parent.dom) {
        throw new PatchError(ch, 'add 부모의 dom 참조가 없습니다.');
      }
      if (ch.before && !ch.before.dom) {
        throw new PatchError(ch, 'add 기준(before) 노드의 dom 참조가 없습니다.');
      }
    }
  }

  // 1단계: DOM 변경 순차 적용
  for (const ch of changes) {
    switch (ch.kind) {
      case 'remove': {
        const dom = ch.target.dom;
        if (dom && dom.parentNode) {
          dom.parentNode.removeChild(dom);
        }
        break;
      }
      case 'replace': {
        const oldDom = ch.target.dom;
        if (oldDom && oldDom.parentNode) {
          const newDom = vnodeToDom(ch.node);
          oldDom.parentNode.replaceChild(newDom, oldDom);
          // 새로 만든 노드에 dom 기록 (F1)
          recordDom(ch.node, newDom);
        }
        break;
      }
      case 'text': {
        const dom = ch.target.dom as Text;
        if (dom) {
          dom.nodeValue = ch.text;
        }
        break;
      }
      case 'attrs': {
        const el = ch.target.dom as HTMLElement;
        if (el) {
          for (const [k, v] of Object.entries(ch.set)) {
            el.setAttribute(k, v);
            // value 및 checked 프로퍼티 동기화 (CF-10)
            if (k === 'value' && 'value' in el && (el as HTMLInputElement).value !== v) {
              (el as HTMLInputElement).value = v;
            }
            if (k === 'checked' && 'checked' in el && (el as HTMLInputElement).checked !== (v === 'true')) {
              (el as HTMLInputElement).checked = v === 'true';
            }
          }
          for (const k of ch.remove) {
            el.removeAttribute(k);
          }
        }
        break;
      }
      case 'move': {
        const parentDom = ch.parent.dom as Element;
        const targetDom = ch.target.dom as Node;
        const beforeDom = ch.before?.dom ?? null;
        if (parentDom && targetDom) {
          parentDom.insertBefore(targetDom, beforeDom);
        }
        break;
      }
      case 'add': {
        const parentDom = ch.parent.dom as Element;
        const beforeDom = ch.before?.dom ?? null;
        if (parentDom) {
          const newDom = vnodeToDom(ch.node);
          parentDom.insertBefore(newDom, beforeDom);
          // 새로 만든 노드에 dom 기록 (F1)
          recordDom(ch.node, newDom);
        }
        break;
      }
    }
  }

  // 2단계: 기존 노드의 dom 복사 (D1)
  for (const [oldNode, newNode] of pairs) {
    if (oldNode.dom) {
      newNode.dom = oldNode.dom as any;
    }
  }

  return { applied: changes.length };
}

/**
 * recordDom: 새로 만든 VNode 트리와 실제 DOM 트리를 나란히 내려가며 dom 참조 기록 (F1)
 */
export function recordDom(v: VNode, node: Node): void {
  if (v.type === 'text') {
    v.dom = node as Text;
    return;
  }

  v.dom = node as Element;
  const el = node as Element;

  let childDomIdx = 0;
  for (let i = 0; i < v.children.length; i++) {
    const vchild = v.children[i];
    // 실제 DOM에서 주석 노드가 있을 경우 건너뜀 (신규 생성 노드에는 주석이 없으나 방어코드)
    while (
      childDomIdx < el.childNodes.length &&
      el.childNodes[childDomIdx].nodeType === Node.COMMENT_NODE
    ) {
      childDomIdx++;
    }

    const childDom = el.childNodes[childDomIdx];
    if (childDom) {
      recordDom(vchild, childDom);
      childDomIdx++;
    }
  }
}

/**
 * recoverPatch: Patch 실패 시 전체를 다시 그리고 복구하는 프로토콜 (CF-03, t3)
 */
export function recoverPatch(container: Element, nextTree: VNode, error: unknown): void {
  console.error('[Patch Recovery] Patch 적용 중 오류가 발생하여 실제 영역을 다시 그립니다:', error);

  const newRootDom = vnodeToDom(nextTree);

  // 컨테이너 첫 번째 자식을 교체하거나 추가
  if (container.firstElementChild) {
    container.replaceChild(newRootDom, container.firstElementChild);
  } else {
    container.appendChild(newRootDom);
  }

  // 전체 dom 참조 재기록 (F1)
  recordDom(nextTree, newRootDom);
}
