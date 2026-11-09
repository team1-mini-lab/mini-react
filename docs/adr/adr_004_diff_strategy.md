---
# Optional metadata
status: proposed
date: 2026-11-09
decision-makers: [팀원 이름]
consulted: []
informed: [팀원 전체]
---

# ADR-0004: Diff 비교 전략과 Patch 유형

## Context and Problem Statement

Diff가 어떤 변경 유형을 탐지하고(SRS TBD-03), 자식 목록을 어떤 기준으로 짝지을지(TBD-04, key 사용 여부) 정해야 한다. 이 결정은 `Patch` 타입, Patch 모듈 구현 범위, 그리고 FR-04(변경 부분만 갱신)의 충족 정도를 정한다.

## Decision Drivers

* FR-03~FR-06과 VT-04, VT-27을 모두 표현할 수 있는가
* Patch 타입이 작고 테스트하기 쉬운가
* 목록 중간 삽입·순서 변경 시 불필요한 DOM 변경의 양
* 과제 기간 안에 구현 가능한가

## Considered Options

* 위치(index) 비교 + 5종 Patch (CREATE, REMOVE, REPLACE, TEXT, PROPS)
* key 기반 비교 + 6종 Patch (위 5종 + MOVE)
* 위치 비교를 기본으로, key가 있는 자식만 key 비교 (혼합)

## Decision Outcome

Chosen option: "위치(index) 비교 + 5종 Patch", because 필수 요구사항(FR-03~FR-06)을 모두 충족하는 최소 구조이며, key 비교는 MOVE 패치와 순서 재배치 알고리즘이 추가되어 복잡도가 크게 오르기 때문이다. key 비교는 Phase 2 완료 후 확장 과제(Should)로 둔다.

### Consequences

* Good, because 한 부모에서 CREATE와 REMOVE가 동시에 나오지 않아 Patch 적용 순서 문제가 없다.
* Good, because `diff`가 순수 함수라 입력·출력 단위 테스트가 쉽다.
* Bad, because 목록 중간 삽입 시 뒤쪽 항목이 모두 TEXT/REPLACE로 갱신된다.
* Bad, because 항목 순서 변경 시 기존 요소가 다른 내용으로 재사용된다 (입력값이 엉뚱한 항목에 남을 수 있음).

### Confirmation

* `diff.test.ts`: 5종 패치를 각각 만드는 입력 쌍과 기대 Patch[]가 통과한다 (VT-03~VT-05, VT-27, VT-28).
* 속성 기반 테스트: 임의의 VNode 쌍 a, b에 대해 `applyPatches(render(a), diff(a, b))`의 결과가 b와 같다.
* `Patch` 유니온 타입에 5종 외의 멤버가 없다 (타입 테스트).

## Pros and Cons of the Options

### 위치 비교 + 5종

* Good, because 구현이 가장 작고 명확하다.
* Good, because 필수 요구사항을 모두 충족한다.
* Bad, because 목록 재배치에 비효율적이다.

### key 기반 + MOVE

* Good, because 목록 재배치 시 기존 요소를 올바르게 재사용한다.
* Neutral, because 실제 React와 같은 방식이라 학습 가치가 있다.
* Bad, because MOVE 적용 순서와 인덱스 계산이 복잡하다.
* Bad, because Phase 1 HTML 입력에서 key를 어디서 받을지(`data-key` 등) 추가 규칙이 필요하다.

### 혼합

* Good, because key가 없을 때는 단순 경로를 유지한다.
* Bad, because 두 알고리즘을 모두 유지·테스트해야 한다.

## More Information

* SRS TBD-03, TBD-04, FR-03~FR-06, VT-03~VT-05, VT-27, VT-28
* SDD 3.3 Diff
* [React 문서: Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
