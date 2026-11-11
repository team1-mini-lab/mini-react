// SDD_final_phase1 3장 규칙을 그대로 옮긴 최소 구현 (검증용 시제품)
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><body></body>'); const document = dom.window.document;
const WS = /[ \t\n\r\f]+/g;
function domToVNode(node, opts = {}, inPre = false) {
  if (node.nodeType === 3) { const v = { type: 'text', text: inPre ? node.nodeValue : node.nodeValue.replace(WS, ' ') }; if (opts.recordDom) v.dom = node; return v; }
  const tag = node.localName, pre = inPre || tag === 'pre';
  const attrs = {}; let key;
  for (const a of node.attributes) { if (a.name === 'key') { key = a.value; continue; }
    if (a.name.toLowerCase().startsWith('on')) continue;
    if ((a.name === 'href' || a.name === 'src') && a.value.trim().toLowerCase().startsWith('javascript:')) continue; attrs[a.name] = a.value; }
  const children = [];
  for (const c of node.childNodes) { if (c.nodeType === 3 || (c.nodeType === 1 && c.localName !== 'script')) children.push(domToVNode(c, opts, pre)); }
  const v = { type: 'element', tag, attrs, children }; if (key !== undefined) v.key = key; if (opts.recordDom) v.dom = node; return v;
}
const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const escT = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
function vnodeToHtml(v, depth = 0, inPre = false) {
  if (v.type === 'text') return escT(v.text);
  const pre = inPre || v.tag === 'pre';
  let s = '<' + v.tag + Object.entries(v.attrs).map(([k, x]) => ` ${k}="${escA(x)}"`).join('') + (v.key !== undefined ? ` key="${escA(v.key)}"` : '') + '>';
  if (VOID.has(v.tag)) return s;
  v.children.forEach((c, i) => {
    if (!pre && c.type === 'text' && c.text === ' ') { const last = i === v.children.length - 1; s += '\n' + '  '.repeat(last ? depth : depth + 1); }
    else s += vnodeToHtml(c, depth + 1, pre);
  });
  return s + '</' + v.tag + '>';
}
function htmlToVNode(code) { const t = document.createElement('template'); t.innerHTML = code; const r = t.content.firstElementChild; return r ? domToVNode(r) : null; }
function equalScreen(a, b) { if (a.type !== b.type) return false; if (a.type === 'text') return a.text === b.text;
  if (a.tag !== b.tag) return false; const ka = Object.keys(a.attrs), kb = Object.keys(b.attrs); if (ka.length !== kb.length || ka.some(k => a.attrs[k] !== b.attrs[k])) return false;
  return a.children.length === b.children.length && a.children.every((c, i) => equalScreen(c, b.children[i])); }
module.exports = { document, domToVNode, vnodeToHtml, htmlToVNode, equalScreen };
