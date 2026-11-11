# 목표: 시스템은 한 번의 조작으로 상태가 여러 번 바뀌어도 화면을 한 번만 다시 그려야 한다.

# Optional metadata

status: accepted
date: 2026-11-10
decision-makers: [김은기]
consulted: [@ksomang @hnjee]
informed: [팀원 전체]

---

# ADR-0009: 상태 변경은 같은 순간의 것을 모아(`queueMicrotask`) 한 번만 다시 그린다

## Context and Problem Statement

버튼 한 번에 상태가 여러 개 바뀔 때(예: 장바구니 비우기 → 개수, 합계, 쿠폰), 상태마다 화면을 다시 그릴까, 바뀐 것을 모았다가 한 번만 다시 그릴까(TBD-05)? 과제 원문에서 Batching은 선택 과제다.

```js
onClick: () => {
  setCount(c => c + 1);   // 다시 그리기 예약 1
  setTotal(t => t + 500); // 다시 그리기 예약 2
  setCoupon(null);        // 다시 그리기 예약 3
}
```

## Decision Drivers

- **NFR-01**: 불필요한 Diff·Patch를 줄인다.
- **구현·테스트 비용**: 마감(11/11) 안에 끝낼 수 있어야 한다.
- **테스트에서 다시 그리기 시점을 제어할 수 있는가**
- **실제 리액트 동작과의 유사성**

## Considered Options

- b0. Batching 없음: setter마다 바로 `update()`
- b1. 같은 순간의 변경을 모은다: setter는 "다시 그리기 필요" 표시만 하고, 지금 실행 중인 코드가 끝난 직후(`queueMicrotask`) 한 번에 `update()`
- b2. 이벤트 핸들러 단위로 모은다: 핸들러가 끝날 때 한 번에 `update()`

## Decision Outcome

Chosen option: **b1**, because 구현은 20줄쯤이고 테스트에서 화면을 확인하기 전에 `flushSync()` 한 줄을 더하는 정도라 큰 비용이 아니기 때문이다. 대신 다시 그리기 횟수가 줄고(NFR-01), 리액트 18의 자동 Batching과 같은 동작을 얻고, 과제의 선택 항목을 수행한다.

### 1. 동작

| 함수 | 동작 |
|---|---|
| setter (ADR-0010) | 값이 바뀌었으면 저장하고 `scheduleUpdate()`를 부른다 |
| `scheduleUpdate()` | "다시 그리기 필요" 표시를 켠다. 아직 예약이 없으면 `queueMicrotask(flush)`로 한 번만 예약한다 |
| `flush()` | 표시가 켜져 있으면 끄고 `update()`(ADR-0015)를 한 번 부른다 |
| `flushSync()` | 테스트용. 예약된 다시 그리기를 지금 바로 실행한다 |

- 루트 컴포넌트 하나뿐이라(C-06) 표시 하나로 충분하다.
- Batching을 끄려면 `scheduleUpdate()`가 `update()`를 바로 부르도록 한 줄만 바꾼다.

### 2. 렌더링 도중의 setter

- 컴포넌트 본문(렌더링 도중)에서 setter를 부르면 다음 차례로 미루고 `console.warn`으로 경고한다.
- **알려진 한계 (실제 리액트와의 차이, 2026-11-11 팀 결정)**: 렌더링 도중 setter를 부르면 칸의 값은 바로 바뀌고 다시 그리기만 미뤄진다. 그래서 그 렌더링은 한 번 옛 값으로 그려지고, 다음 차례에 새 값으로 다시 그려진다. 개발자가 실수했을 때만 생기는 경우이고, 조건 없이 매번 부르는 실수는 3절의 50회 안전장치가 잡는다. 오류로 막거나 그 자리에서 다시 렌더링하는 방법은 이 ADR과 `renderTree`를 바꿔야 해서 택하지 않았다.

### 3. 반복 실행 안전장치

effect 안에서 setter를 부르면 "다시 그리기 → effect → setter → 다시 그리기…"가 끝없이 돌 수 있다.

| 규칙 | 이유 |
|---|---|
| 다시 그리기가 실행되는 도중(렌더링이나 effect 안)에 새 다시 그리기가 예약될 때만 1씩 센다 | effect 안 setter 같은 자기 반복만 세기 위해서다 |
| 사용자 조작이나 타이머처럼 다시 그리기 밖에서 새로 예약되면 0으로 되돌린다 | 사용자가 버튼을 50번 누르는 정상적인 경우를 오류로 착각하지 않기 위해서다 |
| 50을 넘으면 `Error('Too many re-renders')`를 던진다 | 페이지가 멈추는 대신 원인을 알린다 |

### 4. 테스트 작성 규칙

setter를 부르거나 클릭한 뒤 화면·상태를 확인하는 테스트는, 확인 전에 `flushSync()`를 부른다. 빠뜨리면 코드가 맞아도 테스트가 실패한다. ADR-0015 C8, ADR-0010 K2~K5·K7~K11 등에 적용한다.

### Consequences

- Good, because 한 핸들러에서 setter를 여러 번 불러도 다시 그리기는 1번이다(NFR-01).
- Good, because 타이머·서버 응답 안의 변경도 함께 묶인다.
- Good, because 리액트 18과 같은 동작이라 "실제 리액트와의 차이점"이 하나 줄어든다.
- Good, because 반복 실행이 분명한 오류로 드러난다.
- Bad, because setter 직후에는 화면이 아직 바뀌지 않아, 테스트에 `flushSync()`가 필요하고 디버깅할 때 한 번 헷갈릴 수 있다.

### Confirmation

| # | 상황 | 기대 결과 | 출처 |
|---|---|---|---|
| B1 | 버튼 핸들러에서 setter 3번 → `flushSync()` | 다시 그리기 1번, 화면에 세 변경이 모두 반영 | b1 |
| B2 | 타이머 안에서 setter 2번 → 기다림 | 다시 그리기 1번 | b1 |
| B3 | setter 호출 직후 / `flushSync()` 후 | 직후에는 화면 그대로, 후에는 바뀜 | b1, 4절 |
| B4 | 의존성 목록 없이 매번 상태를 바꾸는 effect | 연속 50회를 넘으면 오류, 페이지는 멈추지 않음 | 3절 |
| B5 | 버튼을 60번 차례로 누름 (매번 다시 그리기) | 오류 없음 | 3절 |
| B6 | 컴포넌트 본문에서 setter 호출 | 경고 1번, 변경은 다음 차례에 반영 | 2절 |

## Pros and Cons of the Options

### b0. Batching 없음

- Good, because 동작이 가장 단순하고, setter 직후 화면이 바로 바뀐다.
- Bad, because 변경 수만큼 Diff·Patch가 반복된다.
- Bad, because 선택 과제를 수행하지 않는다.

### b1. 같은 순간의 변경을 모은다 (채택)

- Good, because 핸들러, 타이머, 서버 응답 어디서든 일관되게 묶인다.
- Good, because 리액트 18의 자동 Batching과 같은 생각이다.
- Bad, because 테스트에 `flushSync()`나 기다림이 필요하다.

### b2. 이벤트 핸들러 단위로 모은다

- Good, because 핸들러가 끝나면 바로 화면이 바뀌어 테스트가 쉽다.
- Bad, because 타이머·서버 응답 안의 변경은 묶이지 않는다(리액트 17 이전 동작).
- Bad, because 이벤트 핸들러를 감싸는 코드가 필요하다.

## More Information

### 요구사항 변경안

| 대상 | 항목 | 수정안 |
|---|---|---|
| TBD-05 | 상태 | 결정(ADR-0009): Batching을 구현한다 |

### 관련 자료

- 바탕 문서: 팀원 `batching.md` (원래 번호 adr_006)
- 선행 결정: ADR-0015 (`update()`), ADR-0010 (setter)
- 검토 과정: [미니 리액트 개발 일지 ㅡ 팀 설계 검토: Batching(#42)과 Hook 규칙 검사(#43)](https://eutopiaa.tistory.com/101)
- [React 18: Automatic Batching](https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching), [MDN queueMicrotask](https://developer.mozilla.org/en-US/docs/Web/API/Window/queueMicrotask)
- 요구사항: [미니 리액트 프로젝트 ㅡ 요구사항 정리](https://eutopiaa.tistory.com/90) — 관련 ID: FR-11, NFR-01, TBD-05
- GitHub Issue: #42
- 템플릿: [MADR - Full Template](https://adr.github.io/madr/#full-template)

### 변경 이력

| 날짜 | 내용 | 상태 |
|---|---|---|
| 2026-11-11 | 2절에 렌더링 도중 setter의 알려진 한계 추가, accepted로 확정 | 팀 승인 (2026-11-11, PR #54) |
