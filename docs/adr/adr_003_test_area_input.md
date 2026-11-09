---
# Optional metadata
status: proposed
date: 2026-11-09
decision-makers: [팀원 이름]
consulted: []
informed: [팀원 전체]
---

# ADR-0003: 테스트 영역 수정 방식

## Context and Problem Statement

FR-02는 사용자가 테스트 영역의 태그, 속성, 글자를 자유롭게 추가·삭제·변경할 수 있어야 한다고 정한다. 사용자가 HTML 코드 입력칸에서 수정할지, 실제 화면처럼 보이는 영역에서 직접 수정할지에 따라 테스트 영역을 Virtual DOM으로 바꾸는 방법이 달라진다 (SRS TBD-02).

## Decision Drivers

* 태그·속성·글자 변경을 모두 지원하는가 (FR-02)
* Virtual DOM 변환 경로가 단순한가
* 입력한 HTML이 실행되는 보안 문제
* Undo/Redo 후 테스트 영역을 기록 상태로 되돌릴 수 있는가 (FR-08)

## Considered Options

* HTML 코드 입력칸(textarea) + 실시간 미리보기
* contenteditable 영역에서 직접 수정
* 두 방식 모두 제공 (탭 전환)

## Decision Outcome

Chosen option: "HTML 코드 입력칸(textarea) + 실시간 미리보기", because 태그·속성 변경까지 모두 가능하고, `htmlToVNode(textarea.value)` 한 경로로 변환되며, Undo/Redo 후 `vnodeToHTML`로 textarea를 정확히 되돌릴 수 있기 때문이다.

### Consequences

* Good, because 변환 경로가 `DOMParser` → `domToVNode` 하나다.
* Good, because `DOMParser`는 비활성 문서에서 파싱하므로 `<script>`가 실행되지 않는다.
* Bad, because HTML을 모르는 사용자에게는 불편하다.
* Bad, because 미리보기를 별도로 그려야 한다.

### Confirmation

* VT-34: textarea를 수정해도 Patch 전에는 실제 영역이 바뀌지 않는다.
* `dom.test.ts`: `on*` 속성과 `<script>`가 변환 결과에서 제거된다.

## Pros and Cons of the Options

### textarea + 미리보기

* Good, because FR-02의 모든 변경 유형을 지원한다.
* Good, because 입력값 = 직렬화 결과라 History와 왕복이 쉽다.
* Bad, because 시각적 편집 경험이 없다.

### contenteditable

* Good, because 실제 화면처럼 직접 고칠 수 있다.
* Bad, because 속성 추가·태그 종류 변경을 할 수 없다 (FR-02 미충족).
* Bad, because 브라우저마다 생성하는 마크업이 달라 Diff 결과가 불안정하다.

### 두 방식 모두

* Good, because 사용성이 가장 좋다.
* Bad, because 두 입력 사이의 동기화가 필요해 구현 범위가 커진다.

## More Information

* SRS TBD-02, FR-02, IR-01, VT-34
* SDD 3.2 DOM 변환, 3.6 Phase 1 검증 페이지
* [MDN DOMParser](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser)
