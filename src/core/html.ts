// 코드 ↔ Virtual DOM (SDD_final_phase1 3.3, ADR-0006 2·3절 g1·a3, ADR-0018)
import { domToVNode } from './dom';
import type { VNode } from './vnode';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

export interface ParsedCode {
  root: VNode | null;
  /** 첫 요소 뒤에 무시된 최상위 요소 수 (ADR-0019 x2) */
  extraRoots: number;
}

/** <template>에서 브라우저가 읽게 한 뒤 첫 요소만 변환한다 (g1, c1). */
export function parseCode(code: string): ParsedCode {
  const t = document.createElement('template');
  t.innerHTML = code;
  const els = t.content.children;
  return { root: els.length ? domToVNode(els[0]) : null, extraRoots: Math.max(0, els.length - 1) };
}

export function htmlToVNode(code: string): VNode | null {
  return parseCode(code).root;
}

const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** VNode → 코드. 원래 " " 공백 노드 자리만 줄바꿈 + 2칸 들여쓰기 (a3). */
export function vnodeToHtml(v: VNode): string {
  return write(v, 0, false);
}

function write(v: VNode, depth: number, inPre: boolean): string {
  if (v.type === 'text') return escText(v.text);
  const pre = inPre || v.tag === 'pre';
  let s = `<${v.tag}`;
  for (const [k, val] of Object.entries(v.attrs)) s += ` ${k}="${escAttr(val)}"`;
  if (v.key !== undefined) s += ` key="${escAttr(v.key)}"`;
  s += '>';
  if (VOID.has(v.tag)) return s;
  // ADR-0018: 파서는 <pre> 바로 뒤 줄바꿈 하나를 버리므로, 첫 글자가 줄바꿈이면 하나 더 쓴다
  const first = v.children[0];
  if (v.tag === 'pre' && first && first.type === 'text' && first.text.startsWith('\n')) s += '\n';
  v.children.forEach((c, i) => {
    if (!pre && c.type === 'text' && c.text === ' ') {
      const last = i === v.children.length - 1;
      s += '\n' + '  '.repeat(last ? depth : depth + 1);
    } else {
      s += write(c, depth + 1, pre);
    }
  });
  return s + `</${v.tag}>`;
}
