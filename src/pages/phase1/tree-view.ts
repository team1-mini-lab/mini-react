// 트리 보기: 이전/새 트리를 들여쓰기 글자 목록으로 나란히 (v2 + w1, TV1~TV4). dom은 보여 주지 않는다.
import type { DiffResult } from '../../core/diff';
import type { VNode } from '../../core/vnode';

const LEGEND: [string, string][] = [
  ['tv-remove', '삭제'], ['tv-add', '추가'], ['tv-replace', '교체'], ['tv-update', '글자·속성 수정'], ['tv-move', '이동'],
];

export function lineText(v: VNode): string {
  if (v.type === 'text') return JSON.stringify(v.text);
  const attrs = Object.entries(v.attrs).map(([k, val]) => ` ${k}="${val}"`).join('');
  return `<${v.tag}${v.key !== undefined ? ` key="${v.key}"` : ''}${attrs}>`;
}

export function treeMarks(res: DiffResult): { old: Map<VNode, string>; neu: Map<VNode, string> } {
  const old = new Map<VNode, string>();
  const neu = new Map<VNode, string>();
  const partner = new Map<VNode, VNode>(res.pairs.map(([o, n]) => [o, n]));
  for (const ch of res.changes) {
    if (ch.kind === 'remove') old.set(ch.target, 'tv-remove');
    else if (ch.kind === 'add') neu.set(ch.node, 'tv-add');
    else if (ch.kind === 'replace') {
      old.set(ch.target, 'tv-replace');
      neu.set(ch.node, 'tv-replace');
    } else {
      const cls = ch.kind === 'move' ? 'tv-move' : 'tv-update';
      old.set(ch.target, cls);
      const p = partner.get(ch.target);
      if (p) neu.set(p, cls);
    }
  }
  return { old, neu };
}

function renderList(box: HTMLElement, root: VNode, marks: Map<VNode, string>, doc: Document): void {
  const lines: HTMLElement[] = [];
  const walk = (v: VNode, depth: number) => {
    const div = doc.createElement('div');
    div.className = 'tv-line' + (marks.has(v) ? ' ' + marks.get(v) : '');
    div.textContent = '  '.repeat(depth) + lineText(v);
    lines.push(div);
    if (v.type === 'element') v.children.forEach((c) => walk(c, depth + 1));
  };
  walk(root, 0);
  box.replaceChildren(...lines);
}

export function renderTreeDiff(oldV: VNode, newV: VNode, res: DiffResult, doc: Document = document): void {
  const { old, neu } = treeMarks(res);
  const o = doc.getElementById('tree-old');
  const n = doc.getElementById('tree-new');
  const legend = doc.getElementById('tree-legend');
  if (o) renderList(o, oldV, old, doc);
  if (n) renderList(n, newV, neu, doc);
  if (legend && !legend.childElementCount) {
    legend.replaceChildren(...LEGEND.map(([cls, text]) => {
      const s = doc.createElement('span');
      s.className = cls;
      s.textContent = text;
      return s;
    }));
  }
}
