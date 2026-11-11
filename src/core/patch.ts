// Patch (SDD_final_phase1 5장, ADR-0005·0004 1절·0015 3절). 실제 영역 DOM을 바꾸는 유일한 모듈.
import type { DiffResult } from './diff';
import { vnodeToDom } from './dom';
import type { EventHandlers, VNode } from './vnode';

export interface PatchOptions {
  highlight?: boolean;
  highlightExcludeTags?: string[]; // Phase 1: [], Phase 2 Todo: ['input', 'textarea']
}

export interface PatchResult {
  applied: number;
  recovered: boolean;
}

function need<T>(v: T | undefined | null, what: string): T {
  if (v == null) throw new Error(`[patch] ${what}의 dom 참조가 없습니다`);
  return v;
}

/** 1단계 changes 적용 → 2단계 pairs dom 복사(+events) → 3단계 새 노드 recordDom. 실패하면 t3 복구 (ADR-0005 6절). */
export function applyPatch(container: Element, nextTree: VNode, result: DiffResult, opts: PatchOptions = {}): PatchResult {
  const created: [VNode, Node][] = [];
  try {
    for (const ch of result.changes) {
      switch (ch.kind) {
        case 'remove':
          (need(ch.target.dom, 'remove 대상') as ChildNode).remove();
          break;
        case 'add': {
          const el = vnodeToDom(ch.node);
          const ref = ch.before ? need(ch.before.dom, 'add 기준') : null;
          need(ch.parent.dom, 'add 부모').insertBefore(el, ref);
          created.push([ch.node, el]);
          break;
        }
        case 'replace': {
          const el = vnodeToDom(ch.node);
          (need(ch.target.dom, 'replace 대상') as ChildNode).replaceWith(el);
          created.push([ch.node, el]);
          break;
        }
        case 'text': {
          const t = need(ch.target.dom, 'text 대상');
          if (t.nodeType !== 3) throw new Error('[patch] text 대상이 글자 노드가 아닙니다');
          t.nodeValue = ch.text;
          break;
        }
        case 'attrs': {
          const el = need(ch.target.dom, 'attrs 대상');
          for (const [k, v] of Object.entries(ch.set)) {
            el.setAttribute(k, v);
            syncProperty(el, k, v);
          }
          for (const k of ch.remove) {
            el.removeAttribute(k);
            syncProperty(el, k, null);
          }
          break;
        }
        case 'move': {
          const ref = ch.before ? need(ch.before.dom, 'move 기준') : null;
          need(ch.parent.dom, 'move 부모').insertBefore(need(ch.target.dom, 'move 대상'), ref);
          break;
        }
      }
    }
    for (const [o, n] of result.pairs) {
      (n as { dom?: Node }).dom = need(o.dom, '짝 노드');
      if (n.type === 'element') syncEvents(n.dom as Element, n.events);
    }
    for (const [v, node] of created) recordDom(v, node);
  } catch (err) {
    recoverPatch(container, nextTree, err);
    return { applied: 0, recovered: true };
  }
  if (opts.highlight) highlightChanges(result, opts.highlightExcludeTags ?? []);
  return { applied: result.changes.length, recovered: false };
}

/** value·checked는 지금 값(프로퍼티)이 다를 때만 쓴다 — 커서가 튀지 않게 (ADR-0004 1절, TD3~TD5). */
function syncProperty(el: Element, k: string, v: string | null): void {
  const any = el as unknown as Record<string, unknown>;
  if (k === 'value' && 'value' in el) {
    const next = v ?? '';
    if (any.value !== next) any.value = next;
  } else if (k === 'checked' && 'checked' in el) {
    const next = v !== null;
    if (any.checked !== next) any.checked = next;
  }
}

/** F1: 새 트리와 막 만든 실제 노드를 같은 순서로 내려가며 dom을 적는다. */
export function recordDom(v: VNode, node: Node): void {
  (v as { dom?: Node }).dom = node;
  if (v.type === 'element') {
    syncEvents(node as Element, v.events);
    v.children.forEach((c, i) => recordDom(c, node.childNodes[i]));
  }
}

/** t3: 컨테이너의 루트를 새 트리로 통째 다시 그리고 dom을 새로 기록한다. */
export function recoverPatch(container: Element, nextTree: VNode, error: unknown): void {
  console.error('[patch] Patch 도중 오류가 나서 실제 영역을 다시 그립니다:', error);
  const root = vnodeToDom(nextTree);
  const first = container.firstElementChild;
  if (first) first.replaceWith(root);
  else container.appendChild(root);
  recordDom(nextTree, root);
}

/** Phase 2 첫 렌더: 컨테이너를 비우고 트리를 한 번 붙인 뒤 dom을 기록한다 (ADR-0015 2절). */
export function mountTree(container: Element, v: VNode): void {
  const root = vnodeToDom(v);
  container.replaceChildren(root);
  recordDom(v, root);
}

// ---- 이벤트 (ADR-0015 3절): 요소마다 종류별 고정 리스너 하나, 핸들러는 __handlers에서 꺼낸다 ----
type HandlerHost = Element & { __handlers?: EventHandlers };

function dispatch(this: HandlerHost, e: Event): void {
  const host = e.currentTarget as HandlerHost;
  host.__handlers?.[e.type]?.call(host, e);
}

export function syncEvents(el: Element, next?: EventHandlers): void {
  const host = el as HandlerHost;
  const prev = host.__handlers;
  if (!prev && !next) return;
  const n = next ?? {};
  for (const type of Object.keys(n)) if (!prev || !(type in prev)) el.addEventListener(type, dispatch);
  if (prev) for (const type of Object.keys(prev)) if (!(type in n)) el.removeEventListener(type, dispatch);
  host.__handlers = { ...n };
}

// ---- 하이라이트 y2: class·style을 건드리지 않는 animate() 0.6초 ----
function highlightChanges(result: DiffResult, exclude: string[]): void {
  const targets = new Set<Element>();
  for (const ch of result.changes) {
    let el: Node | null | undefined = null;
    if (ch.kind === 'add' || ch.kind === 'replace') el = ch.node.dom;
    else if (ch.kind === 'text') el = ch.target.dom?.parentElement;
    else if (ch.kind === 'attrs' || ch.kind === 'move') el = ch.target.dom;
    if (el && el.nodeType === 1 && !exclude.includes((el as Element).localName)) targets.add(el as Element);
  }
  for (const el of targets) {
    if (typeof (el as Element & { animate?: unknown }).animate !== 'function') continue; // jsdom
    el.animate([{ backgroundColor: '#fff3a3' }, { backgroundColor: 'transparent' }], { duration: 600 });
  }
}
