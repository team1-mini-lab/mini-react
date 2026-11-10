// SDD 6.3 — 틀(#real-area) + 샘플을 jsdom 문서에 붙인다.
// pages/phase1/init.ts 구현 후 init()까지 실행하도록 확장한다.
export function mountFrame(sampleHtml: string): HTMLElement {
  document.body.innerHTML = `<section id="real-area">${sampleHtml}</section>`;
  return document.getElementById('real-area')!;
}
