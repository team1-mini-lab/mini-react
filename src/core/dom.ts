/**
 * DOM ↔ Virtual DOM 변환 모듈 (ADR-0002, ADR-0003, ADR-0014, CF-04 s2)
 */

import { VElement, VNode, VText } from './vnode';

export interface DomToVNodeOptions {
  recordDom?: boolean;  // 실제 영역 첫 로드 시에만 true (T13)
  inPre?: boolean;      // <pre> 내부 여부
}

/**
 * domToVNode: 브라우저 DOM 노드를 Virtual DOM으로 변환
 * - 주석(nodeType 8) 및 <script> 건너뜀 (CF-04 S1)
 * - on* 이벤트 속성 제거 (CF-04 S2)
 * - javascript: 링크/속성 제거 (CF-04 S3)
 * - 공백 정리: <pre> 밖 연속 공백 축약 (ADR-0002)
 */
export function domToVNode(node: Node, opts: DomToVNodeOptions = {}): VNode {
  if (!node) {
    throw new TypeError('domToVNode: 유효한 DOM 노드가 필요합니다.');
  }

  // 1. Text 노드 (nodeType === 3)
  if (node.nodeType === Node.TEXT_NODE) {
    const rawText = node.nodeValue ?? '';
    let text: string;

    if (opts.inPre) {
      // <pre> 내부는 공백/줄바꿈 보존 (T4)
      text = rawText;
    } else {
      // 그 외에는 연속 공백 5종 치환 (T1)
      text = rawText.replace(/[ \t\n\r\f]+/g, ' ');
    }

    const vtext: VText = {
      type: 'text',
      text,
    };

    if (opts.recordDom) {
      vtext.dom = node as Text;
    }

    return vtext;
  }

  // 2. Element 노드 (nodeType === 1)
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const tag = el.localName.toLowerCase(); // 소문자 (T11)
    const inPre = opts.inPre || tag === 'pre';

    const attrs: Record<string, string> = {};
    let key: string | undefined = undefined;

    // 속성 복사 및 필터링
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      const attrName = attr.name.toLowerCase();
      const attrVal = attr.value;

      // key 속성 분리 (T15)
      if (attrName === 'key') {
        key = attrVal;
        continue;
      }

      // 악성 스크립트 정제 (CF-04 s2, S2, S3)
      if (attrName.startsWith('on')) {
        continue; // onclick, onerror 등 제거
      }
      if (
        ['href', 'src', 'action', 'formaction', 'xlink:href'].includes(attrName) &&
        attrVal.trim().toLowerCase().startsWith('javascript:')
      ) {
        continue; // javascript: 스크립트 실행 방지
      }

      attrs[attr.name] = attrVal;
    }

    // 자식 노드 순회
    const children: VNode[] = [];
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i];

      // 주석(nodeType 8) 및 <script> 건너뜀 (S1, VT-02)
      if (child.nodeType === Node.COMMENT_NODE) {
        continue;
      }
      if (child.nodeType === Node.ELEMENT_NODE && (child as Element).localName.toLowerCase() === 'script') {
        continue;
      }

      // 텍스트나 엘리먼트만 변환
      if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.ELEMENT_NODE) {
        const vchild = domToVNode(child, {
          recordDom: opts.recordDom,
          inPre,
        });

        // <pre> 밖에서 빈 텍스트 노드는 제외 가능하나, 공백 한 칸(" ")은 보존
        if (vchild.type === 'text' && vchild.text === '' && !inPre) {
          continue;
        }

        children.push(vchild);
      }
    }

    const velement: VElement = {
      type: 'element',
      tag,
      attrs,
      children,
    };

    if (key !== undefined) {
      velement.key = key;
    }

    if (opts.recordDom) {
      velement.dom = el;
    }

    return velement;
  }

  throw new TypeError(`domToVNode: 지원하지 않는 노드 타입입니다 (${node.nodeType})`);
}

/**
 * vnodeToDom: Virtual DOM을 기반으로 실제 브라우저 DOM 트리 생성 (화면 밖, ADR-0003)
 * - dom 필드는 일체 읽지도 기록하지도 않는다 (규칙 4)
 */
export function vnodeToDom(v: VNode): Node {
  if (v.type === 'text') {
    return document.createTextNode(v.text);
  }

  const el = document.createElement(v.tag);

  // 속성 설정
  for (const [name, val] of Object.entries(v.attrs)) {
    el.setAttribute(name, val);
  }

  // key가 있으면 key 속성으로 다시 부착 (IR-09)
  if (v.key !== undefined) {
    el.setAttribute('key', v.key);
  }

  // 자식 재귀 생성
  for (const child of v.children) {
    el.appendChild(vnodeToDom(child));
  }

  return el;
}
