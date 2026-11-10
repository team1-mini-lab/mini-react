import { describe, expect, it } from 'vitest';
import { domToVNode, vnodeToDom } from '../../src/core/dom';
import { htmlToVNode, vnodeToHtml } from '../../src/core/html';
import type { VElement, VNode } from '../../src/core/vnode';
import { equalScreen, equalTree, h } from '../../src/core/vnode';
import { countMutations } from '../helpers/count-mutations';

const el = (html: string) => {
  const t = document.createElement('template');
  t.innerHTML = html;
  return t.content.firstElementChild!;
};
const conv = (html: string, recordDom = false) => domToVNode(el(html), { recordDom }) as VElement;
const kids = (v: VElement) => v.children.map((c) => (c.type === 'text' ? JSON.stringify(c.text) : c.tag));
const hasDom = (v: VNode): boolean => 'dom' in v || (v.type === 'element' && v.children.some(hasDom));
const allDom = (v: VNode): boolean => !!v.dom && (v.type === 'text' || v.children.every(allDom));

describe('[VT-01] DOM → VNode 기본 모양 (ADR-0002)', () => {
  it('[VT-01][T6] 자식·속성 없는 태그는 children [], attrs {}', () => {
    expect(conv('<p></p>')).toEqual({ type: 'element', tag: 'p', attrs: {}, children: [] });
  });
  it('[VT-01][T11] 모든 tag는 localName 소문자', () => {
    const v = conv('<DIV><H1>a</H1><P>b</P></DIV>');
    expect([v.tag, ...(v.children as VElement[]).map((c) => c.tag)]).toEqual(['div', 'h1', 'p']);
  });
  it('[VT-01][T14] 기본 모드에서는 어떤 객체에도 dom 키가 없다', () => {
    expect(hasDom(conv('<div><!-- 메모 --><p>a</p></div>'))).toBe(false);
  });
  it('[VT-01][T13] 기록함 모드: 주석을 건너뛴 첫 자식의 dom이 실제 p이고, 모든 객체에 dom이 있다', () => {
    const root = el('<div><!-- 메모 --><p>a</p></div>');
    const v = domToVNode(root, { recordDom: true }) as VElement;
    expect(v.children[0].dom).toBe(root.querySelector('p'));
    expect(allDom(v)).toBe(true);
  });
  it('[VT-01][T15] key 속성은 key로 옮기고 attrs에서 뺀다. 없으면 key 키 자체가 없다', () => {
    const v = conv('<ul><li key="a" class="x">a</li><li>b</li></ul>');
    const [a, b] = v.children as VElement[];
    expect(a.key).toBe('a');
    expect(a.attrs).toEqual({ class: 'x' });
    expect('key' in b).toBe(false);
  });
});

describe('[VT-02] 공백·주석·실행 내용 규칙 (ADR-0002 3·4절)', () => {
  const T1 = '<div>\n  <h1>a</h1>\n  <p>b</p>\n</div>';
  it('[VT-02][T1] 들여쓰기된 div > h1, p → 자식 5개, 공백 노드는 " "', () => {
    expect(kids(conv(T1))).toEqual(['" "', 'h1', '" "', 'p', '" "']);
  });
  it('[VT-02][T2] 들여쓰기 2칸 → 4칸이어도 결과가 같다', () => {
    expect(conv(T1.replace(/\n {2}/g, '\n    '))).toEqual(conv(T1));
  });
  it('[VT-02][T3] <b>안녕</b>⏎<i>하세요</i> 가운데 " "', () => {
    expect(conv('<p><b>안녕</b>\n<i>하세요</i></p>').children[1]).toEqual({ type: 'text', text: ' ' });
  });
  it('[VT-02][T4] <pre> 안의 줄바꿈은 그대로', () => {
    const v = conv('<pre><b>첫째 줄</b>\n\n\n<b>넷째 줄</b></pre>');
    expect(v.children[1]).toEqual({ type: 'text', text: '\n\n\n' });
  });
  it('[VT-02][T5] <pre> 자손 안의 글자도 정리하지 않는다', () => {
    const b = conv('<pre><b>a   b\n c</b></pre>').children[0] as VElement;
    expect(b.children[0]).toEqual({ type: 'text', text: 'a   b\n c' });
  });
  it('[VT-02][T7] 주석은 Virtual DOM에 없다', () => {
    expect(kids(conv('<div><!-- 메모 --><p>a</p></div>'))).toEqual(['p']);
  });
  it('[VT-02][T8] &nbsp;는 공백이 아니다', () => {
    expect(conv('<p>a&nbsp;&nbsp;b</p>').children[0]).toEqual({ type: 'text', text: 'a  b' });
  });
  it('[VT-02][T12] 글자 사이의 공백·탭·줄바꿈도 한 칸', () => {
    expect(conv('<p>안녕  \t\n 하세요</p>').children[0]).toEqual({ type: 'text', text: '안녕 하세요' });
  });
  it('[VT-02][S1] <script>는 건너뛴다', () => {
    expect(kids(conv('<div><script>alert(1)</script><p>a</p></div>'))).toEqual(['p']);
  });
  it('[VT-02][S2] on* 속성은 넣지 않는다 (대소문자 무관)', () => {
    expect(conv('<button onclick="x" onMouseOver="y" class="b">b</button>').attrs).toEqual({ class: 'b' });
  });
  it('[VT-02][S3] javascript: href·src만 뺀다', () => {
    const v = conv('<div><a href="  JavaScript:alert(1)">x</a><a href="https://a.b">y</a></div>');
    const [a, b] = v.children as VElement[];
    expect(a.attrs).toEqual({});
    expect(b.attrs).toEqual({ href: 'https://a.b' });
  });
  it('[VT-02][S5] (ADR-0016 (가), 알려진 한계) 글자 사이 <script>는 합치지 않아 왕복 후 1개로 합쳐진다', () => {
    const v = conv('<div>a<script>x</script>b</div>');
    expect(kids(v)).toEqual(['"a"', '"b"']);
    expect(kids(htmlToVNode(vnodeToHtml(v)) as VElement)).toEqual(['"ab"']);
  });
});

describe('[VT-37] FR-01 비교 기준과 주석 양옆 공백 (ADR-0002 T10, ADR-0016)', () => {
  it('[VT-37][T16] 주석 양옆에 남은 공백 노드는 하나로 합친다', () => {
    expect(kids(conv('<div>\n  <p>A</p>\n  <!-- 메모 -->\n  <p>B</p>\n</div>'))).toEqual(['" "', 'p', '" "', 'p', '" "']);
  });
  it('[VT-37][T17] 기록함 모드에서 합친 공백의 dom은 주석 앞 실제 공백 노드', () => {
    const root = el('<div>\n  <p>A</p>\n  <!-- 메모 -->\n  <p>B</p>\n</div>');
    const v = domToVNode(root, { recordDom: true }) as VElement;
    expect(v.children[2].dom).toBe(root.childNodes[2]);
  });
  it('[VT-37][T10] 실제 영역과 그 결과로 그린 미리보기를 각각 변환하면 다섯 키 기준으로 같다', () => {
    const real = el('<div>\n  <h1>a</h1>\n  <!-- x -->\n  <ul><li key="k">b</li></ul>\n</div>');
    const v = domToVNode(real, { recordDom: true });
    const preview = vnodeToDom(htmlToVNode(vnodeToHtml(v))!);
    expect(equalScreen(domToVNode(real), domToVNode(preview))).toBe(true);
  });
});

describe('[VT-21] 잘못된 입력 (SDD_final_phase1 8장)', () => {
  it('[VT-21] Node가 아닌 값·주석 노드를 넣으면 TypeError', () => {
    expect(() => domToVNode(null as unknown as Node)).toThrow(TypeError);
    expect(() => domToVNode({} as Node)).toThrow(TypeError);
    expect(() => domToVNode(document.createComment('x'))).toThrow(TypeError);
  });
  it('[VT-21] 코드에 요소가 없으면 htmlToVNode는 null', () => {
    expect(htmlToVNode('그냥 글자')).toBeNull();
    expect(htmlToVNode('')).toBeNull();
  });
});

describe('[VT-25][VT-26] 빈 요소', () => {
  it('[VT-25] 자식 없는 요소 → children []', () => expect(conv('<ul></ul>').children).toEqual([]));
  it('[VT-26] 속성 없는 요소 → attrs {}', () => expect(conv('<ul></ul>').attrs).toEqual({}));
});

describe('[VT-38] VNode → 실제 DOM (ADR-0003)', () => {
  const v = h('div', { id: 'app' }, ' ', h('ul', null, h('li', { key: 'a', class: 'x' }, '사과'), h('li', null, '배')), h('pre', null, 'a\n  b'));
  it('[VT-38] 왕복: domToVNode(vnodeToDom(v))가 다섯 키 + key로 같다', () => {
    expect(equalTree(domToVNode(vnodeToDom(v)), v)).toBe(true);
  });
  it('[VT-38] 반환 노드 종류와 localName', () => {
    expect(vnodeToDom({ type: 'text', text: 'a' }).nodeType).toBe(3);
    expect((vnodeToDom(h('section')) as Element).localName).toBe('section');
  });
  it('[VT-38] vnodeToDom은 dom을 읽지도 기록하지도 않는다', () => {
    const real = el('<p>a</p>');
    const rv = domToVNode(real, { recordDom: true });
    vnodeToDom(rv);
    expect(rv.dom).toBe(real);
    expect('dom' in v).toBe(false);
  });
  it('[VT-38] 미리보기에 붙이는 childList 변경은 노드 수와 상관없이 1건', async () => {
    const box = document.createElement('section');
    document.body.append(box);
    const n = await countMutations(box, () => box.appendChild(vnodeToDom(v)));
    expect(n).toBe(1);
  });
});

describe('[VT-46] 깊은 중첩 (TBD-09, ADR-0002 T9)', () => {
  it('[VT-46][T9] 100겹 중첩도 오류 없이 변환된다', () => {
    let html = 'x';
    for (let i = 0; i < 100; i++) html = `<div>${html}</div>`;
    let v = conv(html);
    let depth = 1;
    while (v.children[0]?.type === 'element') {
      v = v.children[0] as VElement;
      depth++;
    }
    expect(depth).toBe(100);
  });
});
