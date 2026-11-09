# ADR-0002: History 분기 시 이후 기록 처리 정책

| 항목 | 값 |
|---|---|
| status | proposed |
| date | 2026-11-09 |
| decision-makers | [팀원 이름] |
| consulted | [팀원 이름] |
| informed | [팀원 전체] |

## Context and Problem Statement

Patch를 세 번 해서 기록이 A → B → C로 쌓인 상태에서 Undo를 두 번 눌러 A로 돌아간 뒤, 테스트 영역을 고치고 다시 Patch해서 새 화면 D가 생겼다. 이때 A 다음에 있던 B와 C를 지울지, 남겨 둘지 결정해야 한다 (SRS TBD-01).

이 결정은 History 자료구조(선형 배열 / 트리)와 Redo 버튼의 의미를 정한다.

## Decision Drivers

* Redo 동작이 사용자에게 예측 가능한가
* History 자료구조와 구현 난이도
* FR-07(기록 저장), FR-08(Undo/Redo) 검증의 단순함
* 일반적인 편집기·브라우저와 같은 사용 경험

## Considered Options

* 분기 시 이후 기록(B, C) 삭제 — 선형 History
* 이후 기록 보존 — 트리 History (분기 선택 UI 필요)
* 이후 기록을 D 뒤로 이어 붙임 — A, D, B, C

## Decision Outcome

Chosen option: "분기 시 이후 기록(B, C) 삭제 — 선형 History", because 브라우저 뒤로가기·텍스트 편집기와 같은 동작이라 Redo 의미가 명확하고, 배열 + index 하나로 구현되어 FR-07·FR-08 검증이 단순하기 때문이다.

### Consequences

* Good, because `History<T>`가 `entries: T[]`와 `index: number`만으로 구현된다.
* Good, because "Redo 가능 여부 = index < entries.length - 1" 하나로 버튼 상태가 결정된다.
* Bad, because 분기 이전의 B, C는 복구할 수 없다.

### Confirmation

* `history.test.ts`: A, B, C push → undo 2회 → D push 후 `size === 2`(A, D), `canRedo() === false`.
* SDD 3.5 `History.push` 주석과 구현이 일치하는지 코드 리뷰에서 확인한다.

## Pros and Cons of the Options

### 분기 시 이후 기록(B, C) 삭제 — 선형 History

* Good, because 구현과 테스트가 가장 단순하다.
* Good, because 사용자가 익숙한 동작이다.
* Neutral, because 텍스트 편집기·브라우저와 같은 방식이라 따로 설명할 필요가 적다.
* Bad, because 버려진 기록을 되살릴 수 없다.

### 이후 기록 보존 — 트리 History (분기 선택 UI 필요)

* Good, because 어떤 기록도 잃지 않는다.
* Neutral, because 학습 측면에서 흥미로운 자료구조다.
* Bad, because 분기를 고르는 UI가 필요하고 Redo의 의미가 모호해진다.
* Bad, because 과제 요구사항 범위를 넘는다.

### 이후 기록을 D 뒤로 이어 붙임 — A, D, B, C

* Good, because 기록을 잃지 않으면서 선형 구조를 유지한다.
* Neutral, because 배열 하나로 구현된다는 점은 선형 방식과 같다.
* Bad, because A → D → B 순서가 실제 작업 순서와 맞지 않아 혼란스럽다.

## More Information

* SRS TBD-01, FR-07, FR-08, VT-07~VT-09, VT-30
* SDD 3.5 History
* GitHub Issue: #11 (핵심 자료구조 설계)
