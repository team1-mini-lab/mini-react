# 미니 React 최종 소프트웨어 설계 문서 — Phase 2 (Component · State · Hooks · Batching · Todo App)

2026-11-10 · **Final v1.2** · 프로젝트 팀 · 기준 요구사항: SRS v1.4 (`docs/SRS_fixed.md`)

> **v1.2 변경 (2026-11-10)**: 구현하며 정한 것을 8장에 적고 7장 1·5번을 해소로 표시. 이 장은 2.1·2.5·3.1·3.2 #4보다 우선한다. 구현·테스트 완료(Phase 2 테스트 53개, 전체 173개 통과).
>
> **v1.1 변경 (2026-11-10)**: SRS v1.4 ID 추적표와 VT별 테스트 위치(6장), Todo 페이지를 포함해 React·JSX 0(1.1), Hook 개수 증가 감지(2.4 ①, ADR-0010 HR4와 일치), 설계 검토 필요 항목(7장) 추가. 그 밖의 결정은 바꾸지 않았다.
>
> 공통 내용은 `SDD_final_common.md`에 있다.
>
> **문서 상태**: ADR-0009·0010·0015는 proposed다. accepted가 될 때까지 팀 검토 대상이다.

> **기준 및 출처 안내**
> - 본 문서는 `SDD_fixed_phase2.md`(v0.5)를 바탕으로 **Phase 1 최종 엔진(`SDD_final_phase1.md`)** 위에 **통합 ADR (`ADR-0001`, `ADR-0004`, `ADR-0005`, `ADR-0006`, `ADR-0009`, `ADR-0010`, `ADR-0015`)**, 요구사항 명세 **`docs/requirements/issue.md` (및 SRS v1.3)**, 팀 설계 검토 일지 **`피드백 03~06` (`eutopiaa.tistory.com/99~102` 내용 전문 수록)**을 전수 통합한 **Phase 2 최종 단일 설계 기준서**이다.
> - *외부 티스토리 링크(`eutopiaa.tistory.com/98~102`)는 직접 웹 크롤링할 수 없으나, 해당 글의 원문·결정·테스트 목록이 저장소 `docs/reviews/feedback-02 ~ feedback-06.md` 및 `docs/adr/ADR-*.md`에 있으며, 반영 여부는 하네스 `check:docs`(`SDD_final_phase1.md` 10.2)로 확인한다.*

---

## 0. `SDD_fixed_phase2.md` 대비 최종 변경 요약 (모순 해소 내역)

| 항목 | `SDD_fixed_phase2.md` (v0.5) 잔존 문제 | `SDD_final_phase2.md` (Final v1.0) 확정 내용 | 근거 |
| --- | --- | --- | --- |
| 1. 이벤트 키 이름 | 노드 이벤트 키를 `on`으로 표기 | **`events?: Record<string, EventListener>`** 로 통일 (`e2` 결정) | `ADR-0001`, `ADR-0015` 3절, 피드백 03 |
| 2. `unmount` 제거 | `FunctionComponent.unmount()`, `unmountTree()`, `"unmount 후 setter 경고"`가 남아 있음 | **`unmount()` / `unmountTree()` 및 관련 예외 완전 제거** (`C-05`는 `hooks`, `mount()`, `update()`만 요구, 루트 단일 컴포넌트) | `ADR-0015` 2절, 피드백 03·04·05 |
| 3. 컴포넌트 `key` 규칙 | props에서 꺼내 붙인다고만 적고 자식 컴포넌트 props 미전달 여부 불명확 | `h(TodoItem, { key: todo.id, todo })` 시 **`key`는 `TodoItem`의 `props`로 넘기지 않고 펼친 루트 `VElement.key`에 부착 (`TD2`)** | `ADR-0015` 1절, 피드백 06 4-1절 |
| 4. 연속 50회 안전장치 세부 | "연속 50회 초과 시 오류"만 적고 기준 불명확 | **렌더링·effect 도중 예약될 때만 +1, 사용자 클릭·타이머 등 외부 예약 시 0으로 초기화** (`B4`, `B5`) | `ADR-0009` 3절, 피드백 05 4-1절 |
| 5. Hook 오류 시 DOM 보존 | 오류 시 화면 상태 미명시 | Diff/Patch 진입 **전** 렌더링 중 오류 발생 → **화면 DOM은 이전 상태 그대로 보존** + 콘솔 오류 (`HR6`) | `ADR-0010` 4절, 피드백 05 4-2절 |
| 6. Todo 앱 시연·정확성 보강 | `DebugPanel` 포맷 미지정, 하이라이트 제외 미반영 | **`DebugPanel`은 `formatChange` 한 줄 요약 (`TD11`)**, Patch 하이라이트(`y2`) 활성화 + **`input`/`textarea` 제외 (`TD10`)**, `input.value`/`checked` diff-guard 동기화 (`TD3~TD5`) | `ADR-0004` 1절, `ADR-0006` 8절, 피드백 06 |
| 7. 테스트 ID 통일 | 옛 `VT-*` 번호 위주 | 채택된 ADR 테스트 **`C1~C10`, `B1~B6`, `K1~K14`, `HR1~HR6`, `TD1~TD11`** 전수 명시 (+ `issue.md` / `SRS` 대응) | `ADR-0009`, `0010`, `0015`, 피드백 06 |

---

## 1. 개요와 아키텍처 원칙

### 1.1 핵심 범위와 제약 (`C-05 ~ C-08`, `FR-10 ~ FR-18`)

- **루트 단일 상태 (`C-06`, Lifting State Up)**: 모든 State와 Hook(`useState`, `useEffect`, `useMemo`)은 루트 컴포넌트(`App`) 하나에서만 사용한다. 자식 컴포넌트는 `props`만 받아 VNode를 반환하는 순수 함수이다 (`FR-14`).
- **선언적 렌더링 (`FR-10`)**: 개발자는 "이 상태일 때 화면이 이렇게 생겼다"만 작성한다. 상태 변경 코드 안에는 DOM을 직접 조작하는 명령이 없으며, 실제 DOM 수정은 오직 Phase 1의 **`core/patch.ts`** 만 수행한다 (`L2`).
- **UI 프레임워크 0 (SRS `CON-01`)**: Todo 테스트 페이지(`pages/phase2`)도 React·JSX 없이 이 문서의 `h()`와 `render()`로만 만든다. JSX 문법은 쓰지 않으며 `h(...)` 호출로 화면을 적는다. 이 프로젝트의 `h`·`FunctionComponent`가 곧 "우리가 만든 React"이고, 그것으로 Todo 페이지를 그리는 것이 FR-23의 시연이다.
- **Phase 1 엔진 재사용 (`C-08`, `SDD_final_phase1.md`)**: `update()`가 화면을 다시 그릴 때는 Phase 1의 `diff(this.vnode, next)`와 `applyPatch`를 **수정 없이 그대로** 사용한다. State History는 Phase 1 검증 페이지 전용이므로 Phase 2에서는 사용하지 않는다.

### 1.2 실제 React와의 의도된 차이점 5가지 (발표·방어 포인트)

1. **자식 컴포넌트 즉시 펼침 (`ADR-0015` 1절)**: 실제 React는 Fiber 트리에 컴포넌트 노드를 남기지만, 본 프로젝트는 자식이 무상태 순수 함수(`C-06`)이므로 `h()` 안에서 즉시 실행해 순수 `VElement` 트리로 펼친다. 덕분에 Diff는 Phase 1과 동일한 알고리즘을 쓴다.
2. **요소별 고정 리스너 (`ADR-0015` 3절)**: 실제 React의 루트 이벤트 위임 대신, 각 요소에 이벤트 종류별 고정 `dispatch` 리스너 1개만 최초 부착하고 `el.__handlers` 객체만 교체한다.
3. **동기적 Post-Patch Effect (`ADR-0010` 3절)**: 실제 React는 브라우저 페인트 이후 비동기로 실행하나, 테스트 단순성과 결정적 검증(`K10`)을 위해 `applyPatch` 직후 동기적으로 실행한다.
4. **루트 컴포넌트 단 하나 & `unmount()` 없음 (`ADR-0015` 2절)**: `C-05` 범위와 단일 앱 구조에 맞춰 `mount()`와 `update()`만 둔다.
5. **렌더링 도중 setter는 한 번 옛 값으로 그려짐 (`ADR-0009` 2절, 알려진 한계)**: 칸 값은 바로 바뀌고 다시 그리기만 다음 차례로 미뤄진다. 리액트는 그 자리에서 다시 렌더링한다.

---

## 2. 상세 모듈 설계

### 2.1 `h()` 확장과 자식 정리 · 컴포넌트 `key` (`component/h.ts`, `ADR-0015` 1절)

```typescript
export type Props = Record<string, unknown> & {
  key?: string | number;
  children?: VNode[];
};
export type Component<P = Record<string, unknown>> = (
  props: P & { children: VNode[] }
) => VElement;
export type Child = VNode | string | number | boolean | null | undefined | Child[];

let renderingChild = 0; // > 0 이면 자식 컴포넌트 실행 중 (HookCallError 감지용)
export function isRenderingChild(): boolean { return renderingChild > 0; }

export function h<P>(
  tag: string | Component<P>,
  props?: (P & Props) | null,
  ...children: Child[]
): VElement;
```

#### ① 자식 배열 정규화 규칙 (`C5`)

| 입력 자식 값 | 처리 결과 | 비고 |
| --- | --- | --- |
| `VNode` (`object`) | 그대로 `children`에 포함 | — |
| `string` / `number` | `{ type: 'text', text: String(child) }` | `domToVNode`를 거치지 않으므로 공백 축약 미적용 |
| `null` / `undefined` / `boolean` | 건너뜀 | `isDone && h('span', ...)` 조건부 렌더링 지원 |
| 배열 (`Child[]`) | 재귀로 평탄화(flatten)해 순서대로 삽입 | `todos.map(...)` 지원 |

#### ② `tag` 종류별 처리 (`C4`, `C6`, `C7`, `TD2`)

1. **`tag`가 문자열(태그명)일 때**:
   - `tag`를 소문자(`tag.toLowerCase()`)로 정규화.
   - `props`를 키의 무리(`ADR-0001`)에 따라 3곳으로 분류:
     - `key` (`!== undefined && !== null`): `VElement.key = String(value)` (단, `attrs` 제외)
     - `^on[A-Z].*` 또는 `^on` + 값이 `function`: `events[propName.slice(2).toLowerCase()] = fn` (`onClick` → `events.click`, `C7`)
     - 값 `null`, `undefined`, `false`: 넣지 않음 (`disabled: false`, `checked: false` 제외)
     - 값 `true`: `attrs[k] = ''` (`checked: true`)
     - 그 외: `attrs[k] = String(value)`
   - `events`에 항목이 0개면 **`events` 키 자체를 붙이지 않는다** (`ADR-0001` 선택 키 규칙).
2. **`tag`가 함수(컴포넌트)일 때**:
   - `props`에서 **`key`를 분리해 보관**하고, 컴포넌트에 넘길 `cleanProps`에서는 `key`를 제외한다 (`TD2`).
   - `renderingChild++` → `try { result = tag({ ...cleanProps, children: normalizedChildren }); } finally { renderingChild--; }`
   - 반환값이 유효한 `VElement`(`result?.type === 'element'`)가 아니면 `TypeError`를 던진다.
   - 호출 시 `key`가 주어졌다면 **`result.key = String(key)`**로 반환된 루트 요소에 부착한다 (`TD2`, React 호환).

---

### 2.2 `FunctionComponent`와 `mount` / `update` (`component/function-component.ts`, `ADR-0015` 2절)

```typescript
export type HookSlot =
  | { kind: 'state';  value: unknown; setter: SetState<any> }
  | { kind: 'effect'; deps?: unknown[]; effect: () => void | (() => void); cleanup?: () => void; shouldRun: boolean }
  | { kind: 'memo';   deps: unknown[]; value: unknown };

export class FunctionComponent<P = Record<string, unknown>> {
  hooks: HookSlot[] = [];
  hookIndex = 0;
  renderCount = 0;                 // DebugPanel / B1~B6 검증용
  lastChanges: Change[] = [];      // DebugPanel 한 줄 로그용 (TD11)
  private vnode: VElement | null = null;

  constructor(private fn: Component<P>, private props: P, private container: Element) {}

  mount(): void;   // 최초 렌더 → mountTree → dom·events 기록 → effect 실행
  update(): void;  // 재렌더 → diff → applyPatch (0건이어도 호출!) → effect 실행
}

export function render<P>(fn: Component<P>, props: P, container: Element): FunctionComponent<P>;
```

#### 한 번의 렌더링 사이클 (8단계)

1. `currentComponent = this`, `this.hookIndex = 0`.
2. `let next: VElement; try { next = this.fn({ ...this.props, children: [] }); } finally { currentComponent = null; }`
   - 실행 도중 `HookCallError` 또는 `HookOrderError` 발생 시 즉시 예외가 전파되어 **3단계 이후(Diff/Patch)로 진입하지 않으며, 화면 DOM은 이전 상태 그대로 유지**된다 (`HR6`).
3. **Hook 개수 검증**: 재렌더(`renderCount > 0`)인데 `this.hookIndex !== this.hooks.length`이면 `HookOrderError`를 던진다 (`HR4`).
4. **DOM 반영 (반드시 `core/patch.ts` 경유)**:
   - **`mount()`**: `mountTree(this.container, next)` 호출 → 컨테이너를 비우고 `vnodeToDom(next)`를 **1회 부착**한 뒤, `recordDom(next, domRoot)`(`ADR-0005` `F1`)로 모든 VNode에 `.dom`을 기록하고 `events` 고정 리스너를 연결한다 (`C1`).
   - **`update()`**: `const result = diff(this.vnode!, next)` → `this.lastChanges = result.changes` → **`result.changes.length === 0`이어도 반드시 `applyPatch(this.container, next, result, patchOpts)`를 호출**한다 (`C2`, `C8`, `C9`).
     - *이유*: 화면 데이터가 같아도 새로 만들어진 클로저 핸들러(`events`)와 `.dom` 참조를 `pairs`를 통해 `next` 트리로 인계해야 다음 클릭에서 최신 핸들러가 불리기 때문이다 (`C8`).
     - 만약 `applyPatch` 도중 예외가 나면 Phase 1의 **`recoverPatch(this.container, next, err)` (`t3`)**가 컨테이너를 통째 재구축하고 `.dom`과 `events`를 복구한다 (`C10`).
5. `this.vnode = next` (Patch가 `.dom`을 채운 바로 그 트리 객체를 보관).
6. `this.renderCount += 1`.
7. **Post-Patch Effect 실행 (`K7~K11`, `K14`)**: `Mount/Update` 반영(또는 `t3` 복구) 직후 동기적으로 `this.hooks`를 앞에서부터 순회하며 `slot.kind === 'effect' && slot.shouldRun`인 항목을 실행한다 (상세는 2.4절).

---

### 2.3 이벤트 동기화 (`events` & `core/patch.ts`, `ADR-0015` 3절)

`events`는 화면 데이터가 아니므로 `diff`도 `equalScreen`도 읽지 않는다 (`C9`, `NFR-01`). 실제 연결은 `core/patch.ts`가 `.dom`을 채우고 복사하는 두 시점에 이뤄진다:

```typescript
const HANDLER_MAP = Symbol('mini-react-handlers'); // 또는 el.__handlers

function dispatch(e: Event) {
  const el = e.currentTarget as Element & { __handlers?: EventHandlers };
  el?.__handlers?.[e.type]?.(e);
}

function syncEvents(el: Element, nextEvents?: EventHandlers): void {
  const prev = (el as any).__handlers as EventHandlers | undefined;
  const next = nextEvents ?? {};

  // 새로 추가된 이벤트 타입에만 고정 dispatch 리스너 1회 부착
  for (const type of Object.keys(next)) {
    if (!prev || !(type in prev)) {
      el.addEventListener(type, dispatch);
    }
  }
  // 사라진 이벤트 타입은 리스너 제거(또는 __handlers에서 비움)
  if (prev) {
    for (const type of Object.keys(prev)) {
      if (!(type in next)) {
        el.removeEventListener(type, dispatch);
      }
    }
  }
  (el as any).__handlers = { ...next };
}
```

- **효과**: 매 렌더마다 새 화살표 함수(`() => onToggle(todo.id)`)가 생성되어도 `changes`는 0건이며 `addEventListener`/`removeEventListener` 호출도 일어나지 않고, 메모리 내 `__handlers` 참조만 최신 함수로 교체된다 (`C8`, `C9`).

---

### 2.4 Hooks (`component/hooks.ts`, `ADR-0010`, 피드백 04~05)

```typescript
export type SetState<T> = (next: T | ((prev: T) => T)) => void;

export function useState<T>(initial: T | (() => T)): [T, SetState<T>];
export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
export function useMemo<T>(factory: () => T, deps: unknown[]): T;
export function depsChanged(prev: unknown[] | undefined, next: unknown[] | undefined): boolean;
```

#### ① 공통 호출 검사 & 오류 (`component/errors.ts`)

| 위반 조건 | 감지 방식 | 예외 | DOM 영향 |
| --- | --- | --- | --- |
| 컴포넌트 밖 호출 (핸들러, effect, 최상위) | `currentComponent === null` | `HookCallError` (`HR1`, `HR2`) | 예외 전파 |
| 자식 컴포넌트 안 호출 (`h()` 내부) | `isRenderingChild() === true` | `HookCallError` (`HR3`) | 루트 `hooks[]` 오염 차단 |
| 재렌더 시 슬롯 `kind` 불일치 | `hooks[i].kind !== expectedKind` | `HookOrderError` (`HR5`) | **이전 DOM 유지 (`HR6`)** |
| 재렌더 시 호출 개수 감소 (`hookIndex !== hooks.length`) | 렌더 직후 검사 | `HookOrderError` (`HR4`) | **이전 DOM 유지 (`HR6`)** |
| 재렌더 시 호출 개수 증가 (`hooks[hookIndex]`가 없음) | Hook 호출 시점 검사. 재렌더에서는 새 칸을 만들지 않는다 | `HookOrderError` (`HR4`) | **이전 DOM 유지 (`HR6`)** |

*(한계: 우연히 호출 개수와 종류가 모두 일치하는 조건부 분기는 런타임에 감지할 수 없으므로 코드 리뷰로 보완한다.)*

#### ② `useState(initial)`

- **최초 렌더**: `initialValue = typeof initial === 'function' ? (initial as () => T)() : initial`. 안정적인 `setter`를 생성해 `{ kind: 'state', value: initialValue, setter }` 저장 후 `[value, setter]` 반환 (`K1`).
- **재렌더**: `initial`을 무시하고 `slot.value`와 **최초와 동일한 `slot.setter` 참조** 반환 (`K6`).
- **`setter(next)` 동작**:
  1. `const computed = typeof next === 'function' ? next(slot.value) : next` (`K5`)
  2. `if (Object.is(slot.value, computed)) return;` (같은 값이면 재렌더 예약 안 함, `K4`)
  3. `slot.value = computed; scheduleUpdate(ownerComponent);` (`K2`, `K3`)

#### ③ `useEffect(effect, deps?)` (`f1` + `g1` 확정)

- **의존성 규칙 (`f1`)**:
  - `deps === undefined` (목록 생략): **매 렌더링마다 실행** (`K7`)
  - `deps.length === 0` (`[]`): **최초 mount 후 1회만 실행** (`K8`)
  - `deps` 있음: `depsChanged(slot.deps, deps)`가 `true`일 때만 실행 (`K9`)
- **실행 및 정리(`cleanup`, `g1`) 순서** (Patch 완료 직후):
  리액트와 같은 순서로 두 단계로 나눈다 (2026-11-11 팀 결정, ADR-0010 3절):
  1. **정리 단계**: 이번에 실행할 `effect` 칸을 앞에서부터 보며, 이전 `slot.cleanup`이 있으면 **모두** 먼저 호출하고 비운다 (`K11`).
  2. **실행 단계**: 같은 칸들을 앞에서부터 다시 보며 `slot.effect()`를 실행하고, 반환값이 함수면 `slot.cleanup`에 저장한다 (`K15`: 정리 A → 정리 B → 실행 A → 실행 B).
  3. 두 단계 모두 칸마다 `try/catch`로 따로 격리한다. effect나 정리 함수 하나가 실패해도 나머지는 계속 실행하고 `console.error`로 남긴다 (`K14`, `K15`). `TooManyRendersError`만 밖으로 나간다 (8.2).
  4. `unmount()`가 없으므로 정리 함수는 "다시 실행되기 직전"에만 호출된다.

#### ④ `useMemo(factory, deps)` (`FR-18`, `K12`, `K13`)

- 최초 렌더 또는 `depsChanged(slot.deps, deps)`가 `true`일 때만 `factory()`를 호출해 결과와 `deps`를 저장한다.
- 의존성이 모두 `Object.is`로 같으면 `factory()`를 부르지 않고 저장된 `slot.value`를 즉시 반환한다.

---

### 2.5 스케줄러와 Batching (`component/scheduler.ts`, `ADR-0009`, 피드백 05)

```typescript
let pendingComponent: FunctionComponent<any> | null = null;
let flushQueued = false;
let isRenderingOrEffect = false;    // 렌더링 또는 effect 실행 중 여부 (mount()·update() 모두, ADR-0009 3절)
let consecutiveSelfUpdates = 0;     // 내부 연쇄 재렌더 횟수 카운터

export function scheduleUpdate(c: FunctionComponent<any>): void {
  if (currentComponent !== null) {
    // 렌더링 본문 중 setter 호출 → 경고 출력 후 다음 microtask로 미룸 (B6)
    console.warn('렌더링 도중 setState가 호출되었습니다. 다음 차례로 미룹니다.');
  }

  if (isRenderingOrEffect) {
    consecutiveSelfUpdates += 1;
    if (consecutiveSelfUpdates > 50) {
      throw new Error('Too many re-renders'); // B4
    }
  } else {
    // 사용자 클릭, 타이머 등 외부 이벤트에서 새로 예약되면 0으로 리셋 (B5)
    consecutiveSelfUpdates = 0;
  }

  pendingComponent = c;
  if (!flushQueued) {
    flushQueued = true;
    queueMicrotask(flush);
  }
}

function flush(): void {
  if (!flushQueued) return;
  flushQueued = false;
  const target = pendingComponent;
  pendingComponent = null;
  if (target) {
    isRenderingOrEffect = true;
    try {
      target.update();
    } finally {
      isRenderingOrEffect = false;
    }
  }
}

export function flushSync(): void {
  flush(); // 테스트용: 예약된 업데이트 즉시 동기 실행 (B1, B3)
}
```

- **Batching (`b1`)**: 한 클릭 핸들러 또는 `setTimeout` 안에서 setter를 3번 불러도 microtask 1회당 `update()`는 단 **1번**만 실행된다 (`B1`, `B2`).
- **`mount()`도 같은 표시를 켠다**: `FunctionComponent.mount()`와 `update()`는 렌더링과 effect 실행 동안 `isRenderingOrEffect = true`로 둔다(ADR-0009 3절 "렌더링이나 effect 안"). 위 `flush()`의 표시는 `update()` 경로의 예다. 그래서 mount 직후 effect 안의 setter도 연쇄로 센다.
- **무한 루프 방지 vs 정상 클릭 구분**: `isRenderingOrEffect === true`일 때만 연쇄 카운터를 올리므로, 의존성 없는 `useEffect` 안 setter 무한 루프는 50회 초과 시 `Error('Too many re-renders')`로 중단되지만(`B4`), 사용자가 버튼을 60번 클릭하는 정상 시나리오는 매번 0으로 리셋되어 오류가 나지 않는다(`B5`).
- **테스트 작성 규칙**: setter나 클릭 후 DOM/상태를 검증하는 모든 테스트(`C8`, `K2~K5`, `K7~K11`, `TD1~TD11`)는 확인 직전 반드시 `flushSync()`를 호출한다 (`B3`).

---

## 3. Phase 2 Todo 테스트 앱 설계 (`pages/phase2`, 피드백 06)

### 3.1 컴포넌트 트리와 책임

| 컴포넌트 | 구분 | State / Props | 검증하는 요구사항 & 테스트 |
| --- | --- | --- | --- |
| `App` | **루트 (State 소유)** | `useState`: `todos`, `input`, `filter`<br>`useMemo`: `filteredTodos`, `stats`<br>`useEffect`: `document.title` 갱신, 변경 로그 | `FR-11`, `FR-14`, `FR-15`, `FR-16`, `FR-17`, `FR-18`, `K1~K14` |
| `TodoInput` | 자식 (순수 함수) | Props: `value`, `onInput`, `onAdd`, `onAddThree` | `value` 프로퍼티 동기화 + 커서 유지 (`TD3`, `TD4`), 3개 일괄 추가 Batching (`TD6`) |
| `Header` | 자식 (순수 함수) | Props: `stats` (`total`, `remaining`) | 남은 개수 표시 장소 1 (`FR-11`, `TD9`) |
| `FilterBar` | 자식 (순수 함수) | Props: `filter`, `onChange` | 전체/진행/완료 전환 (`useMemo` 재계산 vs 타이핑 시 무재계산, `TD7`) |
| `TodoList` / `TodoItem` | 자식 (순수 함수) | `TodoItem`마다 **`key: todo.id`** 부여 (`TD1`, `TD2`). Props: `todo`, `onToggle`, `onRemove` | 3회 이상 재사용(`FR-13`), 첫 항목 삭제 시 조작 1회(`TD1`), `checked` 동기화(`TD5`), 줄 단위 하이라이트(`TD10`) |
| `DebugPanel` | 자식 (순수 함수) | Props: `renderCount`, `memoCount`, `effectLogs`, `stats`, `lastChanges` | 남은 개수 표시 장소 2(`FR-12`, `TD9`), **`formatChange` 한 줄 요약 (`TD11`)** |

### 3.2 Phase 2 Todo 앱 UX · 정확성 4대 필수 규칙 (피드백 06 확정)

1. **목록 항목 `key` 전달 및 props 은닉 (`TD1`, `TD2`)**:
   - `h(TodoItem, { key: todo.id, todo, onToggle, onRemove })`로 호출하면 `h()`가 `key`를 소비하여 결과 `<li>`의 `VElement.key`에 붙이고, `TodoItem`이 받는 `props` 객체에는 `key`가 포함되지 않는다.
2. **`input.value` / `checkbox.checked` 동기화 (피드백 06 4-2절 → ADR-0004 1절에 추가 예정, `TD3~TD5`)**:
   - 할 일 추가 후 `setInput('')` 실행 시 Phase 1 Patch의 프로퍼티 동기화 덕분에 실제 `<input>.value`가 즉시 비워진다 (`TD3`).
   - 글자를 칠 때마다 재렌더되더라도 현재 DOM `el.value === nextValue`이면 다시 대입하지 않으므로 커서가 끝으로 튀지 않는다 (`TD4`).
3. **Patch 하이라이트 (`y2`) + 제외 태그 (`TD10`)**:
   - `FunctionComponent.update()`는 `applyPatch(..., { highlight: true, highlightExcludeTags: ['input', 'textarea'] })`로 호출한다.
   - 할 일 체크 시 해당 줄 `<li>`는 `0.6초` 반짝여 부분 업데이트를 시각화하지만, 입력칸 타이핑 시에는 `<input>`이 제외되어 산만하게 깜빡이지 않는다.
4. **`DebugPanel` 변경 로그 한 줄 요약 (`TD11`)**:
   - Phase 1과 동일한 `formatChange(change)`를 재사용해 `lastChanges`를 읽기 쉬운 한 줄 텍스트로 보여 준다 (원시 VNode JSON 덤프 금지).

---

## 4. 예외 처리 및 L4 불변식 (Phase 2)

### 4.1 예외 및 경계 조건 표

| 상황 | 모듈 | 처리 결과 | 관련 테스트 |
| --- | --- | --- | --- |
| 컴포넌트 밖 / effect 안 / 자식에서 Hook 호출 | `hooks` / `h` | `HookCallError` 발생 | `HR1`, `HR2`, `HR3` |
| 렌더마다 Hook 개수·종류 변화 | `hooks` / `fc` | `HookOrderError` 발생 (**Diff·Patch 미진입 → 이전 DOM 보존**) | `HR4`, `HR5`, `HR6` |
| `setter`에 `Object.is` 동일 값 전달 | `hooks` | 무시 (재렌더 예약 없음) | `K4` |
| 렌더링 본문 중 `setter` 호출 | `scheduler` | `console.warn` 1회 + 다음 microtask로 연기 | `B6` |
| 렌더링/effect 내부 연쇄 `setter` 50회 초과 | `scheduler` | `Error('Too many re-renders')` 발생 | `B4` |
| 외부 이벤트/타이머로 버튼 60번 클릭 | `scheduler` | 매번 카운터 0 초기화 → 오류 없이 정상 동작 | `B5` |
| effect 1개가 실행 중 예외 발생 | `fc` | `console.error` 기록 후 나머지 effect 정상 실행 | `K14` |
| 컴포넌트가 `VElement` 이외 값 반환 | `h` | `TypeError` 발생 | `ADR-0015` |
| `update()` 중 `applyPatch` 예외 (`dom` 누락 등) | `patch` | `recoverPatch(container, next, err)` (`t3`)로 컨테이너 통째 복구 + `console.error` | `C10` |
| 핸들러(`events`)만 바뀐 재렌더 | `diff` / `patch` | `changes` 0개, DOM 리스너 추가/제거 0회, `__handlers`만 교체 | `C9` |

### 4.2 Phase 2 핵심 불변식 (`L4`)

1. **Memo 불변식**: 같은 `deps`로 $k$회 재렌더 시 `useMemo`의 `factory`는 **1회만** 실행된다 (`K12`).
2. **Batching 불변식**: 한 microtask/핸들러 안에서 `setter`를 $m$회 불러도 `renderCount`는 **+1**만 증가한다 (`B1`, `B2`).
3. **화면 동등성 불변식**: 임의의 상태 변화 시퀀스 후 `equalScreen(domToVNode(container.firstElementChild!), currentRenderedVNode)`가 항상 참이다 (`C-08`, `FR-14`).
4. **무조작 핸들러 갱신 불변식**: 클로저 핸들러만 바뀐 두 렌더 사이 `changes.length === 0`, DOM 쓰기 0회이면서 최신 핸들러가 호출된다 (`C8`, `C9`, `NFR-01`).

---

## 5. Phase 2 전체 테스트 목록 및 추적성 매트릭스

### 5.1 채택된 ADR · 피드백 테스트 총괄 (`47개`)

| 카테고리 | 테스트 ID | 수량 | 핵심 확인 항목 |
| --- | --- | --- | --- |
| Component & `events` (`ADR-0015`) | **`C1 ~ C10`** | 10 | `mount()` `.dom` 기록(`C1`), 무변경 `update()`(`C2`), `diff`+`applyPatch` 1회씩(`C3`), `h()` `key`/자식정리/자식펼침/`events`(`C4~C7`), 핸들러 최신화(`C8`), 리스너 무변경(`C9`), `t3` 컨테이너 복구(`C10`) |
| Batching (`ADR-0009`) | **`B1 ~ B6`** | 6 | 핸들러/타이머 Batching(`B1`, `B2`), `flushSync()` 전후(`B3`), effect 50회 한계(`B4`), 클릭 60회 정상(`B5`), 렌더 중 setter 경고(`B6`) |
| Hooks 동작 (`ADR-0010`) | **`K1 ~ K15`** | 15 | `useState` 초기값·유지·다중격리·동일값무시·함수형업데이트·setter정체성(`K1~K6`), `useEffect` 생략/`[]`/`[a]`/DOM순서/cleanup/에러격리(`K7~K11`, `K14`), `useMemo` 캐싱·결과반영(`K12`, `K13`) |
| Hook 규칙 (`ADR-0010`) | **`HR1 ~ HR6`** | 6 | 핸들러(`HR1`), effect(`HR2`), 자식 컴포넌트(`HR3`) `HookCallError`; 개수·종류 순서 변경 `HookOrderError`(`HR4`, `HR5`); 오류 시 이전 DOM 유지(`HR6`) |
| Todo App (`피드백 06`) | **`TD1 ~ TD11`** | 11 | key 삭제 1건(`TD1`), props에 key 미전달(`TD2`), input 초기화·커서 보존(`TD3`, `TD4`), checkbox `checked`(`TD5`), 3개 일괄 추가(`TD6`), `useMemo`/`useEffect` 선택 실행(`TD7`, `TD8`), 이중 카운터 동기(`TD9`), `input` 제외 하이라이트(`TD10`), `DebugPanel` 한 줄 요약(`TD11`) |

### 5.2 `issue.md` Phase 2 요구사항 추적표

| `issue.md` ID | 요구사항 요약 | 설계 반영 절 | 검증 테스트 |
| --- | --- | --- | --- |
| `FR-10` | 선언적 화면 (상태 변경에 직접 DOM 조작 금지) | 1.1, 2.2 | `C3` + L2 코드 검토 |
| `FR-11` | 상태 변경 시 모든 표시 장소 자동 갱신 | 2.2, 3.1 (`Header`·`DebugPanel`) | `TD9` |
| `FR-12` | 표시 장소 추가 시 상태 변경 코드 무수정 | 3.1 (props 전달) | 코드 검토 |
| `FR-13` | 컴포넌트 재사용 3회 이상 | 2.1, 3.1 (`TodoItem`) | `C6`, `TD1`, `TD2` |
| `FR-14` | 같은 데이터는 항상 같은 값 (Lifting State Up) | 1.1, 3.1 | `TD9` |
| `FR-15` | 재렌더 후 상태 값 유지 | 2.4 (`useState`) | `K2`, `K5` |
| `FR-16` | 여러 상태 미혼선 + Hook 순서 규칙 | 2.4 (`hooks[]`, `HookOrderError`) | `K3`, `HR4~HR6` |
| `FR-17` | `useEffect` (생략=매번, `[]`=1회, deps, `cleanup`) | 2.4 (`f1`, `g1`) | `K7~K11`, `K14`, `K15`, `TD8` |
| `FR-18` | `useMemo` (의존성 같으면 재계산 생략) | 2.4 | `K12`, `K13`, `TD7` |
| `NFR-01` | 변경 비례 최소 조작 (`events` 분리 + Batching) | 2.3, 2.5 | `C9`, `B1`, `TD1`, `TD6` |
| `C-05 ~ C-08` | 함수형, `FunctionComponent(hooks,mount,update)`, 루트 State, Phase 1 재사용 | 1.1, 2.1, 2.2 | `C1~C10`, `HR3` |
| `TBD-05` | `queueMicrotask` Batching | 2.5 | `B1~B6`, `TD6` |

---

## 6. SRS v1.4 추적표와 VT별 테스트 위치 (Phase 2)

### 6.1 SRS ID ↔ 설계 ↔ 검증

`issue.md`의 Phase 2 번호(5.2 표)는 SRS 번호와 다르다(SRS 5.1.4). 이 표는 SRS ID를 하나씩 적는다.

| SRS ID | 설계 요소 | 절 | ADR·피드백 테스트 | VT |
| --- | --- | --- | --- | --- |
| FR-10 | 컴포넌트는 VNode만 반환, DOM 쓰기는 `core/patch.ts`만 | 1.1, 2.2 | C3 | VT-22 |
| FR-11 | `FunctionComponent`(`hooks`, `mount`, `update`) | 2.2 | C1, C2 | VT-10 |
| FR-12 | `render` → `mountTree`, 루트 1회 부착 | 2.2 | C1 | VT-10 |
| FR-13 | `h(Component, props)`, 자식 즉시 펼침 | 2.1 | C4, C6, TD2 | VT-11 |
| FR-14 | setter → `scheduleUpdate` → `update` → `diff`·`applyPatch` | 2.2, 2.4, 2.5 | C2, C3, K2, TD9 | VT-13 |
| FR-15 | 루트 전용 State, 자식은 Props만 (`useState`, `HookCallError`) | 1.1, 3.1 | HR3, TD9 | VT-11 |
| FR-16 | `useState` 초기값·`[state, setter]` | 2.4 ② | K1, K6 | VT-12 |
| FR-17 | setter: 함수형 업데이트, `Object.is` 같으면 무시, 재렌더 예약 (`useState`, `scheduleUpdate`) | 2.4 ② | K2, K3, K4, K5 | VT-13 |
| FR-18 | effect를 Patch 직후 실행 (`useEffect`, `update`) | 2.2 7단계, 2.4 ③ | K10, K11, K14 | VT-14 |
| FR-19 | `deps` 생략·`[]`·값 목록 (`useEffect`, `depsChanged`) | 2.4 ③ | K7, K8, K9 | VT-14 |
| FR-20 | `useMemo` | 2.4 ④ | K12, K13, TD7 | VT-15 |
| FR-21 | `HookCallError`, `HookOrderError` | 2.4 ① | HR1, HR2, HR3, HR4, HR5, HR6 | VT-16 |
| FR-22 | `update()` 안의 `diff` + `applyPatch`, `recoverPatch` 재사용 | 1.1, 2.2 | C3, C10 | VT-17 |
| FR-23 | Todo 테스트 페이지 (React 없이) | 3장 | TD1~TD11 | VT-18 |
| IR-07 | Phase 2 페이지의 입력·버튼 | 3.1 | TD3, TD6 | VT-18 |
| IR-08 | setter (`useState`, `scheduleUpdate`) | 2.4 ② | K2 | VT-13 |
| CON-06 | 루트 전용 State (`useState`, `HookCallError`) | 1.1, 2.4 ① | HR3 | VT-11, VT-16 |
| TBD-05 | microtask Batching | 2.5 | B1, B2, B3, B4, B5, B6 | VT-19 |

### 6.2 VT별 테스트 위치

| 파일 | VT | ADR·피드백 테스트 |
| --- | --- | --- |
| `tests/unit/h.test.ts` | VT-11 | C4, C5, C6, C7, TD2 |
| `tests/unit/component.test.ts` | VT-10, VT-11 | C1, C2, C3, C8, C9, C10 |
| `tests/unit/hooks.test.ts` | VT-12, VT-14, VT-15, VT-16 | K1~K15, HR1~HR6 |
| `tests/unit/scheduler.test.ts` | VT-19 | B1~B6 |
| `tests/integration/phase2.test.ts` | VT-13, VT-17 | TD1, TD3~TD11 |
| 수동 체크리스트 (`docs/verification/checklist-phase2.md`) | VT-18 | TD10 (하이라이트 눈으로 확인) |

## 7. 설계 검토가 더 필요한 항목 (Hermes·팀 검토 대상)

| # | 항목 | 지금 설계 | 열린 질문 |
| --- | --- | --- | --- |
| 1 | 모듈 순환 | **해소** (8.1) | `component/current.ts`로 분리. depcruise `no-circular` 통과 |
| 2 | 렌더 중 setter (B6) | **해소** (2026-11-11 팀 결정) | 지금 동작 유지. ADR-0009 2절에 "칸 값은 바로 바뀌고 다시 그리기만 미뤄져 한 번은 옛 값으로 그려진다"를 알려진 한계로 적음. 1.2 차이점 5번 |
| 3 | (해소) mount 중 effect의 setter | ADR-0009 3절대로 `mount()`에서도 표시를 켠다 (2.5) | — |
| 4 | effect 실행 순서 | **해소** (2026-11-11 팀 결정) | 리액트와 같게 바꿈: 실행할 칸의 정리 함수 전부 → effect 전부 (ADR-0010 3절, K15). 2.4 ③ |
| 5 | 이벤트 저장 위치 | **해소** | `el.__handlers` (Phase 1 `core/patch.ts`와 같은 이름) |

## 8. 구현하며 정한 것 (v1.2)

### 8.1 `component/current.ts` (7장 1번 해소)

- "지금 렌더링 중인 컴포넌트", "자식 컴포넌트 실행 중", "렌더링·effect 실행 중" 표시와 `HookSlot`·`HookHost` 타입을 이 모듈 하나에 둔다.
- `h`·`hooks`·`scheduler`·`function-component`는 이 모듈만 읽고 서로를 직접 import하지 않는다. 의존 방향: `hooks → scheduler → current`, `function-component → core`, 순환 0.
- `isRenderingChild()`는 2.1대로 `component/h.ts`에서도 내보낸다.

### 8.2 오류 `TooManyRendersError` (2.5 보완)

- `errors.ts`에 `TooManyRendersError`(메시지 `Too many re-renders`)를 둔다.
- effect 오류 격리(K14)가 이 오류는 잡지 않고 밖으로 내보낸다. 무한 루프가 `console.error` 한 줄로 묻히지 않게 하기 위해서다 (B4).
- 던질 때 연쇄 카운터와 예약을 비운다. 그래서 다음 `flushSync()`는 아무것도 하지 않는다.

### 8.3 `flushSync()`는 예약이 없어질 때까지 반복 (2.5 보완)

- effect 안의 setter가 다시 예약하면 그것까지 실행한다. 50회 한계(B4) 안에서 끝난다.
- 테스트는 클릭 뒤 `flushSync()` 한 번이면 화면과 effect가 모두 끝난 상태를 본다 (B3).

### 8.4 `h()`의 on* 규칙 (2.1 ② 보완, 반례 9 → C11)

- 이름이 `on`(대소문자 무관)으로 시작하는 props는 값이 함수일 때만 `events`에 넣는다.
- 문자열 등 함수가 아닌 값은 버린다. `attrs`에도 넣지 않는다. ADR-0002 s2가 실제 DOM에서 `on*` 속성을 버리는 것과 같은 이유다.

### 8.5 화면 동등성 불변식의 비교 방법 (4.2 3번 보완, 반례 8)

- `h()`의 글자는 공백 규칙을 거치지 않는다. 그래서 `"  두 칸  "`처럼 공백이 여럿이면 `domToVNode`로 다시 읽은 트리와 글자가 다르다.
- 불변식은 **두 쪽 모두에 같은 공백 규칙**(공백 묶음 → 한 칸, 공백만 있는 글자 노드 제외)을 적용한 뒤 `equalScreen`으로 비교한다 (`tests/integration/phase2.test.ts`).

### 8.6 Todo 페이지 변경 로그와 디버그 숫자 (3.1 `DebugPanel`, 3.2 #4 보완, TD11)

- `lastChanges`는 Patch가 끝난 뒤에야 생긴다. 그래서 컴포넌트 props로 넘기면 항상 한 박자 늦다.
- 대신 `render(App, props, container, { onCommit })`의 `onCommit`에서 페이지(`pages/phase2/main.ts`)가 컴포넌트 트리 밖의 `#change-log`에 `formatChange` 한 줄씩 쓴다. Phase 1 페이지의 `#change-log`와 같은 방식이다.
- `DebugPanel`은 남은 개수(TD9 두 번째 장소), 지금 몇 번째 렌더인지(`renderCount + 1`), `filteredTodos` 계산 횟수만 보여 준다.
- useEffect 실행 횟수는 effect가 Patch 뒤에 돌기 때문에 `#effect-count`에 `onCommit`이 쓴다.
- `FilterBar`는 `FilterButton`을 3번 쓴다. `TodoItem`과 함께 FR-13(재사용 3회 이상)을 만족한다.

### 8.7 구현 확인 결과 (2026-11-10)

- `tsc --noEmit`, `eslint src`, `depcruise`(21개 모듈, 순환 0), `check:stack` 통과.
- Vitest 전체 173개 통과: `h.test` 7, `component.test` 7, `hooks.test` 21, `scheduler.test` 6, `phase2.test` 12.
- 커버리지(문장): component 99%, core 97%.

### 8.8 팀 결정 반영 (2026-11-11, PR #54 리뷰)

- 7장 열린 항목 2·4번을 결정했다. ADR-0009·0010·0015를 accepted로 확정했다.
- effect 실행 순서를 리액트와 같게 바꿨다(2.4 ③, `runEffects`를 정리 단계와 실행 단계로 나눔, 오류 격리는 `guard()` 하나로 두 단계에 같이 씀). 테스트 K15 3개 추가.
- 렌더링 도중 setter는 코드를 바꾸지 않고 알려진 한계로 적었다(1.2 5번, ADR-0009 2절).

---

## 부록 A. Phase 2 파일별 함수 명세표

| 파일 | 함수 / 클래스 | 입력 | 출력 | 하는 일 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `component/h.ts` | `h(tag \| Component, props, ...children)` | 태그·컴포넌트, props, 자식 | `VElement` | 컴포넌트 즉시 펼침 + `key` 루트 부착(props 제외), `attrs`/`events` 분리, 자식 평탄화 | `ADR-0015` |
| `component/h.ts` | `isRenderingChild()` | 없음 | `boolean` | 자식 컴포넌트 실행 중 여부 반환 (`HR3`) | `ADR-0010` |
| `component/function-component.ts` | `render(fn, props, container)` | 루트 부품, Props, 컨테이너 | `FunctionComponent` | 컴포넌트 인스턴스 생성 후 `mount()` 실행 | `C-05`, `ADR-0015` |
| `component/function-component.ts` | `mount()` / `update()` | 없음 | 없음 | 최초 그리기(`mountTree`) / `diff`+`applyPatch` 재렌더 + Post-Patch `effect` 순차 실행 (`unmount()` 미존재) | `ADR-0015`, `C-05` |
| `component/hooks.ts` | `useState(initial)` | 초기값 또는 초기화 함수 | `[값, setter]` | `hooks[]` 상태 칸 읽기/초기화 및 Batching setter 반환 | `ADR-0010` |
| `component/hooks.ts` | `useEffect(effect, deps?)` | 부수효과 함수, deps(선택) | 없음 | 생략/빈배열/의존성 기준 실행 예약 및 `cleanup` 관리 (`f1`, `g1`) | `ADR-0010` |
| `component/hooks.ts` | `useMemo(factory, deps)` | 계산 함수, deps | 캐시된 값 | `depsChanged`일 때만 `factory()` 재실행 | `ADR-0010` |
| `component/hooks.ts` | `depsChanged(prev, next)` | 이전 목록, 새 목록 | `boolean` | 길이·`Object.is` 비교로 변경 여부 판단 | `ADR-0010` |
| `component/scheduler.ts` | `scheduleUpdate(c)` | `FunctionComponent` | 없음 | `queueMicrotask` 예약 + 렌더중 경고 + 내부연쇄 50회 제한 | `ADR-0009` |
| `component/scheduler.ts` | `flushSync()` | 없음 | 없음 | 예약된 `update()` 즉시 동기 실행 (테스트 전용) | `ADR-0009` |
| `component/current.ts` | `getCurrent`·`setCurrent`·`isRenderingChild`·`isBusy`·`setBusy` | 없음/컴포넌트 | 상태 | 렌더링 중 표시 (8.1) | `ADR-0009`, `ADR-0010` |
| `component/errors.ts` | `HookCallError`, `HookOrderError`, `TooManyRendersError` | 메시지 | Error 객체 | Hook 호출 위치 및 순서 규칙 위반 구분 | `ADR-0010` |
| `core/patch.ts` | `mountTree(container, v)` / `syncEvents(el, events)` | 컨테이너·요소, VNode·events | 없음 | 최초 트리 1회 부착 + `recordDom` / 고정 `dispatch` 리스너 `__handlers` 교체 | `ADR-0005`, `0015` |
| `pages/phase2/App.ts` | `App`, `TodoInput`, `TodoList`, `TodoItem`, `Header`, `FilterBar`, `DebugPanel` | Props | `VElement` | Todo 앱 + 한 줄 `formatChange` 로그 + `input`/`textarea` 제외 하이라이트 | 피드백 06 |

## 부록 B. 핵심 설계 원리 Q&A (Phase 2)

| 모듈 | 핵심 질문 | 설계 기반 답변 |
| --- | --- | --- |
| `hooks` | 함수는 매번 새로 실행되는데 상태는 어떻게 유지되는가? | 함수 바깥의 `FunctionComponent.hooks` 배열에 호출 순서 인덱스(`hookIndex`)별로 저장하기 때문이다. |
| `h` + `hooks` | 자식 컴포넌트 안에서 `useState`를 호출하면 왜 `renderingChild > 0` 체크가 필수인가? | 자식은 `h()` 안에서 즉시 실행되므로 그 순간 `currentComponent`는 여전히 루트(`App`)를 가리킨다. 체크가 없으면 자식이 루트의 `hooks[]`를 조용히 망가뜨리기 때문이다(`HR3`). |
| `fc` | `update()`에서 `changes.length === 0`이어도 왜 `applyPatch`를 꼭 호출하는가? | 화면은 같더라도 매 렌더마다 새로 생성된 `events` 핸들러와 `.dom` 참조를 `pairs`를 통해 새 트리와 실제 DOM의 `__handlers`로 인계해야 다음 이벤트가 최신 상태를 보기 때문이다(`C8`). |
| `h` | `TodoItem`에 준 `key`를 왜 props로 넘기지 않고 반환된 루트 `VElement`에 붙이는가? | `h()`가 자식을 즉시 펼치면 컴포넌트 함수 자체는 트리에 남지 않으므로, 루트 요소에 `key`를 달아 주어야 Diff의 `key` 짝짓기(`TD1`)가 동작하기 때문이다(`TD2`). |
| `scheduler` | 왜 사용자 클릭 60회는 오류가 나지 않고 effect 무한 루프만 오류(`Too many re-renders`)가 나는가? | 연쇄 카운터를 **렌더·effect 실행 도중(`isRenderingOrEffect`) 예약된 경우에만** +1하고, 외부 이벤트에서 시작되면 0으로 리셋하기 때문이다(`B4`, `B5`). |
