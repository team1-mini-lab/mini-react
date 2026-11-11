# 목표: Phase 1 검증 페이지는 이상한 입력이나 드문 실패가 있어도 버튼 상태와 안내가 어긋나지 않고, 사용자가 막히지 않아야 한다.

---
# Optional metadata
status: accepted
date: 2026-11-10
decision-makers: [김은기]
consulted: [Claude (설계 검토 반례 6, SDD_final_phase1 11장 1·3·8번)]
informed: [팀원 전체]
보완 대상: ADR-0006, ADR-0008, SDD_final_phase1 7.3
---

# ADR-0019: Phase 1 페이지의 경계 동작 네 가지 (빈 코드 Patch, 여러 최상위 요소, 복구 실패, "수정 취소" 버튼)

## Context and Problem Statement

SDD_final_phase1 7.3의 흐름에 정해지지 않은 경우가 네 가지 있다.

1. **빈 코드로 Patch** (반례 6): Patch가 0.3초 타이머를 취소한 뒤 `htmlToVNode`가 `null`이면 "루트 요소가 필요합니다"로 끝나는데, `pending`을 되돌리는 단계가 없어 다음 입력 전까지 두 이동 버튼이 꺼진 채 남는다.
2. **최상위 요소가 여러 개**: `htmlToVNode`는 `<template>`의 첫 요소만 쓴다. 두 번째 이후 요소는 아무 안내 없이 사라진다.
3. **복구 자체의 실패**: t3 `recoverPatch` 안에서 다시 오류가 나면(새 트리에 문제가 있는 버그 등) 정의된 동작이 없다.
4. **수정 중 막힘**: m3(ADR-0008) 때문에 수정 중에는 이동 버튼이 꺼진다. 고친 내용을 버리고 이동하려면 사용자가 코드를 손으로 되돌려야 한다.

## Decision Outcome (2026-11-10 모두 채택)

| # | 경우 | 결정 | 이유 |
| --- | --- | --- | --- |
| x1 | 빈 코드로 Patch | `pending = false`, `dirty = true`로 두고 "루트 요소가 필요합니다"를 보여 준다. 버튼은 평소 규칙대로 다시 계산한다 | 버튼 상태가 위치·수정 여부만으로 정해진다는 ADR-0008 3절과 맞춘다 |
| x2 | 최상위 요소 여러 개 | 첫 요소만 쓰고 `#status`에 "첫 번째 요소만 사용합니다"를 보여 준다. Patch는 막지 않는다 | 루트 하나 규칙(ADR-0006 6절)을 지키면서 사용자에게 사라진 내용을 알린다 |
| x3 | 복구 실패 | `console.error`로 두 오류를 모두 남기고 `#status`에 "복구하지 못했습니다. 새로고침이 필요합니다"를 보여 준 뒤 Patch·뒤로가기·앞으로가기를 끈다 | 실제 영역과 지금 트리가 어긋난 상태에서 계속 조작하면 오류가 이어진다 |
| x4 | "수정 취소" 버튼 | `#revert` 버튼을 상태 문구 옆에 둔다. 누르면 `#editor.value = vnodeToHtml(current)` → 미리보기 다시 그림(g1) → `dirty = false`, `pending = false` → 버튼 갱신. `dirty`가 아닐 때는 꺼 둔다 | m3의 대가("수정 중에는 이동 불가")를 버튼 하나로 풀어 준다 (SDD-3 7.3 제안) |

### Consequences

- Good, because 네 경우 모두 버튼 상태와 안내가 정해져 자동 테스트로 확인할 수 있다.
- Bad, because 페이지에 버튼(`#revert`)과 문구가 하나씩 늘어 VT-32 체크 항목도 는다.

### Confirmation

| # | 상황 | 기대 결과 | 출처 |
| --- | --- | --- | --- |
| H13 | 코드를 모두 지우고 0.3초 안에 Patch | "루트 요소가 필요합니다", `pending === false`, `dirty === true`, 두 이동 버튼 꺼짐 | x1 |
| H14 | 코드를 고친 뒤 "수정 취소" | 코드 입력칸이 지금 기록의 코드와 같고, 미리보기가 같으며, 이동 버튼이 위치 조건대로 켜짐 | x4 |
| TA15 | 코드에 `<div>a</div><p>b</p>` | 새 트리는 `div` 하나, `#status`에 "첫 번째 요소만 사용합니다" | x2 |
| R5 | `recoverPatch`가 던지도록 만든 상태에서 Patch | 오류가 밖으로 나가지 않고, `console.error` 2회, 안내 문구, 세 버튼 꺼짐 | x3 |

## More Information

- 발견: 설계 검토 반례 6, SDD_final_phase1 11장 1번(여러 최상위 요소)·3번(복구 실패)·8번("수정 취소" 버튼)
- accepted가 되면 SDD_final_phase1 7.1(버튼), 7.3(흐름), 7.4(상태 문구), 8장(예외 표)을 고친다.
