# ADR 목록

`somage/works`와 `eungi/docs/adr` 두 곳의 ADR을 한 곳(`docs/adr/`)으로 모은 목록이다. 두 브랜치가 같은 번호(0001~0006)를 서로 다른 주제에 썼기 때문에 통합 번호를 새로 매겼다.

## 1. 통합 번호

| 통합 번호 | 제목 | 상태 | 원래 위치 | 새 파일 이름 (제안) |
|---|---|---|---|---|
| ADR-0001 | Virtual DOM 노드 모양 | accepted | `somage/works` ADR 0001 | `0001-vdom-node-shape.md` |
| ADR-0002 | DOM → Virtual DOM 변환과 공백 규칙 | accepted | `somage/works` ADR 0002 | `0002-dom-to-vdom.md` |
| ADR-0003 | Virtual DOM → 실제 DOM 그리기 | accepted | `somage/works` ADR 0003 | `0003-vdom-to-dom.md` |
| ADR-0004 | Diff·Patch 분리, `dom` 참조, key 짝짓기 | accepted | `somage/works` ADR 0004 | `0004-diff-patch.md` |
| ADR-0005 | Patch 적용 순서와 `{ changes, pairs }` | accepted | `somage/works` ADR 0005 | `0005-patch.md` |
| ADR-0006 | 테스트 영역 = 코드 입력칸 + 미리보기 | accepted | `somage/works` ADR 0006 | `0006-test-area.md` |
| ADR-0007 | 프로그래밍 언어 (TypeScript) | accepted | `eungi` adr_001 + `somage/works` ADR_0001 | `0007-language.md` |
| ADR-0008 | History 분기 시 이후 기록 삭제 | proposed | `eungi` adr_002 | `0008-history-branch.md` |
| ADR-0009 | State 변경 Batching | proposed | `eungi` adr_006 | `0009-batching.md` |
| ADR-0010 | Hook 저장 방식과 호출 규칙 | proposed | `eungi` adr_007 | `0010-hook-rules.md` |
| ADR-0011 | 테스트 하네스 (Vitest + jsdom) | proposed | `eungi` adr_008 | `0011-test-harness.md` |
| ADR-0012 | 설계 준수 검증 하네스 | proposed | `eungi` adr_009 | `0012-design-harness.md` |

**대체된 ADR** (`docs/adr/superseded/`로 옮기고 지우지 않는다)

| 원래 위치 | 상태 | 대체한 ADR | 남은 충돌 |
|---|---|---|---|
| `eungi` adr_003 테스트 영역 수정 방식 | superseded by ADR-0006 | ADR-0006 | CF-04 |
| `eungi` adr_004 Diff 비교 전략 | superseded by ADR-0004 | ADR-0004 | — |
| `eungi` adr_005 Patch 일괄 적용 | superseded by ADR-0005 | ADR-0005 | CF-03 |

**번호를 이렇게 정한 이유**: somage ADR은 모두 accepted이고 서로를 번호로 많이 인용하며, `리액트 issue.md`와 SRS도 "ADR-0002 변환 규칙"처럼 이 번호를 쓴다. 그래서 0001~0006을 그대로 두고, eungi 쪽을 0007부터 다시 매겼다. eungi 쪽을 인용하는 `SDD.md`의 ADR 번호는 위 표대로 고쳐야 한다.

## 2. 충돌 표시 규칙

충돌은 세 곳에 같은 ID(`CF-xx`)로 표시한다. `C-xx`는 `리액트 issue.md`의 설계 제약 ID라서 겹치지 않게 `CF`를 쓴다.

**① 각 ADR 파일 안**: 충돌이 생기는 결정 바로 아래에 GitHub 경고 블록을 둔다.

```markdown
> [!WARNING]
> **CF-03 (미결)** 구 eungi adr_005는 대상이 하나라도 없으면 DOM 변경 0건 후
> `PatchError`를 던진다고 정했다. 이 ADR에는 실패 처리가 없다.
> 결정: TBD-07 · 담당: @이름 · 기한: YYYY-MM-DD
```

해소되면 `[!WARNING]`을 `[!NOTE]`로 바꾸고 "(해소: ADR-0005 채택, YYYY-MM-DD)"를 적는다. 블록을 지우지 않아야 왜 그렇게 정했는지가 남는다.

**② 대체된 ADR의 메타데이터**: MADR 규칙대로 `status: superseded by ADR-0004`로 바꾸고, 대체한 ADR의 More Information에 "대체: 구 eungi adr_004"를 적는다.

**③ 이 문서의 충돌 목록(3절)과 SRS 6.2**: 전체 현황을 한눈에 보는 곳. SRS에서 영향받는 행에는 `⚠️ CF-xx`를 붙인다.

## 3. 충돌 목록

| ID | 내용 | 한쪽 | 다른 쪽 | 심각도 | 상태 |
|---|---|---|---|---|---|
| CF-01 | 자식 짝짓기와 변경 종류 | eungi adr_004: 위치 비교 + 5종 | ADR-0004: key + 6종 | 높음 | 해소: ADR-0004 (SRS TBD-03·04와 일치) |
| CF-02 | Patch 대상 지정 | eungi adr_005: `path: number[]` | ADR-0004·0005: 이전 객체 + `dom` | 높음 | 해소: ADR-0004·0005 |
| CF-03 | Patch 실패 원자성 | eungi adr_005: 변경 0건 후 `PatchError` | ADR-0005: 정의 없음 | 중간 | 미결 (SRS TBD-07) |
| CF-04 | `<script>`·`on*` 정제 | eungi adr_003: 제거 | ADR-0002·0006: 모두 유지 | 중간 | 미결 (SRS TBD-08) |
| CF-05 | 파서·갱신 시점 | eungi adr_003: `DOMParser`, 실시간 | ADR-0006: `<template>`, 0.3초 | 낮음 | 해소: ADR-0006 |
| CF-06 | ADR 번호 중복 | eungi 001~009 | somage 0001~0006 | 낮음 | 해소: 1절 통합 번호 |
| CF-07 | 함수 이름·표기 | camelCase (`htmlToVNode` 등) | snake_case (`dom_to_vdom` 등) | 낮음 | 미결 (코드 컨벤션) |
| CF-08 | 용어·ID 체계 | SRS: CON-xx, Undo/Redo | issue.md: C-xx, 뒤로가기 | 낮음 | 일부 해소 (SRS 5.1.4), 나머지 TBD-10 |
