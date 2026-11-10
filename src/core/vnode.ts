// Virtual DOM 자료구조 (SDD_final_phase1 2.2, ADR-0001)
// 키의 네 무리: 화면 데이터(type·tag·attrs·text·children) / 짝짓기(key) / 참조(dom) / 동작(events)

export type Attrs = Record<string, string>;
export type EventHandlers = Record<string, EventListener>;

export interface VElement {
  type: 'element';
  tag: string; // 항상 소문자 (localName)
  attrs: Attrs; // 없으면 {}. key와 on* 속성은 넣지 않는다
  children: VNode[]; // 없으면 []
  key?: string; // 없으면 키 자체가 없다
  dom?: Element; // 지금 실제 영역에 그려진 트리에만 있다. Diff는 읽지 않는다
  events?: EventHandlers; // Phase 2 전용. Diff·비교는 읽지 않는다
}

export interface VText {
  type: 'text';
  text: string; // 공백 정리 규칙이 적용된 글자
  dom?: Text;
}

export type VNode = VElement | VText;

/** 테스트·Phase 1 도우미. attrs.key가 있으면 key로 옮긴다 (ADR-0001). */
export function h(tag: string, attrs?: (Attrs & { key?: string }) | null, ...children: (VNode | string)[]): VElement {
  const a: Attrs = { ...(attrs ?? {}) };
  const v: VElement = { type: 'element', tag: tag.toLowerCase(), attrs: a, children: [] };
  if ('key' in a) {
    v.key = String(a.key);
    delete a.key;
  }
  v.children = children.map((c) => (typeof c === 'string' ? ({ type: 'text', text: c } as VText) : c));
  return v;
}

function sameAttrs(a: Attrs, b: Attrs): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && a[k] === b[k]);
}

function compare(a: VNode, b: VNode, withKey: boolean): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'text') return a.text === (b as VText).text;
  const e = b as VElement;
  if (a.tag !== e.tag || !sameAttrs(a.attrs, e.attrs)) return false;
  if (withKey && a.key !== e.key) return false;
  if (a.children.length !== e.children.length) return false;
  return a.children.every((c, i) => compare(c, e.children[i], withKey));
}

/** FR-01 비교 기준: 화면 데이터 다섯 키만 본다. key·dom·events는 보지 않는다 (ADR-0004 6절). */
export function equalScreen(a: VNode, b: VNode): boolean {
  return compare(a, b, false);
}

/** 왕복 비교: 다섯 키 + key (ADR-0003 Confirmation). equalScreen과 다른 함수다. */
export function equalTree(a: VNode, b: VNode): boolean {
  return compare(a, b, true);
}
