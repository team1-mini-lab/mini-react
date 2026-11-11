import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { domToVNode } from '../../src/core/dom';
import type { VNode } from '../../src/core/vnode';
import { equalScreen } from '../../src/core/vnode';
import { htmlToVNode } from '../../src/core/html';
import { init } from '../../src/pages/phase1/init';
import { MSG } from '../../src/pages/phase1/main';
import { renderPreview } from '../../src/pages/phase1/preview';
import { loadPage } from '../helpers/phase1-page';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const screen = (el: Element) => domToVNode(el);
const same = (p: ReturnType<typeof loadPage>) => equalScreen(screen(p.realRoot()), screen(p.previewRoot()));
const edit = (p: ReturnType<typeof loadPage>, from: string, to: string) => p.type(p.editor.value.replace(from, to));
const status = (p: ReturnType<typeof loadPage>) => p.$('status').textContent;
const disabled = (p: ReturnType<typeof loadPage>, id: string) => (p.$(id) as HTMLButtonElement).disabled;

describe('[VT-32] 페이지 구성 (ADR-0006, CON-01)', () => {
  it('[VT-32] 실제 영역·코드 입력칸·미리보기·버튼·기록 표시·상태 문구·로그·트리 보기가 있다', () => {
    const p = loadPage();
    for (const id of ['real-area', 'editor', 'preview', 'patch', 'undo', 'redo', 'revert', 'history-pos', 'status', 'change-log', 'tree-old', 'tree-new']) {
      expect(p.$(id), id).toBeTruthy();
    }
    expect(p.$('history-pos').textContent).toBe('기록 1 / 1');
  });
});

describe('[VT-33] 첫 로드 (FR-01)', () => {
  it('[VT-33][H1] 공식 샘플로 첫 로드 → 실제 영역과 미리보기가 FR-01 기준으로 같고, 두 이동 버튼 꺼짐', () => {
    const p = loadPage();
    expect(same(p)).toBe(true);
    expect(disabled(p, 'undo') && disabled(p, 'redo')).toBe(true);
  });
});

describe('[VT-34] Patch 전에는 실제 영역 그대로 (FR-02)', () => {
  it('[VT-34] 코드를 고치고 0.3초가 지나도 실제 영역은 바뀌지 않는다', () => {
    const p = loadPage();
    const before = screen(p.realRoot());
    edit(p, '장바구니 목록', '바뀐 제목');
    vi.advanceTimersByTime(400);
    expect(equalScreen(screen(p.realRoot()), before)).toBe(true);
    expect(p.$('preview').textContent).toContain('바뀐 제목');
  });
});

describe('[VT-40] 0.3초 미리보기 (ADR-0006 e3)', () => {
  it('[VT-40][TA8] 입력 직후 0.3초 전에는 미리보기 그대로, 후에는 바뀜', () => {
    const p = loadPage();
    edit(p, '장바구니 목록', '새 제목');
    vi.advanceTimersByTime(299);
    expect(p.$('preview').textContent).not.toContain('새 제목');
    vi.advanceTimersByTime(2);
    expect(p.$('preview').textContent).toContain('새 제목');
  });
  it('[VT-40][TA9] 0.3초 전에 Patch하면 미리보기가 즉시 바뀌고 실제 영역과 같다', () => {
    const p = loadPage();
    edit(p, '장바구니 목록', '바로 Patch');
    p.page.onPatch();
    expect(p.$('preview').textContent).toContain('바로 Patch');
    expect(same(p)).toBe(true);
  });
});

describe('[VT-40][VT-41] 미리보기·첫 로드 함수 직접 확인 (IR-01, CON-07)', () => {
  it('[VT-40] renderPreview(htmlToVNode(code))는 #preview에 그 코드의 화면을 그린다', () => {
    const p = loadPage();
    const v = htmlToVNode('<div><p>미리</p></div>')!;
    renderPreview(v, document);
    expect(equalScreen(screen(p.previewRoot()), v)).toBe(true);
  });
  it('[VT-41] init()은 실제 영역을 기록함 모드로 읽어 기록 1개를 만들고, 코드 입력칸·미리보기를 채운다', () => {
    const p = loadPage();
    const { history, current } = init(document);
    expect(history.size).toBe(1);
    expect(current.dom).toBe(p.realRoot());
    expect(p.editor.value).toContain('장바구니');
    expect(same(p)).toBe(true);
  });
});

describe('[VT-41] 루트 교체와 틀로 찾기 (ADR-0006 h1·i1)', () => {
  it('[VT-41][TA10] 루트 div → section 교체 후 한 번 더 Patch, 두 번 모두 성공', () => {
    const p = loadPage('<div id="app"><p>a</p></div>');
    p.type('<section id="app"><p>a</p></section>');
    p.page.onPatch();
    p.type('<section id="app"><p>b</p></section>');
    p.page.onPatch();
    expect(p.realRoot().localName).toBe('section');
    expect(same(p)).toBe(true);
    expect(status(p)).toBe('');
  });
  it('[VT-41][TA11] 페이지 코드는 샘플 안의 id(#app, #scroll-box)로 요소를 찾지 않는다', () => {
    const dir = resolve(import.meta.dirname, '../../src/pages/phase1');
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
      expect(readFileSync(resolve(dir, f), 'utf8'), f).not.toMatch(/getElementById\(\s*['"](app|scroll-box)['"]|querySelector\(\s*['"]#(app|scroll-box)/);
    }
  });
  it('[VT-41][TA12] 첫 로드와 Patch 후, 미리보기 노드는 어떤 객체의 dom에도 없다', () => {
    const p = loadPage();
    const doms = (v: VNode, out: Node[] = []) => {
      if (v.dom) out.push(v.dom);
      if (v.type === 'element') v.children.forEach((c) => doms(c, out));
      return out;
    };
    const inPreview = (v: VNode) => doms(v).some((n) => p.$('preview').contains(n));
    expect(inPreview(p.page.state.current)).toBe(false);
    edit(p, '딸기', '포도');
    p.page.onPatch();
    expect(inPreview(p.page.state.current)).toBe(false);
  });
});

describe('[VT-47] 변경 없는 Patch (ADR-0008 k1)', () => {
  it('[VT-47][TA13][H6] 공식 샘플로 아무것도 안 고치고 Patch → 기록 그대로, "변경 사항 없음"', () => {
    const p = loadPage();
    p.page.onPatch();
    expect(p.page.history.size).toBe(1);
    expect(status(p)).toBe(MSG.noChange);
  });
  it('[VT-47][H7] [A, B, C]에서 B로 돌아와 아무것도 안 고치고 Patch → C가 남는다', () => {
    const p = loadPage();
    edit(p, '딸기', 'B');
    p.page.onPatch();
    edit(p, 'B', 'C');
    p.page.onPatch();
    p.page.onUndo();
    p.page.onPatch();
    expect(p.page.history.size).toBe(3);
    expect(p.page.history.canRedo()).toBe(true);
  });
  it('[VT-47][TA1] 들여쓰기만 바꿔 Patch해도 changes 0개', () => {
    const p = loadPage();
    p.type(p.editor.value.replace(/\n {2}</g, '\n    <')); // <pre> 안은 건드리지 않는다
    p.page.onPatch();
    expect(status(p)).toBe(MSG.noChange);
    expect(p.page.history.size).toBe(1);
  });
});

describe('[VT-08][VT-09][VT-49] 뒤로가기·앞으로가기 (ADR-0008)', () => {
  it('[VT-08][H3] Patch 2번 후 뒤로가기 → 세 화면이 1번 기록과 같고, 바뀌지 않은 요소는 같은 객체', () => {
    const p = loadPage();
    const h1 = p.realRoot().querySelector('h1');
    edit(p, '딸기', '포도');
    p.page.onPatch();
    const afterFirst = screen(p.realRoot());
    edit(p, '포도', '수박');
    p.page.onPatch();
    p.page.onUndo();
    expect(equalScreen(screen(p.realRoot()), afterFirst)).toBe(true);
    expect(same(p)).toBe(true);
    expect(p.editor.value).toContain('포도');
    expect(p.realRoot().querySelector('h1')).toBe(h1);
  });
  it('[VT-09][H4] 이어서 앞으로가기 → 세 화면이 2번 기록과 같다', () => {
    const p = loadPage();
    edit(p, '딸기', '포도');
    p.page.onPatch();
    edit(p, '포도', '수박');
    p.page.onPatch();
    const second = screen(p.realRoot());
    p.page.onUndo();
    p.page.onRedo();
    expect(equalScreen(screen(p.realRoot()), second)).toBe(true);
    expect(same(p)).toBe(true);
    expect(p.editor.value).toContain('수박');
  });
  it('[VT-49][H11] 뒤로가기 후 저장된 객체의 화면 데이터는 그대로이고 dom은 지금 실제 영역 노드를 가리킨다', () => {
    const p = loadPage();
    const first = p.page.state.current;
    edit(p, '딸기', '포도');
    p.page.onPatch();
    p.page.onUndo();
    expect(p.page.state.current).toBe(first);
    expect(first.dom).toBe(p.realRoot());
  });
});

describe('[VT-48] 수정 중 이동 금지 (ADR-0008 m3·틈 막기, ADR-0019)', () => {
  const twoRecords = () => {
    const p = loadPage();
    edit(p, '딸기', '포도');
    p.page.onPatch();
    return p;
  };
  it('[VT-48][H12] 입력 직후 0.3초 전에는 두 버튼 꺼짐', () => {
    const p = twoRecords();
    expect(disabled(p, 'undo')).toBe(false);
    edit(p, '포도', '포도!');
    expect(disabled(p, 'undo')).toBe(true);
  });
  it('[VT-48][H8] 고치고 0.3초 지나면 버튼 꺼짐 + 안내 문구', () => {
    const p = twoRecords();
    edit(p, '포도', '사과');
    vi.advanceTimersByTime(300);
    expect(disabled(p, 'undo')).toBe(true);
    expect(status(p)).toBe(MSG.dirty);
  });
  it('[VT-48][H9] 원래대로 되돌리면 버튼이 다시 켜진다', () => {
    const p = twoRecords();
    const code = p.editor.value;
    edit(p, '포도', '사과');
    vi.advanceTimersByTime(300);
    p.type(code);
    vi.advanceTimersByTime(300);
    expect(disabled(p, 'undo')).toBe(false);
  });
  it('[VT-48][H10] 들여쓰기만 바꾸면 0.3초 뒤 버튼이 켜진다', () => {
    const p = twoRecords();
    p.type(p.editor.value.replace(/\n {2}</g, '\n    <')); // <pre> 안은 건드리지 않는다
    vi.advanceTimersByTime(300);
    expect(disabled(p, 'undo')).toBe(false);
  });
  it('[VT-48] key만 바꾸면 수정 있음으로 판단해 꺼진 채 안내', () => {
    const p = twoRecords();
    edit(p, 'key="s"', 'key="x"');
    vi.advanceTimersByTime(300);
    expect(disabled(p, 'undo')).toBe(true);
    expect(status(p)).toBe(MSG.dirty);
  });
  it('[VT-48][H13] 코드를 비우고 0.3초 안에 Patch → "루트 요소가 필요합니다", pending 풀림, 버튼 꺼짐', () => {
    const p = twoRecords();
    p.type('');
    p.page.onPatch();
    expect(status(p)).toBe(MSG.needRoot);
    expect(p.page.state.pending).toBe(false);
    expect(p.page.state.dirty).toBe(true);
    expect(disabled(p, 'undo')).toBe(true);
  });
  it('[VT-48][H14] 고친 뒤 "수정 취소" → 코드·미리보기가 지금 기록과 같고 버튼이 켜진다', () => {
    const p = twoRecords();
    edit(p, '포도', '사과');
    vi.advanceTimersByTime(300);
    p.page.onRevert();
    expect(p.editor.value).toContain('포도');
    expect(same(p)).toBe(true);
    expect(disabled(p, 'undo')).toBe(false);
  });
});

describe('[VT-31] 페이지에서의 실패 복구 (ADR-0005 6절, ADR-0017, ADR-0019 x3)', () => {
  const breakDom = (p: ReturnType<typeof loadPage>) => {
    const root = p.page.state.current;
    if (root.type === 'element') delete (root.children[1] as { dom?: unknown }).dom;
  };
  it('[VT-31][R1] Patch 중 복구 → 실제 영역이 새 트리와 같고, 안내 문구, 기록 1개 증가', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const p = loadPage();
    breakDom(p);
    edit(p, '딸기', '포도');
    p.page.onPatch();
    expect(status(p)).toBe(MSG.recovered);
    expect(p.page.history.size).toBe(2);
    expect(same(p)).toBe(true);
  });
  it('[VT-31][R3] 뒤로가기 중 복구 → 기록 [A,B,C] 그대로, 위치 1, 앞으로가기 가능', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const p = loadPage();
    edit(p, '딸기', 'B');
    p.page.onPatch();
    edit(p, 'B', 'C');
    p.page.onPatch();
    breakDom(p);
    p.page.onUndo();
    expect(status(p)).toBe(MSG.recovered);
    expect([p.page.history.size, p.page.history.index, p.page.history.canRedo()]).toEqual([3, 1, true]);
    expect(same(p)).toBe(true);
  });
  it('[VT-31][R4] R3 직후 앞으로가기는 복구 없이 정상', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const p = loadPage();
    edit(p, '딸기', 'B');
    p.page.onPatch();
    edit(p, 'B', 'C');
    p.page.onPatch();
    breakDom(p);
    p.page.onUndo();
    p.page.onRedo();
    expect(status(p)).toBe('');
    expect(p.editor.value).toContain('C');
    expect(same(p)).toBe(true);
  });
  it('[VT-31][R5] 복구 자체가 실패하면 오류가 밖으로 나가지 않고 안내 후 버튼을 모두 끈다', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const p = loadPage();
    breakDom(p);
    vi.spyOn(Element.prototype, 'replaceWith').mockImplementation(() => {
      throw new Error('복구 중 DOM 오류'); // 복구도 실패하는 버그 상황
    });
    edit(p, '딸기', '포도');
    expect(() => p.page.onPatch()).not.toThrow();
    expect(status(p)).toBe(MSG.recoverFailed);
    expect(err).toHaveBeenCalledTimes(2);
    expect(['patch', 'undo', 'redo'].every((id) => disabled(p, id))).toBe(true);
  });
});

describe('[VT-21] 여러 최상위 요소 (ADR-0019 x2)', () => {
  it('[VT-21][TA15] 첫 요소만 쓰고 "첫 번째 요소만 사용합니다"를 보여 준다', () => {
    const p = loadPage('<div><p>a</p></div>');
    p.type('<div><p>b</p></div><p>버려짐</p>');
    p.page.onPatch();
    expect(status(p)).toBe(MSG.firstOnly);
    expect(p.realRoot().textContent).toBe('b');
  });
});

describe('[VT-32] 시연 기능 (피드백 02: U1·U2·TV1~TV4)', () => {
  it('[VT-32][U1] 글자 하나 바꿔 Patch → 로그에 요약 1줄', () => {
    const p = loadPage();
    edit(p, '딸기', '포도');
    p.page.onPatch();
    expect(p.$('change-log').textContent!.split('\n')).toHaveLength(1);
    expect(p.$('change-log').textContent).toMatch(/^글자 수정: <li> "딸기 " → "포도 "$/);
  });
  it('[VT-32][U2] 바뀐 것 없음 / 수정 중 / 복구 후 상태 문구', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const p = loadPage();
    p.page.onPatch();
    expect(status(p)).toBe(MSG.noChange);
    edit(p, '딸기', '포도');
    vi.advanceTimersByTime(300);
    expect(status(p)).toBe(MSG.dirty);
    const root = p.page.state.current;
    if (root.type === 'element') delete (root.children[1] as { dom?: unknown }).dom;
    p.page.onPatch();
    expect(status(p)).toBe(MSG.recovered);
  });
  it('[VT-32][TV1] 글자 하나 바꾸면 왼쪽·오른쪽에서 그 글자만 같은 색', () => {
    const p = loadPage('<div><p>a</p><p>b</p></div>');
    p.type('<div><p>a</p><p>c</p></div>');
    p.page.onPatch();
    const marked = (id: string) => Array.from(p.$(id).querySelectorAll('.tv-update')).map((e) => e.textContent!.trim());
    expect(marked('tree-old')).toEqual(['"b"']);
    expect(marked('tree-new')).toEqual(['"c"']);
  });
  it('[VT-32][TV2][TV3] 삭제는 왼쪽에만, 추가는 오른쪽에만 칠한다', () => {
    const p = loadPage('<ul><li key="a">a</li><li key="b">b</li></ul>');
    p.type('<ul><li key="b">b</li><li key="c">c</li></ul>');
    p.page.onPatch();
    expect(p.$('tree-old').querySelectorAll('.tv-remove')).toHaveLength(1);
    expect(p.$('tree-new').querySelectorAll('.tv-remove')).toHaveLength(0);
    expect(p.$('tree-new').querySelectorAll('.tv-add')).toHaveLength(1);
    expect(p.$('tree-old').querySelectorAll('.tv-add')).toHaveLength(0);
  });
  it('[VT-32][TV4] 트리 보기 글자에 dom 정보가 없다', () => {
    const p = loadPage();
    edit(p, '딸기', '포도');
    p.page.onPatch();
    expect(p.$('tree-viewer').textContent).not.toMatch(/\bdom\b|HTML\w*Element|\[object/);
  });
});

describe('[VT-36] key 있음·없음 비교 시연 (SDD_final_common 5장 5번, TBD-13)', () => {
  it('[VT-36][D6][P2] 맨 앞에 사과를 추가하면 key 있음은 add 1개이고 입력값이 바나나를 따라가며, key 없음은 입력값이 자리에 남는다', () => {
    const p = loadPage();
    const inputs = (id: string) => Array.from(p.$(id).querySelectorAll('input')) as HTMLInputElement[];
    inputs('kd-keyed')[0].value = '3';
    inputs('kd-unkeyed')[0].value = '3';
    (p.$('kd-add') as HTMLButtonElement).click();
    const row = (id: string) => inputs(id).map((i) => `${i.parentElement!.firstChild!.textContent!.trim()}=${i.value}`);
    expect(row('kd-keyed')).toEqual(['사과=', '바나나=3', '딸기=']);
    expect(row('kd-unkeyed')[0]).toBe('사과=3');
    expect(p.$('kd-log').textContent).toMatch(/key 있음: 변경 1개/);
  });
});
