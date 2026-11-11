# 목표: 컴포넌트 함수는 매번 새로 실행되지만, 상태·작업·계산 결과는 다시 실행되어도 유지되어야 하고, Hook을 잘못 부르면 시스템이 잡아내야 한다.

# Optional metadata

status: accepted
date: 2026-11-10
decision-makers: [김은기]
consulted: [@ksomang @hnjee]
informed: [팀원 전체]

---

# ADR-0010: Hook 상태는 루트 컴포넌트의 hooks 배열에 호출 순서대로 저장하고, useEffect는 리액트와 같은 의존성 규칙과 정리 함수를 따르며, 잘못된 Hook 호출은 실행 중에 오류로 잡는다

## Context and Problem Statement

과제의 핵심 질문은 "함수는 매번 새로 실행되는데, 상태는 어떻게 유지할까?"이다. 컴포넌트 함수 안의 지역 변수는 함수가 끝나면 사라지므로, 상태는 함수 밖에 두어야 한다(FR-15). 상태가 여러 개여도 섞이지 않아야 하고(FR-16), Hook은 루트 컴포넌트에서만 써야 한다(C-06). 이를 위해 다음을 정한다.

1. Hook 상태를 어디에 어떤 구조로 저장할까?
2. useState, useEffect, useMemo는 각각 어떻게 동작할까? 특히 의존성 목록을 생략한 useEffect와 정리 함수는?
3. 잘못된 Hook 호출(컴포넌트 밖, 자식 컴포넌트, 조건부 호출)을 어떻게 잡을까?

## Decision Drivers

- **FR-15·FR-16, C-05·C-06**: 다시 실행해도 값이 유지되고, 상태끼리 섞이지 않으며, Hook은 루트에서만 쓴다.
- **FR-17·FR-18**: effect는 화면 갱신 뒤, 지정한 값이 바뀔 때만 실행한다. memo는 재료가 같으면 다시 계산하지 않는다.
- **실제 리액트와의 차이 줄이기**: 비용이 작다면 리액트와 같게 동작한다.
- **C-07**: 최소한으로 구현한다.
- **검증 가능성**: 규칙 위반이 테스트 가능한 오류로 드러나야 한다.

## Considered Options

**Hook 상태 저장과 규칙 검사** (팀원 `hook_rule_enforcement.md`)
- 컴포넌트의 hooks 배열 + 호출 순서 번호 + 실행 중 검사
- Hook마다 고유 이름을 받는 방식 (`useState('count', 0)`)
- 배열 방식 + ESLint 규칙만으로 검사

**의존성 목록을 생략한 useEffect**
- f1. 리액트와 같게: 생략하면 렌더링마다 실행
- f2. issue.md 글자대로: 생략해도 처음 한 번만 실행

**effect 정리 함수**
- g1. 넣는다: effect가 돌려준 함수를 다음 실행 직전에 부른다
- g2. 뺀다: 돌려준 값을 무시한다

## Decision Outcome

Chosen options: **hooks 배열 + 호출 순서 번호 + 실행 중 검사, f1, g1**.

- **hooks 배열 + 실행 중 검사**, because 실제 리액트와 같은 호출 순서 모델을 유지하면서, 컴포넌트 밖·자식 컴포넌트·호출 수 변화·종류 불일치를 실행 중 오류로 잡아 테스트로 검증할 수 있기 때문이다. 비용이 작고, 검사하지 않으면 상태가 조용히 섞이는 문제를 막을 방법이 없다.
- **f1**, because 비용이 없고 실제 리액트와의 차이가 줄어들기 때문이다. issue.md FR-17의 "지정한 값이 없으면 한 번만"은 이 부분을 설계하기 전에 쓴 문장이라 고쳤다.
- **g1**, because 작은 비용으로 리액트와 같은 동작을 얻고, 타이머 같은 effect를 안전하게 쓸 수 있기 때문이다.

### 1. Hook 저장 칸

```
FunctionComponent (ADR-0015)
  hooks: [ 칸0, 칸1, 칸2, ... ]   ← 컴포넌트 함수 밖에 있어서, 함수가 다시 실행돼도 남아 있음
  hookIndex: 렌더링마다 0부터 다시 셈

App 실행 중
  useState(0)        → hooks[0]  { kind: "state",  value }
  useMemo(f, [q])    → hooks[1]  { kind: "memo",   deps, value }
  useEffect(g, [a])  → hooks[2]  { kind: "effect", deps, effect, cleanup }
```

- Hook을 부른 순서가 칸 번호다. 다시 실행할 때 같은 순서로 불러야 같은 칸을 연다.
- 칸마다 종류(`kind`)를 적어 순서가 어긋났을 때 잡는다(4절).
- 루트 컴포넌트 하나만 hooks 배열을 가진다(C-06).

### 2. useState

| 동작 | 규칙 |
|---|---|
| 첫 렌더링 | 초깃값(함수면 실행 결과)을 칸에 넣고 `[값, setter]`를 돌려준다 |
| 다시 렌더링 | 칸에 있는 값을 돌려준다. 초깃값은 무시한다 |
| setter | 새 값을 계산한다(함수를 넘기면 이전 값으로 실행). 이전 값과 `Object.is`로 같으면 아무것도 하지 않는다. 다르면 저장하고 다시 그리기를 예약한다(ADR-0009) |
| setter의 정체 | 렌더링마다 같은 함수를 돌려준다 |

### 3. useEffect와 useMemo

**의존성 비교 `depsChanged`** (두 Hook 공통): 이전 목록이 없거나, 길이가 다르거나, 같은 자리 값이 `Object.is`로 하나라도 다르면 "바뀜".

| Hook | 규칙 |
|---|---|
| useEffect, 목록 생략 | 렌더링마다 실행 (f1) |
| useEffect, 빈 목록 `[]` | 첫 렌더링 뒤 한 번만 실행 |
| useEffect, 목록 있음 | `depsChanged`일 때만 실행 |
| useMemo | 첫 렌더링에 계산해 결과와 목록을 저장. 다시 렌더링할 때 `depsChanged`면 다시 계산, 아니면 저장된 결과를 돌려준다 (FR-18) |

**effect 실행 순서** (렌더링 한 번이 끝난 뒤):

effect는 `update()`(ADR-0015)의 Patch, `dom` 복사·기록, 핸들러 바꿔 끼우기가 모두 끝난 뒤 실행한다. Patch 실패 복구(ADR-0005 6절)가 일어나도 실행한다. 실제 리액트와 같은 순서로 두 단계로 나눈다(2026-11-11 팀 결정):

1. **정리 단계**: 이번 렌더링에서 실행하기로 정해진 effect 칸(위 표)을 앞에서부터 보며, 이전 실행이 남긴 정리 함수를 **모두** 먼저 부른다 (g1).
2. **실행 단계**: 같은 칸들을 앞에서부터 다시 보며 effect를 실행하고, 돌려준 값이 함수면 정리 함수로 칸에 저장한다.

- 그래서 effect가 여러 개일 때 어떤 effect도 다른 effect의 옛 정리 함수보다 먼저 실행되지 않는다(예: 타이머를 정리한 뒤 새 타이머를 건다).
- 두 단계 모두 칸마다 오류를 따로 잡는다. effect나 정리 함수 하나가 오류를 내도 나머지는 계속 실행하고, 오류는 `console.error`로 남긴다 (K14).
- 정리 함수는 "다시 실행하기 직전"에만 부른다. `unmount()`가 없으므로(ADR-0015) 컴포넌트가 내려갈 때 부르는 경우는 없다.
- effect는 Patch 직후 동기적으로 실행한다. 실제 리액트는 브라우저가 화면을 그린 뒤 조금 늦게 실행한다. "실제 리액트와의 차이점"으로 설명한다.

### 4. Hook 호출 규칙 검사

| 잘못된 호출 | 잡는 방법 | 오류 |
|---|---|---|
| 컴포넌트 밖에서 호출 (버튼 핸들러, effect 안 등) | 지금 렌더링 중인 컴포넌트가 없음 | `HookCallError` |
| 자식 컴포넌트에서 호출 | `h`의 "자식 실행 중" 표시가 켜져 있음 (ADR-0015) | `HookCallError` |
| 렌더링마다 Hook 개수가 다름 (if문 안 호출) | 렌더링 후 이번 개수 ≠ 칸 개수 | `HookOrderError` |
| 같은 칸의 종류가 다름 (순서가 바뀜) | 칸에 적힌 종류 ≠ 이번에 부른 종류 | `HookOrderError` |

- 두 번째 줄이 특히 중요하다. 자식 컴포넌트는 `h` 안에서 바로 실행되므로(ADR-0015), 그동안에도 "지금 렌더링 중인 컴포넌트"는 루트다. 표시가 없으면 자식의 `useState`가 루트의 칸을 조용히 가져다 쓴다.
- 검사는 렌더링 도중, 즉 Diff·Patch 전에 오류를 낸다. 그래서 화면은 이전 상태로 남고 콘솔에 오류가 남는다.
- 개수와 종류가 우연히 같은 조건부 호출은 실행 중에 잡을 수 없다. 코드 검토로 보완한다.
- 오류는 클래스로 구분하고, 테스트는 메시지가 아니라 클래스로 판별한다.

### 5. 알려진 한계

| 한계 | 설명 |
|---|---|
| 의존성 목록에 렌더링마다 새로 만드는 객체·배열을 넣으면 항상 "바뀜" | `Object.is`는 같은 객체일 때만 같다고 본다. 실제 리액트도 같다 |
| 개수·종류가 우연히 같은 조건부 호출은 잡지 못함 | 4절. 코드 검토로 보완 |
| effect 안 setter의 반복 실행 | 안전장치는 ADR-0009 3절 |

### Consequences

- Good, because hooks 배열 하나로 useState, useEffect, useMemo 상태를 모두 저장하고, 함수가 다시 실행되어도 값이 유지된다(FR-15).
- Good, because 실제 리액트와 같은 호출 순서 모델이라 원리를 그대로 설명할 수 있다.
- Good, because 의존성 규칙과 정리 함수가 리액트와 같아 리액트를 아는 사람에게 익숙하다.
- Good, because 잘못된 호출이 테스트 가능한 오류로 드러나고, 상태가 조용히 섞이지 않는다(FR-16).
- Bad, because 일부 조건부 호출은 실행 중에 잡지 못한다.
- Bad, because issue.md FR-17 문장을 고쳐야 했다.
- Neutral, because effect 실행 시점(Patch 직후 동기)이 실제 리액트와 다르다.

### Confirmation

| # | 상황 | 기대 결과 | 출처 |
|---|---|---|---|
| K1 | `useState(5)`, `useState(() => 7)` | 값 5, 7. setter는 함수 | 2절 |
| K2 | setter로 0 → 1 바꾼 뒤 다시 렌더링 | 1이 보임 | FR-15 |
| K3 | 상태 두 개를 각각 바꾼 뒤 다시 렌더링 | 각자의 값이 유지됨 | FR-16 |
| K4 | setter에 지금과 같은 값 | 다시 렌더링 없음 | 2절 |
| K5 | `setCount(c => c + 1)` | 이전 값에 1을 더한 값 | 2절 |
| K6 | 렌더링 두 번 | 두 번 받은 setter가 같은 함수 | 2절 |
| K7 | 목록 생략 effect, 렌더링 3번 | 3번 실행 | f1 |
| K8 | `[]` effect, 렌더링 3번 | 1번 실행 | FR-17 |
| K9 | `[a]` effect, 렌더링 3번 중 2번째에만 `a` 변경 | 2번 실행 (첫 렌더링 + 2번째) | FR-17 |
| K10 | effect 안에서 실제 DOM 읽기 | 이번 렌더링의 새 값이 이미 화면에 있음 | FR-17 |
| K11 | 정리 함수를 돌려주는 `[a]` effect, `a`를 두 번 바꿈 | 정리 함수가 다음 실행 직전마다 1번씩, 첫 실행 전에는 0번 | g1 |
| K12 | `useMemo(spy, [a])`, `a` 그대로 다시 렌더링 → `a` 변경 | spy 호출 1번 → 2번 | FR-18 |
| K13 | useMemo 결과를 같은 렌더링 안에서 화면에 씀 | 화면에 계산 결과가 보임 | FR-18 |
| K14 | effect 두 개 중 첫 번째가 오류 | 두 번째도 실행되고 `console.error` 1번 | 3절 |
| K15 | 정리 함수를 돌려주는 effect 두 개, 둘 다 다시 실행 | 정리 A → 정리 B → 실행 A → 실행 B 순서. 정리 함수 하나가 오류여도 나머지 정리·실행은 계속 | 3절 |
| HR1 | 버튼 핸들러 안에서 `useState` | `HookCallError` | 4절 |
| HR2 | effect 안에서 `useState` | `HookCallError` | 4절 |
| HR3 | 자식 컴포넌트 안에서 `useState` | `HookCallError` (루트 칸을 쓰지 않음) | 4절, C-06 |
| HR4 | 조건에 따라 Hook 개수가 바뀜 | `HookOrderError` | 4절, FR-16 |
| HR5 | 두 렌더링에서 `useState`와 `useMemo`의 순서가 바뀜 | `HookOrderError` | 4절 |
| HR6 | HR4 상황에서 | 화면이 이전 상태 그대로, 콘솔에 오류 | 4절 |

- setter나 클릭 뒤 화면을 확인하는 테스트는 확인 전에 `flushSync()`를 부른다(ADR-0009 4절).
- 코드 검토: 조건문·반복문 안에서 Hook을 부르는 곳이 없는지 확인한다.

## Pros and Cons of the Options

### hooks 배열 + 호출 순서 번호 + 실행 중 검사 (채택)

- Good, because 실제 리액트의 동작 원리와 같다.
- Good, because 위반이 테스트 가능한 오류로 드러난다.
- Bad, because 일부 위반은 실행 중에 감지되지 않는다.

### Hook마다 고유 이름

- Good, because 호출 순서에 의존하지 않아 조건부 호출도 안전하다.
- Bad, because 리액트의 Hook 모델과 달라 학습 목적에 맞지 않는다.
- Bad, because 이름 충돌을 관리해야 한다.

### 배열 + ESLint만

- Good, because 실행 전에 위반을 찾는다.
- Bad, because 규칙 작성 비용이 크고, 실행 중 위반(동적 호출)은 놓친다.

### f1. 생략하면 렌더링마다 (채택) / f2. 생략해도 한 번만

- f1 Good, because 리액트와 같아 예상대로 동작하고, "렌더링마다 실행"을 쓸 방법이 있다.
- f1 Bad, because issue.md FR-17을 고쳐야 한다.
- f2 Good, because issue.md를 그대로 둔다.
- f2 Bad, because 생략과 빈 목록의 차이가 없어져 하나가 쓸모없어지고, 리액트를 아는 사람이 헷갈린다.

### g1. 정리 함수를 넣는다 (채택) / g2. 뺀다

- g1 Good, because 타이머처럼 이전 실행을 치워야 하는 effect를 안전하게 쓸 수 있고, 리액트와 같다.
- g1 Bad, because 칸에 함수를 저장하고 부르는 코드와 테스트가 하나 늘어난다.
- g2 Good, because C-07의 "최소한"에 더 충실하다.
- g2 Bad, because 의존성이 바뀔 때마다 타이머가 늘어나는 식의 문제가 생긴다.

## More Information

### 요구사항 변경안

| 대상 | 항목 | 수정안 |
|---|---|---|
| FR-17 | 요구사항 | 값 목록을 비워 두면 첫 표시 뒤 한 번만, 목록 자체를 생략하면 화면을 다시 계산할 때마다 실행해야 한다. 작업이 정리 함수를 돌려주면 다음 실행 직전에 그 함수를 먼저 실행해야 한다 |
| FR-17 | 인수 기준 | 값 목록이 비어 있으면 실행 횟수가 1이다. 목록을 생략하면 화면 계산 횟수만큼 실행된다. 정리 함수는 다음 실행 직전에 1번 실행된다 |

### 관련 자료

- 바탕 문서: 팀원 `hook_rule_enforcement.md` (원래 번호 adr_007, "Hook 상태 저장 방식과 호출 규칙 강제"). 이 ADR에서 "Hooks"로 범위를 넓혔다.
- 선행 결정: ADR-0015 (`FunctionComponent`, `h`의 자식 즉시 실행, `unmount` 제외), ADR-0009 (다시 그리기 예약, 반복 실행 안전장치), ADR-0005 6절 (Patch 실패 복구)
- 검토 과정: [미니 리액트 개발 일지 ㅡ 팀 설계 검토: useState(#39), useEffect(#40), useMemo(#41)](https://eutopiaa.tistory.com/100), [미니 리액트 개발 일지 ㅡ 팀 설계 검토: Batching(#42)과 Hook 규칙 검사(#43)](https://eutopiaa.tistory.com/101)
- [React 문서: Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- 요구사항: [미니 리액트 프로젝트 ㅡ 요구사항 정리](https://eutopiaa.tistory.com/90) — 관련 ID: FR-15~FR-18, C-05~C-07
- GitHub Issue: #39, #40, #41, #43
- 템플릿: [MADR - Full Template](https://adr.github.io/madr/#full-template)

### 변경 이력

| 날짜 | 내용 | 상태 |
|---|---|---|
| 2026-11-11 | 3절 effect 실행 순서를 리액트와 같게(정리 전부 → 실행 전부) 바꾸고 K15 추가, accepted로 확정 | 팀 승인 (2026-11-11, PR #54) |
