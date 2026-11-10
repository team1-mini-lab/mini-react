import { describe, expect, it } from 'vitest';
import { diff } from '../../src/core/diff';
import { domToVNode } from '../../src/core/dom';
import { htmlToVNode, parseCode, vnodeToHtml } from '../../src/core/html';
import type { VElement } from '../../src/core/vnode';
import { equalScreen, equalTree } from '../../src/core/vnode';
import { samplePageHtml } from '../helpers/phase1-page';

const roundTrip = (code: string) => {
  const v = htmlToVNode(code)!;
  return { v, back: htmlToVNode(vnodeToHtml(v))! };
};

describe('[VT-39] 코드 ↔ Virtual DOM 왕복 (ADR-0006 a3·g1)', () => {
  it('[VT-39][TA2] 들여쓰기된 샘플 → 코드 → 다시 읽기: 다섯 키 + key 기준으로 같다', () => {
    const { v, back } = roundTrip('<div>\n  <h1>a</h1>\n  <ul>\n    <li key="b">바나나</li>\n  </ul>\n</div>');
    expect(equalTree(back, v)).toBe(true);
  });
  it('[VT-39][TA1] 고친 것 없이 다시 읽으면 diff changes 0개', () => {
    const { v, back } = roundTrip('<div>\n  <p>x</p>\n</div>');
    expect(diff(v, back).changes).toHaveLength(0);
  });
  it('[VT-39][TA3] <pre> 안 줄바꿈은 그대로', () => {
    const { v, back } = roundTrip('<div><pre>배송 안내:\n  - 당일\n  - 신선</pre></div>');
    expect(equalTree(back, v)).toBe(true);
  });
  it('[VT-39][TA4] key는 코드에 key 속성으로 적힌다', () => {
    const v = htmlToVNode('<ul><li key="a">x</li></ul>')!;
    expect(vnodeToHtml(v)).toContain('key="a"');
    expect(((htmlToVNode(vnodeToHtml(v)) as VElement).children[0] as VElement).key).toBe('a');
  });
  it('[VT-39][TA5] 글자의 < & 와 속성 값의 " 는 이스케이프된다', () => {
    const { v, back } = roundTrip('<p title="a &quot;b&quot; &amp; c">1 &lt; 2 &amp;&amp; 3 &gt; 2</p>');
    expect(equalTree(back, v)).toBe(true);
  });
  it('[VT-39][TA6] <br>, <img>는 닫는 태그 없이 적힌다', () => {
    const { v, back } = roundTrip('<p>a<br><img src="x.png" alt="x">b</p>');
    expect(vnodeToHtml(v)).not.toMatch(/<\/br>|<\/img>/);
    expect(equalTree(back, v)).toBe(true);
  });
  it('[VT-39][TA14] <pre>가 줄바꿈으로 시작해도 왕복 후 그대로 (ADR-0018)', () => {
    const { v, back } = roundTrip('<div><pre>\n\nabc</pre></div>');
    const pre = (x: typeof v) => ((x as VElement).children[0] as VElement).children[0];
    expect(pre(v)).toEqual({ type: 'text', text: '\nabc' });
    expect(equalTree(back, v)).toBe(true);
  });
  it('[VT-39][TA13] 공식 샘플(주석 포함)로 첫 로드 → 코드 → 다시 읽기: FR-01 기준으로 같고 changes 0개 (ADR-0016)', () => {
    const t = document.createElement('template');
    t.innerHTML = samplePageHtml();
    const real = domToVNode(t.content.firstElementChild!, { recordDom: true });
    const back = htmlToVNode(vnodeToHtml(real))!;
    expect(equalScreen(real, back)).toBe(true);
    expect(diff(real, back).changes).toHaveLength(0);
  });
});

describe('[VT-42] 잘못된 HTML (ADR-0006 c1)', () => {
  it('[VT-42][TA7] <p>안녕<div>세상</div></p> → 브라우저가 고친 결과를 그대로 쓴다 (오류 없음)', () => {
    expect(() => htmlToVNode('<section><p>안녕<div>세상</div></p></section>')).not.toThrow();
    const v = htmlToVNode('<section><p>안녕<div>세상</div></p></section>') as VElement;
    expect(v.children.map((c) => (c.type === 'element' ? c.tag : 'text'))).toEqual(['p', 'div', 'p']);
  });
});

describe('[VT-21] 여러 최상위 요소 (ADR-0019 x2)', () => {
  it('[VT-21][TA15] 첫 요소만 쓰고 나머지 수를 알려 준다', () => {
    const r = parseCode('<div>a</div><p>b</p>');
    expect((r.root as VElement).tag).toBe('div');
    expect(r.extraRoots).toBe(1);
  });
});
