# 미니 React 소프트웨어 설계 문서 — Phase 2 (Component, State, Hooks)

2026-11-10 · v0.5 · 프로젝트 팀 (초안: AI, 검토·결정: 팀)

> 공통 설계(아키텍처, 하네스, 역할)와 Phase 1은 `SDD.md`에 있다. 이 문서는 SDD v0.3의 4장을 Phase 1 최종 설계(`SDD.md` 3장)에 맞춰 고쳐 분리한 것이다.

## 1. 개요와 수정 판단

### 1.1 범위

State는 루트 컴포넌트 하나만 가지고, 자식은 Props만 받는 순수 함수다 (FR-15, FR-21, CON-06). State가 바뀌면 루트를 다시 실행해 새 VNode를 만들고, **Phase 1의 `diff` + `applyPatch`로만** 화면을 바꾼다 (FR-22, C-08).

| 항목 | 내용 |
| --- | --- |
| 기준 문서 | SRS v1.3 (FR-10~FR-23, IR-07, IR-08, CON-06, VT-10~VT-19, TBD-05), `SDD.md` v0.5 3장, ADR-0009, ADR-0010 |
| 문서 상태 | Draft: ADR-0009, ADR-0010이 accepted가 되면 확정 |

### 1.2 Phase 2를 고쳐야 하는가

**고친다.** 근거는 두 가지이고, 무게가 다르다.

**근거 1 (주된 근거): Phase 1 인터페이스가 바뀌었다.** C-08과 FR-22는 Phase 2가 Phase 1의 Virtual DOM, Diff, Patch를 **그대로** 쓰라고 한다. v0.3의 Phase 2는 지운 설계(구 eungi adr_004·005)의 인터페이스 위에 서 있었으므로, Phase 1이 somage 설계로 바뀐 이상 Phase 2도 따라 바뀌어야 한다.

| v0.3 Phase 2가 쓰던 것 | 최종 Phase 1 (`SDD.md`) | Phase 2에서 바뀌는 곳 |
| --- | --- | --- |
| `VElement.props` (이벤트 함수 포함) | `attrs`(문자열) + `key` + `on`(Phase 2 전용) | 2.1 `h()` |
| `diff()` → `Patch[]` (path) | `diff()` → `{ changes, pairs }` (이전 객체 참조) | 2.2 `update()` |
| `applyPatches(container, patches)` | `applyPatch(result)` (확인 → 적용 → `dom` 복사 → 기록) | 2.2 `update()` |
| `container.appendChild(createElement(next))` | `mountTree(container, next)` (그리기 + `dom` 기록) | 2.2 `mount()` |
| 이벤트: 매 렌더 PROPS 패치 + 고정 리스너 | `on`은 Diff가 보지 않고 Patch가 동기화 | 2.5 |
| key 미사용 | key 짝짓기 (FR-09) | 2.1, 2.8 (목록 항목에 key) |

**근거 2 (보조 근거): 팀 설계 검토([블로그 97](https://eutopiaa.tistory.com/97)) 중 일부 항목이 같은 원리로 Phase 2에도 적용된다.** 이 글은 Phase 1 History 검토다. Phase 2는 History와 코드 입력칸을 쓰지 않으므로(C-08은 Virtual DOM·Diff·Patch만 재사용을 요구), 항목마다 적용 여부를 따로 판단했다.

| 피드백 항목 | Phase 2 해당 | 반영 | 근거 |
| --- | --- | --- | --- |
| 첫 로드 상태를 0번 기록으로 | 아니오 | 반영 안 함 | Phase 2는 History를 쓰지 않는다 |
| 이동도 Diff·Patch로, "이전" 쪽은 언제나 **지금 트리** | **예** | **반영** | `update()`의 "이전"은 마지막으로 그려진 `this.vnode`이고, 이것만 정확한 `dom`을 가진다. 같은 원리다 (2.2) |
| `canUndo()`/`canRedo()`로 버튼 끄기 | 아니오 | 반영 안 함 | 이동 버튼이 없다 |
| "저장된 객체를 수정하지 않는다" 문장 수정 | **예** | **반영** | v0.3 4.8은 "Phase 2가 Phase 1 자료구조를 바꾸지 않는다"고 했지만, Patch는 `next`에 `dom`을 써 넣는다. "화면 데이터와 `key`는 바꾸지 않고, `dom`·`on` 동기화는 Patch만 한다"로 고친다 (2.9) |
| 이동 시 미리보기 갱신 누락 | 아니오 | 반영 안 함 | 미리보기가 없다 |
| 변경 없는 Patch는 기록하지 않는다 (k1) | **일부** | **일부 반영** | 기록할 History는 없다. 하지만 "변경이 0개여도 `applyPatch`를 불러 `dom`을 이어받는다"는 같은 이유로 `update()`에도 필요하다 (2.2) |
| Patch하지 않은 수정이 있으면 이동 금지 (m3·n2) | 아니오 | 반영 안 함 | 코드 입력칸이 없다. State는 setter로만 바뀌고 바로 다시 그려진다 |

## 2. 설계

### 2.1 컴포넌트와 VNode 생성 (`component/h.ts`)

```typescript
export type Props = Record<string, unknown> & { key?: string | number; children?: VNode[] };
export type Component<P = {}> = (props: P & { children: VNode[] }) => VElement;
export type Child = VNode | string | number | boolean | null | undefined | Child[];

// Phase 1의 h를 확장: tag가 함수면 자식 컴포넌트로 즉시 실행해 VNode로 펼친다
export function h<P>(tag: string | Component<P>, props?: (P & Props) | null, ...children: Child[]): VElement;
```

`h()`는 props를 성격에 따라 VNode의 키 무리(`SDD.md` 3.1)로 나눠 담는다. ADR-0001의 "성격이 다른 정보는 섞지 않는다" 원칙을 Phase 2로 넓힌 것이다.

| props | VNode에 들어가는 곳 | 예 |
| --- | --- | --- |
| `key` | `key` (문자열로) | `h(TodoItem, { key: t.id })` |
| `on`으로 시작하고 값이 함수 | `on[이벤트 이름 소문자]` | `onClick` → `on.click` |
| 값이 `null`, `undefined`, `false` | 넣지 않는다 | `disabled: false` |
| 값이 `true` | `attrs[이름] = ''` | `checked: true` |
| 그 밖 | `attrs[이름] = String(값)` | `class: 'done'`, `value: 3` |

| children | 처리 |
| --- | --- |
| `string`, `number` | 글자 노드. 공백 정리는 하지 않는다 (`dom_to_vdom`을 거치지 않으므로) |
| `null`, `undefined`, `boolean` | 건너뛴다 (`cond && h(…)` 조건부 렌더링) |
| 배열 | 펼친다 (`todos.map(…)`) |

- 자식 컴포넌트는 `h(TodoItem, { key, todo, onToggle })`로 호출된다. `h` 안에서 `renderingChild`를 올리고 실행한 뒤 내린다. 이 값이 0보다 크면 Hook 호출은 오류다 (2.7).
- 컴포넌트 호출에 `key`가 있으면 그 컴포넌트가 돌려준 루트 요소의 `key`로 붙인다. 그래서 목록 항목 컴포넌트도 FR-09의 key 짝짓기를 받는다 (React와 같은 의미).
- 결과 VNode에는 컴포넌트 함수가 남지 않는다. `diff`는 Phase 1과 똑같이 순수 VNode만 비교한다.
- `on`은 `diff`가 보지 않는다. `h()`가 HTML을 거치지 않으므로 ADR-0014의 `on*` 정제와 충돌하지 않는다.
- 선택사항: JSX를 쓰려면 `tsconfig`의 `jsxFactory: "h"`로 연결한다.

### 2.2 FunctionComponent (`component/function-component.ts`)

```typescript
type HookSlot =
  | { kind: 'state';  value: unknown }
  | { kind: 'effect'; deps?: unknown[]; cleanup?: () => void; pending?: () => void | (() => void) }
  | { kind: 'memo';   deps: unknown[]; value: unknown };

export class FunctionComponent<P> {
  hooks: HookSlot[] = [];
  hookIndex = 0;
  renderCount = 0;                 // VT-10, VT-19 검증용
  private vnode: VElement | null = null;   // 지금 화면에 그려진 트리 (dom 있음)

  constructor(private fn: Component<P>, private props: P, private container: Element);
  mount(): void;                   // 최초 렌더 + mountTree + effect
  update(): void;                  // 재렌더 + diff + applyPatch + effect
  unmount(): void;                 // effect cleanup 후 unmountTree
}

export function render<P>(fn: Component<P>, props: P, container: Element): FunctionComponent<P>;
```

렌더 한 번의 순서 (`mount`와 `update` 공통):

1. `currentComponent = this`, `hookIndex = 0`
2. `next = fn(props)` 실행. Hook은 `hooks[hookIndex++]`를 읽고 쓴다.
3. 호출된 Hook 개수가 이전 렌더와 다르면 `HookOrderError` (2.7)
4. `currentComponent = null`
5. 화면 반영 (모두 `core/patch.ts`를 거친다. 실제 DOM을 바꾸는 코드는 patch.ts뿐이라는 `SDD.md` 2장 규칙 그대로)
   - mount: `mountTree(this.container, next)` — `vnodeToDom(next)`를 컨테이너에 **한 번** 붙이고 `recordDom`으로 `dom`을 기록하고 `on`을 연결한다 (ADR-0003, ADR-0005 F1)
   - update: `applyPatch(diff(this.vnode, next))` — **변경이 0개여도 부른다.** 짝 목록대로 `dom`을 이어 주고 `on`을 동기화해야 다음 렌더가 동작하기 때문이다 (블로그 97 k1 항목의 Phase 2 대응)
6. `this.vnode = next` — Patch가 `dom`을 채운 **바로 그 객체**를 지금 트리로 둔다. 복사하지 않는다. 다음 `update()`의 "이전" 쪽이 된다 (블로그 97 "이전 = 지금 트리" 항목)
7. `renderCount++`
8. pending effect를 순서대로: 이전 cleanup 실행 → effect 실행 → 반환값을 cleanup으로 저장 (FR-18)

- 루트 요소의 `tag`가 바뀌면 `replace`로 교체된다. 루트의 부모는 컨테이너이고 컨테이너는 고정이다 (Phase 1의 "틀"과 같은 역할).
- `unmount`: 모든 cleanup 실행 → `unmountTree(this.vnode)`(`vnode.dom.remove()`) → `this.vnode = null`.

![Phase 2 한 바퀴](./img/loop.png)

> 그림 갱신 필요: `loop.png`의 ④를 "diff → `{ changes, pairs }` → applyPatch"로 고쳐야 한다.

파란 칸(④)이 Phase 1에서 만든 Diff와 Patch를 그대로 다시 쓰는 자리다 (FR-22). ②에서 변경을 모아 두기 때문에 버튼 한 번에 값이 여러 개 바뀌어도 ③~⑤는 한 번만 돈다 (ADR-0009).

### 2.3 Hooks (`component/hooks.ts`)

```typescript
export type SetState<T> = (next: T | ((prev: T) => T)) => void;

export function useState<T>(initial: T | (() => T)): [T, SetState<T>];
export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
export function useMemo<T>(factory: () => T, deps: unknown[]): T;

// 공통: 이전 deps가 없거나, 길이가 다르거나, 하나라도 Object.is로 다르면 true
export function depsChanged(prev: unknown[] | undefined, next: unknown[] | undefined): boolean;
```

| Hook | 최초 렌더 | 재렌더 | FR / VT |
| --- | --- | --- | --- |
| `useState` | `initial`(함수면 실행 결과)을 슬롯에 저장, `[value, setter]` 반환 | 슬롯 값 반환. setter는 컴포넌트·인덱스에 묶인 같은 함수 | FR-16, VT-12 |
| setter | — | 새 값 계산(함수면 `prev`로 실행) → `Object.is`로 같으면 무시 → 다르면 저장 후 `scheduleUpdate` | FR-17, IR-08, VT-13 |
| `useEffect` | effect를 pending에 등록 | `deps` 없음: 매번 등록 / `[]`: 등록 안 함 / 그 외: `depsChanged`일 때만 등록 | FR-18, FR-19, VT-14 |
| `useMemo` | `factory()` 결과와 deps 저장 | `depsChanged`면 재계산, 아니면 저장된 값 반환 | FR-20, VT-15 |

- Effect는 Patch 직후 동기적으로 실행한다. React는 페인트 이후 비동기로 실행하나, 테스트를 단순하게 하려고 단순화했다.
- `useMemo`가 VNode 조각을 돌려주면 같은 객체가 이전 트리와 새 트리에 함께 들어간다. 이때 짝은 (x, x)이고 `dom` 복사는 `x.dom = x.dom`이라 안전하다. 그 조각이 삭제됐다가 나중에 다시 추가되면 남아 있던 `dom`은 `recordDom`이 덮어쓴다.

**"함수는 매번 새로 실행되는데, 상태는 어떻게 유지할까?"** (LMS 핵심 질문)

부품 함수 안의 변수는 함수가 끝나면 사라진다. 그래서 값을 함수 밖, 부품마다 하나씩 있는 사물함 줄(`hooks` 배열)에 넣어 둔다. 함수가 다시 실행되면 `useState`를 부른 **순서**대로 1번 사물함, 2번 사물함을 열어 지난 값을 꺼낸다.

1. 처음 실행: `useState(0)` → 1번 사물함에 0을 넣고 0을 돌려준다.
2. 버튼 클릭: setter가 1번 사물함 값을 1로 바꾸고 다시 그리기를 예약한다.
3. 다시 실행: `useState(0)`을 또 부르지만, 1번 사물함에 이미 1이 있으므로 초기값 0은 무시하고 1을 돌려준다.

사물함을 "번호(순서)"로 찾기 때문에 Hook을 if문 안에서 부르면 번호가 밀려 다른 값을 꺼내게 된다. 이것이 Hook 호출 규칙(2.7, FR-21)이 필요한 이유다.

### 2.4 스케줄러와 Batching (`component/scheduler.ts`, TBD-05, ADR-0009)

```typescript
export function scheduleUpdate(c: FunctionComponent<any>): void {
  dirty.add(c);
  if (!flushQueued) { flushQueued = true; queueMicrotask(flush); }
}
function flush(): void { flushQueued = false; for (const c of dirty) c.update(); dirty.clear(); }
export function flushSync(): void;   // 테스트용: 대기 중인 업데이트 즉시 실행
```

- 한 이벤트 핸들러에서 setter를 3번 호출해도 microtask 한 번에 `update()` 1회, `renderCount`는 1 증가 (VT-19).
- 렌더 중 setter 호출은 다음 microtask로 미루고 `console.warn`을 남긴다. 무한 루프 방지를 위해 연속 50회를 넘으면 오류를 던진다.
- ADR-0009가 기각되면 `scheduleUpdate`에서 `c.update()`를 바로 부르도록 한 줄만 바꾼다.

### 2.5 이벤트 처리 (`on` 동기화)

v0.3은 매 렌더마다 새 클로저 때문에 PROPS 패치가 생기고, DOM은 바꾸지 않는 패치로 처리했다. 최종 설계는 핸들러를 `on`이라는 별도 키에 두고 **Diff가 보지 않게** 한다.

| 단계 | 하는 일 |
| --- | --- |
| `recordDom` (새로 만든 노드) | `on`이 있으면 `el.__handlers = { ...on }`, 이벤트 종류마다 고정 리스너 `dispatch`를 한 번 `addEventListener` |
| `dom` 복사 (짝 목록의 노드) | `el.__handlers`를 새 `on`으로 바꾼다. 새로 생긴 이벤트 종류는 리스너를 붙이고, 사라진 종류는 뗀다 |
| `dispatch(e)` | `e.currentTarget.__handlers[e.type]?.(e)` |

- 핸들러만 바뀐 렌더는 `changes`가 0개이고 DOM 기록도 0건이다. 그래서 "변경 목록 개수 = 조작 횟수"(NFR-01)가 Phase 2에서도 그대로 성립한다.
- 짝 목록을 한 번 더 도는 비용은 JavaScript 객체 대입뿐이고 DOM 쓰기가 아니다.
- Phase 1에는 `on`이 없으므로(ADR-0014가 `on*` 속성을 거름) 이 동기화는 아무 일도 하지 않는다.
- 이 코드는 `core/patch.ts` 안에 있다. Phase 2 전용 키지만 DOM을 바꾸는 코드는 patch.ts 한 곳이라는 규칙이 우선한다.

### 2.6 입력칸 (`value`, `checked`)

`TodoInput`처럼 State로 입력칸 값을 정하는 경우, 타이핑 → setter → 다시 렌더 → `attrs.value` 변경이 매 글자마다 일어난다. `SDD.md` 3.4의 `value`·`checked`·`selected` 규칙(CF-10)이 이 경우를 처리한다.

- `attrs` 변경으로 `value`가 나오면 `setAttribute`와 함께 프로퍼티도 쓰되, **현재 프로퍼티 값과 다를 때만** 쓴다. 사용자가 방금 친 값과 State 값이 같으면 프로퍼티를 다시 쓰지 않으므로 커서가 튀지 않는다 (FR-04).
- `checked: false`는 `h()`에서 `attrs`에 넣지 않으므로 `remove`로 나오고, Patch는 `removeAttribute`와 함께 프로퍼티를 `false`로 쓴다.

### 2.7 Hook 호출 규칙 검사 (FR-21, ADR-0010)

| 위반 | 감지 방법 | 결과 |
| --- | --- | --- |
| 컴포넌트 밖에서 호출 | `currentComponent === null` | `HookCallError` |
| 자식 컴포넌트에서 호출 | `renderingChild > 0` | `HookCallError` |
| 조건문·반복문 안에서 호출 (호출 수 변화) | 렌더 후 `hookIndex !== hooks.length` | `HookOrderError` |
| 순서 변경 (같은 인덱스의 종류 불일치) | `hooks[i].kind !== 요청 kind` | `HookOrderError` |

개수와 종류가 우연히 같은 조건부 호출은 런타임에 잡을 수 없다. 이 한계는 코드 리뷰(VT-22) 항목으로 보완한다. 오류 클래스는 `component/errors.ts`에 둔다 (`core/errors.ts`는 core 전용, `SDD.md` 2장 의존 방향).

### 2.8 Phase 2 테스트 페이지 (`pages/phase2`, FR-23, IR-07)

할 일 목록 앱으로, 각 화면 요소가 하나의 검증 항목을 보여 준다.

| 컴포넌트 | 역할 | 사용 Hook / Props | VT |
| --- | --- | --- | --- |
| `App` (루트) | `todos`, `input`, `filter` State 소유 | useState ×3, useMemo(필터 결과, 통계), useEffect(`document.title`, 로그) | VT-12~VT-15 |
| `TodoInput` | 입력칸 + 추가 버튼 | Props: `value`, `onInput`, `onAdd` | VT-11, VT-18 |
| `TodoList` / `TodoItem` | 목록, 완료 토글, 삭제. **`TodoItem`마다 `key: todo.id`** | Props: `todos`, `onToggle`, `onRemove` | VT-11, VT-17 |
| `Header` | 남은 개수 표시 | Props: `stats` | VT-11 |
| `FilterBar` | 전체/진행/완료 | Props: `filter`, `onChange` | VT-15 |
| `DebugPanel` | renderCount, memo 재계산 횟수, effect 로그, 남은 개수, 마지막 `changes` | Props: `stats`, `log` | VT-17, VT-19 |
| "한 번에 3개 추가" 버튼 | setter 3회 호출 | — | VT-19 |

- `TodoItem`에 key를 주므로 맨 앞 항목을 지우거나 순서를 바꿔도 각 줄의 체크 상태와 포커스가 자기 항목을 따라간다 (FR-09를 Phase 2에서 시연).
- 남은 개수는 `Header`와 `DebugPanel` 두 곳에 표시된다. 표시 장소를 하나 더해도 setter(추가·토글·삭제) 코드는 고치지 않는다. issue.md FR-11·FR-12(SRS 미반영, TBD-10)를 이 페이지로 보여 줄 수 있다.

### 2.9 자료구조 관계와 Phase 1 → 2 확장

| 자료구조 | 소유자 | 참조하는 것 | Phase 2에서 달라지는 점 |
| --- | --- | --- | --- |
| `VNode` | 페이지(Phase 1), `FunctionComponent.vnode`(Phase 2) | 자식 `VNode[]`, `dom` | `VElement`에 `on`(동작 무리)이 생긴다. 다른 키는 그대로 |
| `DiffResult` | `diff`가 만들고 `applyPatch`가 즉시 소비 | 이전·새 VNode 객체 | 변화 없음 (FR-22) |
| `History<VNode>` | Phase 1 페이지 | VNode 트리 | Phase 2에서는 사용 안 함 |
| `FunctionComponent` | `render()` 호출자 | `Component` 함수, `HookSlot[]`, 지금 트리, 컨테이너 | Phase 2 신규 |
| `HookSlot` | `FunctionComponent.hooks` | State 값, effect deps·cleanup, memo 값 | Phase 2 신규 |

핵심은 Phase 2가 Phase 1 자료구조 위에 쌓는다는 점이다. 다만 v0.3의 "Phase 1 자료구조를 바꾸지 않는다"는 정확하지 않았다. 고쳐 쓰면 다음과 같다 (블로그 97 반영).

> Phase 2는 VNode의 **화면 데이터(다섯 키)와 `key`를 만든 뒤 바꾸지 않는다.** `dom` 기록과 `on` 동기화는 Patch만 하며, `dom`은 지금 화면에 그려진 트리(`this.vnode`)에서만 믿는다.

## 3. 예외 처리 및 경계 조건 (Phase 2)

Phase 1 항목은 `SDD.md` 5장에 있다.

| 상황 | 모듈 | 정의된 처리 결과 | VT |
| --- | --- | --- | --- |
| 컴포넌트 밖 / 자식에서 Hook 호출 | hooks | `HookCallError` | VT-16 |
| 렌더마다 Hook 개수·종류 변화 | hooks | `HookOrderError` | VT-16 |
| setter에 이전과 같은 값 | hooks | 재렌더 없음 (`renderCount` 변화 없음) | VT-13 |
| unmount 후 setter 호출 | hooks | 무시 + `console.warn` | VT-21 |
| effect 함수 안에서 오류 | component | 다른 effect는 계속 실행, 오류는 `console.error` | VT-21 |
| 렌더 중 setter 연속 50회 초과 | scheduler | `Error('Too many re-renders')` | VT-21 |
| 컴포넌트가 `VElement`가 아닌 값을 반환 | h | `TypeError` | VT-21 |
| 목록 항목에 같은 key | diff | `console.warn`, 그 부모는 자리 비교 (Phase 1 규칙 그대로) | VT-21 |
| 핸들러만 바뀐 렌더 | patch | `changes` 0개, DOM 기록 0건, `on`만 동기화 | VT-17 |

## 4. 검증 설계 (Phase 2)

무엇이 합격인지는 SRS 4.2(VT-10~VT-19)가 기준이다. 테스트 환경과 측정 도구는 `SDD.md` 6.1·6.3과 같다.

| 파일 | SRS VT | 핵심 확인 |
| --- | --- | --- |
| `tests/unit/h.test.ts` | VT-11 | props가 `key`·`on`·`attrs`로 나뉜다, 컴포넌트 key가 루트에 붙는다, `null`·`false` 자식은 빠진다 |
| `tests/unit/component.test.ts` | VT-10, VT-11 | `render` 후 DOM 생성, `update` 후 `renderCount === 2`, 자식 출력에 Props 값 |
| `tests/unit/hooks.test.ts` | VT-12, VT-14, VT-15, VT-16 | 2.3 표, 2.7 표 |
| `tests/integration/phase2.test.ts` | VT-13, VT-17, VT-19 | setter → 화면 갱신, `diff`·`applyPatch` spy 각 1회 호출·`innerHTML` 대입 없음, 핸들러만 바뀐 렌더의 DOM 기록 0건, setter 3회 → `renderCount` +1 |
| `SDD.md` 6.5 체크리스트에 추가 | VT-18 | Phase 2 페이지에서 추가·토글·삭제·필터가 즉시 반영되고, 항목 삭제 후에도 다른 줄의 체크·포커스가 유지된다 |

**L4 불변식 (Phase 2)**

| 불변식 | 의미 | 근거 |
| --- | --- | --- |
| 같은 deps로 k회 렌더 → useMemo factory 1회 | 계산 결과를 재사용한다 | FR-20 |
| 한 microtask 안 setter m회 → `renderCount` +1 | Batching | ADR-0009 |
| 임의의 State 변화 순서 후 `equalScreen(domToVNode(컨테이너 첫 자식), 마지막 렌더 결과)` | Phase 2 화면이 항상 마지막 렌더와 같다 | FR-14, FR-22 |
| 핸들러만 다른 두 렌더 사이 DOM 기록 0건 | `on`은 화면 데이터가 아니다 | 2.5, NFR-01 |

## 5. 추적성 (Phase 2)

| SRS ID | 설계 요소 | 절 | ADR | VT |
| --- | --- | --- | --- | --- |
| FR-10 | 컴포넌트는 VNode만 반환, DOM 조작은 patch.ts만 | 2.1, 2.2 | 0012 (L2 규칙) | VT-22 |
| FR-11 | `FunctionComponent`, `hooks`, `mount`/`update` | 2.2 | 0010 | VT-10 |
| FR-12 | `render` → `mountTree` | 2.2 | 0003 | VT-10 |
| FR-13 | `h(Component, props)` | 2.1 | — | VT-11 |
| FR-14 | setter → `scheduleUpdate` → `update` | 2.2, 2.4 | 0009 | VT-13 |
| FR-15 | 루트 전용 State, 자식은 Props만 | 1.1, 2.8 | 0010 | VT-11 |
| FR-16 | `useState` | 2.3 | 0010 | VT-12 |
| FR-17 | setter | 2.3 | 0010 | VT-13 |
| FR-18 | effect를 Patch 직후 실행 | 2.2 (8단계), 2.3 | — | VT-14 |
| FR-19 | `depsChanged` | 2.3 | — | VT-14 |
| FR-20 | `useMemo` | 2.3 | — | VT-15 |
| FR-21 | `HookCallError`, `HookOrderError` | 2.7 | 0010 | VT-16 |
| FR-22 | `update()` 안의 `diff` + `applyPatch` | 2.2 | 0004, 0005 | VT-17 |
| FR-23 | 할 일 목록 테스트 페이지 | 2.8 | — | VT-18 |
| IR-07 | Phase 2 페이지의 입력·버튼 | 2.8 | — | VT-18 |
| IR-08 | setter | 2.3 | 0010 | VT-13 |
| CON-06 | 루트 전용 State | 1.1, 2.7 | 0010 | VT-11, VT-16 |
| TBD-05 | microtask Batching | 2.4 | 0009 | VT-19 |

**issue.md의 Phase 2 요구사항과의 대응** (번호가 SRS와 다르다. SRS 5.1.4)

| issue.md | 이 문서에서 충족하는 곳 |
| --- | --- |
| FR-10 선언적 화면 | 2.1, 2.2 |
| FR-11 표시 장소 자동 갱신 | 2.2, 2.8 (`Header`·`DebugPanel`) |
| FR-12 표시 장소 추가 시 상태 코드 무수정 | 2.8 (SRS에 대응 항목 없음, TBD-10) |
| FR-13 조각 재사용 3회 이상 | 2.1, 2.8 (`TodoItem`) |
| FR-14 같은 데이터 같은 값 | 1.1 (루트 전용 State) |
| FR-15 재계산 후 상태 유지 | 2.3 |
| FR-16 여러 상태가 섞이지 않음 | 2.3, 2.7 |
| FR-17 화면 밖 작업 | 2.3 (`useEffect`) |
| FR-18 오래 걸리는 계산 | 2.3 (`useMemo`) |

## 부록 A. 파일별 함수 명세표 — Phase 2

| 파일 | 함수 | 받는 것 (입력) | 돌려주는 것 (출력) | 하는 일 | 요구사항 |
| --- | --- | --- | --- | --- | --- |
| component/h.ts | `h(tag \| Component, props, ...children)` | 태그 또는 부품 함수, props, 자식 | `VElement` | 부품이면 실행해서 설계도로 펼치고, props를 `key`·`on`·`attrs`로 나눈다 | FR-12, FR-13 |
| component/function-component.ts | `render(fn, props, container)` | 루트 부품, Props, 넣을 자리 | `FunctionComponent` | 앱을 처음 화면에 올린다 | FR-11, FR-12 |
| component/function-component.ts | `mount()` / `update()` / `unmount()` | 없음 | 없음 | 처음 그리기 / 바뀐 곳만 다시 그리기 / 치우기 | FR-11, FR-14, FR-22 |
| component/hooks.ts | `useState(initial)` | 처음 값 | `[값, 바꾸는 함수]` | 점수판 하나를 만든다 | FR-16, FR-17 |
| component/hooks.ts | `useEffect(effect, deps)` | 할 일, 지켜볼 값 목록 | 없음 | 그린 뒤에 할 일을 예약한다. 지켜보는 값이 바뀔 때만 | FR-18, FR-19 |
| component/hooks.ts | `useMemo(factory, deps)` | 계산 함수, 지켜볼 값 목록 | 계산 결과 | 값이 그대로면 지난 계산을 다시 쓴다 | FR-20 |
| component/hooks.ts | `depsChanged(prev, next)` | 지난 목록, 새 목록 | `true`/`false` | 지켜보는 값이 하나라도 바뀌었는지 본다 | FR-19, FR-20 |
| component/scheduler.ts | `scheduleUpdate(component)` | 부품 | 없음 | "다시 그려야 함"을 메모하고 한 번만 예약한다 | FR-14, ADR-0009 |
| component/scheduler.ts | `flushSync()` | 없음 | 없음 | 예약된 그리기를 지금 바로 한다 (테스트용) | VT-19 |
| component/errors.ts | `HookCallError`, `HookOrderError` | 메시지 | 오류 객체 | Hook 규칙 위반 종류를 알려 준다 | FR-21 |
| core/patch.ts | `mountTree(container, v)` / `unmountTree(v)` | 넣을 자리, 설계도 | 없음 | 처음 그린 블록 묶음을 붙이고 위치를 메모한다 / 떼어 낸다 | FR-12, FR-22 |
| pages/phase2/App.ts | `App`, `TodoInput`, `TodoList`, `TodoItem`, `Header`, `FilterBar`, `DebugPanel` | Props | `VElement` | 할 일 목록 화면을 이루는 부품들 (2.8) | FR-23 |

## 부록 B. 원리 설명 질문 카드 — Phase 2

| 모듈 | 질문 | 힌트 |
| --- | --- | --- |
| 부품 (component) | 자식 부품에서 `useState`를 부르면 왜 오류가 날까? | ADR-0010, 2.7 |
| 부품 (component) | `update()`에서 바뀐 게 없어도 `applyPatch`를 부르는 이유는? | 2.2 5단계 |
| 부품 (h) | 이벤트 핸들러는 왜 `attrs`가 아니라 `on`에 둘까? 매 렌더 새 함수가 생기면 무슨 일이 생길까? | 2.1, 2.5 |
| 부품 (h) | 목록 항목 부품에 key를 주지 않으면 맨 앞 항목을 지울 때 무슨 일이 생길까? | 2.8, `SDD.md` 3.3 |
| 부품 (hooks) | Hook을 if 문 안에서 부르면 왜 값이 섞일까? | 2.3, 2.7 |
| 부품 (hooks) | `useEffect(fn, [])`와 `useEffect(fn)`은 언제 실행될까? | 2.3 표 |
| 예약 (scheduler) | 버튼 한 번에 값을 3번 바꾸면 화면은 몇 번 다시 그려질까? 왜? | ADR-0009, 2.4 |
