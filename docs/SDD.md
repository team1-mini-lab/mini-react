# 미니 React Phase 1 소프트웨어 설계 문서 (SDD)

2026-11-09 · 프로젝트 팀 (초안: AI, 검토·결정: 팀)

> 한 장 요약은 `SDD_one_page.md`, 설계 지도는 `design_map_phase1.svg`, 설계 결정의 근거는 `adr/`를 참고한다.

## 0. 한 장 요약 (쉬운 말)

**목표 (LMS 과제 요구사항)**

- 사용자가 입력한 HTML을 Virtual DOM으로 변환한다.
- 이전 Virtual DOM과 새 Virtual DOM을 비교해 변경 사항을 찾는다.
- Diff 결과인 Patch를 실제 DOM에 적용해 필요한 부분만 업데이트한다.
- History에 변경 상태를 기록하고 Undo/Redo로 이전·다음 상태를 복원한다.
- Undo/Redo 실행 시 실제 영역과 테스트 영역을 함께 갱신한다.

우리가 만드는 것은 화면에서 바뀐 부분을 찾아 필요한 곳만 수정하는 도구다. 화면 전체를 다시 그리는 대신 변경된 부분만 수정해 입력값이나 커서 위치가 불필요하게 초기화되는 문제를 줄인다.

레고 집으로 생각하면 쉽다. 설계도 두 장을 비교해 달라진 부분을 찾고, 실제 레고 집에서 해당 블록만 바꾼다.

| 어려운 말 | 쉬운 비유 | 우리 코드에서 |
|---|---|---|
| 실제 DOM | 실제로 쌓아 올린 레고 집 | 브라우저 화면 |
| Virtual DOM (VNode) | 레고 집의 설계도 | VNode 객체 |
| Diff | 틀린 그림 찾기 | `diff(이전 VNode, 새 VNode)` |
| Patch | 달라진 블록만 교체하기 | `applyPatches` |
| History | 게임 저장 기록 | `History` |
| Undo / Redo | 이전·다음 저장 기록으로 이동 | `history.undo()`, `history.redo()` |
| 하네스 | 자동 채점기 | `npm run verify` |
| ADR | 설계 결정을 기록한 문서 | `docs/adr/` |

**Phase 1의 핵심 흐름**

1. HTML 입력을 Virtual DOM으로 변환한다.
2. 이전 Virtual DOM과 새 Virtual DOM을 비교해 Patch 목록을 만든다.
3. Patch 목록을 실제 DOM에 적용하고 변경 이력을 History에 저장한다.
4. Undo/Redo로 History의 상태를 이동하고 실제 영역과 테스트 영역을 갱신한다.

## 1. 문서 개요

본 문서는 SRS v1.0의 Phase 1 관련 기능 요구사항을 TypeScript(ADR-0001) 모듈과 함수 단위로 구체화한다. SRS 3.3.2와 5.2에서 설계 문서에서 확정하도록 남긴 함수명, 매개변수, 반환 형식 및 예외 처리 결과를 정의한다.

| 항목 | 내용 |
|---|---|
| 기준 문서 | SRS v1.0 (2026-11-07), ADR-0001 프로그래밍 언어 선택 (TypeScript) |
| 적용 범위 | Phase 1 (Virtual DOM, DOM 변환, Diff, Patch, History, 검증 페이지) |
| 문서 상태 | Draft: TBD 제안안은 팀 검토 및 승인 후 확정 |

### 1.1 TBD 제안안

SRS 6장의 미결 사항 중 Phase 1 설계가 전제로 삼는 제안안이다. 팀이 다른 안을 채택하면 영향을 받는 절을 수정한다.

| TBD | 제안안 | 근거 | 영향 절 |
|---|---|---|---|
| TBD-01 | 분기 시 현재 기록 뒤에 있는 기록을 삭제한다. | 기록을 단일 선형 배열로 유지해 Redo 동작을 명확하게 정의한다. | 3.5 |
| TBD-02 | HTML 코드 입력칸(textarea)과 실시간 미리보기로 구성한다. | `contenteditable`보다 태그·속성·텍스트 변경을 직접 입력하고 확인하기 쉽다. | 3.2, 3.6 |
| TBD-03 | Patch 유형을 CREATE, REMOVE, REPLACE, TEXT, PROPS 5종으로 정의한다. | FR-03~FR-06 및 VT-04, VT-27을 표현하기 위한 최소 유형이다. | 3.3, 3.4 |
| TBD-04 | 기본 비교 방식은 위치(index) 비교로 하고 key 기반 비교는 확장 범위로 둔다. | 필수 요구사항을 위치 비교로 구현하고 MOVE Patch 추가에 따른 복잡도를 제한한다. | 3.3 |

### 1.2 문서 템플릿과 참고 표준

본 문서의 구성은 IEEE 1016-2009 (Software Design Descriptions)의 설계 관점(viewpoint) 구조를 과제 규모에 맞게 축약한 것이다. SRS가 ISO/IEC/IEEE 29148을 참고하므로 요구사항과 설계 및 검증 항목의 연결 관계를 함께 기술한다.

| 표준 / 템플릿 | 대상 | 본 문서에서 쓴 부분 |
|---|---|---|
| IEEE 1016-2009 Software Design Descriptions | 설계 문서(SDD) | 전체 목차: 아키텍처 구성(2장), 인터페이스·자료구조(3장), 설계 근거(1.1) |
| ISO/IEC/IEEE 42010:2022 Architecture description | 아키텍처 기술 | 2장 모듈 구성과 의존 방향 |
| ISO/IEC/IEEE 29119-3:2021 Test documentation | 테스트 문서 | 테스트 설계 및 테스트 케이스 작성 기준 |
| ISO/IEC/IEEE 29148:2018 Requirements engineering | 요구사항(SRS) | 요구사항 추적성(FR ↔ 설계 ↔ VT) |
| MADR Markdown Architectural Decision Records | ADR | 설계 결정과 결정 근거 기록 |

IEEE·ISO 표준 원문 전체를 적용한 것은 아니며, 문서 구성과 관점 구분을 참고했다.

### 1.3 GitHub Issue 대응

| Issue | 완료 조건 | 충족하는 절 | 산출물 |
|---|---|---|---|
| #10 프로젝트 구조 및 함수 인터페이스 설계 | Phase 1 디렉터리 구조, 주요 함수 인터페이스, 모듈 책임 정의 | 2.1, 2.2, 3.2~3.5 | 본 문서 2·3장, `check:arch` 규칙 |
| #11 핵심 자료구조 설계 | Phase 1 자료구조의 필드·역할·관계 정의 | 3.1, 3.3, 3.5 | 본 문서 3장 및 관련 ADR |
| #12 테스트 환경 구성 | 테스트 환경 실행, 실행 방법 문서화, 기능별 테스트 구성 | 테스트 설계 및 검증 문서 | ADR-0008, README 테스트 실행 절 |
| #13 팀 역할 분담 및 설계 문서 작성 | 담당 확정, 설계 중복·누락 확인, 결정 기록 | 문서 전체 | 역할 분담 기록 및 관련 ADR |

### 1.4 이 문서를 읽는 사람과 궁금한 점

IEEE 1016의 설계 관점 구분을 참고해 문서를 읽는 사람별로 필요한 정보를 정리한다.

| 읽는 사람 | 궁금한 점 | 먼저 볼 곳 |
|---|---|---|
| 구현 담당 팀원 | 구현할 함수의 입력·출력, 다른 모듈과의 약속 | 2장, 3장 |
| 테스트 담당 팀원 | VT를 어떻게 검증하는가, 예외는 어떻게 처리하는가 | 3장 및 테스트 설계 문서 |
| 발표자 / 새 팀원 | 전체 실행 흐름과 설계 결정의 근거 | 0장, 2장, 3장 |
| 코치 / 평가자 | Phase 1 요구사항을 충족하는가, 설계 원리를 설명할 수 있는가 | 요구사항 추적성 및 설계 내용 |
| AI 코딩 도구 | 구현 시 지켜야 할 규칙과 검사 항목 | 2장, `AGENTS.md` |

### 1.5 변경 이력

| 버전 | 날짜 | 바뀐 내용 |
|---|---|---|
| 0.1 | 2026-11-09 | 초안 작성 |
| 0.2 | 2026-11-09 | 하네스, 역할 분담, ADR 관련 내용 추가 |
| 0.3 | 2026-11-09 | 쉬운 요약, 설계 그림, 문서 독자 및 부록 추가 |
| 1.0 | 팀 검토 후 | Phase 1 범위 검토 및 SRS 불일치 반영 후 확정 예정 |

## 2. 아키텍처 개요

Phase 1의 모듈 의존성은 `pages → core → DOM` 방향으로 구성한다. 페이지는 사용자 입력과 이벤트를 처리하고 core 모듈을 호출한다. core 모듈은 VNode 변환, Diff, Patch, History 기능을 담당한다.

실제 DOM을 변경하는 코드는 `core/patch.ts`에서 담당한다. Diff와 History는 실제 DOM에 직접 접근하지 않는다.

### 2.1 디렉터리 구조

```text
mini-react/
├── src/
│   ├── core/
│   │   ├── vnode.ts       # VNode 타입, h()
│   │   ├── dom.ts         # DOM ↔ VNode 변환
│   │   ├── diff.ts        # Diff 알고리즘, Patch 타입
│   │   ├── patch.ts       # Patch 적용, setProp
│   │   ├── history.ts     # History<T>, Undo/Redo
│   │   └── errors.ts      # PatchError
│   └── pages/
│       └── phase1/
│           ├── index.html
│           ├── main.ts
│           └── init.ts
├── tests/                 # 테스트 설계 및 검증 항목
└── docs/
    ├── SRS.md
    ├── SDD.md
    ├── SDD_one_page.md
    ├── design_map.svg
    └── adr/
```

### 2.2 모듈별 책임

| 모듈 | 책임 | DOM 접근 | 의존 |
|---|---|---|---|
| `vnode` | VNode 자료구조 및 생성 함수 제공 | 없음 | — |
| `dom` | DOM ↔ VNode 변환, 실제 DOM 노드 생성 | 읽기, 새 노드 생성 | `vnode` |
| `diff` | 이전·새 VNode 비교 및 Patch 목록 생성 | 없음 (순수 함수) | `vnode` |
| `patch` | Patch 목록을 실제 DOM에 적용 | 쓰기 | `vnode`, `dom`, `errors` |
| `history` | 상태 기록 및 Undo/Redo 위치 관리 | 없음 | — |
| `pages/phase1` | 입력·버튼 이벤트 처리 및 core 모듈 호출 | 화면 요소 조회 | `core` |

## 3. Phase 1 설계

Phase 1은 `HTML → VNode → Diff → Patch[] → 실제 DOM` 흐름으로 동작한다. Undo/Redo도 History에서 선택한 VNode와 현재 VNode를 비교한 뒤 동일한 Diff·Patch 경로를 사용해 화면을 갱신한다.

실제 영역을 `innerHTML`로 전체 교체하는 방식은 초기화 시점에만 사용한다. 이후 변경은 Patch를 통해 적용한다.

### 3.1 Virtual DOM 데이터 구조 (`core/vnode.ts`)

```typescript
export type PropValue = string | number | boolean | null;
export type Props = Record<string, PropValue>;

export interface VElement {
  type: 'element';
  tag: string;
  props: Props;
  children: VNode[];
  key?: string;
}

export interface VText {
  type: 'text';
  text: string;
}

export type VNode = VElement | VText;

export function h(
  tag: string,
  props?: Props | null,
  ...children: (VNode | string)[]
): VElement;
```

- `tag`는 소문자로 통일한다.
- `props`와 `children`은 항상 존재하도록 한다. 속성이 없으면 `{}`, 자식이 없으면 `[]`를 사용한다.
- `h()`에 문자열 자식이 전달되면 VText로 변환한다.
- `key`는 확장 가능성을 위한 필드이며 Phase 1의 기본 비교에서는 사용하지 않는다.
- VNode는 불변(immutable)으로 다룬다. History에 저장된 객체를 직접 수정하지 않는다.

### 3.2 DOM 변환 (`core/dom.ts`)

| 함수 | 입력 → 출력 | 역할 | FR / IR |
|---|---|---|---|
| `domToVNode(node: Node): VNode \| null` | DOM 노드 → VNode | Element와 Text 노드를 VNode로 변환한다. 지원하지 않는 노드는 제외한다. | FR-01, IR-04 |
| `htmlToVNode(html: string, rootTag = 'div'): VElement` | HTML 문자열 → 루트 VNode | HTML 문자열을 파싱하고 루트 VNode로 변환한다. | FR-02 |
| `createElement(v: VNode): Node` | VNode → 실제 DOM | VNode에 대응하는 새 DOM 노드를 생성한다. | FR-06 |
| `vnodeToHTML(v: VNode): string` | VNode → HTML 문자열 | VNode를 HTML 문자열로 변환한다. | FR-08 |

**정규화 규칙**

변환된 VNode의 자식 인덱스와 실제 DOM의 자식 인덱스가 일치해야 Patch의 `path`가 올바르게 동작한다.

1. 주석 노드와 공백만 포함하는 Text 노드는 제외한다.
2. 입력 HTML에서 실행 위험이 있는 `<script>` 요소와 `on*` 이벤트 속성을 제거한다.
3. 초기화 시 실제 영역을 VNode로 변환하고, 변환한 VNode를 기준으로 실제 영역을 초기화한다.
4. 초기화 이후에는 VNode와 실제 DOM의 자식 순서가 일치하도록 유지한다.

### 3.3 Diff (`core/diff.ts`)

```typescript
export type Path = number[];

export type Patch =
  | { type: 'CREATE'; path: Path; node: VNode }
  | { type: 'REMOVE'; path: Path }
  | { type: 'REPLACE'; path: Path; node: VNode }
  | { type: 'TEXT'; path: Path; text: string }
  | { type: 'PROPS'; path: Path; set: Props; remove: string[] };

export function diff(
  oldV: VNode | undefined,
  newV: VNode | undefined,
  path?: Path
): Patch[];
```

`Path`는 루트 노드부터 대상 노드까지의 자식 인덱스를 나타낸다. 빈 배열 `[]`은 루트 노드를 의미한다.

**비교 규칙**

| 조건 | 결과 | 관련 |
|---|---|---|
| 이전 노드 없음, 새 노드 있음 | CREATE | VT-04 |
| 이전 노드 있음, 새 노드 없음 | REMOVE | VT-04 |
| 노드 타입 또는 Element의 tag가 다름 | REPLACE (자식 비교 생략) | FR-06 |
| 두 노드가 Text이고 내용이 다름 | TEXT | FR-05 |
| 두 노드가 Element이고 속성이 다름 | PROPS | FR-05, VT-27 |
| Element의 자식 노드 | 인덱스별 재귀 비교 | FR-04 |
| 두 노드가 동일함 | 빈 배열 `[]` | VT-28 |

속성 변경은 추가·수정할 값을 `set`, 제거할 속성 이름을 `remove`에 기록한다.

Phase 1은 위치(index) 기반으로 자식 노드를 비교한다. 따라서 중간 삽입이나 삭제가 발생하면 이후 노드의 TEXT 또는 REPLACE 변경으로 표현될 수 있다. key 기반 비교와 MOVE Patch는 Phase 1의 기본 구현 범위에 포함하지 않는다.

TEXT와 PROPS는 노드 객체를 교체하지 않고 텍스트나 속성만 수정한다. 이를 통해 입력 요소를 불필요하게 교체하지 않고 기존 DOM 노드를 유지할 수 있다.

### 3.4 Patch (`core/patch.ts`)

```typescript
export interface PatchResult {
  applied: number;
}

export function applyPatches(
  root: Element,
  patches: Patch[]
): PatchResult;
```

Patch 적용 과정은 대상 노드를 찾는 단계와 실제 DOM을 변경하는 단계로 나눈다.

1. **해석(resolve):** DOM을 변경하기 전에 각 Patch의 `path`를 확인하고 대상 노드 또는 부모 노드를 찾는다. CREATE는 새 노드를 추가할 부모를 찾는다.
2. **적용(apply):** 해석 단계에서 확인한 대상을 기준으로 Patch를 적용한다.

해석 단계에서 대상 경로를 찾지 못하면 `PatchError`를 발생시키고 DOM을 변경하지 않는다(VT-31). 단, 실제 DOM 변경 단계에서 예외가 발생한 경우까지 자동으로 원상 복구하는 트랜잭션 보장은 별도 결정 및 검증이 필요하다.

| Patch | DOM 조작 | 노드 객체 유지 |
|---|---|---|
| CREATE | 부모 노드에 새 노드 추가 | 새 노드 생성 |
| REMOVE | 대상 노드 제거 | 제거 |
| REPLACE | 대상 노드를 새 노드로 교체 | 교체 |
| TEXT | 대상 Text 노드의 `nodeValue` 변경 | 유지 |
| PROPS | 속성 추가·수정·제거 | 유지 |

`setProp(el, name, value)`는 속성 이름과 값에 따라 DOM 속성 또는 프로퍼티를 갱신한다. `value`, `checked`처럼 폼 요소의 상태와 관련된 값은 프로퍼티 갱신을 고려한다. 현재 값과 동일한 경우 불필요한 갱신을 수행하지 않는다.

오류 타입인 `PatchError`는 `core/errors.ts`에서 정의하고 `patch.ts`에서 사용한다.

### 3.5 History (`core/history.ts`)

```typescript
export class History<T> {
  constructor(initial: T, limit = 100);

  get current(): T;

  push(state: T): void;

  undo(): T | null;

  redo(): T | null;

  goTo(index: number): T | null;

  canUndo(): boolean;

  canRedo(): boolean;

  get size(): number;
}
```

- 초기 상태를 0번 기록으로 저장한다.
- `push(state)`는 현재 위치 뒤에 있는 기록을 삭제한 후 새 상태를 추가한다(TBD-01).
- `undo()`는 이전 상태를 반환한다. 첫 번째 기록에서는 `null`을 반환한다.
- `redo()`는 다음 상태를 반환한다. 마지막 기록에서는 `null`을 반환한다.
- `goTo(index)`는 지정한 위치의 상태를 반환한다. 범위를 벗어나면 `null`을 반환한다.
- 기록 개수가 제한값을 초과하면 가장 오래된 기록부터 제거한다.
- VNode 기록은 불변 객체로 취급한다.

Patch 목록이 비어 있는 경우 History에 새 기록을 추가하지 않는다(VT-29). 이 정책은 SRS FR-07의 기록 조건과 일치하는지 검토해야 한다.

현재 선택된 기록이 화면에 표시되는 상태다. 첫 번째 기록에서는 Undo를 비활성화하고 마지막 기록에서는 Redo를 비활성화한다. 이전 상태로 이동한 후 새 상태를 추가하면 현재 위치 뒤의 기록을 삭제한다(ADR-0002).

### 3.6 Phase 1 검증 페이지 (`pages/phase1`)

페이지는 입력과 버튼 이벤트를 처리하고 core 모듈을 호출한다. 실제 DOM 변경은 `core/patch.ts`를 통해 수행한다.

| UI 요소 | 동작 | FR / IR / VT |
|---|---|---|
| 실제 영역 `#real` | 제목, 목록, input, 스크롤 박스 등을 포함한 샘플 HTML을 표시한다. Patch를 통해 갱신한다. | FR-01, VT-33 |
| 테스트 영역 `#editor` (textarea) 및 `#preview` | HTML 입력에 따라 미리보기를 갱신한다. 실제 영역은 변경하지 않는다. | FR-02, IR-01, VT-34 |
| Patch 버튼 | 입력 HTML을 VNode로 변환하고, 현재 History 상태와 비교해 Patch를 적용한다. 성공적으로 적용한 뒤 History에 새 상태를 기록한다. | FR-03, IR-02 |
| Undo / Redo 버튼 | History에서 이전 또는 다음 상태를 선택하고, 현재 VNode와 비교해 Patch를 적용한다. 테스트 영역의 입력값도 선택한 상태에 맞게 갱신한다. | FR-08, IR-03 |
| 기록 표시 | 현재 기록 위치와 전체 기록 개수를 표시한다. | FR-07 |
| Patch 로그 | 마지막 Diff 결과인 Patch 목록을 JSON 형태로 표시한다. | VT-05, 시연용 |

**실행 흐름**

- Patch: `htmlToVNode(editor)` → `diff(history.current, next)` → `applyPatches(real, patches)` → `history.push(next)`
- Undo/Redo: History에서 대상 상태 선택 → 현재 상태와 대상 상태의 Diff 생성 → Patch 적용 → 테스트 영역 갱신

Undo/Redo에서 History 위치 변경과 DOM Patch 적용 중 하나만 성공하는 상황을 방지할 방법은 구현 전에 확정해야 한다. 특히 Patch 적용 실패 시 History 위치를 어떻게 복구할지 ADR 또는 설계 결정으로 남긴다.
