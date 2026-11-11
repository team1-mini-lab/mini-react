// 변경 1건 → 한 줄 요약 (SDD_final_phase1 7.4 U1). VNode를 JSON으로 덤프하지 않는다.
import type { Change } from '../../core/diff';
import type { VNode } from '../../core/vnode';

export function label(v: VNode | null | undefined): string {
  if (!v) return '(끝)';
  if (v.type === 'text') return `"${v.text.length > 20 ? v.text.slice(0, 20) + '…' : v.text}"`;
  return `<${v.tag}${v.key !== undefined ? ` key="${v.key}"` : ''}>`;
}

export function formatChange(ch: Change): string {
  switch (ch.kind) {
    case 'text': {
      const parent = ch.target.dom?.parentElement?.localName;
      const prev = ch.target.text;
      return `글자 수정: ${parent ? `<${parent}> ` : ''}"${prev}" → "${ch.text}"`;
    }
    case 'attrs': {
      const parts = [
        ...Object.entries(ch.set).map(([k, v]) => `${k}="${v}" ${k in ch.target.attrs ? '변경' : '추가'}`),
        ...ch.remove.map((k) => `${k} 제거`),
      ];
      return `속성 수정: ${label(ch.target)} ${parts.join(' / ')}`;
    }
    case 'add':
      return `추가: ${label(ch.node)} (${ch.before ? `${label(ch.before)} 앞` : '끝'})`;
    case 'remove':
      return `삭제: ${label(ch.target)}`;
    case 'replace':
      return `교체: ${label(ch.target)} → ${label(ch.node)}`;
    case 'move':
      return `이동: ${label(ch.target)} (${ch.before ? `${label(ch.before)} 앞으로` : '끝으로'})`;
  }
}
