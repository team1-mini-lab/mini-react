# ADR-0005: Patch 적용 방식 (경로 해석 후 일괄 적용)

| 항목 | 값 |
|---|---|
| status | proposed |
| date | 2026-11-09 |
| decision-makers | [팀원 이름] |
| consulted | [팀원 이름] |
| informed | [팀원 전체] |

## Context and Problem Statement

Patch는 `path: number[]`로 대상 노드를 가리킨다. 패치를 하나씩 적용하면 앞선 REMOVE가 형제 노드의 인덱스를 밀어 뒤의 패치가 엉뚱한 노드를 수정할 수 있다. 또 대상이 없는 패치(VT-31)를 만나면 이미 일부만 적용된 상태로 DOM이 깨질 수 있다.

## Decision Drivers

* 인덱스 밀림으로 인한 오작동 방지
* 실패 시 DOM이 부분 적용 상태로 남지 않을 것 (VT-31)
* 구현과 테스트의 단순함

## Considered Options

* 경로 해석(resolve) 후 일괄 적용(apply) — 2단계
* 하나씩 적용, REMOVE는 인덱스 내림차순으로 정렬
* 패치마다 경로 대신 노드 참조를 Diff 단계에서 직접 저장

## Decision Outcome

Chosen option: "경로 해석(resolve) 후 일괄 적용(apply) — 2단계", because DOM을 바꾸기 전에 모든 대상을 노드 참조로 바꾸면 적용 순서와 무관하게 안전하고, 대상이 하나라도 없으면 아무것도 바꾸지 않고 `PatchError`를 던질 수 있기 때문이다.

### Consequences

* Good, because REMOVE 순서를 신경 쓰지 않아도 된다.
* Good, because 실패가 원자적이다 (DOM 변경 0건).
* Good, because `diff`는 DOM을 모르는 순수 함수로 남는다.
* Bad, because 패치 목록을 두 번 순회한다 (노드 수가 작아 영향 미미).

### Confirmation

* `patch.test.ts`: 존재하지 않는 path가 섞인 Patch[] 적용 시 `PatchError`, MutationObserver 기록 0건 (VT-31).
* 코드 리뷰: `applyPatches` 안에서 resolve 루프가 apply 루프보다 먼저 끝난다.

## Pros and Cons of the Options

### 경로 해석(resolve) 후 일괄 적용(apply) — 2단계

* Good, because 순서 독립적이고 원자적이다.
* Neutral, because 패치 수가 적은 이 프로젝트에서는 속도 차이가 거의 없다.
* Bad, because 순회가 한 번 늘어난다.

### 하나씩 적용, REMOVE는 인덱스 내림차순으로 정렬

* Good, because 구현이 직관적이다.
* Neutral, because 정렬 규칙만 지키면 결과는 2단계 방식과 같다.
* Bad, because 정렬 규칙을 놓치면 바로 버그가 되고, 실패 시 부분 적용이 남는다.

### 패치마다 경로 대신 노드 참조를 Diff 단계에서 직접 저장

* Good, because 경로 해석이 필요 없다.
* Neutral, because 실제 React(Fiber)는 노드 참조를 들고 다니는 방식에 가깝다.
* Bad, because Diff가 실제 DOM에 의존하게 되어 순수 함수가 아니게 되고, History의 VNode와 비교할 때 쓸 수 없다.

## More Information

* SRS FR-03, FR-04, IR-06, VT-06, VT-31
* SDD 3.4 Patch, 5장 예외 처리
