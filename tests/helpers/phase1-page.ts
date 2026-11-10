// Phase 1 검증 페이지를 jsdom에 그대로 올린다 (SDD_final_common 3.2 fixture).
// 샘플은 src/pages/phase1/index.html에서 읽는다 — 페이지와 테스트가 같은 샘플을 쓴다.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startPhase1 } from '../../src/pages/phase1/main';

const PAGE = readFileSync(resolve(import.meta.dirname, '../../src/pages/phase1/index.html'), 'utf8');

export function pageBody(): string {
  const body = PAGE.slice(PAGE.indexOf('<body>') + 6, PAGE.indexOf('</body>'));
  return body.replace(/<script[\s\S]*?<\/script>/g, '');
}

export function samplePageHtml(): string {
  const b = pageBody();
  const i = b.indexOf('<section id="real-area">') + '<section id="real-area">'.length;
  return b.slice(i, b.indexOf('</section>', i));
}

export function loadPage(realAreaInner?: string) {
  document.body.innerHTML = pageBody();
  if (realAreaInner !== undefined) document.getElementById('real-area')!.innerHTML = realAreaInner;
  const page = startPhase1(document, { debounceMs: 300 });
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const editor = $('editor') as HTMLTextAreaElement;
  const type = (code: string) => {
    editor.value = code;
    editor.dispatchEvent(new Event('input'));
  };
  return { page, $, editor, type, realRoot: () => $('real-area').firstElementChild!, previewRoot: () => $('preview').firstElementChild! };
}
