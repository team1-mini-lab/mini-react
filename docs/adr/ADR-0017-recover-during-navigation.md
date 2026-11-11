# 목표: Patch 실패 복구(t3)가 뒤로가기·앞으로가기 중에 일어나도 State History의 기록과 위치가 깨지지 않아야 한다.

---
# Optional metadata
status: accepted
date: 2026-11-10
decision-makers: [팀원 이름]
consulted: [Claude (설계 검토 반례 5)]
informed: [팀원 전체]
보완 대상: ADR-0005 6절 3번, ADR-0008
---

# ADR-0017: t3 복구가 뒤로·앞으로가기 중에 일어나면 History에 새로 저장하지 않고 위치만 그대로 둔다

## Context and Problem Statement

ADR-0005 6절 3번은 복구 후 "새 트리를 지금 트리로 삼고, Phase 1 페이지는 기록에도 저장한다"고 한다. 이 문장은 **Patch 버튼**을 전제로 쓰였다. 뒤로가기 중 복구가 일어나면 대상 트리는 **이미 기록에 있는데** 다시 `push`하게 되어, j1(ADR-0008) 때문에 앞쪽 기록이 잘리고 같은 기록이 하나 더 생긴다.

예: 기록 `[A, B, C]`, 지금 C → 뒤로가기(대상 B) 중 `dom` 누락으로 복구 → 설계대로면 `push(B)` → 기록 `[A, B, B]`, C가 사라져 앞으로가기 불가 (H4 실패).

## Considered Options

- **v1**. 복구 시 언제나 `push` (지금 문장 그대로)
- **v2**. Patch 버튼으로 복구했을 때만 `push`. 뒤로·앞으로가기 중 복구는 `push`하지 않고, 이동한 위치(대상 기록)를 그대로 지금 트리로 둔다
- **v3**. 뒤로·앞으로가기 중 복구가 나면 이동을 취소하고 원래 위치로 되돌린다

## Decision Outcome

Chosen option: **v2** (2026-11-10 채택), because 복구 뒤 실제 영역은 대상 트리와 같아지므로(ADR-0005 6절 2번) 이동은 이미 성공한 것과 같고, 기록 배열을 바꿀 이유가 없기 때문이다. v1은 앞쪽 기록을 잃고, v3는 실제 영역을 한 번 더 다시 그려야 한다.

| 복구가 일어난 곳 | 지금 트리 | History |
| --- | --- | --- |
| Patch 버튼 | 새 트리 | `push(새 트리)` (지금과 같음) |
| 뒤로가기 / 앞으로가기 | 대상 트리 (이미 기록에 있음) | 바꾸지 않음. 위치는 이동한 그대로 |

공통: `console.error`로 원래 오류를 남기고 `#status`에 "오류가 나서 실제 영역을 다시 그렸습니다"를 보여 준다(ADR-0005 6절 4번).

### Consequences

- Good, because 복구가 일어나도 기록 수와 앞으로가기가 유지된다.
- Good, because `applyPatch`는 그대로이고 페이지 흐름 한 줄만 바뀐다.
- Neutral, because 대상 트리 객체의 `dom`은 복구가 새로 기록하므로(F1) 다음 이동도 정상이다.

### Confirmation

| # | 상황 | 기대 결과 | 출처 |
| --- | --- | --- | --- |
| R3 | 기록 `[A, B, C]`에서 지금 트리의 `dom` 하나를 지운 뒤 뒤로가기 | 오류가 밖으로 나가지 않고, 실제 영역이 B와 FR-01 기준으로 같으며, 기록은 `[A, B, C]` 그대로, 위치 1, `canRedo() === true` | v2 |
| R4 | R3 직후 앞으로가기 | 복구 없이 정상 이동, 실제 영역이 C와 같음 | v2 + F1 |

## More Information

- 발견: `docs/verification/results/2026-11-10-2-design-ALL-claude.md` 반례 5
- accepted가 되면 ADR-0005 6절 3번 문장에 "Patch 버튼일 때만 (ADR-0017)"을 덧붙이고 SDD_final_phase1 5.2·7.3을 고친다.
