# ADR-0013: Patch는 실제 DOM을 바꾸기 전에 모든 변경의 대상을 먼저 확인하고, 하나라도 없으면 아무것도 바꾸지 않는다

| 항목 | 값 |
|---|---|
| status | superseded |
| superseded by | ADR-0005 6절 t3 (피드백 02 5-1절, 2026-11-10) |
| date | 2026-11-10 |
| decision-makers | [팀원 이름] |
| consulted | @ksomang, @hnjee, @onekindalpha |
| informed | [팀원 전체] |
| 보완 대상 | ADR-0005 (Patch) |
| 복구 출처 | 구 eungi adr_005 "Patch 적용 방식 (경로 해석 후 일괄 적용)"의 원자성 부분 ([원문](https://github.com/team1-mini-lab/mini-react/blob/067122b05a3fb1804ee9aaa7fb5e95501acdebef/docs/adr/adr_005_patch_atomic_apply.md)) |

## Context and Problem Statement

ADR-0005는 Patch가 변경 목록(`changes`)을 어떤 순서로 적용할지 정했지만, **적용 도중 대상을 찾지 못하면 어떻게 할지**는 정하지 않았다.

Patch는 각 변경이 가리키는 이전 Virtual DOM 객체의 `dom`으로 실제 노드를 찾는다(ADR-0004 `dom` 규칙). `dom`이 비어 있거나(Patch 후 `dom` 복사 누락, ADR-0004 Consequences), 이미 화면에서 떨어진 노드를 가리키면 그 변경은 적용할 수 없다. 이때 앞의 변경들이 이미 적용된 뒤라면 실제 영역은 **이전 화면도 새 화면도 아닌 반쯤 바뀐 상태**로 남는다. 이 상태에서는 지금 트리(`current`)와 실제 영역이 어긋나서 다음 Patch와 뒤로가기도 연쇄로 실패한다.

구 eungi adr_005는 "경로를 먼저 모두 실제 노드로 해석하고, 하나라도 없으면 DOM을 바꾸지 않고 `PatchError`"로 이 문제를 풀었다. 경로 방식은 ADR-0004·0005로 대체되었지만 **"바꾸기 전에 전부 확인한다"는 원자성 아이디어**는 지금 설계에도 그대로 필요하다. SRS VT-31(존재하지 않는 노드 수정 요청)의 합격 기준도 이 결정에 달려 있다(SRS TBD-07, CF-03).

## Decision Drivers

- 실패해도 실제 영역이 반쯤 바뀐 상태로 남지 않을 것 (NFR-03, VT-31)
- ADR-0004·0005의 결정(Diff는 `dom`을 읽지 않음, 적용 순서)을 바꾸지 않을 것
- 구현과 테스트의 단순함
- 실패 원인을 테스트가 종류로 구분할 수 있을 것

## Considered Options

- 옵션 1. 확인 없이 적용한다. 대상이 없으면 그 자리에서 브라우저 오류(`TypeError`, `NotFoundError`)가 난다.
- 옵션 2. 적용 전에 전체를 확인한다. 하나라도 문제가 있으면 `PatchError`를 던지고 DOM은 0건 바뀐다.
- 옵션 3. 적용하면서 바꾼 내용을 기록해 두었다가, 실패하면 거꾸로 되돌린다(롤백).

## Decision Outcome

Chosen option: "옵션 2. 적용 전에 전체를 확인한다", because 변경 목록은 이미 Diff가 다 만들어 둔 상태라 확인은 목록을 한 번 더 도는 것으로 끝나고, ADR-0005의 적용 순서와 Diff의 순수성을 그대로 둔 채 원자성을 얻을 수 있기 때문이다.

### 확인 규칙 (적용 단계 0)

Patch는 ADR-0005의 적용 순서를 시작하기 전에 모든 변경을 확인한다.

| 변경 종류 | 확인할 것 |
|---|---|
| `remove`, `replace`, `text`, `attrs` | `target.dom`이 있고, 문서에 붙어 있다(`isConnected`) |
| `add` | `parent.dom`이 있고 문서에 붙어 있다. `before`가 `null`이 아니면 `before.dom.parentNode === parent.dom` |
| `move` | `target.dom`, `parent.dom`이 있다. `before`가 `null`이 아니면 `before.dom.parentNode === parent.dom` |
| `text` | `target.dom`이 글자 노드다 |
| `attrs` | `target.dom`이 요소 노드다 |

- 하나라도 어긋나면 `PatchError(change, 이유)`를 던진다. 이 시점까지 DOM은 한 번도 바뀌지 않았다.
- `before`는 항상 아직 처리하지 않은 이전 자식이므로(ADR-0005 5절) 적용 전 시점에 같은 부모의 자식이어야 한다. 그래서 적용 전에 확인해도 결과가 같다.
- 짝 목록(`pairs`)의 `dom` 복사는 확인 대상이 아니다. 복사는 적용이 성공한 뒤에만 일어난다.

### Consequences

- Good, because 실패가 원자적이다. 실제 영역은 Patch 전 화면 그대로 남고, 지금 트리(`current`)와도 계속 맞는다.
- Good, because ADR-0004의 "Patch 후 `dom` 복사를 빠뜨리면 다음 Patch에서 오류"가 **어디서 왜** 틀렸는지 알려 주는 `PatchError`로 바뀐다.
- Good, because ADR-0005의 적용 순서와 F1(새 노드 `dom` 기록), Diff의 순수성을 하나도 바꾸지 않는다.
- Bad, because 변경 목록을 한 번 더 돈다. 변경 수는 바뀐 부분 수에 비례하므로(NFR-01) 비용은 작다.
- Bad, because 확인 규칙과 적용 코드가 같은 조건을 두 번 다룬다. 확인 규칙 표를 테스트로 묶어 둘이 어긋나지 않게 한다.

### Confirmation

- `patch.test.ts`: `dom`이 없는 `target`이 섞인 변경 목록 → `PatchError`, `MutationObserver` 기록 0건 (VT-31).
- `patch.test.ts`: 화면에서 이미 떨어진 노드를 가리키는 변경 → `PatchError`, 기록 0건.
- `patch.test.ts`: `before.dom`이 다른 부모의 자식인 `add` → `PatchError`, 기록 0건.
- 코드 검토: `applyPatch` 안에서 확인 루프가 첫 DOM 쓰기보다 먼저 끝난다.

## Pros and Cons of the Options

### 옵션 1. 확인 없이 적용

- Good, because 코드가 가장 짧다.
- Bad, because 실패하면 실제 영역이 반쯤 바뀐 채 남고, 이후 Patch와 뒤로가기가 연쇄로 실패한다.
- Bad, because 브라우저 오류 메시지로는 어떤 변경이 왜 실패했는지 알기 어렵다.

### 옵션 2. 적용 전 전체 확인 (채택)

- Good, because 실패가 원자적이고 원인이 `PatchError`에 담긴다.
- Neutral, because 구 eungi adr_005의 "해석 후 적용" 2단계와 같은 생각을 `dom` 참조 방식에 맞게 옮긴 것이다.
- Bad, because 목록을 한 번 더 돈다.

### 옵션 3. 롤백

- Good, because 확인으로 잡을 수 없는 실패(적용 도중 브라우저 오류)까지 되돌릴 수 있다.
- Bad, because `move`·`replace`·`remove`의 되돌리기를 각각 구현해야 해서 Patch 코드가 두 배 가까이 된다.
- Bad, because 되돌리기 코드 자체가 버그의 원인이 될 수 있다.

## More Information

- 보완 대상: ADR-0005 (Patch). 이 ADR이 accepted가 되면 ADR-0005의 More Information에 "실패 처리: ADR-0013"을 추가한다.
- 관련: ADR-0004 (`dom` 규칙), SRS VT-31, TBD-07, CF-03
- 설계 위치: SDD 3.4 Patch, 5장 예외 처리
- [MDN — Node.insertBefore() 예외](https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore)
- 템플릿: [MADR](https://adr.github.io/madr/)
