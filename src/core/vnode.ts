/**
 * Virtual DOM 노드 정의 및 보조 함수 (ADR-0001, ADR-0004)
 */

export type Attrs = Record<string, string>;

export interface VElement {
  type: 'element';
  tag: string;                          // 항상 소문자 (localName 기준, T11)
  attrs: Attrs;                         // 속성 해시. 없으면 {}. key는 절대 넣지 않는다 (VT-26)
  children: VNode[];                    // 자식 목록. 없으면 [] (VT-25)
  key?: string;                         // 짝짓기용 식별자. 속성에 없으면 키 자체가 없다 (ADR-0001)
  dom?: Element;                        // 실제 영역에 그려진 트리에만 존재하는 참조 (ADR-0004)
  on?: Record<string, EventListener>;   // Phase 2 전용 이벤트 핸들러
}

export interface VText {
  type: 'text';
  text: string;                         // 공백 정리 규칙이 적용된 문자열 (ADR-0002)
  dom?: Text;                           // 실제 텍스트 노드 참조
}

export type VNode = VElement | VText;

/**
 * h() 함수: 가상 엘리먼트 생성 헬퍼
 */
export function h(
  tag: string,
  attrs?: (Attrs & { key?: string }) | null,
  ...children: (VNode | string | number | null | undefined)[]
): VElement {
  const normalizedAttrs: Attrs = {};
  let key: string | undefined = undefined;

  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'key') {
        if (v !== undefined && v !== null) {
          key = String(v);
        }
      } else if (v !== undefined && v !== null) {
        normalizedAttrs[k] = String(v);
      }
    }
  }

  const normalizedChildren: VNode[] = [];
  for (const child of children) {
    if (child === null || child === undefined || (child as any) === false) {
      continue;
    }
    if (typeof child === 'string' || typeof child === 'number') {
      normalizedChildren.push({
        type: 'text',
        text: String(child),
      });
    } else {
      normalizedChildren.push(child);
    }
  }

  const element: VElement = {
    type: 'element',
    tag: tag.toLowerCase(),
    attrs: normalizedAttrs,
    children: normalizedChildren,
  };

  if (key !== undefined) {
    element.key = key;
  }

  return element;
}

/**
 * FR-01 화면 동일성 비교 (다섯 키: type, tag, attrs, text, children)
 * dom과 key는 비교하지 않는다.
 */
export function equalScreen(a: VNode | null | undefined, b: VNode | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.type !== b.type) return false;

  if (a.type === 'text' && b.type === 'text') {
    return a.text === b.text;
  }

  if (a.type === 'element' && b.type === 'element') {
    if (a.tag !== b.tag) return false;

    // attrs 비교
    const aKeys = Object.keys(a.attrs);
    const bKeys = Object.keys(b.attrs);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (a.attrs[k] !== b.attrs[k]) return false;
    }

    // children 비교
    if (a.children.length !== b.children.length) return false;
    for (let i = 0; i < a.children.length; i++) {
      if (!equalScreen(a.children[i], b.children[i])) return false;
    }

    return true;
  }

  return false;
}

/**
 * 왕복 불변식 및 완전 동일성 비교 (다섯 키 + key)
 */
export function equalTree(a: VNode | null | undefined, b: VNode | null | undefined): boolean {
  if (!equalScreen(a, b)) return false;
  if (a && b && a.type === 'element' && b.type === 'element') {
    if (a.key !== b.key) return false;
    for (let i = 0; i < a.children.length; i++) {
      if (!equalTree(a.children[i], b.children[i])) return false;
    }
  }
  return true;
}
