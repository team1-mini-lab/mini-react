// 첫 로드 (SDD_final_phase1 7.3, ADR-0006 1절, ADR-0008 2절)
// 실제 영역 → domToVNode(기록함) → 0번 기록 → a3로 코드 입력칸 → g1로 미리보기. 실제 영역은 다시 그리지 않는다.
import { domToVNode } from '../../core/dom';
import { History } from '../../core/history';
import { parseCode, vnodeToHtml } from '../../core/html';
import type { VNode } from '../../core/vnode';
import { renderPreview } from './preview';

export interface Phase1State {
  history: History<VNode>;
  current: VNode; // 지금 실제 영역에 그려진 트리 (dom 있음)
}

export function init(doc: Document = document): Phase1State {
  const frame = doc.getElementById('real-area');
  const root = frame?.firstElementChild; // 틀의 첫 자식 요소 (CON-07, i1)
  if (!frame || !root) throw new Error('#real-area 틀과 루트 요소가 필요합니다');
  const current = domToVNode(root, { recordDom: true });
  const history = new History<VNode>(current);
  const editor = doc.getElementById('editor') as HTMLTextAreaElement | null;
  if (editor) editor.value = vnodeToHtml(current);
  renderPreview(editor ? parseCode(editor.value).root : current, doc);
  return { history, current };
}
