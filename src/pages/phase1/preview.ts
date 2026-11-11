// 미리보기 그리기 (SDD_final_phase1 7.3, ADR-0006 g1). 실제 영역이 아니므로 통째로 다시 그린다.
import { vnodeToDom } from '../../core/dom';
import type { VNode } from '../../core/vnode';

export function renderPreview(v: VNode | null, doc: Document = document): void {
  const box = doc.getElementById('preview');
  if (!box) return;
  if (v) box.replaceChildren(vnodeToDom(v));
  else box.replaceChildren();
}
