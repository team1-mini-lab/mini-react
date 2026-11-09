# Software Requirements Specification (SRS)

> ISO/IEC/IEEE 29148:2018 기반 미니 React 프로젝트 요구사항 명세서

## 문서 정보

| 항목 | 내용 |
|---|---|
| 프로젝트명 | 미니 React 구현 프로젝트 |
| 문서 버전 | 1.0 |
| 작성일 | 2026-11-07 |
| 작성자 | 프로젝트 팀원 전체 |
| 검토자 | 프로젝트 팀원 전체 |
| 문서 상태 | Draft |

---

# 1. Introduction

## 1.1 Document Purpose

본 문서는 미니 React 프로젝트의 기능, 품질, 인터페이스 및 기술적 제약사항을 정의한다.

과제에서 제시한 요구사항을 프로젝트 요구사항과 SRS 요구사항으로 구체화하고, 구현 및 테스트 과정에서 요구사항 충족 여부를 확인하는 기준으로 사용한다.

| 작성 항목 | 작성 내용 |
|---|---|
| 문서 작성 목적 | 미니 React 프로젝트의 요구사항과 검증 기준 정의 |
| 문서 활용 대상 | 프로젝트 참여자, 요구사항 작성자, 구현 담당자, 테스트 담당자 |
| 문서 적용 범위 | Phase 1 Virtual DOM, Diff, Patch, History 및 Phase 2 Component, State, Hooks 구현 |

## 1.2 Product Scope

브라우저 DOM을 Virtual DOM으로 변환하고, 이전 Virtual DOM과 새로운 Virtual DOM을 비교하여 변경된 부분만 실제 DOM에 반영하는 기능을 구현한다.

Phase 2에서는 함수형 컴포넌트와 State, Hooks를 구현하고, State 변경 시 Phase 1의 Virtual DOM, Diff, Patch를 통해 화면을 갱신한다.

| 구분 | 내용 |
|---|---|
| 개발 목적 | React의 핵심 동작 원리를 직접 구현하고 Virtual DOM 기반 화면 갱신 과정을 이해한다. |
| 구현 범위 | Virtual DOM, DOM 변환, Diff, Patch, History, Function Component, Props, State, useState, useEffect, useMemo |
| 제외 범위 | React 등 외부 UI 프레임워크 사용, 실제 React의 전체 기능 구현 |
| 주요 결과물 | 미니 React 구현 코드, Phase 1·2 검증 페이지, 단위 및 기능 테스트 |

## 1.3 Definitions and Abbreviations

| 용어 | 영문 명칭 | 정의 |
|---|---|---|
| DOM | Document Object Model | 브라우저가 HTML 문서를 객체 트리로 표현한 구조 |
| Virtual DOM | Virtual Document Object Model | 실제 DOM을 JavaScript 객체로 표현한 구조 |
| Diff | Difference | 이전 Virtual DOM과 새로운 Virtual DOM의 차이를 비교하는 과정 |
| Patch | Patch | Diff 결과를 실제 DOM에 반영하는 과정 |
| Component | Component | Props를 입력받아 UI를 반환하는 함수형 화면 구성 단위 |
| Props | Properties | 부모 컴포넌트가 자식 컴포넌트에 전달하는 데이터 |
| State | State | 화면 변화에 영향을 주는 상태 데이터 |
| Hook | Hook | 함수형 컴포넌트에서 State 및 부수 효과 등을 관리하는 함수 |
| Batching | Batching | 여러 State 변경을 모아 렌더링 횟수를 줄이는 처리 방식 |
| SRS | Software Requirements Specification | 소프트웨어 요구사항 명세서 |
| FR | Functional Requirement | 기능 요구사항 |
| NFR | Non-functional Requirement | 비기능 요구사항 |
| IR | Interface Requirement | 인터페이스 요구사항 |
| CON | Constraint | 제약사항 |
| VT | Verification Test | 검증 항목 |

## 1.4 References

| 자료명 | 출처 | URL |
|---|---|---|
| Why did we build React? | React | https://legacy.reactjs.org/blog/2013/06/05/why-react.html |
| DOM Introduction | MDN Web Docs | https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction |
| DOM Standard | WHATWG | https://dom.spec.whatwg.org/ |

---

# 2. Product Overview

## 2.1 Product Perspective

프로젝트는 React의 핵심 기능을 외부 프레임워크 없이 구현하는 학습용 시스템이다.

Phase 1에서는 Virtual DOM 변환, Diff, Patch, History를 구현한다. Phase 2에서는 함수형 컴포넌트와 State, Hooks를 구현하고 Phase 1의 화면 갱신 과정을 재사용한다.

| 작성 항목 | 작성 내용 |
|---|---|
| 개발 배경 | React의 핵심 동작 원리를 직접 구현하여 Virtual DOM과 상태 기반 렌더링 과정을 이해한다. |
| 기존 기술과의 관계 | React의 Virtual DOM, Component, State, Hooks의 핵심 개념을 참고하되 직접 구현한다. |
| 시스템 구성 | Virtual DOM, DOM Converter, Diff, Patch, History, Function Component, Hooks |
| 주요 모듈 간 관계 | Phase 2에서 State가 변경되면 새로운 Virtual DOM을 생성하고 Phase 1의 Diff와 Patch를 통해 실제 DOM을 갱신한다. |

## 2.2 Product Functions

| 기능 ID | 기능명 | 기능 설명 | 적용 Phase |
|---|---|---|---|
| PF-01 | DOM 변환 | 브라우저 DOM을 Virtual DOM 객체로 변환한다. | Phase 1 |
| PF-02 | Virtual DOM 비교 | 이전 Virtual DOM과 새로운 Virtual DOM의 차이를 탐지한다. | Phase 1 |
| PF-03 | DOM 갱신 | Diff 결과를 실제 DOM에 반영한다. | Phase 1 |
| PF-04 | 변경 이력 관리 | Patch 실행 결과를 기록하고 Undo/Redo를 지원한다. | Phase 1 |
| PF-05 | 함수형 컴포넌트 | Function Component를 생성하고 실행한다. | Phase 2 |
| PF-06 | Props 전달 | 부모 컴포넌트에서 자식 컴포넌트로 데이터를 전달한다. | Phase 2 |
| PF-07 | State 관리 | 루트 컴포넌트에서 State를 관리하고 변경에 따라 화면을 갱신한다. | Phase 2 |
| PF-08 | Hooks | useState, useEffect, useMemo를 구현한다. | Phase 2 |
| PF-09 | 테스트 페이지 | 사용자 입력과 클릭을 통해 Phase 1·2의 동작을 확인한다. | Phase 1, 2 |

---

# 3. Requirements

## 3.1 Functional Requirements

시스템이 수행해야 하는 기능과 구체적인 동작 조건을 정의한다.

- 요구사항별 고유 ID를 부여한다.
- 하나의 요구사항에는 하나의 명확한 기능 조건을 작성한다.
- 구현 여부를 확인할 수 있도록 인수 기준과 검증 방법을 작성한다.
- 원본 과제 요구사항(R ID)과 프로젝트 요구사항(PR ID)을 추적성 표에서 연결한다.

### 3.1.1 검증 방법

| 검증 구분 | 검증 방법 | 설명 |
|---|---|---|
| 단위 | Unit Test | 함수 하나에 정해진 입력을 넣고 기대한 결과가 나오는지 자동으로 확인한다. |
| 기능 | Functional Test | 페이지에서 직접 클릭하고 입력하면서 화면이 기대한 대로 바뀌는지 확인한다. |
| 검토 | Code Review | 실행하지 않고 코드를 읽어 요구사항에 맞게 구현했는지 확인한다. |

### 3.1.2 Phase 1 Functional Requirements

**Virtual DOM, DOM 변환, Diff, Patch, History**

| 요구사항 ID | 요구사항명 | 요구사항 내용 | 인수 기준 | 검증 | 적용 Phase | 관련 PR ID |
|---|---|---|---|---|---|---|
| FR-01 | 초기 DOM 변환 | 페이지를 열면 시스템은 실제 영역의 샘플 구조를 Virtual DOM으로 변환하고, 테스트 영역에 같은 구조를 표시해야 한다. | 두 영역의 태그, 속성, 글자가 모두 같다. | 기능 | Phase 1 | PR-01, PR-04 |
| FR-02 | 테스트 영역 수정 | 사용자는 테스트 영역의 내용을 자유롭게 수정할 수 있어야 한다. | 태그, 속성, 글자의 추가·삭제·변경이 가능하다. | 기능 | Phase 1 | PR-05 |
| FR-03 | Patch 실행 | 사용자가 Patch 버튼을 누르면 시스템은 실제 영역을 테스트 영역과 같은 구조와 내용으로 만들어야 한다. | Patch 후 두 영역의 구조와 내용이 같다. | 기능, 단위 | Phase 1 | PR-06 |
| FR-04 | 변경 부분만 갱신 | Patch 실행 시 시스템은 변경된 부분만 갱신하고 변경되지 않은 부분은 그대로 유지해야 한다. | 변경되지 않은 화면 요소는 Patch 전후에 같은 요소 객체다. 입력값, 커서 위치, 스크롤 위치가 유지된다. | 단위, 기능 | Phase 1 | PR-02, PR-06 |
| FR-05 | 텍스트 및 속성 변경 | 글자나 속성만 달라진 요소는 새 요소로 교체하지 않고 해당 내용만 변경해야 한다. | Patch 전후 해당 요소의 객체가 동일하다. | 단위 | Phase 1 | PR-02, PR-06 |
| FR-06 | 태그 종류 변경 | 태그 종류가 달라진 요소는 새로운 요소로 교체해야 한다. | Patch 후 해당 위치의 태그가 변경된 종류로 표시된다. | 단위 | Phase 1 | PR-02, PR-06 |
| FR-07 | History 저장 | Patch를 실행할 때마다 시스템은 변경된 시점의 화면 구조를 History에 저장해야 한다. | Patch를 n번 실행하면 정의한 기록 정책에 따라 n개의 변경 이력이 저장된다. | 단위 | Phase 1 | PR-06 |
| FR-08 | Undo/Redo | 사용자가 Undo 또는 Redo를 누르면 시스템은 이전 또는 다음 기록으로 이동하고 실제 영역과 테스트 영역을 해당 상태로 갱신해야 한다. | 이동 후 두 영역이 선택한 기록과 일치한다. 처음과 끝에서 추가 이동은 발생하지 않는다. | 기능, 단위 | Phase 1 | PR-07 |

### 3.1.3 Phase 2 Functional Requirements

**Function Component, Props, State, Hooks**

| 요구사항 ID | 요구사항명 | 요구사항 내용 | 우선순위 | 적용 Phase | 관련 PR ID |
|---|---|---|---|---|---|
| FR-11 | 함수형 컴포넌트 실행 | 시스템은 Hook 배열을 관리하는 FunctionComponent를 구현하고, mount()와 update()를 실행할 수 있어야 한다. | Must | Phase 2 | PR-08 |
| FR-12 | 컴포넌트 렌더링 | 시스템은 함수형 컴포넌트의 실행 결과를 UI에 렌더링해야 한다. | Must | Phase 2 | PR-08 |
| FR-13 | Props 전달 | 부모 컴포넌트는 자식 컴포넌트에 Props를 전달할 수 있어야 하며, 자식 컴포넌트는 전달받은 Props를 사용할 수 있어야 한다. | Must | Phase 2 | PR-10 |
| FR-14 | 컴포넌트 재렌더링 | 시스템은 State 변경 시 컴포넌트를 다시 실행하고 화면을 갱신해야 한다. | Must | Phase 2 | PR-11 |
| FR-15 | State 관리 | 시스템은 루트 컴포넌트에서 State를 관리하고, 자식 컴포넌트에는 Props를 전달해야 한다. | Must | Phase 2 | PR-10 |
| FR-16 | useState 초기값 | useState는 전달받은 초기값으로 상태를 초기화하고, 상태값과 상태 변경 함수를 반환해야 한다. | Must | Phase 2 | PR-12 |
| FR-17 | State 변경 | 사용자는 useState가 반환하는 상태 변경 함수를 통해 상태를 변경할 수 있어야 한다. 상태 변경 시 화면이 갱신되어야 한다. | Must | Phase 2 | PR-11, PR-12 |
| FR-18 | useEffect 실행 | 시스템은 컴포넌트 렌더링 이후 useEffect에 전달된 Effect 함수를 실행해야 한다. | Must | Phase 2 | PR-13 |
| FR-19 | useEffect 의존성 처리 | 시스템은 useEffect의 의존성 배열을 기준으로 Effect 함수의 실행 여부를 판단해야 한다. | Must | Phase 2 | PR-13 |
| FR-20 | useMemo 계산 결과 재사용 | 시스템은 의존성 배열의 값이 변경되지 않으면 이전 계산 결과를 재사용하고, 의존성 값이 변경되면 계산을 다시 수행해야 한다. | Must | Phase 2 | PR-14 |
| FR-21 | Hook 호출 규칙 | Hook은 루트 함수형 컴포넌트의 최상위에서만 호출할 수 있어야 한다. | Must | Phase 2 | PR-09 |
| FR-22 | Phase 1 기능 재사용 | Phase 2에서 State 변경에 따른 화면 갱신은 Phase 1에서 구현한 Virtual DOM, Diff, Patch를 재사용해야 한다. | Must | Phase 2 | PR-15 |
| FR-23 | Phase 2 테스트 페이지 | 시스템은 Phase 2 테스트 페이지에서 사용자 입력과 클릭을 통해 State 변경 및 화면 갱신을 확인할 수 있어야 한다. | Must | Phase 2 | PR-16 |

### 3.1.4 Batching 관련 미결 사항

Batching은 과제의 선택 항목으로, TBD-05에 대한 팀 결정 이후 구현 여부와 우선순위를 확정한다.

현재는 확정된 기능 요구사항에 포함하지 않는다. 구현하기로 결정하면 VT-19를 통해 여러 State 변경에 대한 렌더링 횟수와 화면 반영 결과를 검증한다.

## 3.2 Non-functional Requirements

시스템의 성능, 안정성, 유지보수성 등 품질 조건을 정의한다.

- 측정하거나 테스트할 수 있는 기준을 작성한다.
- 기능 요구사항과 구분하여 작성한다.
- 측정 기준이 확정되지 않은 항목은 설계 및 테스트 단계에서 구체화한다.

### 3.2.1 품질 요구사항

| 요구사항 ID | 품질 특성 | 요구사항 내용 | 측정 및 검증 기준 | 관련 PR ID |
|---|---|---|---|---|
| NFR-01 | Performance | 시스템은 DOM 변경 시 변경되지 않은 영역에 대한 불필요한 업데이트를 최소화해야 한다. | 변경된 노드와 변경되지 않은 노드의 DOM 업데이트 여부 비교 | PR-02, PR-06, PR-15 |
| NFR-02 | Reliability | 각 모듈은 정의된 입력 조건에서 정상적으로 동작해야 하며, 예외 입력과 경계 조건을 처리해야 한다. | 정상 입력, 빈 값, 잘못된 입력 및 경계 조건 테스트 | PR-18, PR-19, PR-20 |
| NFR-03 | Maintainability | 시스템은 Virtual DOM, Diff, Patch, Component, Hooks 기능을 역할에 따라 구분하여 관리해야 한다. | 모듈별 책임 및 함수 인터페이스 검토 | PR-18 |

### 3.2.2 설계 단계에서 확정할 사항

| 항목 | 결정할 내용 |
|---|---|
| 성능 목표 | 렌더링 및 Diff 처리 시간의 측정 여부와 목표값 |
| 안정성 | 빈 값, 잘못된 입력, 경계 조건별 처리 결과 |
| 유지보수성 | 모듈 분리 기준 및 함수별 책임 범위 |
| 테스트 환경 | 브라우저 DOM API를 사용하는 테스트를 위한 DOM 테스트 환경 구성 |

## 3.3 Interface Requirements

사용자 인터페이스와 모듈 간 인터페이스의 입력 및 출력 요구사항을 정의한다.

### 3.3.1 인터페이스 요구사항

| 인터페이스 ID | 인터페이스 대상 | 요구사항 내용 | 입력 | 출력 |
|---|---|---|---|---|
| IR-01 | 테스트 영역 | 사용자는 테스트를 위한 HTML 내용을 입력하거나 수정할 수 있어야 한다. | HTML 입력값 및 수정 내용 | 입력된 테스트 내용 |
| IR-02 | Patch 버튼 | 사용자는 Patch 기능을 실행할 수 있어야 한다. | 버튼 클릭 | 변경 사항 적용 |
| IR-03 | Undo/Redo 버튼 | 사용자는 변경 이력을 되돌리거나 다시 적용할 수 있어야 한다. | 버튼 클릭 | 이전 또는 이후 상태 |
| IR-04 | DOM 변환 모듈 | 모듈은 DOM 노드를 전달받아 Virtual DOM 객체를 반환해야 한다. | DOM 노드 | Virtual DOM 객체 |
| IR-05 | Diff 모듈 | 모듈은 이전·새로운 Virtual DOM을 전달받아 변경 사항을 반환해야 한다. | 이전 및 새로운 Virtual DOM | Diff 결과 |
| IR-06 | Patch 모듈 | 모듈은 Diff 결과를 전달받아 실제 DOM에 변경 사항을 적용해야 한다. | Diff 결과 및 실제 DOM | 변경된 DOM |
| IR-07 | Phase 2 테스트 페이지 | 사용자는 입력 및 클릭을 통해 State 변경과 화면 갱신을 확인할 수 있어야 한다. | 사용자 입력 및 클릭 | 변경된 State와 UI |
| IR-08 | State 변경 인터페이스 | 컴포넌트는 setter를 통해 State 변경을 요청할 수 있어야 한다. | State 변경값 | 변경된 State 및 화면 갱신 |

### 3.3.2 상세 인터페이스 설계

내부 모듈의 함수명, 매개변수 및 반환 형식은 설계 문서에서 확정한다.

## 3.4 Constraints

프로젝트 구현에 적용되는 기술적 제약사항과 전제조건을 정의한다.

| 제약사항 ID | 구분 | 제약 조건 | 사유 | 관련 PR ID |
|---|---|---|---|---|
| CON-01 | 기술적 제약 | React, Vue 등 외부 UI 프레임워크를 사용하지 않고 Virtual DOM, Diff, Patch, Component, Hooks의 핵심 기능을 직접 구현한다. | React의 핵심 동작 원리 구현 | PR-17 |
| CON-02 | 개발 환경 | HTML, CSS, Vanilla JavaScript 또는 TypeScript를 사용한다. | 과제에서 허용한 개발 환경 | PR-17 |
| CON-03 | 구현 범위 | Phase 1의 Virtual DOM, Diff, Patch와 Phase 2의 Function Component, State, Hooks를 구현한다. | 프로젝트 구현 범위 | PR-01~PR-16, PR-21 |
| CON-04 | 전제조건 및 의존성 | 브라우저 DOM API를 사용할 수 있는 환경에서 실행한다. | 실제 DOM 조작 및 화면 갱신 | PR-01, PR-04 |
| CON-05 | 테스트 환경 | DOM API를 사용하는 모듈의 테스트는 DOM 테스트 환경을 구성하여 수행한다. | 브라우저 DOM API에 의존하는 코드의 테스트 | PR-18, PR-19, PR-20 |

---

# 4. Verification

요구사항별 구현 여부를 확인하기 위한 검증 방법과 통과 기준을 정의한다.

- 각 검증 항목은 하나 이상의 요구사항 ID 또는 프로젝트 요구사항 ID와 연결한다.
- Unit Test, Integration Test, Functional Test 등 적절한 검증 방법을 지정한다.
- 테스트 결과를 판단할 수 있도록 예상 결과와 합격 기준을 작성한다.
- Phase 1과 Phase 2의 기능 및 품질 검증을 구분한다.

## 4.1 검증 방법

| 검증 방법 | 설명 |
|---|---|
| Unit Test | 개별 함수 또는 모듈의 입력과 출력 검증 |
| Integration Test | 여러 모듈 간 연동 검증 |
| Functional Test | 사용자의 조작에 따른 전체 기능 동작 검증 |
| Boundary Test | 빈 값, 잘못된 입력, 경계 조건에서의 동작 검증 |
| Code Review | 기술적 제약사항과 모듈별 책임 분리 여부 검토 |
| Test Environment Check | DOM API를 사용하는 테스트 환경의 구성 및 실행 여부 확인 |

## 4.2 Phase 1 검증

Phase 1 기능 요구사항 FR-01~FR-08을 기준으로 검증한다.

| 검증 ID | 요구사항 ID | 검증 방법 | 테스트 조건 | 예상 결과 | 합격 기준 |
|---|---|---|---|---|---|
| VT-01 | FR-01 | Unit Test | 브라우저 DOM 요소를 Virtual DOM으로 변환 | Virtual DOM 객체 생성 | 원본 DOM의 노드 정보가 대응되는 객체로 변환됨 |
| VT-02 | FR-02 | Unit Test | Element, Text 등 서로 다른 노드 변환 | 노드 유형, 속성, 자식 노드 표현 | 각 노드 정보가 정의한 Virtual DOM 구조에 저장됨 |
| VT-03 | FR-03 | Unit Test | 이전·새로운 Virtual DOM 비교 | 두 객체의 차이 확인 | 비교 결과가 예상한 결과와 일치함 |
| VT-04 | FR-04 | Unit Test | 노드 추가, 삭제, 교체 및 속성 변경 | 변경 유형 탐지 | 각 변경 유형을 구분하여 탐지함 |
| VT-05 | FR-05 | Unit Test | 탐지한 변경 사항 기록 | Patch에서 처리할 수 있는 변경 정보 생성 | 변경 유형과 대상 정보가 정확하게 기록됨 |
| VT-06 | FR-06, FR-07 | Integration Test | Diff 결과를 Patch에 전달 | 실제 DOM의 변경된 영역 업데이트 | 변경된 영역에만 변경 사항이 반영됨 |
| VT-07 | FR-07 | Integration Test | Patch 실행 후 변경 이력 확인 | 변경된 상태 저장 | 변경된 Virtual DOM이 History에 기록됨 |
| VT-08 | FR-08 | Functional Test | 변경 이후 Undo 실행 | 이전 상태 복원 | 실제 영역과 테스트 영역이 이전 상태와 일치함 |
| VT-09 | FR-08 | Functional Test | Undo 이후 Redo 실행 | 변경 상태 재적용 | 실제 영역과 테스트 영역이 변경 이후 상태와 일치함 |
| VT-32 | PR-03 | Functional Test | Phase 1 검증 페이지 실행 | 실제 영역, 테스트 영역, Patch, Undo, Redo 표시 | 요구된 UI 요소가 모두 표시되고 각 버튼을 조작할 수 있음 |
| VT-33 | PR-04 | Functional Test | 페이지 최초 실행 | 실제 영역의 HTML을 테스트 영역에 렌더링 | 두 영역에 초기 내용이 정상적으로 표시됨 |
| VT-34 | PR-05 | Functional Test | 테스트 영역의 HTML 요소 및 텍스트 직접 수정 | 테스트 영역만 변경 | Patch 실행 전 실제 영역은 변경되지 않음 |

## 4.3 Phase 2 검증

Phase 2 기능 요구사항 FR-11~FR-23을 기준으로 검증한다.

| 검증 ID | 요구사항 ID | 검증 방법 | 테스트 조건 | 예상 결과 | 합격 기준 |
|---|---|---|---|---|---|
| VT-10 | FR-11, FR-12 | Unit Test | FunctionComponent 생성 및 mount(), update() 실행 | 컴포넌트 생성 및 렌더링 | 정의한 컴포넌트 생명주기 함수가 정상 실행됨 |
| VT-11 | FR-13, FR-15 | Unit Test | 부모 컴포넌트에서 자식 컴포넌트로 Props 전달 | 자식 컴포넌트에서 Props 사용 | 전달한 Props 값과 실제 사용 값이 일치함 |
| VT-12 | FR-16 | Unit Test | useState 초기값 전달 | State와 setter 반환 | 초기값이 State에 설정되고 setter가 반환됨 |
| VT-13 | FR-14, FR-17 | Integration Test | setter를 이용한 State 변경 | 컴포넌트 재렌더링 및 화면 갱신 | 변경된 State가 UI에 반영됨 |
| VT-14 | FR-18, FR-19 | Unit Test | useEffect 실행 및 의존성 변경 | Effect 실행 여부 판단 | 의존성 조건에 따라 Effect가 실행됨 |
| VT-15 | FR-20 | Unit Test | 동일한 의존성 값과 변경된 의존성 값 전달 | 계산 결과 재사용 또는 재계산 | 의존성이 같으면 이전 결과를 재사용하고, 변경되면 다시 계산함 |
| VT-16 | FR-21 | Unit Test | 루트 함수형 컴포넌트의 최상위가 아닌 위치에서 Hook 호출 시도 | Hook 호출 규칙 확인 | 정의한 Hook 호출 규칙을 위반한 호출이 제한됨 |
| VT-17 | FR-22 | Integration Test | Phase 2에서 State 변경 후 화면 갱신 | Phase 1의 VDOM, Diff, Patch 실행 | Phase 1 기능을 통해 변경된 화면이 반영됨 |
| VT-18 | FR-23 | Functional Test | Phase 2 테스트 페이지에서 입력 및 클릭 | State 변경 및 UI 갱신 | 사용자 조작에 따라 화면이 정상적으로 갱신됨 |
| VT-19 | TBD-05 | Functional Test | 하나의 이벤트 핸들러에서 여러 State 변경 | 팀 결정에 따른 렌더링 처리 | Batching을 구현하기로 결정한 경우 렌더링 횟수가 1회이며 모든 State 변경 결과가 UI에 반영됨 |

> VT-19는 TBD-05의 팀 결정에 따라 수행한다. Batching을 구현하지 않기로 결정하면 VT-19를 검증 대상에서 제외한다.

## 4.4 품질 및 제약사항 검증

PR-17~PR-20과 품질 요구사항을 검증한다.

| 검증 ID | 요구사항 ID | 검증 방법 | 테스트 조건 | 예상 결과 | 합격 기준 |
|---|---|---|---|---|---|
| VT-20 | NFR-01 | Integration Test | 일부 DOM 노드만 변경하는 Patch 실행 | 변경된 영역만 업데이트 | 변경되지 않은 DOM 노드에 불필요한 업데이트가 발생하지 않음 |
| VT-21 | NFR-02 | Boundary Test | 빈 값, 잘못된 입력, 존재하지 않는 노드 전달 | 예외 상황 처리 | 각 모듈에서 정의한 예외 처리 결과와 실제 실행 결과가 일치함 |
| VT-22 | NFR-03 | Code Review | Virtual DOM, Diff, Patch, Component, Hooks 코드 검토 | 모듈별 책임 분리 | 각 모듈의 역할과 인터페이스가 구분되어 있음 |
| VT-23 | CON-01, CON-02 | Code Review | 프로젝트의 기술 스택 및 의존성 확인 | Vanilla JS 또는 TS 기반 구현 | React, Vue 등 외부 UI 프레임워크 없이 핵심 기능이 구현됨 |
| VT-24 | CON-04 | Functional Test | 브라우저에서 애플리케이션 실행 | DOM API 정상 동작 | 실제 DOM 조작과 화면 갱신이 정상적으로 수행됨 |
| VT-35 | CON-05 | Test Environment Check | DOM 테스트 환경에서 테스트 실행 | DOM API를 사용하는 테스트 실행 | 설정된 DOM 테스트 환경에서 관련 테스트가 정상적으로 실행됨 |

## 4.5 엣지 케이스 검증

R20의 예외 및 경계 조건을 구체적인 테스트 항목으로 작성한다.

| 검증 ID | 관련 기능 | 테스트 조건 | 예상 결과 | 합격 기준 |
|---|---|---|---|---|
| VT-25 | DOM 변환 | 자식 노드가 없는 요소 변환 | 빈 자식 노드 목록 생성 | 오류 없이 Virtual DOM으로 변환됨 |
| VT-26 | DOM 변환 | 속성이 없는 요소 변환 | 빈 속성 정보 생성 | 오류 없이 Virtual DOM으로 변환됨 |
| VT-27 | Diff | 기존 속성 삭제 | 속성 삭제 변경 사항 탐지 | 삭제 대상 속성이 Diff 결과에 기록됨 |
| VT-28 | Diff | 변경되지 않은 Virtual DOM 비교 | 변경 사항 없음 | 빈 Diff 결과 반환 |
| VT-29 | Patch | 동일한 값 입력 후 Patch 실행 | 실제 DOM 유지 | 불필요한 DOM 변경이 발생하지 않음 |
| VT-30 | History | History가 없는 상태에서 Undo 또는 Redo 실행 | 상태 변경 없음 | 정의된 처리 결과와 실제 실행 결과가 일치함 |
| VT-31 | Patch | 존재하지 않는 노드에 대한 수정 및 삭제 요청 | 정의된 예외 처리 수행 | 정의된 처리 결과와 실제 실행 결과가 일치함 |

> VT-25~VT-31은 R20의 엣지 케이스를 구체화한 테스트 항목이다. 실제 구현 방식에 따라 예외 처리 결과와 세부 테스트 조건은 설계 및 테스트 단계에서 확정한다.

---

# 5. Appendixes

## 5.1 Requirements Traceability

요구사항이 프로젝트 정의부터 SRS 명세와 검증까지 연결되어 있는지 확인하기 위해 추적 관계를 정리한다.

### 5.1.1 프로젝트 요구사항과 SRS 추적 관계

팀에서 정의한 PR과 SRS 요구사항, 검증 항목 간의 관계를 정리한다.

| 프로젝트 요구사항 ID | SRS 요구사항 ID | 검증 ID | 비고 |
|---|---|---|---|
| PR-01 | FR-01, FR-02, IR-04 | VT-01, VT-02 | DOM 변환 |
| PR-02 | FR-03, FR-04, FR-05 | VT-03~VT-05 | Diff |
| PR-03 | IR-01, IR-02, IR-03 | VT-32 | Phase 1 검증 페이지 |
| PR-04 | FR-01, FR-02 | VT-01, VT-02, VT-33 | 초기 렌더링 |
| PR-05 | IR-01 | VT-34 | 테스트 영역 직접 수정 |
| PR-06 | FR-06, FR-07, FR-08, IR-06 | VT-06, VT-07 | Patch 및 History 저장 |
| PR-07 | FR-08, IR-03 | VT-08, VT-09 | History 이동 |
| PR-08 | FR-11, FR-12 | VT-10 | Function Component |
| PR-09 | FR-21 | VT-16 | Hook 호출 규칙 |
| PR-10 | FR-13, FR-15 | VT-11 | Props 및 State 관리 |
| PR-11 | FR-14, FR-17 | VT-13 | State 변경에 따른 렌더링 |
| PR-12 | FR-16, FR-17, IR-08 | VT-12, VT-13 | useState |
| PR-13 | FR-18, FR-19 | VT-14 | useEffect |
| PR-14 | FR-20 | VT-15 | useMemo |
| PR-15 | FR-22 | VT-17 | Phase 1 기능 재사용 |
| PR-16 | FR-23, IR-07 | VT-18 | Phase 2 테스트 페이지 |
| PR-17 | CON-01, CON-02 | VT-23 | 기술 스택 및 프레임워크 제약 |
| PR-18 | NFR-02, NFR-03, CON-05 | VT-01~VT-05, VT-10~VT-16, VT-21, VT-22, VT-35 | 모듈별 테스트 및 테스트 환경 |
| PR-19 | NFR-02 | VT-06~VT-09, VT-13, VT-17~VT-19, VT-24, VT-32~VT-34 | 통합 및 기능 테스트 |
| PR-20 | NFR-02 | VT-25~VT-31 | 엣지 케이스 |
| PR-21 | TBD-05 | VT-19 | Batching 구현 여부 및 검증 |

### 5.1.2 원본 과제 요구사항과 SRS 추적 관계

원본 과제 요구사항과 SRS 요구사항, 검증 항목 간의 추적 관계를 정리한다.

| 원본 요구사항 ID | SRS 요구사항 ID | 검증 ID | 비고 |
|---|---|---|---|
| R17 | CON-01, CON-02 | VT-23 | Vanilla JS/TS 사용 및 외부 UI 프레임워크 금지 |
| R18 | NFR-02, NFR-03 | VT-01~VT-05, VT-10~VT-16, VT-21, VT-22 | 모듈별 단위 테스트 |
| R19 | NFR-02 | VT-06~VT-09, VT-13, VT-17~VT-19, VT-24, VT-32~VT-34 | 통합 및 기능 테스트 |
| R20 | NFR-02 | VT-25~VT-31 | 엣지 케이스 |
| R1~R16 | 확인 필요 | 확인 필요 | 원본 과제 요구사항 내용을 확인한 뒤 추가 |

## 5.2 Additional Materials

추가 설계 자료, 상세 테스트 케이스, 참고 자료를 첨부한다.

| 자료명 | 설명 | 위치 |
|---|---|---|
| 상세 테스트 케이스 | 검증 항목별 구체적인 입력값, 실행 절차 및 테스트 데이터 | 추후 추가 |
| 설계 문서 | 모듈별 함수명, 매개변수, 반환 형식 및 내부 동작 | 추후 추가 |

---

# 6. 미결 사항 (TBD)

구현 방식이나 검증 기준을 팀에서 추가로 결정해야 하는 항목을 정리한다.

| ID | 질문 | 결정이 필요한 이유 | 관련 요구사항 |
|---|---|---|---|
| TBD-01 | Patch를 세 번 해서 기록이 A → B → C로 쌓였다. 뒤로가기를 두 번 눌러 A 화면으로 돌아간 뒤, 테스트 영역을 고치고 다시 Patch해서 새 화면 D가 생겼다. 이때 원래 A 다음에 있던 B와 C는 지울까, 남겨 둘까? | 기록 구조와 Redo 동작에 영향을 준다. | FR-07, FR-08 |
| TBD-02 | 사용자는 테스트 영역을 HTML 코드 입력칸에서 수정할까, 실제 화면처럼 보이는 영역에서 직접 수정할까? | 테스트 영역을 Virtual DOM으로 변환하는 방법이 달라진다. | FR-02 |
| TBD-03 | Diff가 탐지할 변경 유형을 추가, 삭제, 태그 종류 변경, 글자 변경, 속성 변경으로 확정할까? | Diff 결과의 데이터 구조와 Patch 구현 범위를 결정해야 한다. | FR-03~FR-06 |
| TBD-04 | 목록 항목마다 key를 붙여 항목 교체 및 순서 변경 시 기존 요소가 잘못 재사용되는 문제를 해결할까? | 같은 위치끼리 비교하는 방식에서는 항목이 교체되어도 기존 요소가 재사용될 수 있다. | FR-04 |
| TBD-05 | 버튼 한 번에 State가 여러 개 바뀔 때 상태마다 화면을 다시 그릴까, 변경 사항을 모아 한 번만 다시 그릴까(Batching)? | 과제 원문의 선택 항목이며 렌더링 구조와 검증 기준에 영향을 준다. | FR-14, FR-17, VT-19 |
| TBD-06 | 포트폴리오 수준을 무엇으로 측정할까? | 측정 기준이 없으면 완료 여부를 판단하기 어렵다. | NFR-04 |

---

# 7. 최종 검토 항목

- [ ] 기능 요구사항과 비기능 요구사항이 구분되었는가?
- [ ] Phase 1과 Phase 2의 기능 요구사항이 구분되었는가?
- [ ] 프로젝트 요구사항 PR과 SRS 요구사항의 연결이 정확한가?
- [ ] 원본 과제 요구사항 R과 프로젝트 요구사항 PR을 구분했는가?
- [ ] 인터페이스의 입력과 출력이 명확한가?
- [ ] 제약사항이 과제 조건과 일치하는가?
- [ ] 각 요구사항에 검증 방법과 합격 기준이 연결되었는가?
- [ ] Phase 1과 Phase 2의 검증 항목이 구분되었는가?
- [ ] Phase 1 검증 페이지, 초기 렌더링, 테스트 영역 직접 수정이 검증 항목에 포함되었는가?
- [ ] Hook 호출 규칙, Phase 1 기능 재사용, Phase 2 테스트 페이지가 기능 요구사항에 포함되었는가?
- [ ] Batching은 TBD-05의 팀 결정과 검증 항목에 연결되었는가?
- [ ] 엣지 케이스가 테스트 항목에 반영되었는가?
- [ ] 추적성 표의 PR, R, FR, NFR, IR, CON, VT ID가 정확하게 연결되었는가?
- [ ] 최종 SRS.md의 항목과 내용이 작성한 문서와 일치하는가?
