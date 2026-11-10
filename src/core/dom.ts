// DOM ↔ Virtual DOM 변환 (SDD_final_phase1 3.1·3.2, ADR-0002·0003·0016)
import type { Attrs, VElement, VNode, VText } from './vnode';

const WS = /[ \t\n\r\f]+/g; // \s는 &nbsp;까지 줄이므로 쓰지 않는다 (T8)
const WS_ONLY = /^[ \t\n\r\f]*$/;
const URL_ATTRS = new Set(['href', 'src']);

export interface DomToVNodeOptions {
  /** 실제 영역을 처음 변환할 때만 true (ADR-0002 2) */
  recordDom?: boolean;
}

/** 실제 DOM 노드 → VNode. 주석·<script>는 부모가 건너뛰고, on*·javascript: 속성은 넣지 않는다 (s2). */
export function domToVNode(node: Node, opts: DomToVNodeOptions = {}): VNode {
  if (node == null || typeof (node as Node).nodeType !== 'number') {
    throw new TypeError('domToVNode: Node가 아닌 값입니다');
  }
  if (node.nodeType !== 1 && node.nodeType !== 3) {
    throw new TypeError('domToVNode: 태그 노드나 글자 노드만 변환합니다');
  }
  return convert(node, !!opts.recordDom, false);
}

function convert(node: Node, record: boolean, inPre: boolean): VNode {
  if (node.nodeType === 3) {
    const raw = node.nodeValue ?? '';
    const v: VText = { type: 'text', text: inPre ? raw : raw.replace(WS, ' ') };
    if (record) v.dom = node as Text;
    return v;
  }
  const el = node as Element;
  const tag = el.localName;
  const pre = inPre || tag === 'pre';
  const attrs: Attrs = {};
  let key: string | undefined;
  for (const a of Array.from(el.attributes)) {
    if (a.name === 'key') {
      key = a.value;
      continue;
    }
    if (a.name.toLowerCase().startsWith('on')) continue; // S2
    if (URL_ATTRS.has(a.name.toLowerCase()) && a.value.trim().toLowerCase().startsWith('javascript:')) continue; // S3
    attrs[a.name] = a.value;
  }
  const children: VNode[] = [];
  for (const c of Array.from(el.childNodes)) {
    if (c.nodeType === 3 || (c.nodeType === 1 && (c as Element).localName !== 'script')) {
      children.push(convert(c, record, pre));
    } // 주석·<script>·그 밖의 노드는 건너뛴다 (T7, S1)
  }
  const v: VElement = { type: 'element', tag, attrs, children: mergeWhitespace(children, pre) };
  if (key !== undefined) v.key = key;
  if (record) v.dom = el;
  return v;
}

/** ADR-0016 (가): 건너뛴 노드 때문에 나란히 남은 공백 글자 노드를 하나로 합친다. dom은 첫 노드. */
function mergeWhitespace(children: VNode[], pre: boolean): VNode[] {
  const out: VNode[] = [];
  for (const c of children) {
    const last = out[out.length - 1];
    if (last && last.type === 'text' && c.type === 'text' && WS_ONLY.test(last.text) && WS_ONLY.test(c.text)) {
      last.text = pre ? last.text + c.text : ' ';
      continue; // last.dom(첫 실제 노드)는 그대로 둔다 (T17)
    }
    out.push(c);
  }
  return out;
}

/** VNode → 화면 밖 실제 DOM 노드. dom을 읽지도 기록하지도 않는다 (ADR-0003). */
export function vnodeToDom(v: VNode): Node {
  if (v.type === 'text') return document.createTextNode(v.text);
  const el = document.createElement(v.tag);
  for (const [k, val] of Object.entries(v.attrs)) el.setAttribute(k, val);
  if (v.key !== undefined) el.setAttribute('key', v.key);
  for (const c of v.children) el.appendChild(vnodeToDom(c));
  return el;
}
