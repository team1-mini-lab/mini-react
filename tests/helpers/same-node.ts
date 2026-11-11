// SDD 6.3 — Patch 전 vnode.dom을 잡아 두고 Patch 후 같은 실제 노드인지 확인 (FR-04, FR-05, VT-43)
import { expect } from 'vitest';

export function captureDom<T extends { dom?: Node }>(v: T): Node {
  if (!v.dom) throw new Error('captureDom: dom이 없는 VNode입니다');
  return v.dom;
}

export function expectSameNode(before: Node, after: { dom?: Node }): void {
  expect(after.dom).toBe(before);
}
