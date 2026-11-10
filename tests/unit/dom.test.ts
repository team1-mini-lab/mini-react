import { describe, it, expect } from 'vitest';
import { domToVNode, vnodeToDom } from '../../src/core/dom';
import { h } from '../../src/core/vnode';

describe('[VT-02] DOM 변환 및 정제 모듈', () => {
  it('주석 노드와 <script>는 건너뛴다 (S1)', () => {
    const div = document.createElement('div');
    div.innerHTML = '<!-- 메모 --><p>텍스트</p><script>alert(1)</script>';
    const vnode = domToVNode(div);
    expect(vnode.type).toBe('element');
    if (vnode.type === 'element') {
      expect(vnode.children).toHaveLength(1);
      expect((vnode.children[0] as any).tag).toBe('p');
    }
  });

  it('onclick 등 on* 속성은 attrs에서 제외한다 (S2)', () => {
    const btn = document.createElement('button');
    btn.setAttribute('onclick', 'alert(1)');
    btn.setAttribute('class', 'btn');
    const vnode = domToVNode(btn);
    if (vnode.type === 'element') {
      expect(vnode.attrs).toEqual({ class: 'btn' });
      expect(vnode.attrs.onclick).toBeUndefined();
    }
  });

  it('javascript: URL은 attrs에서 제외한다 (S3)', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'javascript:void(0)');
    a.setAttribute('id', 'link');
    const vnode = domToVNode(a);
    if (vnode.type === 'element') {
      expect(vnode.attrs).toEqual({ id: 'link' });
      expect(vnode.attrs.href).toBeUndefined();
    }
  });

  it('<pre> 밖의 연속 공백은 단일 공백으로 치환된다 (T1)', () => {
    const p = document.createElement('p');
    p.textContent = '안녕   \t\n  세상';
    const vnode = domToVNode(p);
    if (vnode.type === 'element') {
      expect((vnode.children[0] as any).text).toBe('안녕 세상');
    }
  });

  it('<pre> 내부의 공백과 줄바꿈은 보존된다 (T4)', () => {
    const pre = document.createElement('pre');
    pre.textContent = '줄바꿈\n  들여쓰기';
    const vnode = domToVNode(pre);
    if (vnode.type === 'element') {
      expect((vnode.children[0] as any).text).toBe('줄바꿈\n  들여쓰기');
    }
  });
});
