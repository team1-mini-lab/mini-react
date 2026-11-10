// h() 확장: 컴포넌트 즉시 펼침, key, attrs/events 분리, 자식 정리 (SDD_final_phase2 2.1, ADR-0015 1절)
import type { EventHandlers, VElement, VNode } from '../core/vnode';
import { enterChild, exitChild, isRenderingChild } from './current';

export { isRenderingChild };

export type Child = VNode | string | number | boolean | null | undefined | Child[];
export type Props = Record<string, unknown> & { key?: string | number; children?: VNode[] };
export type Component<P = Record<string, unknown>> = (props: P & { children: VNode[] }) => VElement;

const isVElement = (v: unknown): v is VElement =>
  typeof v === 'object' && v !== null && (v as VElement).type === 'element';

/** C5: VNode는 그대로, 문자열·숫자는 글자 노드, null·undefined·boolean은 건너뛰고, 배열은 펼친다 */
export function normalizeChildren(children: Child[], out: VNode[] = []): VNode[] {
  for (const c of children) {
    if (c === null || c === undefined || typeof c === 'boolean') continue;
    if (Array.isArray(c)) normalizeChildren(c, out);
    else if (typeof c === 'string' || typeof c === 'number') out.push({ type: 'text', text: String(c) });
    else out.push(c);
  }
  return out;
}

export function h<P extends object>(tag: Component<P>, props: (P & { key?: string | number }) | null, ...children: Child[]): VElement;
export function h(tag: string, props?: Record<string, unknown> | null, ...children: Child[]): VElement;
export function h(tag: string | Component<object>, props?: Record<string, unknown> | null, ...children: Child[]): VElement {
  const kids = normalizeChildren(children);

  if (typeof tag === 'function') {
    // 자식 컴포넌트: key는 떼어 두고 나머지만 넘긴다 (TD2), 실행 중 표시 (HR3)
    const { key, ...rest } = props ?? {};
    let result: unknown;
    enterChild();
    try {
      result = tag({ ...rest, children: kids });
    } finally {
      exitChild();
    }
    if (!isVElement(result)) throw new TypeError('컴포넌트는 VElement 하나를 반환해야 합니다');
    if (key !== undefined && key !== null) result.key = String(key);
    return result;
  }

  const v: VElement = { type: 'element', tag: tag.toLowerCase(), attrs: {}, children: kids };
  const events: EventHandlers = {};
  for (const [k, val] of Object.entries(props ?? {})) {
    if (k === 'children') continue;
    if (k === 'key') {
      if (val !== undefined && val !== null) v.key = String(val);
      continue;
    }
    if (k.length > 2 && k.slice(0, 2).toLowerCase() === 'on') {
      // C7: 함수면 events로. C11: 문자열 on*은 버린다 (ADR-0002 s2와 같은 이유, 반례 9)
      if (typeof val === 'function') events[k.slice(2).toLowerCase()] = val as EventListener;
      continue;
    }
    if (val === null || val === undefined || val === false) continue;
    v.attrs[k] = val === true ? '' : String(val);
  }
  if (Object.keys(events).length > 0) v.events = events; // 없으면 키 자체를 붙이지 않는다 (ADR-0001)
  return v;
}
