# mini-react

**React 없이 TypeScript로 직접 만든 Virtual DOM 엔진과 Hooks**, 그리고 그 설계를 요구사항부터 테스트까지 끊김 없이 추적하는 **검증 하네스**.

[![verify](https://github.com/team1-mini-lab/mini-react/actions/workflows/verify.yml/badge.svg)](https://github.com/team1-mini-lab/mini-react/actions/workflows/verify.yml)
[![pages](https://github.com/team1-mini-lab/mini-react/actions/workflows/pages.yml/badge.svg)](https://github.com/team1-mini-lab/mini-react/actions/workflows/pages.yml)

**기술 스택**: TypeScript 6 (strict) · Vite 8 · Vitest 5 · jsdom · ESLint 10 + typescript-eslint · dependency-cruiser · Stryker · fast-check · GitHub Actions. UI 프레임워크는 쓰지 않습니다.

**▶ 데모: https://team1-mini-lab.github.io/mini-react/** — [Phase 1 검증 페이지](https://team1-mini-lab.github.io/mini-react/src/pages/phase1/index.html) · [Phase 2 Todo 앱](https://team1-mini-lab.github.io/mini-react/src/pages/phase2/index.html) · [성능 실험실](https://team1-mini-lab.github.io/mini-react/src/pages/lab/index.html)

**📋 [최신 검증 보고서](https://github.com/team1-mini-lab/mini-react/blob/verify-report/REPORT.md)** — push할 때마다 CI가 새로 만듭니다

| 테스트 | VT(검증 항목) | 요구사항 추적 | 뮤테이션 점수 | 커버리지 (core · component) | 외부 UI 프레임워크 |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **202 / 202** | **51 / 51** | **44 / 44** | **85.7%** | **97% · 99%** | **0** |

> 숫자는 [검증 보고서 (2026-11-11 스냅샷)](docs/verification/runs/2026-11-11-final-report.md) 기준입니다. 최신 값은 [최신 검증 보고서](https://github.com/team1-mini-lab/mini-react/blob/verify-report/REPORT.md)에 있습니다.

---

## 무엇을 만들었나

브라우저의 실제 DOM을 매번 통째로 다시 그리지 않고, **바뀐 부분만** 고치는 React의 핵심 원리를 바닥부터 구현했습니다.

> **Virtual DOM은 만능이 아닙니다.** Virtual DOM을 만들고 비교하는 데에도 비용이 들기 때문에, 항상 더 빠르거나 DOM 변경을 무조건 최소로 만드는 것은 아닙니다. 실제 성능은 UI 구조와 업데이트 방식에 따라 달라집니다. 이 프로젝트가 줄이는 것은 **메인 스레드에서 하는 일**(Batching으로 렌더 횟수, `useMemo`로 재계산)과 **실제 DOM 변경 수**(Diff·Patch)이고, 그 뒤의 Style → Layout → Paint → Composite는 브라우저의 몫입니다. 그래서 성능은 "빠르다"는 주장 대신 DOM 조작 수·렌더 횟수처럼 **셀 수 있는 값**으로 확인합니다.

### Phase 1 — Virtual DOM · Diff · Patch · History

![Phase 1: 코드를 고치고 Patch하면 바뀐 줄만 노랗게 반짝이고, 변경 목록이 한 줄씩 요약된다](docs/images/phase1-patch.png)

- **Virtual DOM 변환**: 실제 DOM ↔ Virtual DOM ↔ HTML 코드를 오가는 변환기. 공백 규칙(`<pre>` 예외), XSS 정제(`<script>`·`on*`·`javascript:` 제거)
- **Diff**: 이전·새 트리를 비교해 6종 변경(추가·삭제·교체·글자·속성·이동) 목록을 만든다. **key로 자식을 짝지어** 목록 앞에 항목을 넣어도 변경 1개
- **Patch**: 변경만 실제 DOM에 적용. 실제 DOM을 바꾸는 파일은 `core/patch.ts` **하나뿐** (lint로 강제). 실패하면 화면을 새 트리로 복구
- **State History**: 뒤로가기·앞으로가기도 Diff·Patch로 반영. 고친 것 없이 Patch하면 기록하지 않음

| key 있음 · 없음 비교 | 이전 · 새 트리 보기 |
|:---:|:---:|
| ![key가 있으면 입력값 3이 바나나를 따라가고 변경은 1개, key가 없으면 사과 옆에 남고 변경은 3개](docs/images/phase1-key-demo.png) | ![바뀐 노드만 색칠한 이전 트리와 새 트리](docs/images/phase1-tree-view.png) |

### Phase 2 — Component · State · Hooks · Batching

![Phase 2 Todo 앱: 체크한 줄과 바뀐 숫자만 반짝이고, 오른쪽에 Patch 변경 목록이 보인다](docs/images/phase2-todo.png)

- **`h()`**: `h('li', { key, onClick }, ...)`로 화면을 선언. 자식 컴포넌트는 즉시 펼치고, 이벤트는 `attrs`가 아닌 `events`로 분리
- **Hooks**: `useState`, `useEffect`(의존성·정리 함수), `useMemo`. 잘못된 호출(컴포넌트 밖·자식 안·개수 변화)은 실행 중 오류로 잡음
- **Batching**: setState를 여러 번 불러도 `queueMicrotask`로 모아 한 번만 다시 그림. 무한 루프는 50회에서 차단
- **Phase 1 엔진 재사용**: 다시 그릴 때 Phase 1의 `diff`·`applyPatch`를 **수정 없이** 그대로 사용
- **Todo 앱**: 위의 `h`·Hooks만으로 만든 테스트 페이지 (React·JSX 0줄)

### 확장 — 성능 실험실 (ADR-0020)

**[▶ 성능 실험실 열기](https://team1-mini-lab.github.io/mini-react/src/pages/lab/index.html)** — 같은 상품 목록이 바뀔 때 화면을 고치는 방법을 나란히 비교합니다.

| 방식 | 하는 일 | 상품 1만 개 · 전부 변경 (Chromium 측정) | 장점 / 단점 |
|---|---|---|---|
| 🔁 전체 렌더링 (비교 기준) | Virtual DOM 없이 매번 전부 새로 만듦 (`innerHTML`) | 새로 만든 노드 2만 개 | 코드 단순 / 입력값·스크롤 사라짐 |
| ✏️ 부분 렌더링 · 동기식 (**과제 구현**) | Virtual DOM으로 비교해 바뀐 곳만 고침, 한 번에 끝까지 | 화면 멈춤 약 **69ms** (50ms 넘으면 클릭·입력 밀림) | 입력값 유지 / 비교 비용 |
| ⏸️ 부분 렌더링 · 분할식 (**팀 확장**) | 비교를 5ms 조각으로 나눠 사이사이 브라우저에 양보 (Time Slicing) | 화면 멈춤 약 **7ms** | 화면 안 멈춤 / 끝나는 건 조금 늦음 |
| 👀 보이는 만큼만 (비교 줄이기) | 10만 개 중 화면에 보이는 줄만 Virtual DOM으로 만들고 스크롤 때 그 줄만 비교 | DOM 약 15줄, 스크롤 한 번에 바뀐 노드 몇 개 | 데이터가 많아도 가벼움 / 줄 높이가 일정해야 함 |
| 🎯 바로 고치기 (비교 없애기) | Signals: 값과 화면 칸의 연결을 미리 기억해 그 칸만 고침 (별도 데모) | 1천 개 중 가격 하나: Virtual DOM 비교 2천여 개 vs **비교 0**, DOM 수정은 둘 다 1 | 비교 비용 없음 / 연결 목록을 메모리에 들고 있어야 함 |

- **1개만 바꾸면** 부분 렌더링은 DOM 수정 1번, 전체 렌더링은 노드 2만 개를 새로 만듭니다.
- **전부 바꾸면** 비교 비용 때문에 전체 렌더링이 더 빠를 수도 있습니다. Virtual DOM의 목적은 "가장 빠른 것"이 아니라, 개발자가 상태만 바꾸면 바뀐 곳을 알아서 고쳐 주는 것입니다. 가장 빠른 건 손으로 그 칸만 고치는 것이지만, 화면이 커질수록 고칠 곳을 사람이 다 기억해야 해서 실수가 늘어납니다.
- **비교 비용을 줄이는 방법**: 보이는 만큼만(위 실험), 안 바뀐 컴포넌트 건너뛰기(React `memo`), 아예 비교하지 않기(Svelte·Solid의 Signals: 값과 화면 칸의 연결을 미리 기억해 그 칸만 고침).
- **분할식 구현**: Diff를 노드 하나씩 멈췄다 이어 할 수 있는 작업(generator)으로 바꿔 `diffSliced()`가 5ms씩 실행하고 `MessageChannel`로 양보합니다. 새 업데이트가 오면 앞 작업은 버리고 최신 상태로 다시 시작합니다. 실제 DOM에 반영하는 단계(Commit)는 나누지 않습니다. 동기 Diff와 결과가 같다는 것을 무작위 트리 300쌍으로 확인했습니다(fast-check).
- 시간은 기계마다 달라 보여 주기만 하고, 자동 테스트는 결과 화면과 DOM 노드 수로 판정합니다.

---

## 요구사항 (SRS)

과제 설명을 먼저 [SRS](docs/SRS_fixed.md)(ISO/IEC/IEEE 29148 형식)로 정리하고, 모든 설계·코드·테스트를 이 ID에 연결했습니다.

| 구분 | 개수 | 예 |
|---|---|---|
| 기능 (FR) | 23 | FR-04 바뀐 부분만 갱신 · FR-09 key 짝짓기 · FR-18 useEffect는 Patch 뒤 실행 |
| 비기능 (NFR) | 4 | NFR-01 바뀌지 않은 곳은 건드리지 않음 · NFR-04 모듈 단일 책임 |
| 인터페이스 (IR) | 10 | IR-05 Diff 엔진 · IR-08 setter |
| 제약 (CON) | 7 | CON-01 React·JSX 등 외부 UI 프레임워크 금지 |
| 검증 항목 (VT) | 51 | 요구사항마다 "어떤 테스트로 확인하는가" |

SRS는 v1.1 → v1.8로 개정됐습니다. 설계 검토에서 찾은 반례와 팀 결정을 요구사항에 다시 반영한 기록이 [개정 이력](docs/SRS_fixed.md#개정-이력)에 남아 있습니다.

---

## 구조

```mermaid
flowchart LR
  subgraph pages["pages (테스트 페이지)"]
    P1["phase1<br/>검증 페이지"]
    P2["phase2<br/>Todo 앱"]
  end
  subgraph component["component (미니 React)"]
    H["h()"] --> FC["FunctionComponent<br/>mount · update"]
    HK["hooks<br/>useState · useEffect · useMemo"] --> SC["scheduler<br/>Batching"]
    SC --> FC
  end
  subgraph core["core (Virtual DOM 엔진)"]
    D["diff<br/>읽기만"] --> PT["patch<br/>DOM 쓰기는 여기만"]
    V["vnode · dom · html<br/>변환"]
    HI["history"]
  end
  P1 --> core
  P2 --> component
  FC --> D
  FC --> PT
```

의존 방향은 `pages → component → core` 한 방향이고, `dependency-cruiser`가 역방향 import와 순환을 막습니다. Diff는 실제 DOM(`dom`)과 이벤트(`events`)를 읽지 않아 **실제 DOM 없이 객체 두 개만으로 테스트**할 수 있습니다.

### 동작 흐름

버튼을 눌렀을 때 데이터가 어떤 함수를 거쳐 화면까지 가는지 그린 그림입니다. 단계별 설명은 흐름 노트에 있습니다.

<details>
<summary><b>Phase 1</b> — 코드 입력 → 새 설계도 → diff → applyPatch, 실패하면 recoverPatch</summary>

![Phase 1 동작 흐름](docs/images/phase1-flow.png)

</details>

<details>
<summary><b>Phase 2</b> — 클릭 → setter → 예약(Batching) → update → diff·applyPatch → useEffect</summary>

![Phase 2 동작 흐름](docs/images/phase2-flow.png)

</details>

---

## 핵심 설계 결정

모든 결정은 [ADR](docs/adr/README.md)(Architecture Decision Record)로 남겼습니다. 대표적인 것만 추리면:

| 결정 | 왜 | ADR |
|---|---|---|
| 변경 목록은 자리 번호가 아니라 **이전 트리 객체**를 가리키고, Patch는 객체에 기억한 실제 노드(`dom`)로 적용 | 실제 DOM에 주석이 있거나 여러 개를 지우면 번호가 밀린다 | [0004](docs/adr/ADR-0004-diff-patch.md) |
| 자식을 **key**로 짝짓기 | 목록 앞에 끼워 넣어도 입력값이 자기 줄을 따라가고, 조작은 1번 | [0004](docs/adr/ADR-0004-diff-patch.md) |
| 적용 순서: 삭제 → 앞에서부터 [자리 맞추기 → 자신의 변경 → 자식] | 교체를 먼저 하면 그 노드를 기준으로 쓰는 이동이 `insertBefore` 오류를 낸다 | [0005](docs/adr/ADR-0005-patch.md) |
| Patch 실패 시 컨테이너를 새 트리로 통째 복구 | 반쯤 바뀐 화면이 남으면 다음 Patch부터 계속 어긋난다 | [0005](docs/adr/ADR-0005-patch.md) |
| 하이라이트는 `element.animate()` | `class`·`style`을 건드리면 조작 횟수 측정에 섞인다 | [0006](docs/adr/ADR-0006-test-area.md) |
| effect는 React와 같은 순서(정리 함수 전부 → 실행 전부) | 한 effect가 다른 effect의 옛 정리에 기대는 경우(타이머) | [0010](docs/adr/ADR-0010-hooks.md) |
| 뒤로 간 상태에서 Patch하면 앞쪽 기록은 버림(한 줄 기록), 바뀐 게 없는 Patch는 기록하지 않음 | 가지 치는 기록은 일정 대비 규칙이 너무 많고, 빈 기록이 생기면 뒤로가기가 고장 난 것처럼 보인다 | [0008](docs/adr/ADR-0008-history.md) |
| setter는 바로 그리지 않고 마이크로태스크로 **한 번만** 예약(Batching), 테스트는 `flushSync()`로 즉시 확인 | 한 번의 클릭에 상태가 여러 번 바뀌어도 Diff·Patch는 1번. 20줄 남짓으로 구현 가능 | [0009](docs/adr/ADR-0009-batching.md) |
| Hook은 hooks 배열 + 호출 순서 번호, 실행 중에 호출 수·종류를 검사해 오류로 알림 | React와 같은 모델을 유지하면서 "자식에서 useState", "조건문 안 Hook"을 테스트 가능한 오류로 잡는다 | [0010](docs/adr/ADR-0010-hooks.md) |
| 이벤트 핸들러는 요소마다 고정 리스너 1개 + `__handlers` 교체 | 매 렌더 새 클로저가 생겨도 DOM 조작 0회 | [0015](docs/adr/ADR-0015-component-rendering.md) |

**실제 React와 의도적으로 다른 점** (발표·방어 포인트): 자식 컴포넌트 즉시 펼침, 요소별 고정 리스너, effect를 Patch 직후 동기 실행, 루트 컴포넌트 하나 & `unmount` 없음, 렌더링 중 setter는 한 번 옛 값으로 그려짐 — 이유는 [SDD Phase 2 1.2](docs/specs/SDD_final_phase2.md)에 있습니다.

---

## 어떻게 검증했나

![검증 루프](docs/images/verify-loop.png)

"테스트가 통과한다"를 넘어, **요구사항 하나하나가 설계·코드·테스트로 이어지는지**를 기계가 확인하게 만들었습니다. 표준은 IEEE 1012(V&V), ISO/IEC/IEEE 29148(요구사항), IEEE 1016(설계 기술)을 참고했습니다.

```
SRS(요구사항) → ADR(결정 20개) → SDD(설계) → 코드(src) → VT(검증 항목 51개) → 테스트 202개
```

| 관문 | 확인하는 것 | 도구 |
|---|---|---|
| **G1** SRS–SDD 정합성 | 요구사항 ID가 설계 추적표에 빠짐없이 있는지, ADR 테스트 ID가 설계에 반영됐는지, 폐기된 ADR을 근거로 쓰지 않는지 | `check:docs` + 하네스 자체 점검(문서를 12가지로 일부러 망가뜨려 모두 잡는지) |
| **G2** 설계 검증 | 구현 전에 설계를 반례로 공격하고, 모든 반례를 사람이 판정했는지 | AI 반례 검토(Claude·Gemini) + 판정 파일 |
| **G3** 구현 | 타입·구조 규칙 | `tsc --strict`, ESLint(DOM 쓰기는 `patch.ts`만, Diff는 `dom` 읽기 금지), dependency-cruiser, `check:stack`(React 0) |
| **G4** VT 검증 | 테스트·커버리지·**뮤테이션**·VT 증거·요구사항 사슬 | Vitest + jsdom, v8 coverage, Stryker, `check:vt`, `check:trace` |

### 구현 전에 설계 결함을 찾은 사례

설계 문서를 jsdom 시제품으로 먼저 돌려 보는 **설계 반증** 단계에서, 공식 샘플을 **아무것도 고치지 않고 Patch해도 "변경 있음"이 나오는** 결함을 찾았습니다. 원인은 주석을 건너뛴 자리 양옆에 공백 글자 노드가 따로 남아, 실제 영역(자식 15개)과 다시 읽은 트리(자식 9개)가 어긋난 것이었습니다. 이 반례를 ADR-0016(나란히 남은 공백 노드 합치기)으로 고친 뒤 구현해, 무수정 Patch의 변경이 **0개**로 떨어집니다. 같은 방식으로 반례 17건을 판정했고(진짜 반례 8 · 기존 한계 3 · 아님 6), 진짜 반례는 [ADR-0016–0019](docs/adr/README.md)가 되었습니다.

### 뮤테이션 테스트로 테스트의 빈틈 찾기

커버리지가 97%여도 테스트가 결과를 제대로 확인하는지는 알 수 없어서, Stryker로 코드를 980군데 일부러 망가뜨려 봤습니다. 처음 79.4%에서 살아남은 변이(HTML 출력 모양, 체크박스 `checked` 동기화, 이벤트 제거, 50회 경계)를 테스트로 보강해 **85.7%**까지 올렸습니다.

---

## 시작하기

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:5173 → Phase 1 · Phase 2 · 성능 실험실
```

| 명령 | 하는 일 |
|---|---|
| `npm test` | Vitest 202개 (jsdom) |
| `npm run test:coverage` | 커버리지 (core·component 90% 미만이면 실패) |
| `npm run test:mutation` | Stryker 뮤테이션 테스트 (약 10분) |
| `npm run verify` | 타입 검사 + 기술 스택 + 의존 방향 + lint + 문서 정합성 + 테스트 |
| `npm run report` | 위 전부를 돌려 `report/REPORT.md`(G1~G4, 정합성 사슬, VT 51개 증거) 생성 |

---

## 폴더

```
src/
  core/         Virtual DOM 엔진: vnode · dom · html · diff · patch · history · slice(분할식 Diff)
  component/    미니 React: h · hooks · scheduler · function-component
  pages/        테스트 페이지: phase1(검증 페이지) · phase2(Todo 앱) · lab(성능 실험실)
tests/          unit · integration · helpers
scripts/        검증 하네스: check_docs · check_trace · check_vt_tests · check_stack · report · merge_mutation
docs/
  SRS_fixed.md  요구사항 명세 (FR·NFR·IR·CON·VT)
  adr/          설계 결정 기록 ADR-0001~0020 (superseded/는 다른 ADR로 대체된 옛 결정)
  specs/        설계서 SDD_final_phase1 · phase2 · common
  verification/ 체크리스트, 설계 검토 결과와 판정, 검증 보고서
```

---

## 팀

SRS(요구사항)는 팀 전체가 함께 작성했고, 설계는 ADR로 나눠 맡았습니다. 모든 결정은 팀 설계 검토와 PR 리뷰를 거쳐 함께 승인했습니다.

| 이름 | 맡은 부분 |
|---|---|
| 김소망 | Phase 1 VDOM·DOM 변환·Diff·Patch·테스트 영역 설계(ADR-0001–0006), Phase 2 컴포넌트 렌더링 설계(ADR-0015), 팀 설계 검토 진행 |
| 김은기 | Phase 1 History, Phase 2 State·Hooks·Batching, 테스트·검증 하네스 설계(ADR-0007–0014), 설계 반례 판정(ADR-0016–0019), Phase 1·2 구현과 자동 검증 보고서 |
| 이현지 | 저장소 구성, ADR 전체 검토 의견(ADR-0001–0015) |

## 다른 팀과 다르게 더한 것

과제 요구사항(Virtual DOM·Diff·Patch, Component·State·Hooks, 테스트 페이지)은 모두 구현했고, 여기에 더해:

| 무엇 | 어디서 보나 |
|---|---|
| 바뀐 곳 하이라이트, 이전·새 트리 보기, key 있음·없음 비교 | Phase 1 페이지 |
| 분할 렌더링(Time Slicing)으로 큰 목록에서도 화면이 멈추지 않게 | 성능 실험실 |
| 보이는 만큼만 비교(가상 스크롤): 데이터 10만 개를 DOM 15줄로 | 성능 실험실 |
| 바로 고치기(Signals): 비교 0번으로 바뀐 칸만 고치는 방식과 Virtual DOM 비교 | 성능 실험실 |
| 요구사항 → 설계 → 코드 → 테스트를 잇는 검증 하네스, push마다 PR에 보고서 | GitHub Actions |
| 구현 전에 설계를 반례로 검증, 뮤테이션 테스트로 테스트 빈틈 확인 | `docs/verification/` |

**비교 비용이 아예 없는 방식**: Virtual DOM은 바뀐 곳을 찾으려고 매번 비교합니다. Svelte·SolidJS·Vue가 쓰는 **Signals**는 "이 값은 이 칸에 쓰인다"는 연결을 처음에 기억해 두고, 값이 바뀌면 그 칸만 바로 고쳐서 비교 자체를 하지 않습니다. 성능 실험실의 "🎯 바로 고치기"에서 직접 비교할 수 있습니다 (우리 엔진은 그대로 두고 별도 데모로 구현).
