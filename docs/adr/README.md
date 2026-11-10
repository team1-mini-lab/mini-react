# ADR 목록

`somage/works`와 `eungi/docs/adr` 두 곳의 ADR을 `docs/adr/` 한 곳으로 모은 목록이다. 취합 브랜치는 `eungi`다.

## 1. 통합 번호

somage ADR은 모두 accepted이고 서로를 번호로 인용하며, `리액트 issue.md`와 SRS도 이 번호를 쓴다. 그래서 0001~0006은 그대로 두고 eungi ADR을 0007부터 다시 매겼다. 복구한 보완 ADR은 그 뒤에 붙였다.

| 통합 번호 | 제목 | 상태 | 원래 위치 | 파일 이름 |
|---|---|---|---|---|
| ADR-0001 | Virtual DOM 노드 모양 | accepted | `somage/works` ADR 0001 | `adr_0001_vdom_node_shape.md` |
| ADR-0002 | DOM → Virtual DOM 변환과 공백 규칙 | accepted | `somage/works` ADR 0002 | `adr_0002_dom_to_vdom.md` |
| ADR-0003 | Virtual DOM → 실제 DOM 그리기 | accepted | `somage/works` ADR 0003 | `adr_0003_vdom_to_dom.md` |
| ADR-0004 | Diff·Patch 분리, `dom` 참조, key 짝짓기 | accepted | `somage/works` ADR 0004 | `adr_0004_diff_patch.md` |
| ADR-0005 | Patch 적용 순서와 `{ changes, pairs }` | accepted | `somage/works` ADR 0005 | `adr_0005_patch.md` |
| ADR-0006 | 테스트 영역 = 코드 입력칸 + 미리보기 | accepted | `somage/works` ADR 0006 | `adr_0006_test_area.md` |
| ADR-0007 | 프로그래밍 언어 (TypeScript) | accepted | eungi `adr_001` + somage `ADR_0001_programming-language` (중복 병합) | `adr_0007_language.md` |
| ADR-0008 | History 정책 (선형, 변경 없으면 기록 안 함, 수정 중 이동 금지) | proposed | eungi `adr_002` + 팀 설계 검토(블로그 97) | `adr_0008_history_policy.md` |
| ADR-0009 | State 변경 Batching (microtask) | proposed | eungi `adr_006` | `adr_0009_batching.md` |
| ADR-0010 | Hook 저장 방식과 호출 규칙 | proposed | eungi `adr_007` | `adr_0010_hook_rules.md` |
| ADR-0011 | 테스트 하네스 (Vitest + jsdom) | proposed | eungi `adr_008` | `adr_0011_test_harness.md` |
| ADR-0012 | 설계 준수 검증 하네스 | proposed | eungi `adr_009` | `adr_0012_design_harness.md` |
| ADR-0013 | Patch 적용 전 검증 (원자적 실패) | proposed | eungi `adr_005`에서 복구, ADR-0005 보완 | `adr_0013_patch_preflight.md` |
| ADR-0014 | 입력 정제 (`<script>`, `on*`, `javascript:`) | proposed | eungi `adr_003`에서 복구, ADR-0002·0006 보완 | `adr_0014_input_sanitize.md` |

**파일 이름 바꾸기 작업 목록** (eungi 브랜치 `docs/adr/`)

- somage ADR 6개는 소망 님이 위 파일 이름으로 eungi에 PR을 올린다. 본문 맨 위의 "목표:" 줄과 메타데이터는 그대로 둔다.
- `adr_001_first_language.md` → `adr_0007_language.md`, 본문 제목 `ADR-0001` → `ADR-0007`
- `adr_002_history_branch_policy.md` → 이 PR의 `adr_0008_history_policy.md`로 교체 (개정본)
- `adr_006_batching.md` → `adr_0009_batching.md`, 제목 `ADR-0006` → `ADR-0009`
- `adr_007_hook_rule_enforcement.md` → `adr_0010_hook_rules.md`, 제목 `ADR-0007` → `ADR-0010`
- `adr_008_test_harness.md` → `adr_0011_test_harness.md`, 제목 `ADR-0008` → `ADR-0011`, 본문의 "ADR-0001"(언어) → "ADR-0007"
- `adr_009_design_verification_harness.md` → `adr_0012_design_harness.md`, 제목 `ADR-0009` → `ADR-0012`
- `adr_README.md`는 이 파일(`README.md`)로 합치고 지운다.

## 2. 대체된 ADR

삭제했다. 원문은 아래 커밋에서 볼 수 있다.

| 원래 위치 | 대체한 ADR | 살려 둔 내용 | 원문 |
|---|---|---|---|
| eungi `adr_003` 테스트 영역 수정 방식 | ADR-0006 | 입력 정제 → ADR-0014 | [067122b](https://github.com/team1-mini-lab/mini-react/blob/067122b05a3fb1804ee9aaa7fb5e95501acdebef/docs/adr/adr_003_test_area_input.md) |
| eungi `adr_004` Diff 비교 전략 | ADR-0004 | — | [067122b](https://github.com/team1-mini-lab/mini-react/blob/067122b05a3fb1804ee9aaa7fb5e95501acdebef/docs/adr/adr_004_diff_strategy.md) |
| eungi `adr_005` Patch 일괄 적용 | ADR-0005 | 원자적 실패 → ADR-0013 | [067122b](https://github.com/team1-mini-lab/mini-react/blob/067122b05a3fb1804ee9aaa7fb5e95501acdebef/docs/adr/adr_005_patch_atomic_apply.md) |

## 3. 충돌을 판정한 방법

두 설계가 부딪히면 아래 순서로 판정했다.

1. **합격선**: `리액트 issue.md`의 인수 기준 중 과제 원문에서 온 것(FR-03~FR-08, NFR-01, NFR-03, C-03, C-08). SRS 1.2는 somage ADR을 토대로 쓰였으므로 합격선으로 쓰면 순환 논리가 된다.
2. **판별 테스트**: 두 설계의 결과가 갈리는 시나리오를 하나 골라 손으로 따라간다. 합격선을 넘지 못하는 쪽은 탈락한다.
3. **보완 가능성**: 둘 다 합격하거나 한쪽에 빈 곳이 있으면, 진 쪽의 아이디어로 빈 곳을 채울 수 있는지 본다.
4. **비용과 합의 상태**: 그래도 같으면 구현량이 적고 accepted인 쪽.

## 4. 충돌 목록

표기 규칙: ID는 `CF-xx`(issue.md의 `C-xx`와 겹치지 않게). 미결 충돌은 해당 ADR 본문에 `> [!WARNING]` 블록을 두고, 해소되면 `[!NOTE]`로 바꾸되 지우지 않는다.

| ID | 내용 | eungi | somage | 판별 테스트와 결과 | 판정 |
|---|---|---|---|---|---|
| CF-01 | 자식 짝짓기와 변경 종류 | 위치 비교 + 5종 | key 짝짓기 + 6종 | ADR-0005 P2(바나나 입력칸 3 → 맨 앞 사과 추가): eungi는 "3"이 사과 옆으로 가고 조작 n+1번 → **FR-04·NFR-01 불합격** | somage |
| CF-02 | Patch 대상 지정 | `path: number[]` + 초기화 때 실제 영역 다시 그리기 | 이전 객체 + `dom` 참조 | P4(실제 영역에 주석이 있을 때 둘째 항목 수정): eungi는 첫 로드에 실제 영역 전체를 다시 그려야 동작 → 첫 로드부터 모든 요소가 새 객체(FR-04 취지 위반). somage는 그대로 | somage |
| CF-03 | Patch 실패 원자성 | 적용 전 확인, 실패 시 0건 | 정의 없음 | VT-31(대상 없는 변경): somage는 반쯤 바뀐 상태가 남을 수 있음 | **보완**: ADR-0013 |
| CF-04 | 입력 정제 | `on*`·`<script>` 제거 | 모든 속성 유지 | `<img onerror>` 입력 후 Patch: somage는 실행됨 | **보완**: ADR-0014 |
| CF-05 | 파서·갱신 시점 | `DOMParser`, 실시간 | `<template>`, 0.3초 | TA9(입력 직후 Patch): 둘 다 실행 안 됨, 실시간은 쓰다 만 코드로 미리보기가 깨짐 | somage |
| CF-06 | ADR 번호 중복 | 001~009 | 0001~0006 | — | 1절 통합 번호 |
| CF-07 | 함수 이름·표기 | camelCase | snake_case, Python 표기 | — | SDD 1.6 이름 대응표 (코드는 camelCase, ADR 이름 병기) |
| CF-08 | 용어·ID 체계 | SRS CON-xx | issue.md C-xx | — | SRS 5.1.4 대응표, 나머지 TBD-10 |
| CF-09 | 루트 교체 | 루트 REPLACE는 `PatchError` | 루트도 교체 가능, 틀로 찾기 | TA10(`div` → `section`): eungi는 FR-02(태그 자유 수정) 불합격 | somage |
| CF-10 | `value`·`checked` 반영 | 속성 대신 프로퍼티로 쓰고 같으면 생략 | `setAttribute`만 | 사용자가 입력한 뒤 코드에서 `value`를 바꿔 Patch: somage는 화면 값이 안 바뀜 | **보완**: SDD 3.4 규칙 (속성과 프로퍼티를 함께 씀) |
