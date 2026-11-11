# 미니 React 최종 소프트웨어 설계 문서 — Phase 1 (Virtual DOM · Diff · Patch · History)

2026-11-10 · **Final v1.2** · 프로젝트 팀 · 기준 요구사항: SRS v1.4 (`docs/SRS_fixed.md`)

> **v1.2 변경 (2026-11-10)**: ADR-0016~0019(accepted)를 12장에 반영하고 11장 해당 항목을 해소로 표시. key 유무 비교 시연(TBD-13 채택)을 7.4에 추가. 구현·테스트 완료(테스트 120개 통과).
>
> **v1.1 변경 (2026-11-10)**: SRS v1.4 ID 추적표(9.3)·VT별 테스트 위치(9.4) 추가, 검증 페이지까지 UI 프레임워크 0(2.3, CON-01), 하네스(10장), 설계 검토 필요 항목(11장) 추가, 하이라이트의 `animate` 지원 확인(5.3). 결정 내용은 바꾸지 않았다.
>
> **문서 상태**: ADR-0008·0011·0012는 proposed, ADR-0001·0002·0004·0005·0006의 일부 절은 "재확인 필요"다(`docs/adr/README.md`). 이들이 accepted가 될 때까지 이 문서는 팀 검토 대상이다.

> **기준 및 출처 안내**
> - 본 문서는 `SDD_fixed_phase1.md`(v0.6)를 바탕으로 **통과·확정된 ADR (`ADR-0001~0006`, `ADR-0008`)**, 요구사항 명세 **`docs/requirements/issue.md` (및 SRS v1.3)**, 팀 설계 검토 일지 **`피드백 01~02`, `피드백 06` (`eutopiaa.tistory.com/97, 98, 102` 내용 전문 수록)**을 전수 통합하여 모순 없이 완성한 **Phase 1 최종 단일 설계 기준서**이다.
> - *외부 티스토리 링크(`eutopiaa.tistory.com/98~102`)는 에이전트 환경에서 직접 웹 크롤링할 수 없으나, 해당 글의 원문·결정·테스트 목록이 저장소 `docs/reviews/feedback-01 ~ feedback-06.md` 및 `docs/adr/ADR-*.md`에 있으며, 반영 여부는 하네스 `check:docs`(10.2)로 확인한다.*
> - Phase 2(Component, State, Hooks, Batching, Todo 앱) 최종 설계는 **`SDD_final_phase2.md`**에 있다.
> - 공통 내용(쉬운 요약, 참고 표준, 검증 전략·관문, 측정 도구, 대표 시나리오, 차별화 제안, 역할 분담, 질문 카드, 이슈 매핑)은 **`SDD_final_common.md`**에 있다. 보관용 `SDD-3.md`에만 있던 내용을 지금 결정에 맞게 옮긴 문서다.

---

## 0. `SDD_fixed_phase1.md` 대비 최종 변경 요약 (모순 해소 내역)

`SDD_fixed_phase1.md`(v0.6)와 최종 팀 검토(피드백 01·02·06, 통합 ADR) 사이에 남아 있던 아래 6건의 불일치를 모두 해소하였다.

| 항목 | `SDD_fixed_phase1.md` (v0.6) 잔존 문제 | `SDD_final_phase1.md` (Final v1.0) 확정 내용 | 근거 |
| --- | --- | --- | --- |
| 1. `VElement` 동작 키 이름 | Phase 2 예정 키를 `on`으로 표기 | **`events?: Record<string, EventListener>`** 로 통일 (키의 네 무리: 화면 데이터 · `key` · `dom` · `events`) | `ADR-0001`, `ADR-0015`, 피드백 03 |
| 2. Patch 실패 처리 모순 | §5.1은 `0단계 사전 확인(PatchError / t2 / ADR-0013)`을 적고 §5.2는 `t3(recoverPatch)`를 적어 서로 충돌 | **`t2` 및 `ADR-0013` 완전 폐기(superseded)**. **`t3(recoverPatch)`** 단일 프로토콜로 통일 | `ADR-0005` 6절, 피드백 02 3-5·5-1절 |
| 3. 컨테이너 일반화 | `recoverPatch`가 `#real-area` 전용처럼 기술 | `recoverPatch(container, nextTree, err, onRecover?)` 형태로 **컨테이너 인자 일반화** (Phase 1은 `#real-area` + History 저장, Phase 2는 `FunctionComponent` 컨테이너) | `ADR-0005` 6절, 피드백 03 3-4절 |
| 4. 입력 정제 위치 ADR | `ADR-0014` 참조 잔존 | **`ADR-0014`는 `superseded`**, **`ADR-0002` 4절 (`s2`)** 로 귀속 일원화 (`S1~S4`) | `ADR-0002` 4절, 피드백 02 5-1절 |
| 5. `History<T>` 범위 축소 | `limit = 100`, `goTo(index)` 포함 | **`limit = 100`과 `goTo(index)` 제거**, 무제한 순수 선형 리스트 + 현재 인덱스(`index`, `size`). (`archive[]`는 확장 후보로만 `ADR-0008`에 기록) | `ADR-0008`, 피드백 01 5·6절 |
| 6. 하이라이트 구현 방식 | `.patch-highlight` CSS 클래스 부여·제거로 기술 | **속성(`class`, `style`)을 전혀 건드리지 않는 `element.animate()` 0.6초 (`y2`)** 확정 (MutationObserver 조작 횟수 테스트 `HL2` 오염 방지, 제외 태그 목록 지원) | 피드백 02 4-3절, 피드백 06 1절(`y2`), `ADR-0006` 8절 |

---

## 1. 개요와 범위

### 1.1 Phase 1 최종 목표

- 사용자의 HTML 코드 수정에 따라 **실제 영역(`#real-area`) 전체를 다시 그리지 않고 바뀐 부분만 최소 DOM 조작으로 부분 업데이트(Patch)**하는 검증 페이지를 구현한다 (`issue.md` FR-03~FR-06, NFR-01).
- **뒤로가기·앞으로가기**로 State History에 저장된 특정 시점의 Virtual DOM으로 이동하며, 이때 **실제 영역, 코드 입력칸(`#editor`), 미리보기(`#preview`)가 모두 일치**해야 한다 (FR-07, FR-08).
- 변경되지 않은 요소는 Patch 및 History 이동 전후로 **동일한 DOM 노드 객체**를 유지하여, 입력 중인 값·커서 위치·스크롤 위치가 보존되어야 한다 (FR-04, NFR-01).
- Phase 1에서 구현하는 VNode 자료구조, `diff`, `applyPatch`(및 `recordDom`, `recoverPatch`, 하이라이트, `formatChange`)는 **Phase 2의 컴포넌트 엔진으로 수정 없이 그대로 재사용**된다 (`C-08`).

### 1.2 기준 문서 및 심볼 명명 규칙

| 구분 | 기준 문서 | 반영 범위 |
| --- | --- | --- |
| 요구사항 (기준) | `docs/SRS_fixed.md` v1.4 | FR-01~FR-09, NFR-01~04, IR, CON, VT (추적표 9.3·9.4) |
| 요구사항 (원문 정리) | `docs/requirements/issue.md` | FR-01~FR-08, NFR-01~04, C-01~C-04, TBD-01~04 (SRS 5.1.4로 대응) |
| 아키텍처 결정 | `ADR-0001` ~ `ADR-0008` (확정/제안), `ADR-0011` ~ `ADR-0012` | 노드 4무리, 공백·`s2`, `vnodeToDom`, 6종 Diff·`pairs`, Patch `C2`·`F1`·`t3`, 테스트 영역·시연 기능 8절, TS, 선형 History |
| 팀 검토 피드백 | 피드백 01(블로그 97), 피드백 02(블로그 98), 피드백 06(블로그 102) 일부 | `H1~H12`, `S1~S4`, `R1~R2`, `U1~U2`, `HL1~HL2`, `TV1~TV4`, `value`/`checked` 프로퍼티 규칙 |

**설계 ADR(snake_case) ↔ TypeScript 코드(camelCase) 공식 심볼 대응표**:

| ADR 표기 (`ADR-0001~0008`) | TypeScript 공식 심볼 (모듈 경로) | 역할 |
| --- | --- | --- |
| `dom_to_vdom(node, 기록 여부)` | `domToVNode(node, opts?)` (`core/dom.ts`) | 실제 DOM → VNode 변환 (+`s2` 정제, 선택 `recordDom`) |
| `vdom_to_dom(node)` | `vnodeToDom(v)` (`core/dom.ts`) | VNode → 실제 DOM 생성 (`dom` 미기록) |
| `g1` (`코드 → dom_to_vdom`) | `htmlToVNode(code)` (`core/html.ts`) | `<template>` 파싱 → `domToVNode(root)` |
| `a3` (`Virtual DOM → 코드`) | `vnodeToHtml(v)` (`core/html.ts`) | 원래 `" "` 공백 자리만 줄바꿈+2칸 들여쓰기 직렬화 |
| `Diff(이전, 새)` | `diff(oldV, newV)` (`core/diff.ts`) | `{ changes, pairs }` 산출 순수 함수 |
| `Patch` / F1 / t3 | `applyPatch(result)` / `recordDom` / `recoverPatch` (`core/patch.ts`) | 실제 DOM 반영, `dom`·`events` 동기화, 실패 복구 |

---

## 2. Phase 1 아키텍처 및 자료구조

### 2.1 모듈 경계와 의존 방향 (`C-01`, `L1/L2` 아키텍처 규칙)

```text
pages/phase1/*  (UI 조립, 이벤트 연결, 미리보기, 트리 뷰어, History 제어)
      │
      ▼  (단방향 의존)
core/*          (순수 엔진: vnode, dom, html, diff, patch, history)
```

- **모듈 격리**: `core/`는 `pages/`를 절대 import하지 않는다.
- **실제 DOM 쓰기 단일 창구 (`L2`)**: 살아 있는 실제 영역(`#real-area` 내부)의 DOM을 수정하는 코드는 오직 `core/patch.ts` 한 곳에만 존재한다. (미리보기 `#preview`와 트리 뷰어, 컨트롤 바 UI 갱신은 실제 영역이 아니므로 `pages/phase1`이 담당한다.)
- **외부 프레임워크 0 (`C-01`, SRS `CON-01`)**: 엔진과 **검증 페이지 모두** Vanilla TypeScript + 브라우저 표준 DOM API만 사용한다. React·JSX는 검증 페이지에도 쓰지 않는다 (2.3).

### 2.2 Virtual DOM 자료구조 (`core/vnode.ts`, `ADR-0001`, `ADR-0004`, `ADR-0015`)

Virtual DOM 노드는 태그 노드(`VElement`)와 글자 노드(`VText`) 두 가지뿐이며, 반드시 **`node.type`으로만 구별**한다 (`"text" in node` 같은 키 존재 검사 금지).

```typescript
export type Attrs = Record<string, string>;
export type EventHandlers = Record<string, EventListener>;

export interface VElement {
  type: 'element';
  tag: string;             // 항상 소문자 (localName 기준, T11)
  attrs: Attrs;            // 없으면 {}. HTML `key` 및 `on*` 속성은 절대 넣지 않는다
  children: VNode[];       // 없으면 []
  key?: string;            // 짝짓기용 이름표. 없으면 키 자체가 없다 (in 연산자 기준 부재)
  dom?: Element;           // 현재 실제 영역에 그려진 트리에만 존재. Diff는 읽기 금지
  events?: EventHandlers;  // 동작 무리 (Phase 2 전용 선택 키, Phase 1에서는 미생성)
}

export interface VText {
  type: 'text';
  text: string;            // 공백 정리 규칙이 적용된 문자열
  dom?: Text;              // 실제 텍스트 노드 참조
}

export type VNode = VElement | VText;

export function h(
  tag: string,
  attrs?: (Attrs & { key?: string }) | null,
  ...children: (VNode | string)[]
): VElement;

export function equalScreen(a: VNode, b: VNode): boolean; // 화면 데이터 5키 기준 비교 (FR-01, T10)
export function equalTree(a: VNode, b: VNode): boolean;   // 화면 데이터 5키 + key 기준 비교 (왕복 테스트)
```

#### 키의 네 무리와 비교 기준 (`ADR-0001` 개정)

| 무리 | 포함 키 | 역할 | `equalScreen` (FR-01) | `equalTree` (왕복 테스트) | `diff` (ADR-0004) |
| --- | --- | --- | --- | --- | --- |
| **1. 화면 데이터** | `type`, `tag`, `attrs`, `text`, `children` | 화면 모습을 결정 | ✅ 비교 | ✅ 비교 | ✅ 비교 |
| **2. 짝짓기 정보** | `key` | 자식 재정렬 시 동일성 판단 | ❌ 무시 | ✅ 비교 | ✅ 자식 짝짓기만 |
| **3. 참조** | `dom` | 실제 영역 DOM 노드 포인터 | ❌ 무시 | ❌ 무시 | ❌ **읽기 금지** |
| **4. 동작** | `events` | Phase 2 이벤트 핸들러 (선택) | ❌ 무시 | ❌ 무시 | ❌ **읽기 금지** |

#### `dom` 키 핵심 8대 규칙 (`ADR-0004` 4절)

1. 참조 키 이름은 `dom`이다.
2. `dom`은 **실제 영역**의 노드만 가리킨다 (테스트 영역 `#preview` 노드는 절대 넣지 않는다).
3. `domToVNode`는 첫 로드시 실제 영역을 읽을 때(`recordDom: true`)만 `dom`을 채운다. 기본값은 `false`이다.
4. `vnodeToDom`은 `dom`을 **읽지도 기록하지도 않는다**.
5. `diff`는 `dom`을 **읽지도 비교하지도 않는다**. 변경 목록의 대상은 이전 VNode 객체 참조다.
6. Patch가 끝나면: 유지/이동 노드는 `pairs`를 통해 `새.dom = 이전.dom`으로 복사하고, 추가/교체로 새로 만든 노드는 `recordDom`으로 새 VNode 트리에 채운다.
7. **`dom`은 지금 실제 영역에 그려진 트리(`current`)에서만 믿는다.** History에 저장된 다른 시점 트리의 화면 데이터 5키와 `key`는 불변이나, 그 트리 내부의 `.dom`은 해당 시점이 다시 현재 트리가 되어 Patch로 덮어써질 때 비로소 유효해진다.
8. `equalScreen` 및 `equalTree`는 `.dom`을 비교하지 않는다.

### 2.3 파일 구조와 기술 스택 (`CON-01`, `CON-02`, `ADR-0007`)

Phase 1 검증 페이지도 엔진과 같은 규칙을 따른다. **React·ReactDOM·Preact·Vue·Svelte와 JSX를 어디에도 쓰지 않는다.** 화면 골격은 `index.html`에 직접 적고, 동작은 TypeScript 모듈이 표준 DOM API로 연결한다.

```text
index.html                    # Vite 진입점: Phase 1 / Phase 2 페이지 링크만 둔다
src/
  core/      vnode.ts dom.ts html.ts diff.ts patch.ts history.ts
  component/ (Phase 2, SDD_final_phase2.md)
  pages/
    phase1/  index.html  init.ts  main.ts  preview.ts  format.ts  tree-view.ts  style.css
    phase2/  (SDD_final_phase2.md 3장)
tests/
  unit/  integration/  property/  helpers/
scripts/
  check_docs.py  check_vt_tests.py  check_stack.py
```

| 규칙 | 내용 | 검사 |
| --- | --- | --- |
| 프레임워크 0 | `package.json`의 `dependencies`·`devDependencies`에 `react`, `react-dom`, `preact`, `vue`, `svelte`, `@vitejs/plugin-react` 등이 없다 | `check:stack` (VT-23) |
| JSX 0 | `src/`·`tests/`에 `.tsx`·`.jsx` 파일이 없고, `tsconfig.json`에 `jsx` 옵션을 두지 않는다 | `check:stack` (VT-23) |
| 언어 | TypeScript `strict: true`, `src/` 아래 `.js` 소스 없음 | `typecheck`, `check:stack` |
| 개발 도구 | Vite(빌드·개발 서버), Vitest + jsdom(테스트), fast-check(불변식)만 쓴다. 이들은 화면을 만들지 않으므로 CON-01과 충돌하지 않는다 | — |
| 스타일 | 일반 CSS 파일 하나(`pages/phase1/style.css`). CSS 프레임워크는 필요하지 않다 | — |

---

## 3. 변환 모듈 설계 (`core/dom.ts`, `core/html.ts`)

| 함수 | 입력 → 출력 | 주요 책임 |
| --- | --- | --- |
| `domToVNode(node, opts?)` | `Element \| Text`, `{ recordDom?: boolean }` → `VNode` | DOM 트리를 VNode 트리로 변환 (`s2` 정제, 공백 정리, `key` 분리) |
| `vnodeToDom(v)` | `VNode` → `Node` | VNode 트리를 화면 밖 실제 DOM 노드로 재귀 생성 (`appendChild`로 조립 후 1회 반환) |
| `htmlToVNode(code)` | `string` → `VNode \| null` | `<template>`에 HTML 문자열 삽입 → 첫 자식 요소에 `domToVNode` 적용 (`recordDom: false`) |
| `vnodeToHtml(v)` | `VNode` → `string` | VNode를 2칸 들여쓰기 + 원래 공백 노드 위치 기반 HTML 문자열로 직렬화 (`a3`) |

### 3.1 `domToVNode` 상세 규칙 (`ADR-0002` + 4절 `s2`)

1. **노드 필터링**: 부모가 `childNodes`를 순회할 때 `nodeType === 1`(태그) 또는 `nodeType === 3`(글자)만 재귀 변환한다. **주석(`nodeType === 8`)과 `<script>` 요소는 건너뛴다** (`T7`, `S1`).
2. **유효성 방어**: `nodeType`이 `1` 또는 `3`이 아닌 값이 직접 들어오거나 `null`이 들어오면 `TypeError`를 던진다.
3. **소문자 태그명**: `node.tagName`이 아니라 **`node.localName`**을 읽어 소문자로 통일한다 (`T11`). (SVG 대소문자 태그는 범위 밖).
4. **`key` 분리**: 속성에 `key`가 있으면 `attrs`에 넣지 않고 `VElement.key`에 문자열로 저장한다 (`T15`). 없으면 `key` 프로퍼티 자체를 생략한다.
5. **실행되는 내용 건너뛰기 (`ADR-0002` 4절 `s2`, 구 `ADR-0014` 대체)**:
   - `<script>` 요소: 부모의 자식 순회 단계에서 주석처럼 완전히 건너뛴다 (`S1`).
   - `on`으로 시작하는 모든 속성(`onclick`, `onerror` 등, 대소문자 무시 `name.toLowerCase().startsWith('on')`): `attrs`에 넣지 않고 건너뛴다 (`S2`).
   - 값이 `javascript:`로 시작하는 `href`·`src` 속성(앞뒤 공백 제거 후 소문자 기준 `trim().toLowerCase().startsWith('javascript:')`): `attrs`에 넣지 않고 건너뛴다 (`S3`).
   - *일관성 이유*: 실제 영역 초기 변환과 코드 입력칸 변환이 모두 `domToVNode`를 거치므로, 양쪽이 똑같이 정제되어 불필요한 가짜 Diff가 발생하지 않는다 (`S4`).
6. **공백 정리 규칙 (선택지 4)**:
   - `<pre>` 및 그 모든 자손 내부의 글자 노드는 공백·탭·줄바꿈을 원본 그대로 보존한다 (`T4`, `T5`).
   - 그 외의 모든 글자 노드는 5종 공백(` `, `\t`, `\n`, `\r`, `\f`)이 연속된 구간을 **단일 공백 `" "`**으로 치환한다 (`text.replace(/[ \t\n\r\f]+/g, ' ')`) (`T1~T3`, `T12`).
   - 주의: JavaScript `\s`는 `&nbsp;`(U+00A0)까지 일치시키므로 **절대 `/\s+/g`를 쓰지 않고 명시적 5종 문자 클래스를 사용**한다 (`T8`).
7. **`recordDom` 옵션**: `opts?.recordDom === true`일 때만 변환된 모든 `VElement`/`VText`에 `v.dom = node`를 기록한다 (`T13`, `T14`).

### 3.2 `vnodeToDom` 규칙 (`ADR-0003`)

- `"text"` 노드 → `document.createTextNode(v.text)` 반환.
- `"element"` 노드 → `document.createElement(v.tag)` 생성 → `attrs` 순회하며 `el.setAttribute(k, val)` → `v.key !== undefined`면 `el.setAttribute('key', v.key)` → `children` 재귀 결과를 `el.appendChild` → 완성된 `el` 반환.
- **화면 부착 1회 보장**: `vnodeToDom` 자체는 화면(라이브 DOM)에 절대 붙이지 않으며, 호출자(`preview` 또는 `mount`)가 완성된 트리를 단 한 번만 화면에 부착한다.
- **`dom` 불변**: `vnodeToDom`은 `v.dom`을 읽지도 덮어쓰지도 않는다.

### 3.3 `htmlToVNode` (`g1`) 및 `vnodeToHtml` (`a3`) 규칙 (`ADR-0006` 2·3·5절)

- **`htmlToVNode(code)` (`g1`)**:
  - `document.createElement('template')`의 `innerHTML`에 `code`를 넣어 브라우저 표준 파서로 읽게 한다 (`c1` 잘못된 HTML 자동 교정 허용, 중복 `id` 격리, 비렌더링 파싱).
  - `template.content.firstElementChild`가 없으면 `null`을 반환한다 (`빈 입력 처리`).
  - 첫 자식 요소에 `domToVNode(el, { recordDom: false })`를 적용해 반환한다.
- **`vnodeToHtml(v)` (`a3`)**:
  - **공백 역변환 규칙**: `text === " "`인 글자 노드가 **원래 있던 위치에만** 줄바꿈 + 현재 깊이 들여쓰기(`2칸 × depth`)를 출력한다. 원래 공백 노드가 없던 인접 태그 사이는 붙여 쓴다. 이로써 `vnodeToHtml` → `htmlToVNode` 왕복 시 가짜 공백 노드가 새로 생기지 않아 **무수정 Patch 변경 0개(`TA1`, `TA2`)**를 보장한다.
  - **`<pre>` 예외**: `<pre>` 및 그 자손 안에서는 들여쓰기를 삽입하지 않고 원문 텍스트를 그대로 직렬화한다 (`TA3`).
  - **HTML 이스케이프**: 글자의 `&` → `&amp;`, `<` → `&lt;` (및 `>` → `&gt;`), 속성값의 `&` → `&amp;`, `"` → `&quot;` 치환 (`TA5`).
  - **`key` 속성 출력**: `v.key !== undefined`면 `key="..."` 속성을 함께 출력한다 (`TA4`).
  - **void 태그(빈 요소)**: `area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr` 등 닫는 태그가 없는 태그는 닫는 태그(`</br>`, `</input>` 등)를 붙이지 않는다 (`TA6`).

---

## 4. Diff 모듈 설계 (`core/diff.ts`, `ADR-0004`, `ADR-0005`)

Diff는 **두 Virtual DOM 트리만 비교**하여 변경 명령 목록(`changes`)과 노드 계승 짝 목록(`pairs`)을 돌려주는 순수 함수다 (`D12`). 실제 DOM과 `dom`, `events` 키는 절대 읽지 않는다.

```typescript
export type Change =
  | { kind: 'add';     parent: VElement; node: VNode; before: VNode | null }
  | { kind: 'remove';  target: VNode }
  | { kind: 'replace'; target: VNode; node: VNode }
  | { kind: 'text';    target: VText; text: string }
  | { kind: 'attrs';   target: VElement; set: Attrs; remove: string[] }
  | { kind: 'move';    target: VNode; parent: VElement; before: VNode | null };

export type Pair = readonly [oldNode: VNode, newNode: VNode];

export interface DiffResult {
  changes: Change[]; // 바뀐 조작만 (NFR-01 조작 횟수 기준)
  pairs: Pair[];     // 실제 노드를 계속 재사용하는 (이전 VNode, 새 VNode) 쌍
}

export function diff(oldV: VNode, newV: VNode): DiffResult;
```

### 4.1 설계 원칙 (`ADR-0005` A1, B2, D1)

1. **이동 판단(`A1`)**: Diff가 이전 자식 VNode 배열 순서를 시뮬레이션하며 "제자리에 있는가"를 판단해 `move`를 직접 발행한다. Patch는 판단 없이 명령만 실행한다.
2. **위치 표현(`B2`)**: 실제 DOM에 남은 주석 노드 때문에 인덱스 번호가 어긋나는 문제를 피하기 위해, 추가/이동 위치는 인덱스가 아닌 **기준 이전 VNode(`before`, 없으면 `null` = 맨 뒤)**로 표현한다.
3. **짝 목록 분리(`D1`)**: `changes`에는 바뀐 것만 담아 `changes.length`가 NFR-01 조작 횟수가 되게 하고, `dom` 참조를 이어받아야 하는 노드 쌍(`변경 없음`, `text`, `attrs`, `move` — `replace` 제외)은 별도 `pairs`에 담는다.

### 4.2 단일 노드 비교 우선순위 (`ADR-0004` 1절)

짝이 맞은 `(oldNode, newNode)` 쌍에 대해 위에서부터 검사하여 처음 걸리는 규칙을 적용한다:
1. `oldNode.type !== newNode.type` → `replace` (`D5`), `pairs` 제외, 자식 비교 안 함
2. 둘 다 `element`이고 `oldNode.tag !== newNode.tag` → `replace` (`D4`), `pairs` 제외, 자식 비교 안 함
3. 둘 다 `text`:
   - `pairs.push([oldNode, newNode])`
   - `oldNode.text !== newNode.text` → `text` (`D2`)
4. 둘 다 `element`이고 `tag` 일치:
   - `pairs.push([oldNode, newNode])`
   - `attrs` 비교: 값이 다르거나 새로 추가된 키는 `set`에, 이전에는 있었으나 새 `attrs`에 없는 키는 `remove`에 모아 하나라도 있으면 `attrs` (`D3`)
   - 하위 `children`에 대해 자식 비교 재귀 수행 (`D14`)

### 4.3 자식 목록 짝짓기 및 순서 맞추기 (`ADR-0004` 2절, `ADR-0005` 5절 `C2`)

한 부모의 `(oldChildren, newChildren)` 비교는 다음 순서로 진행한다:

1. **중복 `key` 검사 (`D9`)**: `oldChildren` 또는 `newChildren` 안에 같은 `key` 문자열이 2번 이상 나타나면 `console.warn`을 출력하고 **해당 부모의 자식 전체를 인덱스 자리 비교로 fallback**한다.
2. **1차 짝짓기 (`key` vs 비-`key`)**:
   - `key`가 있는 이전 자식들로 `keyMap: Map<string, VElement>` 생성.
   - `key`가 없는 이전 자식들을 등장 순서대로 배열 `unkeyedOld`로 분리.
   - 새 자식을 순회하며: `key`가 있으면 `keyMap`에서 같은 `key` 탐색, `key`가 없으면 `unkeyedOld`에서 순서대로 1:1 매칭 (`D10`, `D11`).
3. **`C2` 순서대로 `changes` 생성 (삭제 → 앞에서부터 자리 맞추기 → 자신 비교 → 자식 재귀)**:
   - ① **삭제(`remove`)**: 짝을 찾지 못한 모든 `oldChildren` 항목에 `{ kind: 'remove', target }` 발행.
   - ② **현재 남은 이전 자식 목록(`working`) 시뮬레이션**: 삭제된 노드를 제외한 현재 순서 리스트를 유지한다.
   - ③ **새 자식 목록(`newChildren`)을 0번 인덱스부터 앞에서 차례로 순회 (`i = 0 .. n-1`)**:
     - 현재 `working[i]`가 기준 노드(`cursor`)이다.
     - 짝 없는 새 자식이면 → `add(parent: oldParent, node: newChild, before: cursor ?? null)` 발행 후, `working`의 `i` 위치에 placeholder 삽입.
     - 짝 있는 새 자식(`pairedOld`)이면:
       - `working[i] !== pairedOld`이면 → `move(target: pairedOld, parent: oldParent, before: cursor ?? null)` 발행 후, `working`에서 `pairedOld`를 뽑아 `i` 위치로 이동. (이미 `working[i] === pairedOld`면 이동 불필요).
       - 이어서 `(pairedOld, newChild)`의 **자신 비교 및 자식 재귀** 실행 (4.2절).

> **왜 `[삭제 → 앞에서부터 자리 맞추기 → 자신 비교]` 순서인가? (`P6`)**
> `[A(p), B] → [B, A(h1)]`에서 만약 교체를 먼저 하면 옛 `<p>`가 DOM에서 떨어져 나가 이후 `B`를 옛 `<p>` 앞으로 옮기는 `insertBefore`가 `NotFoundError`로 실패한다. 삭제를 먼저 치우고 앞에서부터 자리를 맞추면 기준 노드(`before`)는 **항상 아직 교체되지 않고 DOM에 붙어 있는 이전 노드**이므로 절대 실패하지 않는다.

---

## 5. Patch 모듈 설계 (`core/patch.ts`, `ADR-0005`, 피드백 02 4-3절)

Patch는 Diff가 계산한 `{ changes, pairs }`를 실제 브라우저 DOM에 반영하고, 다음 Patch를 위해 새 VNode 트리에 `.dom` 참조를 채우는 **유일한 DOM 쓰기 모듈**이다.

```typescript
export interface PatchOptions {
  highlight?: boolean;
  highlightExcludeTags?: string[]; // Phase 1: [], Phase 2 Todo: ['input', 'textarea']
}

export function applyPatch(
  container: Element,
  nextTree: VNode,
  result: DiffResult,
  opts?: PatchOptions
): { applied: number; recovered: boolean };

export function recordDom(v: VNode, node: Node): void;

export function recoverPatch(
  container: Element,
  nextTree: VNode,
  error: unknown
): void;
```

### 5.1 `applyPatch` 실행 3단계 절차 (`ADR-0005` 2·2-1·5·6절)

기존 `SDD_fixed_phase1.md`에 있던 `0단계 사전 확인(PatchError / t2)`은 **폐기(`superseded`)**되었으며, 최종 확정은 **`t3` (`try ... catch` + 실패 시 `recoverPatch`)** 단일 흐름이다.

```text
try {
  [1단계: changes 순차 DOM 적용] → [2단계: pairs .dom 복사 (+events 동기화)] → [3단계: 새 노드 recordDom]
                                                                                     ↓
                                                                       [선택: highlightChanges (y2)]
} catch (error) {
  [t3 복구: recoverPatch(container, nextTree, error)]
  return { applied: 0, recovered: true }
}
```

1. **1단계: `changes` 순차 적용**:
   - `remove`: `target.dom!.remove()`
   - `add`: `const el = vnodeToDom(node); parent.dom!.insertBefore(el, before?.dom ?? null);` (새로 만든 루트 `el`을 이후 3단계 `recordDom(node, el)` 대상으로 기록)
   - `replace`: `const el = vnodeToDom(node); target.dom!.replaceWith(el);` (마찬가지로 `(node, el)`을 3단계 대상으로 기록)
   - `text`: `(target.dom as Text).nodeValue = text` (DOM 노드 유지, `FR-05`)
   - `attrs`:
     - `set` 항목마다 `el.setAttribute(k, v)` 적용. **`value`·`checked` 동기화 (피드백 06 4-2절 → ADR-0004 1절에 추가 예정, `TD3~TD5`)**: `k === 'value'`이면 `el.value !== v`일 때만 `el.value = v`; `k === 'checked'`이면 `el.checked !== true`일 때만 `el.checked = true`.
     - `remove` 항목마다 `el.removeAttribute(k)` 적용. **`k === 'checked'`**이면 `el.checked !== false`일 때만 `el.checked = false`; **`k === 'value'`**이면 `el.value !== ''`일 때만 `el.value = ''`.
     - *커서 보존 원리*: 사용자가 이미 타이핑한 값과 새 속성 값이 같으면 프로퍼티를 다시 대입하지 않으므로 입력 커서가 끝으로 튀지 않는다.
   - `move`: `parent.dom!.insertBefore(target.dom!, before?.dom ?? null)` (노드 객체 유지 → 입력값/포커스/스크롤 보존, `FR-04`)
2. **2단계: 기존 노드 `.dom` 복사 (`D1`, `P7`)**:
   - `pairs`의 모든 `[oldNode, newNode]`에 대해 `newNode.dom = oldNode.dom`을 복사한다.
   - (`newNode`가 `VElement`이면 Phase 2 호환을 위해 `syncEvents(el, newNode.events)`도 함께 수행 — Phase 1에서는 `events`가 없으므로 아무 동작 안 함).
3. **3단계: 새로 만든 노드의 `.dom` 재귀 기록 (`F1`, `ADR-0005` 2-1절)**:
   - 1단계의 `add`·`replace`로 새로 생성된 `(newVNode, createdDom)`마다 `recordDom(newVNode, createdDom)`을 실행한다.
   - `recordDom(v, node)`: `v.dom = node` 기록 후(Phase 2용 `events`가 있으면 고정 리스너 부착), `v.type === 'element'`이면 `v.children[i]`와 `node.childNodes[i]`를 인덱스 순서대로 재귀 방문한다 (`vnodeToDom`이 만든 서브트리에는 주석 노드가 없으므로 인덱스가 100% 일치한다).

### 5.2 Patch 실패 복구 프로토콜 (`t3`, `ADR-0005` 6절, `R1`, `R2`)

1. `applyPatch` 실행 중 예외(`dom` 누락, `NotFoundError` 등)가 발생하면 즉시 DOM 적용을 중단하고 `recoverPatch(container, nextTree, err)`를 실행한다.
2. **컨테이너 기반 재구축**: `const newRoot = vnodeToDom(nextTree);`를 만들고, `container.firstElementChild ? container.firstElementChild.replaceWith(newRoot) : container.appendChild(newRoot)`로 컨테이너 내용을 통째 교체한다. (Phase 1은 `#real-area` 전달, Phase 2는 `FunctionComponent`의 `container` 전달).
3. **`.dom` 완전 재기록**: `recordDom(nextTree, newRoot)`로 새 트리 전체에 실제 DOM 참조를 채운다.
4. **호출자 동기화**:
   - Phase 1 페이지: `nextTree`를 현재 트리로 삼고 **History에 새 슬롯으로 저장**하며 (`recovered: true`), `#status`에 **`"오류가 나서 실제 영역을 다시 그렸습니다"`**를 표시하고 `console.error(err)`를 출력한다.
   - Phase 2 컴포넌트: `this.vnode = nextTree`로 삼고 `console.error(err)`를 출력한다 (History 미사용).
5. **테스트 투명성**: 복구가 발생한 그 1회만 새 DOM을 만드므로 `P1·P2·P5·P11·P12` 같은 요소 동일성 테스트가 버그를 감추지 않고 정확히 잡아내며, 다음 Patch부터는 정상 동작한다 (`R1`, `R2`).

### 5.3 공통 Patch 하이라이트 (`y2`, 피드백 02 4-3절 & 06 4-3절 → ADR-0006 8절에 추가 예정)

- **적용 대상**: `changes`에서 `add`(`node.dom`), `replace`(`node.dom`), `text`(`target.dom.parentElement`), `attrs`·`move`(`target.dom`) 요소를 찾는다.
  - 글자 노드는 직접 스타일/애니메이션을 줄 수 없으므로 **부모 요소(`parentElement`)**를 강조한다 (`HL1`).
  - `remove`는 이미 화면에서 제거되었으므로 강조하지 않는다 (로그에만 남음).
- **제외 태그 필터(`highlightExcludeTags`)**: 대상 요소의 `localName`이 제외 목록(Phase 1은 `[]`, Phase 2 Todo는 `['input', 'textarea']`)에 속하면 건너뛴다.
- **0.6초 애니메이션 방식**: 요소의 `class`나 `style` 속성을 수정하지 않는 **Web Animations API (`element.animate(...)`, duration `600ms`)**를 사용한다. `typeof el.animate !== 'function'`인 환경(jsdom 등)에서는 건너뛴다 (11장 2번).
  - *이유*: 속성을 바꾸면 `MutationObserver`가 추가 DOM 조작으로 기록해 `NFR-01`/`P3` 테스트(`HL2`)가 오염되기 때문이다.

---

## 6. History 모듈 설계 (`core/history.ts`, `ADR-0008`, 피드백 01)

`SDD_fixed_phase1.md`에 남아 있던 `goTo(index)`와 `limit = 100`은 요구사항 밖이므로 제거되었고, `archive[]` 역시 `ADR-0008` More Information의 미래 확장 후보로만 남기고 구현 범위에서는 제외한다.

```typescript
export class History<T> {
  private entries: T[];
  private cursor: number; // 0-based

  constructor(initial: T) {
    this.entries = [initial];
    this.cursor = 0;
  }

  get current(): T { return this.entries[this.cursor]; }
  get index(): number { return this.cursor; }
  get size(): number { return this.entries.length; }

  push(state: T): void {
    // j1: 현재 위치 뒤의 미래 기록을 자르고 새 상태 추가
    this.entries = this.entries.slice(0, this.cursor + 1);
    this.entries.push(state);
    this.cursor = this.entries.length - 1;
  }

  undo(): T | null {
    if (!this.canUndo()) return null;
    this.cursor -= 1;
    return this.current;
  }

  redo(): T | null {
    if (!this.canRedo()) return null;
    this.cursor += 1;
    return this.current;
  }

  canUndo(): boolean { return this.cursor > 0; }
  canRedo(): boolean { return this.cursor < this.entries.length - 1; }
}
```

### 확정 운영 규칙 (`ADR-0008` `j1 · k1 · m3 · n2`)

1. **0번 기록**: 첫 로드 시 실제 영역을 `domToVNode(realRoot, { recordDom: true })`로 변환한 결과를 0번 슬롯으로 둔다 (`H1`).
2. **분기 시 뒤 기록 삭제(`j1`)**: `undo()`로 뒤로 간 뒤 새로 Patch하면 현재 위치 뒤의 기록을 잘라 버리고 새 상태를 추가한다 (`H5`).
3. **변경 없는 Patch 무시(`k1`)**: `diff(history.current, draft).changes.length === 0`이면 DOM 조작·`history.push`·미래 기록 삭제를 모두 하지 않고, `#status`에 **`"변경 사항 없음"`**을 표시한다 (`H6`, `H7`).
4. **불변성과 `.dom` 갱신**: History에 저장된 VNode의 화면 데이터 5키와 `key`는 수정하지 않는다. Undo/Redo로 과거 시점 `target`이 선택되면 `diff(prevCurrent, target)` → `applyPatch(#real-area, target, result)`를 실행해 화면을 최소 변경으로 전환함과 동시에 `target`의 `.dom`이 지금 실제 영역을 가리키도록 갱신한다 (`H3`, `H4`, `H11`).

---

## 7. Phase 1 검증 페이지 설계 (`pages/phase1`, `ADR-0006`, `ADR-0008`)

### 7.1 고정 영역 ID와 HTML 골격

```html
<!-- 실제 영역 틀 (고정, 내부 루트만 Patch로 변경/교체) -->
<section id="real-area">
  <div id="app"><!-- 샘플 HTML 5대 필수 요건 --></div>
</section>

<!-- 테스트 영역 (원본 코드 입력칸 + VDOM 경유 미리보기) -->
<section id="test-area">
  <textarea id="editor" spellcheck="false"></textarea>
  <section id="preview"></section>
</section>

<!-- 컨트롤 바 및 상태 안내 -->
<div class="controls">
  <button id="patch">Patch</button>
  <button id="undo">뒤로가기</button>
  <button id="redo">앞으로가기</button>
  <span id="history-pos">기록 1 / 1</span>
  <p id="status"></p>
</div>

<!-- Patch 한 줄 요약 로그 및 트리 비교 뷰어 -->
<pre id="change-log"></pre>
<section id="tree-viewer">
  <div id="tree-legend"></div>
  <div id="tree-old"></div>
  <div id="tree-new"></div>
</section>
```

- **틀 기반 탐색 (`CON-07`, `i1`)**: 실제 영역과 미리보기는 샘플 내부 `id`(`#app` 등)로 찾지 않고 반드시 `document.getElementById('real-area')!.firstElementChild`와 `#preview` 틀로 찾는다 (`TA10`, `TA11`).

### 7.2 샘플 HTML 5대 필수 요건 (`피드백 02` 4-2절)

```html
<div id="app">
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
</div>
```

### 7.3 확정 동작 흐름 (`ADR-0006` 1절 · `ADR-0008` 2절)

| 시점 | 실행 순서 (누락 금지) |
| --- | --- |
| **첫 로드 (`init`)** | `#real-area` 첫 자식 → `domToVNode(..., { recordDom: true })` → `History(initial)` 0번 저장 → `vnodeToHtml(initial)`로 `#editor` 채움 (`a3`) → **`renderPreview(htmlToVNode(#editor.value))`**로 `#preview` 그림 (`g1`: 코드를 다시 읽어 그린다, ADR-0006 1절·ADR-0008 2절) → 버튼·표시(`1 / 1`) 갱신 |
| **코드 입력 (`input` 이벤트)** | **즉시 `pending = true` 설정 후 `#undo`/`#redo` 비활성화(`n2` 0.3초 틈 차단)** → 0.3초 타이머(`e3`) 리셋 → 0.3초 멈춤 후 `draft = htmlToVNode(#editor.value)` → `renderPreview(draft)` → `dirty = draft ? diff(history.current, draft).changes.length > 0 : true` 판정 → `pending = false` → 버튼 상태 갱신 |
| **Patch 클릭** | 타이머 대기 중이면 즉시 취소 후 `draft = htmlToVNode(#editor.value)` → null이면 `#status = "루트 요소가 필요합니다"` 후 종료 → `renderPreview(draft)` 즉시 갱신 → `result = diff(history.current, draft)` → `changes.length === 0`이면 `#status = "변경 사항 없음"` 및 `dirty=false, pending=false` 갱신 후 종료(`k1`) → `applyPatch(#real-area, draft, result, { highlight: true, highlightExcludeTags: [] })` → `history.push(draft)` (`recovered: true`여도 푸시) → `formatChange` 로그·트리 뷰어 갱신 → 버튼 및 `index+1 / size` 갱신 |
| **Undo / Redo 클릭** | `const prev = history.current`; `const target = history.undo() / redo()` → null이면 종료 → `result = diff(prev, target)` → `applyPatch(#real-area, target, result, { highlight: true })` → `#editor.value = vnodeToHtml(target)` (`a3`) → **`renderPreview(htmlToVNode(#editor.value))` (`g1`)** *(코드를 다시 읽어 그린다. 프로그래밍 값 대입은 input 이벤트를 안 일으키므로 명시 호출 필수)* → `dirty=false, pending=false` → 로그·트리 뷰어·버튼·위치 갱신 |

#### 버튼 비활성화 & 0.3초 틈 막기 (`m3`, `n2`, `H8~H10`, `H12`)

- `#undo.disabled = !history.canUndo() || dirty || pending`
- `#redo.disabled = !history.canRedo() || dirty || pending`
- `dirty`로 인해 버튼이 꺼지면 `#status`에 **`"Patch하거나 수정을 되돌리면 이동할 수 있습니다"`**를 표시한다 (`m3`).
- 들여쓰기만 바꾸면 `0.3초` 타이핑 직후 잠시(`pending`) 꺼졌다가 `0.3초` 뒤 `diff(current, draft).changes.length === 0` 판정으로 다시 켜진다 (`H10`, `H12`).

### 7.4 시연 기능 3종 (피드백 02 4절 → ADR-0006 8절에 추가 예정 · `U1~U2`, `HL1~HL2`, `TV1~TV4`)

1. **`formatChange(change)` 한 줄 요약 로그 (`U1`)**:
   - `Change` 안의 `target`/`parent`는 VNode 트리를 물고 있으므로 `JSON.stringify`를 쓰지 않고 `tag`, `key`, `text`만 뽑아 요약한다.
   - `text`: ``글자 수정: <태그> "이전" → "새"``
   - `attrs`: ``속성 수정: <태그> class="red" 추가 / title 제거``
   - `add`: ``추가: <li key="a"> (<li key="b"> 앞)`` 또는 `(끝)`
   - `remove`: ``삭제: <li key="c">``
   - `replace`: ``교체: <p> → <h1>``
   - `move`: ``이동: <li key="b"> (<li key="a"> 앞으로)`` 또는 `(끝으로)`
2. **상태 문구 `#status` 3대 표준 문구 (`U2`)** (`alert()` 절대 금지):
   - 변경 없음: `"변경 사항 없음"`
   - 수정 중 이동 차단: `"Patch하거나 수정을 되돌리면 이동할 수 있습니다"`
   - Patch 오류 복구: `"오류가 나서 실제 영역을 다시 그렸습니다"`
3. **트리 비교 뷰어 (`v2` 나란히 + `w1` 들여쓰기 글자 목록, `TV1~TV4`)**:
   - 왼쪽(`[이전 트리]`)과 오른쪽(`[새 트리]`)을 들여쓰기 텍스트 목록으로 나란히 출력하고 색 범례를 둔다.
   - 각 줄에는 `tag`, `key`, `attrs`, 글자의 `text`만 표시하고 **`dom`은 절대 출력하지 않는다** (`TV4`).
   - 색칠 규칙 (`pairs`로 짝 노드 추적):
     - `remove`: 왼쪽 대상 색칠(빨강) / 오른쪽 없음 (`TV2`)
     - `add`: 왼쪽 없음 / 오른쪽 새 노드 색칠(초록) (`TV3`)
     - `replace`: 왼쪽 옛 노드 + 오른쪽 새 노드 색칠(주황)
     - `text` / `attrs`: 왼쪽 대상 + 오른쪽 짝(`pairs`) 색칠(노랑) (`TV1`)
     - `move`: 왼쪽 대상 + 오른쪽 짝(`pairs`) 색칠(파랑)

---

## 8. 예외 처리 및 경계 조건 (Phase 1)

| 상황 | 모듈 | 정의된 시스템 동작 | 관련 테스트 |
| --- | --- | --- | --- |
| 자식/속성 없는 태그 | `dom` | `children: []`, `attrs: {}` 정규화 | `T6` |
| 주석 및 `<script>` | `dom` | 부모 순회 시 건너뜀 (`VNode` 미포함) | `T7`, `S1` |
| `on*` 및 `javascript:` `href`·`src` | `dom` | `attrs`에 넣지 않고 정제(`s2`) | `S2`, `S3`, `S4` |
| 코드 입력칸이 비거나 태그 없음 | `html` / `page` | `htmlToVNode` `null` 반환, `"루트 요소가 필요합니다"` 안내 후 중단 | `VT-21` |
| 잘못된 HTML (`<p>안녕<div>...`) | `html` | `<template>` 브라우저 교정 결과를 그대로 사용(`c1`) | `TA7` |
| 중복 `key` 존재 | `diff` | `console.warn` 후 해당 부모의 자식만 인덱스 비교 | `D9` |
| 변경 0건 Patch | `diff` / `page` | DOM 조작 0건, History 미추가(`k1`), `"변경 사항 없음"` | `TA1`, `H6`, `H7` |
| `dirty`/`pending` 중 이동 | `page` | Undo/Redo 버튼 비활성화(`m3`, `n2`) 및 안내 문구 | `H8`, `H9`, `H10`, `H12` |
| 루트 태그 교체 (`div` → `section`) | `patch` / `page` | `replaceWith` 적용 + `recordDom` + `#real-area.firstElementChild` 재탐색 | `TA10` |
| `applyPatch` 도중 예외 / `dom` 누락 | `patch` | **`t3` `recoverPatch` 실행**: 컨테이너 통째 재구축 + `recordDom` + History 동기화 + `console.error` + 상태 문구 | `R1`, `R2` |

---

## 9. Phase 1 전체 검증 목록 및 추적성 매트릭스

### 9.1 ADR · 피드백 채택 테스트 총괄 (`80개 + L4 속성 테스트`)

| 모듈 (테스트 파일) | 채택 테스트 ID | 핵심 검증 내용 |
| --- | --- | --- |
| `dom.test.ts` | **`T1~T15`**, **`S1~S4`** | 공백 5종 단일 치환, `<pre>`·`&nbsp;` 보존, `localName` 소문자, `key` 분리, `recordDom` 모드 분기, `<script>`·`on*`·`javascript:` 정제(`s2`) |
| `html.test.ts` / `vdomToDom` | **왕복 + `TA1~TA6`** | `domToVNode(vnodeToDom(v))` == `equalTree`, `MutationObserver` 1회 부착, `a3` 공백 가역성·이스케이프·void 태그 |
| `diff.test.ts` | **`D1~D15`** | 6종 `Change`, `pairs`, 맨 앞 추가(`D6`), 이동(`D7~D8`), 중복 key(`D9`), 빈 부모(`D13`), 100겹 중첩(`D14`), 복합 변경(`D15`), **`dom` 없는 순수 dict 비교(`D12`)** |
| `patch.test.ts` | **`P1~P12`**, **`R1~R2`** | 동일 DOM 객체 유지(`P1`, `P2`), 100개 중 1개 상수 조작(`P3`), 주석 공존(`P4`), `[A(p), B]→[B, A(h1)]`(`P6`), `dom` 이어받기(`P7~P8`), **`dom` 고의 삭제 후 `t3` 복구 및 후속 정상 패치(`R1`, `R2`)** |
| `history.test.ts` & `phase1.test.ts` | **`H1~H12`**, **`TA7~TA12`**, **`U1~U2`**, **`HL1~HL2`**, **`TV1~TV4`** | 0번 기록(`H1`), 선형 분기 삭제(`H5`), `k1` 무변경(`H6~H7`), `m3`·`n2` 0.3초 틈 차단(`H8~H12`), 한 줄 로그(`U1`), 상태 문구(`U2`), `animate()` 무오염 강조(`HL1~HL2`), 나란히 트리 뷰어(`TV1~TV4`) |

### 9.2 `issue.md` 요구사항 ↔ Phase 1 설계/테스트 추적표

| `issue.md` ID | 설계 반영 절 | 검증 테스트 |
| --- | --- | --- |
| `FR-01` 화면 동일성 | 2.2 (`equalScreen`), 3.1, 3.2, 7.3 | `T10`, `P9`, `H3`, `H4` |
| `FR-02` 테스트 영역 자유 수정 (+정제) | 3.1 (`s2`), 3.3 (`htmlToVNode`), 7.1 | `S1~S4`, `TA7` |
| `FR-03` Patch 일치 | 4장, 5.1, 7.3 | `P9`, `TA9`, `TA10` |
| `FR-04` 비변경 유지 (입력값·커서·스크롤) | 4.3 (`key` 짝짓기), 5.1 (`value`/`checked`), 7.2, 7.3 | `P1`, `P2`, `H3`, `TD4` |
| `FR-05` 글자/속성 노드 재사용 | 4.2, 5.1 (`nodeValue`/`setAttribute`) | `P1`, `P4`, `P5` |
| `FR-06` 태그 변경 시 교체 | 4.2, 5.1 (`replaceWith`) | `D4`, `D5`, `P6`, `TA10` |
| `FR-07` State History 저장 (k1 예외 포함) | 6장 (`History<T>`) | `H1`, `H2`, `H5`, `H6`, `H7` |
| `FR-08` 뒤로/앞으로가기 (세 곳 동기화) | 6장, 7.3 (`#editor` + `renderPreview` + `applyPatch`) | `H3`, `H4`, `H8~H12` |
| `NFR-01` 조작 횟수 ∝ 변경 수 | 4.1 (`changes` = 바뀐 것만), 5.3 (`animate()`) | `D6`, `P3`, `HL2` |
| `NFR-02` / `NFR-03` 품질 및 엣지 케이스 | 8장, 9.1 | `D13~D15`, `P10~P12`, `R1~R2` |
| `C-01~C-04` 기술·구성 제약 | 2.1, 2.3, 3장, 4장, 5장, 7.1 | `check:stack` + 코드 검토 + 통합 테스트 |

### 9.3 SRS v1.4 요구사항 ↔ 설계 ↔ 검증 추적표 (공통 + Phase 1)

`docs/requirements/issue.md` ID와 SRS ID의 대응은 SRS 5.1.4에 있다. 이 표는 **SRS ID를 하나씩** 적는다. 범위 표기("FR-01~FR-09")로 적으면 하네스(`check:docs`)가 빠진 ID를 찾지 못한다. Phase 2 항목(FR-10~FR-23, IR-07, IR-08, CON-06, VT-10~VT-19, TBD-05)은 `SDD_final_phase2.md` 6장에 있다.

| SRS ID | 설계 요소 | 절 | ADR·피드백 테스트 | VT |
| --- | --- | --- | --- | --- |
| FR-01 | `domToVNode`(recordDom), `vnodeToDom`, `equalScreen`, 첫 로드 흐름 | 2.2, 3.1, 3.2, 7.3 | T10, P9, H1, H3, H4 | VT-01, VT-02, VT-33, VT-37, VT-38 |
| FR-02 | `#editor`, `htmlToVNode`, 0.3초 미리보기, s2 정제 | 3.1, 3.3, 7.3 | S1, S2, S3, S4, TA7, TA8 | VT-02, VT-34, VT-40, VT-42 |
| FR-03 | Patch 흐름, `diff` + `applyPatch` | 4장, 5.1, 7.3 | P9, TA1, TA9, TA10 | VT-03, VT-06, VT-39, VT-41 |
| FR-04 | `diff` 짝짓기·`pairs`, `applyPatch`(`move`, `value`·`checked` 규칙) | 4.3, 5.1, 7.2 | P1, P2, P4, P5, H3 | VT-04, VT-06, VT-20, VT-36, VT-43 |
| FR-05 | `diff`의 `text`·`attrs` 변경, `applyPatch` | 4.2, 5.1 | D2, D3, P1 | VT-04, VT-27 |
| FR-06 | `diff`의 `replace`, `applyPatch`(`replaceWith`), `recordDom` | 4.2, 5.1 | D4, D5, P6 | VT-05 |
| FR-07 | `History.push`, 0번 기록, k1 | 6장, 7.3 | H1, H2, H5, H6, H7 | VT-06, VT-07, VT-29, VT-45, VT-47 |
| FR-08 | `undo`·`redo` + `diff`·`applyPatch` + `vnodeToHtml`·`renderPreview`, m3·n2 | 6장, 7.3 | H3, H4, H8, H9, H10, H11, H12 | VT-08, VT-09, VT-30, VT-45, VT-48, VT-49 |
| FR-09 | `diff` 자식 짝짓기, 중복 key, `move` | 4.3 | D6, D7, D8, D9, D10, D11, P2 | VT-36 |
| NFR-01 | `diff`의 `changes` 개수 = 조작 횟수, `vnodeToDom` 부착 1회, `applyPatch`의 `animate()` 하이라이트 | 3.2, 4.1, 5.3 | D6, P3, HL2 | VT-20, VT-29, VT-39 |
| NFR-02 | 테스트 구조와 하네스. 잘못된 입력은 `domToVNode`(TypeError), `htmlToVNode`(루트 없으면 null), Patch 실패는 `recoverPatch`(t3)가 처리 | 8장, 9.4, 10장 | R1, TA15 | VT-21, VT-35 |
| NFR-03 | `diff`·`applyPatch`·`recoverPatch` (주석·중첩·동시 변경·순서+교체·실패 복구) | 4.3, 5.1, 5.2, 8장 | D13, D14, D15, P4, P6, P10, P11, P12, R1, R2 | VT-21, VT-25, VT-26, VT-27, VT-28, VT-29, VT-30, VT-31, VT-43, VT-44, VT-45, VT-46 |
| NFR-04 | 모듈 경계, Diff는 읽기·Patch는 쓰기 | 2.1, 10장 | D12 | VT-22 |
| IR-01 | `#editor`, 0.3초 갱신 (`htmlToVNode`, `renderPreview`) | 7.1, 7.3 | TA8, TA9 | VT-34, VT-40 |
| IR-02 | `#patch`, Patch 흐름 | 7.1, 7.3 | TA9 | VT-32 |
| IR-03 | `#undo`·`#redo`, 버튼 갱신 (`canUndo`, `canRedo`) | 7.1, 7.3 | H8, H9 | VT-08, VT-09, VT-30 |
| IR-04 | `domToVNode` | 3.1 | T1, T6, T7, T11, T15, S1, S2, S3 | VT-01, VT-02 |
| IR-05 | `diff` → `{ changes, pairs }` | 4장 | D1, D2, D12 | VT-03, VT-04, VT-05 |
| IR-06 | `applyPatch`·`recordDom`·`recoverPatch` | 5.1, 5.2 | P7, P8, R1, R2 | VT-06, VT-31, VT-45 |
| IR-09 | `vnodeToDom` | 3.2 | ADR-0003 Confirmation | VT-38 |
| IR-10 | `htmlToVNode`, `vnodeToHtml` | 3.3 | TA1, TA2, TA3, TA4, TA5, TA6 | VT-39, VT-42 |
| CON-01 | UI 프레임워크 0 (엔진·검증 페이지·의존 패키지) | 2.1, 2.3, 10장 | — | VT-23 |
| CON-02 | TypeScript strict | 2.3, 10장 | ADR-0007 Confirmation | VT-23 |
| CON-03 | 구현 범위 = 이 문서 + Phase 2 문서 | 1장 | — | — |
| CON-04 | 브라우저 표준 DOM API만 사용 | 2.1, 3장, 5장 | — | VT-24 |
| CON-05 | Vitest + jsdom | 10장 | ADR-0011 Confirmation | VT-35 |
| CON-07 | 틀로 루트 찾기, 샘플 `id` 미사용 (`init`, `renderPreview`) | 7.1 | TA10, TA11, TA12 | VT-41 |
| TBD-01 | 선형 기록 j1 | 6장 | H5 | VT-07 |
| TBD-02 | 코드 입력칸 + 미리보기 | 7장 | TA1~TA12 | VT-39 |
| TBD-03 | 변경 6종 | 4장 | D1~D15 | VT-03, VT-04, VT-05 |
| TBD-04 | key 짝짓기 | 4.3 | D6~D11 | VT-36 |
| TBD-06 | 커버리지 90% + VT 전체 통과 | 10장 | — | — |
| TBD-07 | t3 실패 복구 | 5.2 | R1, R2 | VT-31 |
| TBD-08 | s2 정제 | 3.1 | S1~S4 | VT-02, VT-21 |
| TBD-09 | 재귀 깊이: 1,000겹 (2026-11-11 팀 결정) | 4.2, 11장 | D14, P11 | VT-46 |
| TBD-10 | 설계 범위 밖 (ID 체계 정렬). 이 표는 SRS ID를 쓴다 | 9.3 | — | — |
| TBD-11 | (제안) `README.md` 산출물 — `SDD_final_common.md` 0장·부록 B가 내용 근거 | common | — | — |
| TBD-12 | (제안) 통째 교체 vs Patch 비교 화면 — `countMutations` 재사용 | common 5장 2번 | — | — |
| TBD-13 | (제안) key 있음·없음 비교 시연 | common 5장 5번 | D6, P2 | — |

### 9.4 VT별 테스트 위치 (Phase 1 + 공통)

테스트 이름에는 VT ID와 ADR·피드백 테스트 ID를 함께 붙인다. 예: `it('[VT-36][D6] 맨 앞 추가는 add 1개', …)`. 하네스 `check:vt`가 이 이름으로 VT별 자동 테스트 유무를 센다.

| 파일 | VT | ADR·피드백 테스트 |
| --- | --- | --- |
| `tests/unit/vnode.test.ts` | VT-22 (두 비교 함수 분리) | ADR-0001 Confirmation |
| `tests/unit/dom.test.ts` | VT-01, VT-02, VT-21, VT-25, VT-26, VT-37, VT-38 | T1~T15, S1~S4, ADR-0003 Confirmation |
| `tests/unit/html.test.ts` | VT-39, VT-42 | TA1~TA7 |
| `tests/unit/diff.test.ts` | VT-03, VT-04, VT-05, VT-27, VT-28, VT-36 | D1~D15 |
| `tests/unit/patch.test.ts` | VT-06, VT-20, VT-29, VT-31, VT-43, VT-44, VT-45, VT-46 | P1~P12, R1, R2, HL1, HL2 |
| `tests/unit/history.test.ts` | VT-07, VT-30 | H1, H2, H5 |
| `tests/integration/phase1.test.ts` | VT-08, VT-09, VT-40, VT-41, VT-47, VT-48, VT-49 | H3, H4, H6~H12, TA8~TA12, U1, U2, TV1~TV4 |
| `tests/property/*.prop.test.ts` | VT-03, VT-06, VT-28 (보강) | 10.3 불변식 |
| `scripts/check_stack.py` (`check:stack`) | VT-23 | ADR-0007 Confirmation |
| CI 로그 (`npm test`) | VT-35 | ADR-0011 Confirmation |
| 코드 검토 | VT-22 | ADR-0004·0005 코드 검토 항목 |
| `eslint` (`lint`, L2 규칙) + `dependency-cruiser` (`check:arch`) | VT-22 | 자동 검사: DOM 쓰기는 `core/patch.ts`만, Diff는 `dom`·`events`를 읽지 않음, 의존 방향·순환 0 (SDD_final_common 3.4) |
| 수동 체크리스트 (`docs/verification/checklist-phase1.md`) | VT-24, VT-32, VT-33, VT-34, FR-04 스크롤·커서 | — |

---

## 10. 설계 검증 하네스 (공통, `ADR-0011`, `ADR-0012`)

하네스는 "코드와 문서가 설계대로인가(준수)"를 기계로 판정한다. "설계가 옳은가(타당성)"는 ADR·팀 피드백(`docs/reviews/`)과 Hermes 설계 검토(`docs/VERIFICATION_GUIDE.md`)로 다룬다.

### 10.1 명령

| 명령 | 계층 | 검사 내용 | 실패 조건 |
| --- | --- | --- | --- |
| `npm run typecheck` | L1 타입 | `tsc --noEmit` (strict) | 타입 오류 |
| `npm run check:stack` | L2 아키텍처 | 2.3절 규칙: UI 프레임워크 의존·JSX 파일·`react` import 없음, `strict: true` | 하나라도 위반 |
| `npm run check:arch` | L2 아키텍처 | `core → pages/component` import 금지, 순환 금지, 실제 영역 DOM 쓰기는 `core/patch.ts`만, `diff.ts`의 `.dom`·`.events` 읽기 금지 | 규칙 위반 (dependency-cruiser + ESLint, Phase 1 구현 때 도입) |
| `npm test` | L3 동작 | 9.4 표의 테스트 | 실패 1개 이상 |
| `npm run check:docs` | L5 추적성 | SRS ↔ 이 문서 ↔ Phase 2 문서 ↔ ADR (10.2) | 하나라도 위반 |
| `npm run check:vt` | L5 추적성 | VT별 자동 테스트 유무 (보고). `--strict`면 Phase 1 VT 중 테스트 없는 것이 있을 때 실패 | `--strict`에서만 실패 |
| `npm run verify:docs` | — | `check:docs` | — |
| `npm run verify` | — | `typecheck` → `check:stack` → `check:docs` → `test` | 하나라도 실패 |

### 10.2 `check:docs`가 확인하는 것

1. SRS의 모든 `FR/NFR/IR/CON/VT/TBD` ID가 두 설계 문서의 추적표(이 문서 9.3·9.4, Phase 2 문서 6장)에 하나씩 적혀 있고, 설계 문서에만 있는 ID가 없다.
2. SRS 4장의 "요구사항 → VT" 연결이 설계 추적표에도 그대로 있다.
3. 모든 VT가 테스트 위치 표(9.4, Phase 2 문서 6.2)에 있다.
4. ADR Confirmation 표와 피드백 문서의 테스트 ID(T, S, D, P, R, TA, H, U, HL, TV, C, B, K, HR, TD)가 설계 문서에 모두 있다.
5. `docs/adr/README.md` 표의 상태와 각 ADR 파일의 `status`가 같고, superseded ADR(0013, 0014)을 SRS 요구사항·설계 본문이 근거로 인용하지 않는다.
6. 지운 설계의 용어(`PatchError`, `applyPatches`, `path: number[]`, `DOMParser`, `goTo(`, `unmount(`, `on?:` 등)가 설계 본문에 없다. 0장 변경 요약과 변경 이력은 검사하지 않는다.

### 10.3 L4 불변식 (fast-check, Phase 1 구현 완료 시)

| 불변식 | 근거 |
| --- | --- |
| `applyPatch(diff(a, b))` 후 `equalScreen(domToVNode(컨테이너 첫 자식), b)` | FR-03, P9 |
| `diff(a, a).changes` = `[]` | VT-28, D1 |
| `pairs`의 쌍은 Patch 전후 같은 실제 노드 | FR-04, P1 |
| Patch 후 새 트리의 모든 객체에 `dom`이 있다 | P7 |
| `diff` 결과는 `dom` 유무와 무관하다 | D12 |
| `equalTree(htmlToVNode(vnodeToHtml(v)), v)` (공백 규칙 적용된 `v`) | TA2 |
| `MutationObserver` 기록 수 = Σ(`move` 2건, `attrs` 바뀐 속성 수, 나머지 1건) — 하이라이트를 켜도 같다. NFR-01의 조작 횟수 자체는 `changes.length`로 센다 (jsdom 실측: `move` 1건 = 기록 2건) | NFR-01, HL2 |
| push n회 → undo n회 → 0번 기록, redo n회 → 마지막 기록 | ADR-0008 |

## 11. 설계 검토가 더 필요한 항목 (Hermes·팀 검토 대상)

아래는 이 문서를 하네스로 맞추는 과정에서 찾은 빈틈이다. 결정은 팀이 하고, 정해지면 ADR(또는 피드백 문서)에 적은 뒤 이 문서를 고친다.

| # | 항목 | 지금 설계 | 열린 질문 |
| --- | --- | --- | --- |
| 1 | 여러 최상위 요소 입력 | **해소** → 12장 ADR-0019 x2 | 첫 요소만 쓰고 "첫 번째 요소만 사용합니다" (TA15) |
| 2 | jsdom의 `element.animate` | **해소** | `typeof el.animate === 'function'`일 때만 호출. HL1·HL2는 테스트에서 `animate`를 가짜로 넣어 확인 |
| 3 | t3 복구 중 오류 | **해소** → 12장 ADR-0019 x3 | 오류를 밖으로 내지 않고 안내 후 버튼을 모두 끈다 (R5) |
| 4 | t3와 요소 동일성 | **해소** (2026-11-11 팀 결정) | 지금처럼 상태 문구 + `console.error`만. 복구는 엔진 버그 때만 타는 안전망이고, 실패 순간에는 `pairs`를 믿을 수 없어 입력값을 옮기는 규칙을 새로 만들어야 하므로 더하지 않는다 |
| 5 | 재귀 깊이 (TBD-09) | **해소** (2026-11-11 팀 결정) | T9·D14·P11을 1,000겹으로 올려 통과. jsdom 측정으로 1,500겹부터 호출 스택 초과. 반복문으로 바꾸지 않는다 |
| 7 | ADR에 아직 없는 결정 | **해소** (2026-11-11) | 최종 ADR-0004(1절 `value`·`checked`), ADR-0005, ADR-0006(8절 시연 기능) 파일로 교체 |
| 10 | 주석·`<script>` 양옆 글자 노드 (설계 검토 반례 1·2·3) | 건너뛴 노드 양옆 글자가 따로 남아 공식 샘플에서 FR-01·TA1이 깨진다 | **ADR-0016 (accepted, 12장 반영·구현) (해소)**: 나란히 남은 글자 노드 합치기(u1), 공백끼리만 합칠지. 테스트 `T16`, `T17`, `S5`, `TA13` |
| 11 | 뒤로·앞으로가기 중 복구 (반례 5) | **해소** (5.2를 12장이 대체) | **ADR-0017 (accepted, 12장 반영·구현) (해소)**: Patch 버튼일 때만 저장. 테스트 `R3`, `R4` |
| 12 | `<pre>` 첫 줄바꿈 (반례 4) | a3가 `<pre>` 안을 그대로 씀 | **ADR-0018 (accepted, 12장 반영·구현) (해소)**: 줄바꿈 하나 더 쓰기. 테스트 `TA14` |
| 13 | 빈 코드 Patch, 여러 최상위 요소, 복구 실패, 수정 취소 (반례 6, 이 표 1·3·8번) | 정의 없음 | **ADR-0019 (accepted, 12장 반영·구현) (해소)**: x1~x4. 테스트 `H13`, `H14`, `TA15`, `R5` |
| 8 | "수정 취소" 버튼 (SDD-3 7.3) | **해소** → 12장 ADR-0019 x4 | `#revert`가 코드 입력칸을 `vnodeToHtml(current)`로 되돌린다 |
| 9 | 성능 목표 (SDD-3 7.3) | **해소** (2026-11-11 팀 결정) | 시간 기준은 두지 않고 NFR-01(조작 횟수)만. 시간은 기계마다 달라 이유 없이 실패하는 테스트가 생기고, jsdom은 실제 브라우저 성능을 대표하지 못한다. Reflow/Repaint는 DOM 조작 횟수와 직결된다 |
| 6 | "재확인 필요" 절 | **해소** (2026-11-11 팀 승인) | ADR-0001 `events`, 0002 4절, 0004 1절, 0005 6절(3번은 ADR-0017로 좁힘), 0006 8절 모두 승인 |

## 12. ADR-0016~0019 반영 (v1.2, 설계 검토 반례에서 나온 결정)

이 장은 3.1, 3.3, 5.2, 7.1, 7.3, 7.4보다 우선한다. 각 규칙의 테스트는 괄호 안 ID이며 모두 구현·통과했다.

### 12.1 나란히 남은 공백 글자 노드 합치기 (ADR-0016 (가), 3.1 보완)

- `domToVNode`가 주석·`<script>` 등 건너뛴 노드 때문에 **공백만 있는 글자 노드가 나란히 둘 이상** 남으면 하나(`" "`)로 합친다 (T16).
- 기록함 모드에서 합친 노드의 `dom`은 **앞쪽(주석 앞) 실제 공백 노드**다 (T17). 뒤쪽 실제 공백 노드는 주석처럼 "추적하지 않는 노드"로 남는다.
- 공백이 아닌 글자끼리는 합치지 않는다. 그래서 `<div>a<script>x</script>b</div>`는 왕복 뒤 `"ab"` 하나가 된다 (S5, **알려진 한계**).
- 결과: 공식 샘플로 첫 로드 → 고친 것 없이 Patch → `changes` 0개, "변경 사항 없음" (TA13, H6).

### 12.2 `<pre>` 첫 줄바꿈 (ADR-0018, 3.3 a3 보완)

- `vnodeToHtml`은 `<pre>`의 첫 자식 글자가 `\n`으로 시작하면 여는 태그 뒤에 `\n`을 하나 더 쓴다. HTML 파서가 첫 줄바꿈 하나를 버리기 때문이다 (TA14).

### 12.3 이동 중 복구 (ADR-0017, 5.2 대체)

- Patch 버튼으로 복구했을 때만 History에 새 트리를 넣는다 (R1). 뒤로·앞으로가기 중 복구하면 History는 그대로이고 위치만 옮긴다 (R3, R4).

### 12.4 페이지 경계 동작 (ADR-0019, 7.3 보완)

| # | 상황 | 동작 | 테스트 |
| --- | --- | --- | --- |
| x1 | 빈 코드(루트 요소 없음)로 Patch | 실제 영역·History 그대로, "루트 요소가 필요합니다", 미리보기 비움, 이동 버튼 꺼짐 | H13 |
| x2 | 최상위 요소가 둘 이상 | 첫 요소만 쓰고 "첫 번째 요소만 사용합니다" | TA15 |
| x3 | 복구 자체가 실패 | 오류를 밖으로 내지 않고 `console.error`, "복구하지 못했습니다. 새로고침이 필요합니다", Patch·뒤로·앞으로 버튼을 모두 끈다 | R5 |
| x4 | 수정 취소 `#revert` | 코드 입력칸을 `vnodeToHtml(current)`로, 미리보기도 다시 그리고 이동 버튼을 켠다 | H14 |

### 12.5 key 유무 비교 시연 (TBD-13 채택, 7.4 추가, 차별화 5번)

- `#key-demo` 안에 `#kd-keyed`(key 있음)와 `#kd-unkeyed`(key 없음) 목록을 나란히 그린다. 둘 다 `[바나나, 딸기]`이고 각 줄에 입력칸이 있다.
- "맨 앞에 사과 추가"(`#kd-add`)는 두 목록에 같은 변경을 `diff` → `applyPatch`(하이라이트 켬)로 적용하고, `#kd-log`에 변경 목록을 `formatChange`로 보여 준다.
- key 있음: `add` 1개, 사용자가 친 입력값이 자기 과일을 따라간다. key 없음: 글자 수정 2개 + 끝에 `add` 1개, 입력값이 자리에 남아 다른 과일 옆으로 간다.
- 실제 영역(`#real-area`)과 History에는 영향이 없다. 파일: `pages/phase1/key-demo.ts` (`fruitList`, `startKeyDemo`).

### 12.6 구현 확인 결과 (2026-11-10)

- `tsc --noEmit`, `eslint src`, `depcruise`(순환 0), `check:stack`, `check:docs` 통과. Vitest 120개 통과, core 커버리지 문장 97%.
- 구현하며 테스트 2곳을 고쳤다: 들여쓰기 테스트(TA1, H10)가 `<pre>` 안 글자까지 들여써서 "변경 있음"이 맞는 입력이었다 → 태그 앞 줄만 들여쓰도록 수정. R5는 복구가 실제로 실패하는 상황(`replaceWith`가 오류)으로 수정.

### 12.7 팀 결정 반영 (2026-11-11, PR #54 리뷰)

- 11장 열린 항목 4·5·6·7·9번을 모두 결정했다(11장 표). ADR-0004·0005·0006은 팀의 최종본으로 교체했다.
- 재귀 깊이 기준은 **1,000겹**(TBD-09). 테스트 T9·D14·P11을 1,000겹으로 올렸다. 재귀 구현이라 jsdom에서는 1,500겹부터 호출 스택을 넘는다. 사람이 쓰는 HTML은 보통 수십 겹이라 여유가 충분하다.
- ADR-0001·0002·0004·0005·0006의 "재확인 필요" 절, ADR-0008·0011·0012·0016~0019를 팀이 승인했다.

---

## 부록 A. Phase 1 파일별 함수 명세표

| 파일 | 함수 / 클래스 | 입력 | 출력 | 하는 일 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `core/vnode.ts` | `h(tag, attrs, ...children)` | 태그, 속성, 자식 | `VElement` | Virtual DOM 요소 dict 생성 | `ADR-0001` |
| `core/vnode.ts` | `equalScreen(a, b)` | `VNode`, `VNode` | `boolean` | 화면 데이터 5키 기준 동일성 판정 | `FR-01` |
| `core/vnode.ts` | `equalTree(a, b)` | `VNode`, `VNode` | `boolean` | 5키 + `key` 기준 구조 동일성 판정 | `ADR-0003` |
| `core/dom.ts` | `domToVNode(node, opts?)` | `Node`, `{ recordDom? }` | `VNode` | DOM→VNode 변환 (공백 정리, 주석/`<script>`/`on*`/`javascript:` 제외) | `ADR-0002` |
| `core/dom.ts` | `vnodeToDom(v)` | `VNode` | `Node` | VNode→실제 DOM 노드 재귀 생성 (`dom` 미기록) | `ADR-0003` |
| `core/html.ts` | `htmlToVNode(code)` | `string` | `VNode \| null` | `<template>` 파싱 후 `domToVNode` 호출 (`g1`) | `ADR-0006` |
| `core/html.ts` | `vnodeToHtml(v)` | `VNode` | `string` | 2칸 들여쓰기 + 공백 위치 보존 HTML 직렬화 (`a3`) | `ADR-0006` |
| `core/diff.ts` | `diff(oldV, newV)` | `VNode`, `VNode` | `DiffResult` | 6종 `changes` + 재사용 `pairs` 산출 (순수 함수) | `ADR-0004`, `0005` |
| `core/patch.ts` | `applyPatch(c, next, res, opts?)` | 컨테이너, 새 트리, `DiffResult`, 옵션 | `{ applied, recovered }` | `changes` 적용 → `pairs` `.dom` 복사 → `recordDom` → `animate` 하이라이트 (`t3` 복구 포함) | `ADR-0005`, `0006` |
| `core/patch.ts` | `recordDom(v, node)` | `VNode`, `Node` | `void` | 새로 만든 실제 DOM 노드 참조를 재귀 기록 (`F1`) | `ADR-0005` |
| `core/patch.ts` | `recoverPatch(c, next, err)` | 컨테이너, 새 트리, 오류 | `void` | 실패 시 컨테이너 통째 교체 + `recordDom` + 에러 기록 (`t3`) | `ADR-0005` |
| `core/history.ts` | `History<T>` | 초기값 | 인스턴스 | 선형 기록 + 현재 위치 관리 (`push`, `undo`, `redo`, `canUndo`, `canRedo`) | `ADR-0008` |
| `core/history.ts` | `push(state)` / `undo()` / `redo()` / `canUndo()` / `canRedo()` | 상태 / 없음 | 없음 / `T \| null` / `boolean` | 기록 추가(j1, 뒤쪽 삭제) / 한 칸 이동 / 버튼 켜기 판단 | `ADR-0008` |
| `pages/phase1/format.ts` | `formatChange(change)` | `Change` | `string` | 변경 1건을 한 줄 요약 문자열로 변환 (`U1`) | 피드백 02 4절 (ADR-0006 8절 추가 예정) |
| `pages/phase1/preview.ts` | `renderPreview(v)` | `VNode \| null` | `void` | `#preview` 영역 통째 렌더링 | `ADR-0006` |
| `pages/phase1/tree-view.ts` | `renderTreeDiff(oldV, newV, res)` | 이전·새 VNode, `DiffResult` | `void` | 나란히 들여쓰기 트리 뷰어(`v2+w1`) 렌더링 | 피드백 02 4절 (ADR-0006 8절 추가 예정) |
| `pages/phase1/init.ts` | `init()` | 없음 | `{ history, current }` | 첫 로드: 실제 영역 → `domToVNode(recordDom)` → 0번 기록 → `#editor`·`#preview` 채움 | `ADR-0006`, `0008` |
| `pages/phase1/main.ts` | 페이지 컨트롤러 | DOM 이벤트 | `void` | 초기화, 0.3s 디바운스(`e3`/`n2`), Patch, Undo/Redo, `#status` 조율 | `ADR-0006`, `0008` |

## 부록 B. 핵심 설계 원리 Q&A (Phase 1)

| 주제 | 핵심 질문 | 설계 기반 답변 |
| --- | --- | --- |
| 공백 정리 | 왜 `\s+` 정규식을 쓰지 않고 5종 공백 문자를 직접 나열하는가? | `\s`는 `&nbsp;`(U+00A0)까지 한 칸으로 줄여 브라우저 실제 렌더링과 어긋나기 때문이다(`T8`). |
| `dom` & `pairs` | Diff가 `.dom`을 직접 고치지 않고 `pairs`를 따로 돌려주는 이유는? | Diff는 실제 DOM 없는 순수 함수여야 dict 두 개만으로 테스트(`D12`)할 수 있고, `changes`에는 바뀐 것만 남아 `changes.length === 조작 횟수`(`NFR-01`)가 성립하기 때문이다. |
| 적용 순서 (`C2`) | 왜 `[삭제 → 앞에서부터 자리 맞추기 → 자신 비교]` 순서를 지켜야 하는가? | 태그 교체를 먼저 하면 옛 노드가 DOM에서 떨어져 나가, 다른 노드를 그 앞으로 옮기는 `insertBefore`가 `NotFoundError`로 실패하기 때문이다(`P6`). |
| 정제 위치 (`s2`) | `<script>`, `on*`, `javascript:`를 왜 `editor` 입력 쪽이 아니라 `domToVNode`에서 거르는가? | 실제 영역과 코드 입력칸 양쪽에 같은 규칙이 적용되어야 수정 없는 첫 Patch에서 불필요한 속성 삭제 Diff가 생기지 않기 때문이다(`S4`). |
| 하이라이트 (`y2`) | 왜 `class`를 붙이지 않고 `element.animate()`로 0.6초 반짝이는가? | `class`/`style` 속성을 건드리면 DOM 조작 횟수 감시(`MutationObserver`) 테스트(`P3`, `HL2`)에 가짜 조작이 섞이기 때문이다. |
