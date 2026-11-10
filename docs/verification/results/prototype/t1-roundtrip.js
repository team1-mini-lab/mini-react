const { document, domToVNode, vnodeToHtml, htmlToVNode, equalScreen } = require('./spec');
// SDD_final_phase1 7.2 샘플 그대로
const SAMPLE = `<div id="app">
  <h1>장바구니 목록</h1>
  <!-- 1. key 목록 + 줄별 수량 input (D6, P2 시연) -->
  <ul>
    <li key="b">바나나 <input type="text" class="qty" value="3" /></li>
    <li key="s">딸기 <input type="text" class="qty" value="1" /></li>
  </ul>
  <!-- 2. 주석 노드 하나 (P4 시연) -->
  <!-- 주문 메모 섹션 -->
  <!-- 3. 스크롤 박스 (FR-04 시연) -->
  <div id="scroll-box" style="height: 60px; overflow-y: scroll;">
    <p>안내 문구 1</p><p>안내 문구 2</p><p>안내 문구 3</p><p>안내 문구 4</p>
  </div>
  <!-- 4. <pre> 블록 (TA3, T4 시연) -->
  <pre>배송 안내:
  - 당일 배송
  - 신선 포장</pre>
  <!-- 5. 2칸 들여쓰기된 HTML 구조 (TA1 무변경 Patch 시연) -->
</div>`;
const area = document.createElement('section'); area.innerHTML = SAMPLE; document.body.append(area);
const real = domToVNode(area.firstElementChild, { recordDom: true });
const code = vnodeToHtml(real);
const draft = htmlToVNode(code);
console.log('실제 영역 루트 자식 수:', real.children.length, ' / 코드→다시 읽은 트리 자식 수:', draft.children.length);
console.log('실제 영역 자식 종류:', real.children.map(c => c.type === 'text' ? JSON.stringify(c.text) : c.tag).join(' '));
console.log('다시 읽은 자식 종류:', draft.children.map(c => c.type === 'text' ? JSON.stringify(c.text) : c.tag).join(' '));
console.log('equalScreen(실제 영역, 미리보기 트리) =', equalScreen(real, draft), ' ← FR-01 / VT-33·37 기대값 true');
// 두 번째 왕복은 안정적인가
const draft2 = htmlToVNode(vnodeToHtml(draft)); console.log('두 번째 왕복 equalScreen =', equalScreen(draft, draft2));
// <pre> 앞 줄바꿈
const p = htmlToVNode('<div><pre>\n\nabc</pre></div>'); const p2 = htmlToVNode(vnodeToHtml(p));
console.log('<pre> 첫 글자 줄바꿈: 원래', JSON.stringify(p.children[0].children[0].text), '→ 왕복 후', JSON.stringify(p2.children[0].children[0].text));
// <script> 사이
const s1 = htmlToVNode('<div>a<script>x</script>b</div>'); const s2 = htmlToVNode(vnodeToHtml(s1));
console.log('<script> 건너뛴 자리: 원래 자식', s1.children.length, '개 → 왕복 후', s2.children.length, '개');
