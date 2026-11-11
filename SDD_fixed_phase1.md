# 미니 React 소프트웨어 설계 문서 — Phase 1 (Virtual DOM, Diff, Patch, History)

2026-11-10 · v0.6 · 프로젝트 팀 (초안: AI, 검토·결정: 팀)

> 공통 설계(아키텍처, 하네스, 역할)는 `SDD.md`, Phase 2(Component, State, Hooks)는 `SDD_fixed_phase2.md`, 결정 이유는 `docs/adr/`, 한 장 요약은 `SDD_one_page.md`에 있다.
> 이 문서는 `SDD.md`에서 **Phase 1 전용 설계(VDOM, 변환, Diff, Patch, History, Phase 1 검증 페이지)**를 독립적으로 분리하고, 팀원 설계 문서 2종(ADR-0005, ADR-0002 4절) 및 팀 설계 검토 블로그 피드백(CF-03, CF-04, 영역 ID 통일, 한 줄 요약 로그, 샘플 요건, 트리 보기 등)을 완벽히 반영한 문서이다.

---

## 1. 개요와 범위

### 1.1 Phase 1 최종 목표 (LMS 과제 요구사항)

- 사용자의 입력·수정에 따라 **전체를 다시 그리지 않고 바뀐 부분만 실제 영역에 부분 업데이트(Patch)**하는 웹 페이지를 구현한다 (FR-03~FR-06, NFR-01).
- **뒤로가기·앞으로가기**로 State History에 저장된 특정 시점의 Virtual DOM으로 이동하며, 이때 **실제 영역, 코드 입력칸, 미리보기가 함께 일치**되어야 한다 (FR-07, FR-08).
- 모든 과정에서 브라우저 DOM 조작을 최소화하고, 수정되지 않은 요소의 상태(입력 중인 값, 포커스/커서, 스크롤 위치)가 보존되어야 한다 (FR-04, NFR-01).
- Phase 1에서 구현한 Virtual DOM 구조와 `diff`, `applyPatch`는 **Phase 2의 컴포넌트 렌더링 엔진으로 그대로 재사용**된다 (FR-22, C-08).

### 1.2 기준 문서 및 반영된 피드백 대응

| 항목 | 내용 |
| --- | --- |
| 기준 문서 | SRS v1.3 (FR-01~FR-09, NFR-01~NFR-04, IR-01~06, IR-09~10, CON-04, CON-07, VT-01~09, VT-20~49) |
| 설계 문서 1 | **ADR-0005 (Patch)**: Diff의 순서 판단(A1), 위치의 기준 dict 표현(B2), 짝 목록 분리(D1), 적용 순서 [삭제 → 자리맞추기 → 자신의 변경 → 자식](C2), 새 노드 `dom` 기록(F1), **Patch 실패 시 전체 다시 그리기 복구(t3, CF-03)** |
| 설계 문서 2 | **ADR-0002 (DOM → VDOM 변환)**: 공백 정리 규칙(선택지 4: 연속 공백 한 칸 정리 + `<pre>` 예외), **4절 실행되는 내용 건너뛰기(s2, CF-04: `<script>`, `on*` 속성, `javascript:` 링크 제외)** |
| 팀 블로그 피드백 | **팀 설계 검토 (화면 구성, dream kim 2026.11.10)**: <br>① 영역 ID 충돌 해결: 실제 영역 `#real-area`, 미리보기 `#preview`, 코드 입력칸 `#editor`<br>② 입력 0.3초 debounce(e3) 및 대기 중 이동 차단(n2)<br>③ Patch 로그 JSON 대신 `formatChange` **한 줄 요약** 표시<br>④ 상태 문구 `#status` 3대 상황(k1 변경없음, m3 수정중 이동차단, t3 오류복구) 안내<br>⑤ 발표/테스트 시연용 **샘플 HTML 5대 필수 요건**(key 목록+수량 input, 스크롤 상자, 주석, `<pre>`, 들여쓰기 HTML) 명시<br>⑥ 트리 보기: **이전/새 트리 나란히(v2) + 들여쓰기 글자 목록(w1) + 색칠 규칙** |

---

## 2. Phase 1 아키텍처 및 자료구조

### 2.1 Virtual DOM 데이터 구조 (`core/vnode.ts`, ADR-0001, ADR-0004)

Virtual DOM 노드는 태그 노드(`VElement`)와 글자 노드(`VText`) 두 가지로 한정하며, `node.type`으로만 구별한다.

```typescript
export type Attrs = Record<string, string>;

export interface VElement {
  type: 'element';
  tag: string;                          // 항상 소문자 (localName 기준, T11)
  attrs: Attrs;                         // 속성 해시. 없으면 {}. key는 절대 넣지 않는다 (VT-26)
  children: VNode[];                    // 자식 목록. 없으면 [] (VT-25)
  key?: string;                         // 짝짓기용 식별자. 속성에 없으면 키 자체가 없다 (ADR-0001)
  dom?: Element;                        // 실제 영역에 그려진 트리에만 존재하는 참조 (ADR-0004)
  on?: Record<string, EventListener>;   // Phase 2 전용 이벤트 핸들러 (SDD_fixed_phase2)
}

export interface VText {
  type: 'text';
  text: string;                         // 공백 정리 규칙이 적용된 문자열 (ADR-0002)
  dom?: Text;                           // 실제 텍스트 노드 참조
}

export type VNode = VElement | VText;

export function h(tag: string, attrs?: (Attrs & { key?: string }) | null, ...children: (VNode | string)[]): VElement;
export function equalScreen(a: VNode, b: VNode): boolean;  // 다섯 키 비교 (FR-01, 화면 동일성 기준)
export function equalTree(a: VNode, b: VNode): boolean;    // 다섯 키 + key 비교 (왕복 불변식 기준)
```

**키 무리와 역할 분리 원칙**:
- **화면 데이터**(`type`, `tag`, `attrs`, `text`, `children`): 화면 렌더링 모습을 결정하는 값. 불변(immutable).
- **짝짓기 정보**(`key`): 자식 재정렬 시 동일성 판단. `attrs`에서 분리하여 속성 비교에 섞이지 않음.
- **참조**(`dom`): 실제 DOM 노드 연결. Diff는 절대 읽지 않으며(규칙 5), 오직 Patch만 읽고 쓴다.

---

## 3. 변환 모듈 설계 (`core/dom.ts`, `core/html.ts`)

| 함수 | 입력 → 출력 | 주요 역할 |
| --- | --- | --- |
| `domToVNode(node, opts?)` | `Element \| Text`, `{ recordDom?: boolean }` → `VNode` | 브라우저 DOM을 Virtual DOM으로 변환. `recordDom: true` 시 `dom` 참조 기록 |
| `vnodeToDom(v)` | `VNode` → `Node` | Virtual DOM을 기반으로 실제 브라우저 DOM 트리 생성 (화면 밖) |
| `htmlToVNode(code)` | `string` → `VNode \| null` | `<template>`을 통해 HTML 문자열 파싱 후 VNode로 변환 |
| `vnodeToHtml(v)` | `VNode` → `string` | VNode를 들여쓰기 2칸의 정돈된 HTML 문자열로 직렬화 |

### 3.1 `domToVNode` 상세 규칙 (ADR-0002, ADR-0014, CF-04 s2)

1. **노드 필터링**: 부모가 `childNodes`를 순회할 때 `nodeType === 1`(태그) 또는 `nodeType === 3`(글자)만 변환한다. **주석(`nodeType === 8`)과 `<script>` 요소는 건너뛴다** (CF-04, s2).
2. **소문자 태그명**: 대문자를 반환하는 `tagName` 대신 `node.localName`을 사용하여 항상 소문자(`"div"`, `"p"`)로 저장한다 (T11).
3. **`key` 속성 분리**: HTML에 `key="..."` 속성이 존재하면 `attrs`에서 제외하고 VNode의 `key` 필드로 격상한다 (T15).
4. **실행되는 악성 내용 건너뛰기 (s2, 2026-11-10 확정)**:
   - 사용자가 코드 입력칸에 넣은 스크립트가 미리보기나 실제 영역에서 예기치 않게 실행(alert 등)되는 것을 방지하기 위해 다음을 변환 단계에서 건너뛴다:
     - `<script>` 요소 전체 (자식 순회 시 주석처럼 무시, S1)
     - `on`으로 시작하는 모든 이벤트 속성(`onclick`, `onerror` 등)은 `attrs`에 넣지 않음 (S2)
     - 값이 `javascript:`로 시작하는 링크/속성(`href`, `src`, `action`, `formaction`, `xlink:href`)은 `attrs`에 넣지 않음 (S3)
   - *이유*: 실제 영역과 코드 입력칸 양쪽 모두 `domToVNode`를 거치므로 동일한 정제 규칙이 적용되어 불필요한 Diff가 발생하지 않는다 (S4).
5. **공백 정리 규칙**:
   - `<pre>` 및 그 하위 자손 내의 글자 노드는 줄바꿈과 탭, 공백을 원본 그대로 보존한다 (T4, T5).
   - 그 외의 모든 글자 노드는 공백 문자 5종(` `, `\t`, `\n`, `\r`, `\f`)이 연속된 구간을 단일 공백 `" "`으로 치환한다 (`/[ \t\n\r\f]+/g`).
   - `&nbsp;`(U+00A0)는 브라우저 렌더링 규칙에 따라 공백으로 축약하지 않고 그대로 유지한다 (T8).
6. **`recordDom` 옵션**:
   - `recordDom: true`는 **첫 로드 시 실제 영역(`#real-area`)을 변환할 때만** 사용한다 (T13).
   - 테스트 영역 변환이나 Diff용 VNode 변환 시에는 기본값(`false`)을 사용하여 테스트 DOM 노드가 `dom`에 들어가는 사고를 방지한다 (T14).

### 3.2 `vnodeToDom` 및 `vnodeToHtml` 규칙 (ADR-0003, ADR-0006)

- `vnodeToDom`:
  - `attrs`를 순회하며 `setAttribute`를 호출하고, `key`가 있으면 `setAttribute('key', key)`로 붙인다.
  - `dom` 필드는 일체 읽지도 기록하지도 않는다 (규칙 4). 오직 독립적인 DOM 트리를 반환한다.
- `vnodeToHtml`:
  - Virtual DOM 내 원래 공백 노드(`" "`)가 있던 위치를 기준으로 줄바꿈과 2칸 들여쓰기를 적용해 재구성한다 (TA2).
  - 아무 수정 없이 코드를 읽고 다시 변환했을 때 Diff 변경이 0개가 되도록 가역성을 보장한다.

---

## 4. Diff 모듈 설계 (`core/diff.ts`, ADR-0004, ADR-0005)

Diff는 오직 두 Virtual DOM 트리(`oldV`, `newV`)를 비교하여 변경 사항과 재사용 노드 쌍을 산출하는 **순수 함수**이다. 실제 DOM을 보지 않으며 `dom` 키도 읽지 않는다 (ADR-0004 결정 1·2, D12).

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
  changes: Change[];  // 바뀐 것만 (조작 횟수 계산용, NFR-01)
  pairs: Pair[];      // 실제 노드를 계속 유지·재사용하는 (이전 dict, 새 dict) 쌍
}

export function diff(oldV: VNode, newV: VNode): DiffResult;
```

### 4.1 반환값 설계 원칙 (ADR-0005 A1, B2, D1)

1. **이동 판단(A1)**: Diff가 이전 dict의 순서를 흉내 내어 "이미 제자리에 있는가"를 직접 판단하고 `move` 기록을 발행한다. Patch는 실제 DOM의 순서를 읽지 않고 전달받은 명령을 그대로 실행만 한다.
2. **위치 표현(B2)**: 실제 영역의 주석 노드로 인한 번호 어긋남 문제(ADR-0002)를 원천 차단하기 위해, 추가/이동 위치를 숫자가 아닌 **기준 이전 dict(`before`: 그 순간 그 자리에 있는 이전 dict, 없으면 `null` = 끝)**로 담는다.
3. **짝 목록 분리(D1)**: 변경 목록에는 "바뀐 것"만 담아 `changes.length`로 조작 횟수(NFR-01)를 세고, `dom` 참조를 이어받아야 하는 노드들은 별도의 `pairs`에 담아 성격이 다른 정보를 분리한다.
   - `pairs` 대상: 글자 수정(`text`), 속성 수정(`attrs`), 변경 없음(유지), 이동(`move`). (교체 `replace`는 실제 노드를 새로 생성하므로 제외).

### 4.2 노드 비교 및 자식 짝짓기 알고리즘 (ADR-0004, ADR-0005)

**단일 노드 비교 우선순위**:
1. 이전 노드 없음 → `add`
2. 새 노드 없음 → `remove`
3. `type` 불일치 (태그 ↔ 글자) → `replace` (D5)
4. 둘 다 태그이나 `tag` 불일치 (`<p>` ↔ `<h1>`) → `replace` (D4)
5. 둘 다 글자 노드이나 `text` 불일치 → `text` (D2)
6. 둘 다 태그이고 `tag` 일치, `attrs` 불일치 → `attrs` (`set`, `remove` 분리, D3)
7. 둘 다 태그이고 속성까지 동일 → 변경 없음 (자식 비교 진행, D1)

**자식 목록 순서 맞추기 및 짝짓기 (FR-09, ADR-0005 5절 C2)**:
1. 이전 자식 중 `key`가 있는 요소들로 `keyMap(key → 이전 VNode)`을 구성한다.
2. `key`가 일치하는 노드끼리 최우선 짝을 짓는다.
3. `key`가 없는 노드는 key 없는 이전 자식들과 출현 순서대로 1:1 짝을 짓는다.
4. 중복 `key` 발견 시 `console.warn`을 출력하고 해당 부모의 자식 전체를 인덱스 자리 비교로 전환한다 (D9).
5. **변경 목록 생성 순서 (C2)**:
   - ① 짝 없는 이전 자식을 모두 `remove`한다.
   - ② 새 자식 순서를 앞에서부터 0번부터 순회하며:
     - [자리 맞추기]: 제자리가 아니면 `move`, 새 노드면 `add` (`before`는 현재 시점 그 자리에 있는 이전 노드).
     - [자신의 변경]: `replace`, `text`, `attrs` 적용.
     - [자식 재귀]: 태그가 같으면 하위 자식들에 대해 위 순서를 재귀 적용.
   - *이유*: 앞에서부터 맞추면 기준 노드(`before`)는 항상 아직 처리되지 않은 노드이므로, 교체로 인해 옛 노드가 DOM에서 떨어져 나가 발생하는 `insertBefore` 실패 오류(`NotFoundError`)를 원천 방지한다 (P6).

---

## 5. Patch 모듈 설계 (`core/patch.ts`, ADR-0005, ADR-0013, CF-03 t3)

Patch는 오직 Diff가 전달한 `{ changes, pairs }`를 기반으로 실제 브라우저 DOM을 최소 조작으로 업데이트하고, 새 Virtual DOM 트리에 `dom` 참조를 올바르게 인계하는 **쓰기 전용 모듈**이다.

```typescript
export class PatchError extends Error {
  constructor(public change: Change, message: string);
}

export function applyPatch(result: DiffResult): { applied: number };
export function recordDom(v: VNode, node: Node): void;
export function recoverPatch(container: Element, nextTree: VNode, error: unknown): void;
```

### 5.1 `applyPatch` 4단계 실행 절차

```text
[0단계: 사전 확인] → [1단계: DOM 변경 적용] → [2단계: dom 복사] → [3단계: 새 노드 dom 기록]
  (PatchError 감지)
         ↓ (예외 발생 시)
[t3 복구 프로토콜: 실제 영역 통째 재구축 + 새 트리 dom 기록 + History 동기화]
```

1. **0단계: 사전 확인 (ADR-0013)**
   - 모든 변경의 `target`, `parent`, `before`에 `dom` 참조가 실제로 존재하는지, `before.dom`이 부모의 자식이 맞는지 검사한다.
2. **1단계: DOM 변경 순차 적용**
   - `add`: `parent.dom.insertBefore(vnodeToDom(node), before?.dom ?? null)`
   - `remove`: `target.dom.remove()`
   - `replace`: `target.dom.replaceWith(vnodeToDom(node))`
   - `text`: `target.dom.nodeValue = text` (노드 유지, FR-05)
   - `attrs`: `set` 속성들은 `setAttribute`, `remove` 속성들은 `removeAttribute` (노드 유지, FR-05)
   - `move`: `parent.dom.insertBefore(target.dom, before?.dom ?? null)` (노드 객체 유지, 입력값·포커스 보존, FR-04, FR-09)
   - **`value` / `checked` 동기화 (CF-10)**: `value`, `checked`는 DOM 어트리뷰트 수정과 함께 프로퍼티(`el.value`, `el.checked`)도 동기화하되, **현재 프로퍼티 값과 다를 때만 덮어써서** 사용자가 입력 중인 커서가 튀지 않도록 한다.
3. **2단계: 기존 노드의 `dom` 복사 (D1)**
   - `pairs`의 모든 쌍에 대해 `새 VNode.dom = 이전 VNode.dom`을 대입한다 (P7).
4. **3단계: 새로 만든 노드의 `dom` 재귀 기록 (F1, ADR-0005 2-1절)**
   - `add`나 `replace`로 새로 생성된 노드에 대해 `recordDom(새 VNode, 생성된 실제 노드)`을 호출한다.
   - 새 VNode 트리와 실제 DOM 트리를 나란히 내려가며 자식 인덱스 순서대로 `dict.dom = childNode`를 기록한다. 새로 만든 노드에는 주석이 없으므로 인덱스가 어긋나지 않는다.

### 5.2 Patch 실패 복구 프로토콜 (ADR-0005 6절, CF-03 t3 확정)

적용 순서 버그나 비정상 상태로 인해 `applyPatch` 도중 오류가 발생했을 때 어중간한 상태로 방치하면 이후 모든 Patch가 연쇄 실패한다. 이를 방지하기 위해 **t3(실패 시 전체 다시 그리기)** 전략을 실행한다:

1. `applyPatch` 실행 블록을 `try ... catch`로 감싸고, 오류 발생 시 즉시 DOM 조작을 중단한다.
2. `recoverPatch`를 호출하여 실제 영역 틀(`#real-area`)의 첫 자식 요소를 `vnodeToDom(nextTree)` 결과로 통째 교체한다.
3. F1 방식으로 `recordDom(nextTree, newDomRoot)`를 실행하여 새 Virtual DOM 전체에 실제 노드 참조를 완벽히 재기록한다.
4. History에 새 트리를 저장하고 `current = nextTree`로 동기화하여, **다음 Patch부터는 100% 정상 동작**하도록 복구한다 (R1, R2).
5. 콘솔에 `console.error`로 원인 에러를 출력하고, 상태 문구(`#status`)에 `"오류가 나서 실제 영역을 다시 그렸습니다"`를 표시한다.

---

## 6. History 모듈 설계 (`core/history.ts`, ADR-0008)

```typescript
export class History<T> {
  constructor(initial: T, limit = 100);
  get current(): T;
  get index(): number;
  get size(): number;
  push(state: T): void;            // 현재 위치 뒤의 기록을 자르고 새 상태 추가 (j1)
  undo(): T | null;                // 한 칸 뒤로 이동. 처음이면 null
  redo(): T | null;                // 한 칸 앞으로 이동. 끝이면 null
  goTo(index: number): T | null;   // 특정 인덱스로 이동 (부록 C 타임머신 슬라이더용)
  canUndo(): boolean;              // index > 0
  canRedo(): boolean;              // index < size - 1
}
```

- **0번 슬롯 불변성**: 첫 페이지 로드 시의 Virtual DOM이 0번 기록으로 저장된다 (FR-07).
- **무변경 Patch 무시 (k1)**: Diff 결과 `changes.length === 0`인 Patch는 History에 슬롯을 추가하지 않고, 상태 문구에 `"변경 사항 없음"`을 알린다 (VT-47).
- **참조 보존**: History에는 Patch가 `dom`을 성공적으로 채운 바로 그 VNode 객체 트리(`current`)를 저장한다.
- **이동 시의 Patch 실행**: 뒤로가기/앞으로가기 시에도 Diff의 이전 쪽은 항상 **현재 실제 영역에 그려져 있는 `current`**여야 한다 (`diff(current, target)`). 그래야 정확한 `dom`을 기준으로 화면이 전환되고 `dom` 참조가 온전히 승계된다.

---

## 7. Phase 1 검증 페이지 설계 (`pages/phase1`, ADR-0006, ADR-0008, 팀 화면 구성 검토)

### 7.1 화면 레이아웃 및 영역 ID 통일

```html
<!-- 실제 영역 (틀은 고정, 내부는 Patch로만 갱신) -->
<section id="real-area">
  <div id="app">
    <!-- 샘플 HTML 5대 요건 탑재 -->
  </div>
</section>

<!-- 테스트 영역 (코드 입력칸 원본 + VDOM 거친 미리보기) -->
<section id="test-area">
  <textarea id="editor" spellcheck="false"></textarea>
  <section id="preview"></section>
</section>

<!-- 조작 바 및 알림 상태 UI -->
<div class="controls">
  <button id="patch">Patch</button>
  <button id="undo">뒤로가기</button>
  <button id="redo">앞으로가기</button>
  <span id="history-pos">기록 1 / 1</span>
  <p id="status"></p>
</div>

<!-- Patch 로그 (한 줄 요약 출력) -->
<pre id="change-log"></pre>
```

- **영역 ID 충돌 해결**: 팀 합의에 따라 실제 영역 틀은 `#real-area`, 미리보기 틀은 `#preview`, 코드 입력칸은 **`#editor`**로 확정 통일했다.
- **틀 기반 검색 (CON-07)**: 페이지 로직은 내부 샘플의 `id`를 쓰지 않고 틀(`#real-area`, `#preview`)의 `firstElementChild`로 루트 요소를 찾는다.

### 7.2 샘플 HTML 5대 필수 요건 (발표 및 기능 테스트 시연)

발표 시연 및 단위/통합 테스트 검증을 위해 기본 샘플 HTML에는 반드시 다음 5가지 요소가 포함되어야 한다:

```html
<div id="app">
  <h1>장바구니 목록</h1>
  <!-- 1. key 목록 및 줄마다 수량 입력칸: D6, P2 시연 (맨 앞 추가 시에도 바나나 입력값 '3' 유지) -->
  <ul>
    <li key="b">바나나 <input type="text" class="qty" value="3" /></li>
    <li key="s">딸기 <input type="text" class="qty" value="1" /></li>
  </ul>
  <!-- 2. 주석 노드 하나: P4 시연 (주석이 존재해도 둘째 항목만 정확히 수정) -->
  <!-- 주문 메모 섹션 시작 -->
  <!-- 3. 스크롤 박스: FR-04 시연 (스크롤을 중간으로 내린 뒤 문단 수정해도 스크롤 위치 유지) -->
  <div id="scroll-box" style="height: 60px; overflow-y: scroll;">
    <p>안내 문구 1</p><p>안내 문구 2</p><p>안내 문구 3</p><p>안내 문구 4</p>
  </div>
  <!-- 4. <pre> 블록: TA3, T4 시연 (공백/줄바꿈이 정리되지 않고 보존됨) -->
  <pre>배송 안내:
  - 당일 배송
  - 신선 포장</pre>
  <!-- 5. 들여쓰기된 HTML 구조: TA1 시연 (로드 직후 수정 없이 Patch 시 '변경 사항 없음' 확인) -->
</div>
```

### 7.3 Patch 로그 표시 규격 (`formatChange`, 한 줄 요약)

`Change` 객체 내 `target`, `parent`는 VNode 트리 전체를 물고 있어 JSON 직렬화 시 트리가 무더기로 쏟아져 나온다. 따라서 기계적으로 **한 줄 요약 형식**으로 변환하여 출력한다:

| `kind` | 로그 표시 형식 예시 |
| --- | --- |
| `text` | `글자 수정: <li> "사과" → "딸기"` |
| `attrs` | `속성 수정: <p> class="red" 추가` |
| `add` | `추가: <li key="a"> (<li key="b"> 앞)` (기준 노드가 없으면 `(끝)`) |
| `remove` | `삭제: <li key="c">` |
| `replace` | `교체: <p> → <h1>` |
| `move` | `이동: <li key="b"> (<li key="a"> 앞으로)` |

### 7.4 상태 문구 (`#status`) 안내 규격

사용자를 방해하는 `alert()` 창은 일체 금지하며, 버튼 옆 `#status`에 다음 3대 상황을 출력한다:
1. `changes.length === 0`일 때: `"변경 사항 없음"` (k1, VT-47)
2. `dirty` 상태에서 이동 시도 또는 이동 버튼 비활성화 시: `"Patch하거나 수정을 되돌리면 이동할 수 있습니다"` (m3, VT-48)
3. Patch 실패 복구 프로토콜(t3) 발동 시: `"오류가 나서 실제 영역을 다시 그렸습니다"` (CF-03, R1)

### 7.5 실시간 반응 및 버튼 활성화 흐름

- **입력 debounce (0.3초, e3)**: 타이핑 즉시 `pending = true`로 두고 이동 버튼을 끈다 (n2). 타이핑이 0.3초 멈추면 `htmlToVNode`를 수행해 미리보기를 갱신하고, `dirty = diff(current, draft).changes.length > 0`를 판정한다.
- **버튼 활성화 조건**:
  - 뒤로가기 활성: `history.canUndo() && !dirty && !pending`
  - 앞으로가기 활성: `history.canRedo() && !dirty && !pending`
- **미리보기 갱신 (`preview.ts`)**:
  - `#preview.replaceChildren(vnodeToDom(draft))`로 통째 교체한다. 미리보기는 실제 영역이 아니므로 통째로 그려도 무방하다 (ADR-0006 4절).

---

## 8. 예외 처리 및 경계 조건 (Phase 1)

| 예외 및 경계 상황 | 처리 모듈 | 정의된 시스템 동작 | 관련 검증 |
| --- | --- | --- | --- |
| 자식이 없거나 속성이 없는 요소 | dom | `children: []`, `attrs: {}`로 정규화 | VT-25, VT-26 |
| `domToVNode(null)` 등 비정상 노드 | dom | `TypeError` 발생 | VT-21 |
| 주석 및 `<script>` 요소 | dom | 부모 순회 단계에서 건너뜀 (VNode에 미포함) | VT-02, S1 |
| `on*` 속성 및 `javascript:` URL | dom | `attrs`에 포함하지 않고 무시 (정제 s2) | S2, S3, S4 |
| 코드에 요소가 하나도 없는 빈 문자열 | page/html | `htmlToVNode`가 `null` 반환, "루트 요소가 필요합니다" 안내 후 Patch 중단 | VT-21 |
| 동일한 Virtual DOM 비교 | diff | `changes: []`, `pairs`에 전 노드 등록 | VT-28 |
| 부모 내 중복 `key` 존재 | diff | `console.warn` 출력 후 해당 부모만 인덱스 기반 자리 비교 | VT-36 |
| 변경 없는 Patch 실행 | page | DOM 조작 0회, 기록 추가 없음, `#status`에 "변경 사항 없음" | VT-29, VT-47 |
| 기록의 처음이나 끝에서 이동 시도 | history | `null` 반환, 이동 차단, 버튼 비활성화 유지 | VT-30 |
| 미반영 수정(`dirty`) 중 이동 시도 | page | 이동 버튼 비활성화 및 m3 안내 문구 표시 | VT-48 |
| 대상 `dom` 누락 또는 Patch 도중 예외 | patch | **t3 복구 프로토콜**: 실제 영역 통째 재구축, `recordDom` 재수행, History 동기화, 에러 콘솔 출력, 상태 문구 표시 | VT-31, R1, R2 |
| 루트 태그 교체 (`<div id="app">` → `<main id="app">`) | patch | 틀(`#real-area`)의 첫 자식을 `replaceWith`로 교체 성공 | VT-41 |

---

## 9. Phase 1 검증 및 테스트 계획

### 9.1 테스트 모듈 구성

| 테스트 파일 | 검증 대상 | 포함되는 주요 ADR 테스트 케이스 |
| --- | --- | --- |
| `tests/unit/vnode.test.ts` | `equalScreen`, `equalTree` | ADR-0001 Confirmation |
| `tests/unit/dom.test.ts` | `domToVNode`, `vnodeToDom` | ADR-0002 T1~T15, **S1~S4(스크립트/이벤트 정제)** |
| `tests/unit/html.test.ts` | `htmlToVNode`, `vnodeToHtml` | ADR-0006 TA1~TA6 (공백 왕복 보존) |
| `tests/unit/diff.test.ts` | `diff` 알고리즘 전반 | **ADR-0005 D1~D15** (D6 맨앞추가, D7 순서교환, D8 순환이동, D12 dom없는비교, D14 100겹 중첩) |
| `tests/unit/patch.test.ts` | `applyPatch`, `recordDom` | **ADR-0005 P1~P12**, **R1·R2(t3 실패 복구 및 재패치)** |
| `tests/unit/history.test.ts` | `History` 스택 조작 | ADR-0008 Confirmation (j1 선형 기록, 가역성) |
| `tests/integration/phase1.test.ts` | 검증 페이지 종합 연동 | ADR-0006 TA7~TA12, ADR-0008 k1(무변경), m3·n2(수정중 이동차단) |
| `tests/property/diff-patch.prop.test.ts` | fast-check 기반 불변식 | 임의 VNode 생성기 기반 Patch 후 화면 동일성 검증 |

### 9.2 주요 테스트 대표 시나리오

1. **무수정 Patch (VT-39, VT-47, TA1)**: 페이지 로드 직후 아무것도 수정하지 않고 Patch 클릭 시 DOM 변경 0건, 기록 수 유지, `"변경 사항 없음"` 안내.
2. **맨 앞 추가 시 입력값 보존 (VT-36, D6, P2)**: 바나나 수량 입력칸에 `"3"`을 입력한 상태에서 맨 앞에 사과를 추가해 Patch하면, `add` 1건만 발생하고 바나나 옆에 `"3"`이 온전히 유지됨.
3. **주석 건너뛰기 정합성 (VT-43, P4)**: 실제 DOM에 주석 노드가 있어도 둘째 요소의 글자 수정이 정확한 노드에 적용됨.
4. **순서 교환 + 태그 교체 복합 상황 (VT-44, P6)**: `[A(p), B]` → `[B, A(h1)]` 적용 시 `insertBefore` 오류 없이 정상 갱신.
5. **Patch 도중 실패 복구 (R1, R2)**:
   - 고의로 특정 dict의 `dom` 참조를 삭제하고 Patch → t3 복구 발동, 실제 영역이 새 트리로 다시 그려지고 `console.error` 1회 발생, `"오류가 나서 실제 영역을 다시 그렸습니다"` 출력.
   - R1 직후 다시 일반 수정을 가해 Patch → 정상적으로 단일 조작 Patch 성공 (복구 없이 정상 이어받기 증명).
6. **타임머신 왕복 (VT-08, VT-09, VT-49)**: Patch 2회 수행 → 뒤로가기 → 1회차 상태 일치 → 앞으로가기 → 2회차 상태 일치 (실제 영역, 에디터, 미리보기 삼위일체 동기화).

---

## 10. 차별화 구현 상세 설계 (팀 제안)

### 10.1 변경 사항 하이라이트 (0.6초 반짝임)
- Patch 적용 직후 변경된 노드(`target.dom` 또는 새로 만든 `node.dom`)에 임시 CSS 클래스(`.patch-highlight`)를 부여하고 0.6초 후 제거한다. 부분 업데이트가 일어난 위치를 시각적으로 확인시켜 준다.

### 10.2 트리 비교 뷰어 (v2 나란히 + w1 들여쓰기 글자 목록, 팀 블로그 고민 3 채택)

Diff가 어떤 원리로 두 트리를 비교했는지 직관적으로 시연하기 위해, 페이지 하단에 **이전 트리(왼쪽)와 새 트리(오른쪽)**를 들여쓴 글자 목록(w1)으로 나란히(v2) 배치하고 노드별 변경 상태를 하이라이트한다:

```text
[ 이전 트리 ]                          [ 새 트리 ]
div                                   div
├ ul                                  ├ ul
│ ├ li key="a" "사과" (삭제: 붉은색)     │ ├ li key="b" "바나나" (이동: 푸른색)
│ └ li key="b" "바나나" (이동: 푸른색)    │ └ li key="c" "포도"   (추가: 초록색)
```

**종류별 색칠(하이라이트) 규칙**:

| 변경 종류 | 이전 트리 (왼쪽) | 새 트리 (오른쪽) | 비고 |
| --- | --- | --- | --- |
| `remove` | 대상 노드 색칠 (빨강) | — (새 트리에 없음) | 삭제된 요소 시각화 |
| `add` | — (이전 트리에 없음) | 새 노드 색칠 (초록) | 추가된 요소 시각화 |
| `replace` | 옛 노드 색칠 (주황) | 새 노드 색칠 (주황) | 1:1 교체 시각화 |
| `text` / `attrs` | 대상 노드 색칠 (노랑) | 짝 노드 색칠 (`pairs`로 추적) | 내용 변경 시각화 |
| `move` | 대상 노드 색칠 (파랑) | 짝 노드 색칠 (`pairs`로 추적) | 위치 이동 시각화 |

---

## 11. 함수 명세 총괄표 (Phase 1)

| 파일 | 함수 / 클래스 | 매개변수 | 반환값 | 주요 책임 요약 |
| --- | --- | --- | --- | --- |
| `core/vnode.ts` | `h(tag, attrs, ...children)` | 태그, 속성, 자식 | `VElement` | Virtual DOM 엘리먼트 생성 |
| `core/vnode.ts` | `equalScreen(a, b)` | VNode, VNode | `boolean` | 화면 렌더링 5대 키 기준 동일성 검사 (FR-01) |
| `core/vnode.ts` | `equalTree(a, b)` | VNode, VNode | `boolean` | `key`를 포함한 완전한 트리 구조 동일성 검사 |
| `core/dom.ts` | `domToVNode(node, opts)` | Node, `{ recordDom }` | `VNode` | DOM을 VNode로 변환 (스크립트/on* 정제 s2 포함) |
| `core/dom.ts` | `vnodeToDom(v)` | `VNode` | `Node` | VNode 기반 실제 DOM 서브트리 생성 |
| `core/html.ts` | `htmlToVNode(code)` | `string` | `VNode \| null` | HTML 문자열을 `<template>`을 거쳐 VNode로 파싱 |
| `core/html.ts` | `vnodeToHtml(v)` | `VNode` | `string` | VNode를 2칸 들여쓰기 HTML 텍스트로 직렬화 |
| `core/diff.ts` | `diff(oldV, newV)` | VNode, VNode | `{ changes, pairs }` | 변경 목록과 짝 목록 산출 (순수 함수) |
| `core/patch.ts` | `applyPatch(result)` | `DiffResult` | `{ applied }` | Diff 결과를 실제 DOM에 순차 반영 및 dom 인계 |
| `core/patch.ts` | `recordDom(v, node)` | VNode, Node | `void` | 새 VNode 트리에 실제 DOM 참조 재귀 기록 (F1) |
| `core/patch.ts` | `recoverPatch(c, next, err)`| Container, VNode, Error | `void` | Patch 실패 시 실제 영역 통째 재구축 복구 (t3) |
| `core/history.ts`| `History<T>` | 초기값, 한도 | `History` | 선형 세이브 슬롯 관리자 (undo/redo) |
| `pages/phase1/main.ts` | `formatChange(change)` | `Change` | `string` | 변경 1건을 한 줄 요약 문자열로 변환 |
| `pages/phase1/preview.ts` | `renderPreview(v)` | `VNode` | `void` | 미리보기 틀(`#preview`) 통째 렌더링 |
