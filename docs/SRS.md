Software Requirements Specification (SRS)
ISO/IEC/IEEE 29148:2018 기반 미니 React 프로젝트 요구사항 명세서

문서 정보
항목	내용
프로젝트명	미니 React 구현 프로젝트
문서 버전	1.1 (최종 완결본)
작성일	2026-11-07
작성자	프로젝트 팀원 전체
검토자	프로젝트 팀원 전체
문서 상태	Approved / Complete
0. 기본 요구사항 및 배경 정리
본 장은 React의 핵심 동작 원리를 외부 프레임워크 없이 직접 구현하기 위한 기본 배경 및 문제 해결 요구사항을 정리한다.

과제 기능	해결하는 불편/요구사항
Virtual DOM	브라우저·사용자: 실행 중에 이전 모습과 새 모습을 실제 DOM으로 비교하려면 비교 전에 새 DOM을 실제로 만들어야 하며, 이는 높은 렌더링 비용을 유발한다.
개발자: 데이터가 바뀔 때마다 화면 전체 모습을 새로 작성하더라도 불필요한 DOM 조작 및 렌더링이 일어나지 않아야 하며, 이전과 새 모습의 비교 과정이 실제 DOM 생성보다 훨씬 가벼워야 한다.
Diff	개발자: 기존 명령형 방식에서는 데이터 변경 시 화면의 어떤 요소를 고쳐야 할지 직접 찾아야 하며, 누락 시 데이터와 화면이 어긋난다.
데이터가 바뀌면 도구가 이전 모습과 새 모습을 스스로 비교하여 달라진 노드와 그 종류(추가, 삭제, 교체, 글자 수정, 속성 수정, 이동)를 개발자의 개입 없이 자동으로 찾아내야 한다.
Patch	브라우저·사용자: DOM을 전체 갱신하면 바뀌지 않은 노드까지 새로 만들어져 범위 넓은 스타일/레이아웃/페인트 계산이 재발생하며, 입력 중인 글자, 커서, 스크롤 상태가 소실된다.
실제 DOM에는 Diff가 발견한 변경 사항만 반영하여 바뀌지 않은 노드의 사용자 상태를 유지하고 계산 범위를 줄인다.
Component	개발자: 화면 전체 구성을 한곳에 작성하면 대규모 코드가 되어 읽고 고치기 어렵다.
화면 설명을 입력(props)을 받아 UI 조각을 반환하는 함수형 컴포넌트로 분할하여 재사용성과 가독성을 극대화한다.
State	사용자: 동일한 데이터를 복수의 조각이 각자 가질 경우 동기화 문제가 발생한다.
개발자: 상태 변경 시 화면을 다시 그리도록 명시적으로 명령하지 않아도 되도록, 바뀌는 데이터의 진실의 원천(Single Source of Truth)을 루트 컴포넌트에 두고 상태 변경 시 다시 그리기 프로세스(VDOM → Diff → Patch)가 자동 실행되도록 한다.
useState	사용자·개발자: 상태 변경으로 컴포넌트 함수가 재실행되면 함수 내 지역 변수는 초기화된다.
함수가 반복 실행되어도 상태 값은 함수 외부(FunctionComponent의 hooks 배열)에 보존되어야 하며, State 변경 함수는 값을 업데이트함과 동시에 다시 그리기 프로세스를 구동해야 한다.
useEffect	서버·사용자: 서버 요청, Document Title 변경 등 부수 효과(Side-effect)를 컴포넌트 내에 작성하면 재렌더링 시마다 불필요하게 반복 실행되어 지연과 부하가 발생한다.
부수 효과는 화면 갱신(Patch) 완료 후 실행되어야 하며, 지정된 의존성 배열의 변경 여부에 따라 실행 타이밍이 제어되어야 한다.
useMemo	사용자: 연산량이 많은 로직이 무관한 상태 변경에 의한 재렌더링 시 매번 실행되어 화면이 느려진다.
의존성 값이 변경되지 않은 경우 이전 계산 결과를 캐싱하여 즉시 재사용하도록 렌더링 과정 중에 처리한다.
1. Introduction
1.1 Document Purpose
본 문서는 미니 React 프로젝트의 기능, 품질, 인터페이스 및 기술적 제약사항을 정의한다. 과제에서 제시한 요구사항을 프로젝트 요구사항과 SRS 요구사항으로 구체화하고, 구현 및 테스트 과정에서 요구사항 충족 여부를 확인하는 기준을 제공한다.

작성 항목	작성 내용
문서 작성 목적	미니 React 프로젝트의 요구사항과 검증 기준 정의
문서 활용 대상	프로젝트 참여자, 요구사항 작성자, 구현 담당자, 테스트 담당자
문서 적용 범위	Phase 1 (Virtual DOM, Diff, Patch, History) 및 Phase 2 (Component, State, Hooks) 구현 전반
1.2 Product Scope
브라우저 DOM을 Virtual DOM으로 변환하고, 이전 Virtual DOM과 새로운 Virtual DOM을 비교하여 변경된 부분만 실제 DOM에 반영하는 엔진을 구현한다. Phase 2에서는 함수형 컴포넌트와 State, Hooks를 구축하여 State 변경 시 Phase 1의 핵심 엔진을 재사용해 화면을 자동으로 갱신한다.

구분	내용
개발 목적	React의 핵심 동작 원리를 직접 구현하고 Virtual DOM 기반 상태 렌더링 체계를 이해한다.
구현 범위	Virtual DOM, DOM 변환, Diff, Patch, History, Function Component, Props, State, useState, useEffect, useMemo
제외 범위	React, Vue 등 외부 UI 프레임워크 사용, 실제 React의 전체 서드파티 기능 구현
주요 결과물	미니 React 코어 라이브러리, Phase 1·2 검증 페이지, 단위 및 통합/기능 테스트 스위트
1.3 Definitions and Abbreviations
용어	영문 명칭	정의
DOM	Document Object Model	브라우저가 HTML 문서를 객체 트리로 표현한 구조
Virtual DOM	Virtual Document Object Model	실제 DOM을 JavaScript 객체로 표현한 구조
Diff	Difference	이전 Virtual DOM과 새로운 Virtual DOM의 차이를 비교하는 과정
Patch	Patch	Diff 결과를 실제 DOM에 반영하는 과정
Component	Component	Props를 입력받아 UI 구조를 반환하는 함수형 화면 구성 단위
Props	Properties	부모 컴포넌트가 자식 컴포넌트에 전달하는 데이터
State	State	화면 변화에 영향을 주는 상태 데이터
Hook	Hook	함수형 컴포넌트에서 State 및 부수 효과 등을 관리하는 함수
Batching	Batching	여러 State 변경을 모아 렌더링 횟수를 줄이는 처리 방식
SRS	Software Requirements Specification	소프트웨어 요구사항 명세서
FR	Functional Requirement	기능 요구사항
NFR	Non-functional Requirement	비기능 요구사항
IR	Interface Requirement	인터페이스 요구사항
CON	Constraint	제약사항
VT	Verification Test	검증 항목
1.4 References
자료명	출처	URL
Why did we build React?	React Blog	https://legacy.reactjs.org/blog/2013/06/05/why-react.html
DOM Introduction	MDN Web Docs	https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction
DOM Standard	WHATWG	https://dom.spec.whatwg.org/
2. Product Overview
2.1 Product Perspective
프로젝트는 React의 핵심 기능을 외부 프레임워크 없이 구현하는 학습용 프레임워크 시스템이다.

Phase 1: Virtual DOM 변환, Diff, Patch, History 모듈 구축.
Phase 2: 함수형 컴포넌트, State, Hooks 모듈 구축 및 Phase 1 엔진 연동.
작성 항목	작성 내용
개발 배경	React의 핵심 동작 원리를 직접 구현하여 Virtual DOM 및 상태 기반 렌더링 메커니즘 체득
기존 기술과의 관계	React의 Virtual DOM, Component, State, Hooks 개체 개념을 표준 Vanilla Web API 기반으로 자작
시스템 구성	Virtual DOM Converter, Diff Engine, Patch Engine, History Manager, Component Runtime, Hooks Engine
모듈 간 관계	Phase 2 State 변경 → 새 Virtual DOM 생성 → Phase 1 Diff 알고리즘 → Patch 엔진을 통한 실제 DOM 갱신
2.2 Product Functions
기능 ID	기능명	기능 설명	적용 Phase
PF-01	DOM 변환	브라우저 DOM을 Virtual DOM 객체로 변환	Phase 1
PF-02	Virtual DOM 비교	이전 Virtual DOM과 새 Virtual DOM 간 차이 탐지	Phase 1
PF-03	DOM 갱신	Diff 결과를 실제 DOM에 최소 단위로 반영	Phase 1
PF-04	변경 이력 관리	Patch 실행 결과를 기록하고 Undo/Redo 지원	Phase 1
PF-05	함수형 컴포넌트	Function Component 렌더링 및 생명주기 관리	Phase 2
PF-06	Props 전달	부모 컴포넌트에서 자식 컴포넌트로 데이터 전달	Phase 2
PF-07	State 관리	루트 컴포넌트에서의 단일 State 관리 및 화면 자동 갱신	Phase 2
PF-08	Hooks	useState, useEffect, useMemo 구현	Phase 2
PF-09	테스트 페이지	사용자 입력 및 UI 조작을 통한 Phase 1·2 검증 환경 제공	Phase 1, 2
3. Requirements
3.1 Functional Requirements
3.1.1 검증 방법 정의
검증 구분	검증 방법	설명
단위	Unit Test	개별 함수 및 모듈 단위의 입출력 자동 검증 테스트
기능	Functional Test	검증 페이지 상에서 사용자 조작을 통한 동작 및 UI 상태 검증
검토	Code Review	소스 코드 구조, 모듈 책임 분리, 제약사항 준수 여부 정적 검토
3.1.2 Phase 1 Functional Requirements
Virtual DOM, DOM 변환, Diff, Patch, History

요구사항 ID	요구사항명	요구사항 내용	인수 기준	검증	적용 Phase	관련 PR ID
FR-01	초기 DOM 변환	페이지 로드 시 실제 영역의 샘플 구조를 Virtual DOM으로 변환하고 테스트 영역에 동일한 구조를 표시해야 한다.	두 영역의 태그, 속성, 글자가 모두 일치함 (공백 정리, 주석 제외, 소문자 태그 규칙 적용)	단위, 기능	Phase 1	PR-01, PR-04
FR-02	테스트 영역 수정	사용자는 테스트 영역의 내용을 자유롭게 수정할 수 있어야 한다.	태그, 속성, 글자의 추가·삭제·변경이 가능함	기능	Phase 1	PR-05
FR-03	Patch 실행	사용자가 Patch 버튼을 클릭하면 실제 영역을 테스트 영역과 FR-01 기준으로 동일한 구조와 내용으로 갱신해야 한다.	Patch 후 실제 영역과 테스트 영역의 VDOM 구조가 동일함	기능, 단위	Phase 1	PR-06
FR-04	변경 부분만 갱신	Patch 실행 시 변경된 부분만 갱신하고 변경되지 않은 노드는 유지해야 한다.	변경되지 않은 요소 객체는 유지되며 입력값, 커서 위치, 스크롤 위치가 보존됨	단위, 기능	Phase 1	PR-02, PR-06
FR-05	텍스트 및 속성 변경	글자나 속성만 달라진 요소를 새로 만들지 않고 해당 내용만 변경해야 한다.	Patch 전후 해당 DOM 요소의 참조 객체가 동일함	단위	Phase 1	PR-02, PR-06
FR-06	태그 종류 변경	태그 종류가 달라진 요소는 새 요소로 교체해야 한다.	Patch 후 해당 위치의 DOM 노드가 새 태그 종류로 교체됨	단위	Phase 1	PR-02, PR-06
FR-07	History 저장	Patch 실행 시마다 변경된 시점의 화면 구조를 History에 저장해야 한다.	Patch를 n번 실행 시 정책에 따라 n개의 이력이 저장됨	단위	Phase 1	PR-06
FR-08	Undo/Redo	Undo/Redo 버튼 클릭 시 이전/다음 기록으로 이동하고 실제 및 테스트 영역을 해당 상태로 갱신해야 한다.	이동 후 양쪽 영역이 해당 이력의 상태와 일치하며 끝 지점 초과 이동은 무시됨	기능, 단위	Phase 1	PR-07
3.1.3 Phase 2 Functional Requirements
Function Component, Props, State, Hooks

요구사항 ID	요구사항명	요구사항 내용	인수 기준	검증	적용 Phase	관련 PR ID
FR-10	선언적 화면 갱신	개발자는 화면 요소 조작 명령 없이 상태에 따른 화면 구조만 선언해야 한다.	상태 변경 코드 내에 명령형 DOM 조작 코드가 존재하지 않음	검토	Phase 2	PR-11
FR-11	컴포넌트 실행	시스템은 Hook 배열을 관리하는 FunctionComponent를 구현하고, mount()와 update()를 실행해야 한다.	컴포넌트 생명주기 함수가 정상 동작하고 UI를 반환함	단위	Phase 2	PR-08
FR-12	컴포넌트 렌더링	시스템은 함수형 컴포넌트의 실행 결과를 실제 UI로 렌더링해야 한다.	컴포넌트 렌더링 결과가 화면에 정상 표시됨	단위, 기능	Phase 2	PR-08
FR-13	Props 전달	부모 컴포넌트는 자식 컴포넌트에 Props를 전달하고, 자식은 이를 활용할 수 있어야 한다.	자식 컴포넌트에 전달된 Props 값과 사용 값이 일치함	단위	Phase 2	PR-10
FR-14	컴포넌트 재렌더링	시스템은 State 변경 시 컴포넌트를 다시 실행하고 화면을 자동으로 갱신해야 한다.	State 변경 시 컴포넌트 재실행 및 화면 업데이트 자동 구동	기능, 단위	Phase 2	PR-11
FR-15	State 관리	루트 컴포넌트에서 State를 관리하고 자식 컴포넌트에는 Props로 전달해야 한다 (Lifting State Up).	상태 데이터의 진실의 원천이 루트에 위치하여 데이터 불일치를 방지함	단위, 기능	Phase 2	PR-10
FR-16	useState 초기값	useState는 초기값으로 상태를 설정하고 상태값과 변경 함수(setter)를 반환해야 한다.	initialValue 설정 및 [state, setState] 튜플 반환 검증	단위	Phase 2	PR-12
FR-17	State 변경	setter 실행을 통해 State를 변경하고 화면 갱신 프로세스를 유발해야 한다.	setter 호출 시 새로운 상태 반영 및 재렌더링 수행	단위, 기능	Phase 2	PR-11, PR-12
FR-18	useEffect 실행	시스템은 화면 갱신(Patch) 완료 후 useEffect에 전달된 Effect 함수를 실행해야 한다.	DOM 반영 완료 시점에 Effect 함수가 실행됨	단위	Phase 2	PR-13
FR-19	useEffect 의존성	의존성 배열의 변경 여부에 따라 Effect 실행을 제어해야 한다.	의존성 미변경 시 건너뜀, 빈 배열은 최초 1회만 실행됨	단위	Phase 2	PR-13
FR-20	useMemo 계산 재사용	의존성 변경 시 재계산하고, 미변경 시 이전 계산 결과를 재사용해야 한다.	의존성이 동일하면 계산 로직을 건너뛰고 캐싱 값 반환	단위	Phase 2	PR-14
FR-21	Hook 호출 규칙	Hook은 루트 함수형 컴포넌트의 최상위 레벨에서만 호출되어야 한다.	조건문/반복문 내 Hook 호출 시 제한/예외 처리	단위	Phase 2	PR-09
FR-22	Phase 1 기능 재사용	Phase 2의 State 변경에 따른 화면 갱신은 Phase 1의 Virtual DOM, Diff, Patch를 재사용해야 한다.	Phase 2 화면 갱신 프로세스가 Phase 1 코어 모듈을 호출함	통합	Phase 2	PR-15
FR-23	Phase 2 테스트 페이지	테스트 페이지에서 사용자 입력을 통해 State 변경 및 화면 갱신을 확인해야 한다.	사용자 인터랙션에 의한 상태 및 UI 정상 갱신	기능	Phase 2	PR-16
3.2 Non-functional Requirements
요구사항 ID	품질 특성	요구사항 내용	측정 및 검증 기준	관련 PR ID
NFR-01	Performance	DOM 갱신 시 변경되지 않은 영역의 불필요한 업데이트를 최소화해야 한다.	노드 100개 중 1개 수정 시 실제 DOM 조작 횟수가 변경 부분에만 비례함(상수 회)	PR-02, PR-06, PR-15
NFR-02	Reliability	모든 모듈은 단위 및 기능 테스트를 통해 정상 및 예외 입력을 처리해야 한다.	각 요구사항(FR)에 대응하는 테스트 케이스가 1개 이상 존재	PR-18, PR-19, PR-20
NFR-03	Robustness	엣지 케이스(자식 없음, 깊은 중첩, 복합 동시 변경 등)에서도 안정적으로 동작해야 한다.	팀 정의 엣지 케이스 시나리오 통과	PR-20
NFR-04	Maintainability	Virtual DOM, Diff, Patch, Component, Hooks 모듈 간 단일 책임 원칙을 준수해야 한다.	모듈별 역할 및 함수 인터페이스 검토	PR-18
3.3 Interface Requirements
인터페이스 ID	대상	요구사항 내용	입력	출력
IR-01	테스트 영역 UI	사용자는 테스트용 HTML을 수정 및 입력할 수 있다.	HTML Text / 입력 이벤트	입력된 HTML 텍스트
IR-02	Patch 버튼 UI	사용자는 Patch 실행 조작을 수행한다.	버튼 Click	Patch 알고리즘 수행
IR-03	Undo/Redo 버튼 UI	사용자는 변경 이력을 이전/이후로 이동시킨다.	버튼 Click	이력 상태 복원/적용
IR-04	DOM Converter	실제 DOM 노드를 읽어 Virtual DOM 객체를 생성한다.	DOM Node	Virtual DOM 객체
IR-05	Diff Engine	이전/신규 Virtual DOM을 비교하여 변경 사항을 생성한다.	Old/New Virtual DOM	Diff Result (Patches)
IR-06	Patch Engine	Diff 결과를 실제 DOM에 반영한다.	Target DOM, Diff Result	Updated DOM
IR-07	Phase 2 UI	사용자 입력을 통한 State 변경 테스트 환경을 제공한다.	User Interaction	Changed State & UI
IR-08	State Interface	컴포넌트 내에서 setter 함수를 통한 State 변경을 요청한다.	New State Value	Re-render Trigger
3.4 Constraints
제약사항 ID	구분	제약 조건	사유	관련 PR ID
CON-01	기술 스택	React, Vue 등 외부 UI 프레임워크 사용 금지. Vanilla JS/TS 사용.	핵심 원리 직접 구현	PR-17
CON-02	개발 환경	HTML5, CSS3, Vanilla JavaScript(또는 TypeScript) 사용	과제 기본 환경	PR-17
CON-03	구현 범위	Phase 1 (VDOM, Diff, Patch, History) 및 Phase 2 (Component, State, Hooks)	지정 구현 범위	PR-01~16, 21
CON-04	실행 환경	브라우저 표준 DOM API 기반 동작 환경	DOM 직접 조작	PR-01, PR-04
CON-05	테스트 환경	DOM 테스트 환경(jsdom 등)을 구성하여 단위 테스트 실행	브라우저 API 테스트	PR-18, 19, 20
CON-06	상태 제어	단일 루트 컴포넌트 중심의 State 관리 및 하위 Props 전달	상태 동기화 유지	PR-10
4. Verification
4.1 Phase 1 검증 항목
검증 ID	요구사항 ID	검증 방법	테스트 조건	예상 결과	합격 기준
VT-01	FR-01	Unit Test	DOM 요소를 Virtual DOM으로 변환	VDOM 객체 생성	type, tag, attrs, text, children 정보 정확히 변환
VT-02	FR-01, FR-02	Unit Test	Element, Text 노드 등 변환	노드별 정보 추출	정의된 VDOM 구조 표상에 부합함
VT-03	FR-03	Unit Test	이전·새 VDOM 객체 비교	Diff 알고리즘 작동	변경 대상과 유형이 정확히 산출됨
VT-04	FR-04, FR-05	Unit Test	노드 추가/삭제/속성/텍스트 변경 탐지	변경 감지 정확도	각 변경 유형별 델타 정보 생성 확인
VT-05	FR-06	Unit Test	태그 종류 변경 탐지	Replace 노드 분류	교체 대상 노드로 정확히 식별됨
VT-06	FR-03, FR-07	Integration Test	Diff 결과를 Patch Engine에 전달	DOM 반영	실제 DOM의 변경 대상만 최소 업데이트됨
VT-07	FR-07	Integration Test	Patch 후 History 적재 확인	State History 업데이트	Patch 실행 시마다 VDOM Snapshot 적재
VT-08	FR-08	Functional Test	Undo 실행	이전 상태 복원	실제 및 테스트 영역이 이전 이력과 동일함
VT-09	FR-08	Functional Test	Redo 실행	이후 상태 재적용	실제 및 테스트 영역이 다음 이력과 동일함
VT-32	PR-03	Functional Test	Phase 1 검증 페이지 렌더링	UI 조작 요소 확인	실제/테스트 영역, Patch/Undo/Redo 버튼 표시
VT-33	PR-04	Functional Test	최초 로드	초기 DOM 동기화	두 영역에 동일 샘플 UI 정상 표시
VT-34	PR-05	Functional Test	테스트 영역 HTML 직접 수정	격리 변경 검증	Patch 전까지 실제 영역은 미변경 상태 유지
4.2 Phase 2 검증 항목
검증 ID	요구사항 ID	검증 방법	테스트 조건	예상 결과	합격 기준
VT-10	FR-11, FR-12	Unit Test	FunctionComponent mount/update 실행	컴포넌트 생명주기	mount 및 update 렌더링 정상 실행
VT-11	FR-13, FR-15	Unit Test	부모에서 자식으로 Props 전달	자식 내 Props 사용	전달된 Props 데이터와 사용 결과 일치
VT-12	FR-16	Unit Test	useState 초기 값 전달	state, setter 반환	initialValue 저장 및 setter 함수 반환
VT-13	FR-14, FR-17	Integration Test	setter 호출을 통한 State 변경	재렌더링 트리거	컴포넌트 재실행 및 화면 갱신 완료
VT-14	FR-18, FR-19	Unit Test	useEffect 의존성 평가	Effect 실행 제어	의존성 배열 변경 시에만 Effect 구동
VT-15	FR-20	Unit Test	useMemo 연산 재사용	캐싱 평가	의존성 동일 시 연산 생략 및 이전 값 반환
VT-16	FR-21	Unit Test	Hook 최상위 레벨 외 호출 시도	호출 규칙 제어	규칙 위반 호출 시 예외 발생 또는 제약
VT-17	FR-22	Integration Test	Phase 2 State 변경 갱신 연동	Phase 1 엔진 구동	Phase 1 VDOM Diff/Patch를 통해 UI 반영
VT-18	FR-23	Functional Test	Phase 2 페이지 조작	입력 및 버튼 클릭	상태 변경 및 화면 UI 정상 업데이트
VT-19	TBD-05	Functional Test	한 핸들러 내 다중 State 변경	Batching 검증	(구현 결정 시) 렌더링 1회 및 UI 최종 반영
4.3 품질 및 엣지 케이스 검증
검증 ID	요구사항 ID	검증 방법	테스트 조건	예상 결과	합격 기준
VT-20	NFR-01	Integration Test	노드 1개 수정 Patch 실행	갱신 최소화	미변경 DOM 노드의 불필요한 조작 미발생
VT-21	NFR-02, NFR-03	Boundary Test	빈 값, 잘못된 노드 전달	예외 안전성	정의된 예외 처리 및 시스템 다운 방지
VT-22	NFR-04	Code Review	VDOM, Diff, Patch, Hooks 분리	단일 책임 원칙	각 모듈간 역할 및 인터페이스 독립
VT-23	CON-01, CON-02	Code Review	기술 스택 검토	외부 프레임워크 미사용	pure Vanilla JS/TS로 구현됨 확인
VT-24	CON-04	Functional Test	브라우저 DOM 렌더링	DOM API 연동	실제 브라우저 환경에서 화면 정상 반영
VT-25	NFR-03	Unit Test	자식 노드 없는 요소 변환	빈 자식 배열 생성	에러 없이 VDOM 변환 완료
VT-26	NFR-03	Unit Test	속성 없는 요소 변환	빈 속성 객체 생성	에러 없이 VDOM 변환 완료
VT-27	NFR-03	Unit Test	기존 속성 삭제 탐지	Diff 산출	속성 제거 명령이 Diff 결과 포함
VT-28	NFR-03	Unit Test	동일 VDOM 비교	Diff 산출	Empty Patches 반환
VT-29	NFR-03	Unit Test	동일 값 입력을 통한 Patch	DOM 조작 미발생	실제 DOM 조작 횟수 0회
VT-30	NFR-03	Functional Test	Empty History 상태 Undo/Redo	이동 불가 처리	무동작 및 이전/이후 이력 유지
VT-31	NFR-03	Unit Test	존재하지 않는 노드 수정 요청	예외 방어	안전한 예외 바이패스 처리
VT-35	CON-05	Test Env Check	JSDOM 기반 테스트 환경 수행	DOM API 테스트	자동화 단위 테스트 스위트 정상 통과
5. Appendixes
5.1 Requirements Traceability Matrix
5.1.1 프로젝트 요구사항 (PR) vs SRS & VT
프로젝트 요구사항 ID	SRS 요구사항 ID	검증 ID (VT)	비고
PR-01	FR-01, FR-02, IR-04	VT-01, VT-02	DOM 변환 모듈
PR-02	FR-03, FR-04, FR-05	VT-03~VT-05	Diff 알고리즘
PR-03	IR-01, IR-02, IR-03	VT-32	Phase 1 검증 페이지
PR-04	FR-01, FR-02	VT-01, VT-02, VT-33	초기 렌더링 동기화
PR-05	IR-01	VT-34	테스트 영역 직접 편집
PR-06	FR-06, FR-07, FR-08, IR-06	VT-06, VT-07	Patch Engine & History 저장
PR-07	FR-08, IR-03	VT-08, VT-09	History 이동 (Undo/Redo)
PR-08	FR-11, FR-12	VT-10	Function Component
PR-09	FR-21	VT-16	Hook 호출 규칙 제어
PR-10	FR-13, FR-15	VT-11	Props & State 관리
PR-11	FR-14, FR-17	VT-13	State 변경 렌더링 구동
PR-12	FR-16, FR-17, IR-08	VT-12, VT-13	useState Hook
PR-13	FR-18, FR-19	VT-14	useEffect Hook
PR-14	FR-20	VT-15	useMemo Hook
PR-15	FR-22	VT-17	Phase 1 코어 엔진 재사용
PR-16	FR-23, IR-07	VT-18	Phase 2 검증 페이지
PR-17	CON-01, CON-02	VT-23	순수 기술 스택 준수
PR-18	NFR-02, NFR-04, CON-05	VT-01~05, VT-10~16, VT-21~22, VT-35	모듈 설계 및 단위 테스트
PR-19	NFR-02	VT-06~09, VT-13, VT-17~19, VT-24, VT-32~34	통합 및 기능 테스트
PR-20	NFR-03	VT-25~VT-31	엣지 케이스 처리
PR-21	TBD-05	VT-19	Batching 검증 선택 구현
5.1.2 원본 과제 요구사항 (R) vs SRS & VT
원본 요구사항 ID	SRS 요구사항 ID	검증 ID (VT)	비고
R17	CON-01, CON-02	VT-23	Vanilla JS/TS 기반 외부 프레임워크 사용 금지
R18	NFR-02, NFR-04	VT-01~05, VT-10~16, VT-21, VT-22	모듈별 단위 테스트
R19	NFR-02	VT-06~09, VT-13, VT-17~19, VT-24, VT-32~34	통합 및 기능 테스트
R20	NFR-03	VT-25~VT-31	엣지 케이스 대응
R01 ~ R16	FR-01 ~ FR-23	VT-01 ~ VT-18	Phase 1 & 2 상세 기능 세부 할당
6. 미결 사항 (TBD)
ID	질문 및 이슈 내용	결정이 필요한 이유	결정 상태 / 방향
TBD-01	History 분기 처리: A→B→C 쌓인 상태에서 Undo 2회로 A 이동 후 새 Patch D 발생 시, 기존 B, C 처리	이력 구조 (Linear Stack vs Tree) 결정 필요	Stack 최신 이력 덮어쓰기(선형 이력)로 확정
TBD-02	테스트 영역 수정 방식: HTML 코드 에디터 입력 vs 브라우저 화면 직접 편집	DOM Converter 호출 방식 차이 발생	코드 입력형 텍스트 에디터 방식으로 확정
TBD-03	Diff 탐지 변경 유형 정의	Patch 결과 구조 및 노드 변형 범위 결정	6가지 유형(추가, 삭제, 교체, 글자 수정, 속성 수정, 이동) 확정
TBD-04	목록 재정렬 대응을 위한 key 속성 지원 여부	동일 위치 노드 짝짓기 시 입력 상태 남는 문제 방지	key 속성 지원 및 key 기반 reconciliation 적용 확정
TBD-05	단일 이벤트 핸들러 내 다중 State 변경 시 Batching 적용 여부	불필요한 연쇄 재렌더링 방지 (선택 구현)	성능 최적화 검토 후 구현 여부 최종 결정
TBD-06	포트폴리오 완성도 평가 기준	객관적 완료 조건 산정 필요	단위 테스트 커버리지 90% 이상 및 VT-01~35 통과로 확정
7. 최종 검토 항목
기능 요구사항(FR)과 비기능 요구사항(NFR)이 명확히 구분되었는가?
Phase 1과 Phase 2의 기능 요구사항이 명확히 구분되었는가?
프로젝트 요구사항(PR), 원본 요구사항(R), SRS 요구사항(FR/NFR/CON) 간 추적성이 설정되었는가?
모듈 간 인터페이스(IR)의 입력과 출력이 명시되었는가?
제약사항(CON)이 과제 제반 조건과 완전하게 일치하는가?
모든 FR 및 NFR에 상응하는 검증 항목(VT) 및 합격 기준이 1:1 이상으로 매핑되었는가?
엣지 케이스 시나리오(VT-25~31)가 독립 검증 항목으로 명세화되었는가?
TBD 항목들에 대한 영향도 및 확정 방향이 반영되었는가?
