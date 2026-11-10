/**
 * HTML 문자열 ↔ Virtual DOM 변환 모듈 (ADR-0006, IR-10)
 */

import { domToVNode } from './dom';
import { VElement, VNode } from './vnode';

/**
 * htmlToVNode: HTML 문자열을 <template>을 거쳐 Virtual DOM으로 변환
 */
export function htmlToVNode(html: string): VNode | null {
  const trimmed = html.trim();
  if (!trimmed) {
    return null;
  }

  const template = document.createElement('template');
  template.innerHTML = trimmed;

  const content = template.content;
  // 유효한 첫 번째 자식 엘리먼트 찾기
  let firstEl: Element | null = null;
  for (let i = 0; i < content.childNodes.length; i++) {
    const child = content.childNodes[i];
    if (child.nodeType === Node.ELEMENT_NODE) {
      firstEl = child as Element;
      break;
    }
  }

  if (!firstEl) {
    return null;
  }

  // 기본 모드 (recordDom: false)로 변환
  return domToVNode(firstEl, { recordDom: false });
}

/**
 * vnodeToHtml: Virtual DOM 노드를 2칸 들여쓰기된 HTML 문자열로 직렬화 (TA2 가역성)
 */
export function vnodeToHtml(v: VNode, indentLevel = 0): string {
  const indent = '  '.repeat(indentLevel);

  if (v.type === 'text') {
    return escapeHtml(v.text);
  }

  const tag = v.tag;
  const attrParts: string[] = [];

  // key가 있으면 key 먼저 표시
  if (v.key !== undefined) {
    attrParts.push(`key="${escapeAttr(v.key)}"`);
  }

  for (const [k, val] of Object.entries(v.attrs)) {
    attrParts.push(`${k}="${escapeAttr(val)}"`);
  }

  const attrsStr = attrParts.length > 0 ? ' ' + attrParts.join(' ') : '';

  // self-closing 태그 처리
  const voidTags = ['input', 'img', 'br', 'hr', 'meta', 'link'];
  if (voidTags.includes(tag) && v.children.length === 0) {
    return `${indent}<${tag}${attrsStr} />`;
  }

  // 자식이 없는 경우
  if (v.children.length === 0) {
    return `${indent}<${tag}${attrsStr}></${tag}>`;
  }

  // 자식이 텍스트 노드 1개만 있는 경우 한 줄로 표시
  if (v.children.length === 1 && v.children[0].type === 'text') {
    return `${indent}<${tag}${attrsStr}>${escapeHtml(v.children[0].text)}</${tag}>`;
  }

  // <pre> 태그는 줄바꿈/들여쓰기 변형 없이 직렬화
  if (tag === 'pre') {
    const inner = v.children.map((c) => (c.type === 'text' ? c.text : vnodeToHtml(c, 0))).join('');
    return `${indent}<pre${attrsStr}>${inner}</pre>`;
  }

  // 자식들이 여러 개 있는 경우
  const childLines = v.children.map((c) => {
    if (c.type === 'text' && c.text.trim() === '') {
      return ''; // 빈 공백 줄 제외
    }
    return vnodeToHtml(c, indentLevel + 1);
  }).filter(Boolean).join('\n');

  return `${indent}<${tag}${attrsStr}>\n${childLines}\n${indent}</${tag}>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
