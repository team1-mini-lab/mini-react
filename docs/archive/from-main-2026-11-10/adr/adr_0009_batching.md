---
# Optional metadata
status: proposed
date: 2026-11-09
decision-makers: [팀원 이름]
consulted: []
informed: [팀원 전체]
---

# ADR-0009: State 변경 Batching

## Context and Problem Statement

버튼 한 번에 State가 여러 개 바뀔 때, 상태마다 화면을 다시 그릴지, 변경을 모아 한 번만 다시 그릴지(Batching) 결정해야 한다 (SRS TBD-05). 과제 원문의 선택 항목이며 렌더링 구조와 VT-19 수행 여부를 정한다.

## Decision Drivers

* 불필요한 렌더링 감소 (NFR-01)
* 구현 비용
* 테스트에서 렌더링 시점을 제어할 수 있는가
* 실제 React 동작과의 유사성

## Considered Options

* Batching 없음 — setter 호출마다 즉시 `update()`
* microtask Batching — `queueMicrotask`로 한 번에 `update()`
* 이벤트 핸들러 단위 Batching — 핸들러 래퍼 안에서만 모았다가 끝날 때 `update()`

## Decision Outcome

Chosen option: "microtask Batching", because 스케줄러 약 20줄로 구현되고, 이벤트 핸들러뿐 아니라 setTimeout·Promise 안의 변경도 모두 한 번에 처리되며(React 18 automatic batching과 유사), `flushSync()`로 테스트에서 시점을 제어할 수 있기 때문이다.

### Consequences

* Good, because 한 핸들러에서 setter를 여러 번 불러도 렌더링은 1회다.
* Good, because Batching을 끄려면 `scheduleUpdate` 한 줄만 바꾸면 된다.
* Bad, because setter 호출 직후 DOM이 아직 바뀌지 않아, 테스트는 `await` 또는 `flushSync()`가 필요하다.
* Bad, because 렌더링 중 setter 호출의 무한 루프를 별도로 막아야 한다 (연속 50회 제한).

### Confirmation

* VT-19: 한 핸들러에서 setter 3회 → `renderCount` +1, 화면에 3건 모두 반영.
* `scheduler.test.ts`: `flushSync()` 호출 시 대기 중인 업데이트가 즉시 실행된다.

## Pros and Cons of the Options

### Batching 없음

* Good, because 동작이 가장 단순하고 직관적이다.
* Bad, because 변경 수만큼 diff/patch가 반복된다.
* Bad, because VT-19가 검증 대상에서 빠진다.

### microtask Batching

* Good, because 모든 비동기 경로에서 일관되게 동작한다.
* Neutral, because React 18의 automatic batching과 개념이 같다.
* Bad, because 테스트에 비동기 대기가 필요하다.

### 이벤트 핸들러 단위

* Good, because 핸들러 종료 시점에 동기적으로 렌더링되어 테스트가 쉽다.
* Bad, because setTimeout·Promise 안의 변경은 묶이지 않는다 (React 17 이전 동작).
* Bad, because 모든 이벤트 리스너를 래핑해야 한다.

## More Information

* SRS TBD-05, FR-14, FR-17, VT-19, PR-21
* SDD 4.4 스케줄러와 Batching
* [React 18: Automatic Batching](https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching)
* [MDN queueMicrotask](https://developer.mozilla.org/en-US/docs/Web/API/Window/queueMicrotask)
