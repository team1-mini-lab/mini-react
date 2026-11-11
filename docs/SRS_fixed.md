[software_requirements_specification.md](https://github.com/user-attachments/files/34581979/software_requirements_specification.md)
# Software Requirements Specification (SRS)

> ISO/IEC/IEEE 29148:2018 기반 미니 React 프로젝트 요구사항 명세서

## 문서 정보

| 항목 | 내용 |
|---|---|
| 프로젝트명 | 미니 React 구현 프로젝트 |
| 문서 버전 | 1.9 (변경 내용은 아래 개정 이력, 기준 설계 문서 `docs/specs/SDD_final_phase1.md`·`SDD_final_phase2.md`) |
| 작성일 | 2026-11-07 |
| 개정일 | 2026-11-11 (1.7, 1.8, 1.9) |
| 작성자 | 프로젝트 팀원 전체 |
| 검토자 | 프로젝트 팀원 전체 |
| 문서 상태 | Approved (ADR-0001–0020 팀 승인 완료) |

## 개정 이력

| 버전 | 일자 | 변경 내용 | 근거 |
|---|---|---|---|
| 1.1 | 2026-11-07 | 최종 완결본 | — |
| 1.2 | 2026-11-10 | FR-01·02·03·04·05·06·07·08 요구사항/인수 기준 개정, FR-09 신설, NFR-01·03 측정 기준 구체화, IR-01·04·05·06 개정, IR-09·10 및 CON-07 신설, VT-01~06 개정, VT-36~46 신설, TBD-01~05 결정 근거 연결, TBD-07~10 신설, 6.2 ADR 충돌 사항(CF) 및 5.1.3·5.1.4 추적표 추가 | ADR-0001~0006 (`somage/works`), `리액트 issue.md`, ADR 목록(`docs/adr/README.md`) |
| 1.3 | 2026-11-10 | FR-07에 변경 없는 Patch 예외(k1), FR-08에 수정 중 이동 금지(m3·n2) 추가, VT-47~49 신설, IR-04·06과 VT-31을 ADR-0013·0014에 연결, IR에 코드 이름 병기, TBD-01·06·07·08 상태 갱신, 5.1.3에 ADR-0013·0014 추가, 6.2에 CF-09·10 추가 | ADR-0008 개정(팀 설계 검토, 블로그 97), ADR-0013·0014(복구), SDD v0.5 정합성 검토 |
| 1.4 | 2026-11-10 | CF-03을 ADR-0005 6절 t3(실패 시 컨테이너 재구축)로, CF-04를 ADR-0002 4절 s2로 다시 판정하고 ADR-0013·0014를 superseded로 표시. IR-04·IR-06·VT-31·TBD-07·TBD-08·5.1.3·6.2 갱신. ADR-0015(컴포넌트 렌더링, `events` 키) 추가. CON-01을 "검증 페이지와 의존 패키지까지 UI 프레임워크 0"으로 구체화하고 VT-23 합격 기준을 자동 검사로 바꿈. VT-07(k1, 같은 객체 저장), VT-22(FR-10 연결), VT-28(용어) 수정. 기준 SDD를 `docs/specs/SDD_final_phase1.md`·`SDD_final_phase2.md`로 지정 | ADR-0005 6절, ADR-0002 4절, ADR-0015, 피드백 01~06(`docs/reviews/`), 하네스 정합성 검사 |
| 1.5 | 2026-11-10 | 설계 검토 반례에서 나온 제안 ADR-0016~0019를 5.1.3에 추가(모두 proposed, 요구사항 문장은 바꾸지 않음). 과제 원문의 제출물·차별화 항목을 **제안 요구사항** TBD-11(README), TBD-12(통째 교체 vs Patch 비교 화면), TBD-13(key 유무 비교 시연)으로 추가 | 설계 검토 결과(`docs/verification/results/2026-11-10-2-design-ALL-claude.md`), 과제 원문, `SDD_final_common.md` 5장 |
| 1.6 | 2026-11-10 | TBD-13(key 유무 비교 시연)을 채택으로 바꿈. 차별화는 `SDD_final_common.md` 5장 1(하이라이트)·4(트리 보기)·5(key 비교)로 확정 | 팀 결정, Phase 1·2 구현 |
| 1.7 | 2026-11-11 | TBD-09(재귀 깊이) 1,000겹으로 결정, VT-46 문장 갱신. ADR 전부 accepted(PR #54 팀 승인) | 팀 결정 (PR #54 리뷰) |
| 1.8 | 2026-11-11 | TBD-14(협력적 스케줄링) 추가, TBD-12를 성능 실험실로 구현, VT-50·VT-51 추가, ADR-0020(proposed) | 팀 제안 |
| 1.9 | 2026-11-11 | ADR-0020 승인. 5.1.3 ADR 상태를 모두 accepted로 갱신(2026-11-11 팀 승인 반영), TBD-12·13·14를 채택으로 표시 | 팀 승인 |

> **ADR 번호 안내**: v1.2부터 `docs/adr/README.md`의 통합 번호를 쓴다. ADR-0001~0006은 `somage/works`의 설계 ADR(accepted), ADR-0007~0012는 `eungi/docs/adr`의 ADR을 다시 매긴 번호, ADR-0015는 컴포넌트 렌더링 ADR이다. ADR-0013·0014는 v1.4에서 superseded(각각 ADR-0005 6절 t3, ADR-0002 4절 s2로 대체)되어 `docs/adr/superseded/`에 보관한다. 대응은 5.1.3에 있다.
>
> **기준 설계 문서**: Phase 1 `docs/specs/SDD_final_phase1.md`, Phase 2 `docs/specs/SDD_final_phase2.md`. 저장소 루트의 `SDD-3.md`, `SDD_fixed_phase1.md`, `SDD_fixed_phase2.md`는 보관용이며 기준이 아니다.

---

# 0. 기본 요구사항 및 배경 정리

본 장은 React의 핵심 동작 원리를 외부 프레임워크 없이 직접 구현하기 위한 기본 배경 및 문제 해결 요구사항을 정리한다.

| 과제 기능 | 해결하는 불편/요구사항 |
|---|---|
| **Virtual DOM** | **브라우저·사용자:** 실행 중에 이전 모습과 새 모습을 실제 DOM으로 비교하려면 비교 전에 새 DOM을 실제로 만들어야 하며, 이는 높은 렌더링 비용을 유발한다.<br>**개발자:** 데이터가 바뀔 때마다 화면 전체 모습을 새로 작성하더라도 불필요한 DOM 조작 및 렌더링이 일어나지 않아야 하며, 이전과 새 모습의 비교 과정이 실제 DOM 생성보다 훨씬 가벼워야 한다. |
| **Diff** | **개발자:** 기존 명령형 방식에서는 데이터 변경 시 화면의 어떤 요소를 고쳐야 할지 직접 찾아야 하며, 누락 시 데이터와 화면이 어긋난다.<br>데이터가 바뀌면 도구가 이전 모습과 새 모습을 스스로 비교하여 달라진 노드와 그 종류(추가, 삭제, 교체, 글자 수정, 속성 수정, 이동)를 개발자의 개입 없이 자동으로 찾아내야 한다(ADR-0004). |
| **Patch** | **브라우저·사용자:** DOM을 전체 갱신하면 바뀌지 않은 노드까지 새로 만들어져 범위 넓은 스타일/레이아웃/페인트 계산이 재발생하며, 입력 중인 글자, 커서, 스크롤 상태가 소실된다.<br>실제 DOM에는 Diff가 발견한 변경 사항만 반영하여 바뀌지 않은 노드의 사용자 상태를 유지하고 계산 범위를 줄인다(ADR-0004, ADR-0005). |
| **Component** | **개발자:** 화면 전체 구성을 한곳에 작성하면 대규모 코드가 되어 읽고 고치기 어렵다.<br>화면 설명을 입력(`props`)을 받아 UI 조각을 반환하는 함수형 컴포넌트로 분할하여 재사용성과 가독성을 극대화한다. |
| **State** | **사용자:** 동일한 데이터를 복수의 조각이 각자 가질 경우 동기화 문제가 발생한다.<br>**개발자:** 상태 변경 시 화면을 다시 그리도록 명시적으로 명령하지 않아도 되도록, 바뀌는 데이터의 진실의 원천(Single Source of Truth)을 루트 컴포넌트에 두고 상태 변경 시 다시 그리기 프로세스(VDOM → Diff → Patch)가 자동 실행되도록 한다. |
| **useState** | **사용자·개발자:** 상태 변경으로 컴포넌트 함수가 재실행되면 함수 내 지역 변수는 초기화된다.<br>함수가 반복 실행되어도 상태 값은 함수 외부(`FunctionComponent`의 `hooks` 배열)에 보존되어야 하며, State 변경 함수는 값을 업데이트함과 동시에 다시 그리기 프로세스를 구동해야 한다. |
| **useEffect** | **서버·사용자:** 서버 요청, Document Title 변경 등 부수 효과(Side-effect)를 컴포넌트 내에 작성하면 재렌더링 시마다 불필요하게 반복 실행되어 지연과 부하가 발생한다.<br>부수 효과는 화면 갱신(Patch) 완료 후 실행되어야 하며, 지정된 의존성 배열의 변경 여부에 따라 실행 타이밍이 제어되어야 한다. |
| **useMemo** | **사용자:** 연산량이 많은 로직이 무관한 상태 변경에 의한 재렌더링 시 매번 실행되어 화면이 느려진다.<br>의존성 값이 변경되지 않은 경우 이전 계산 결과를 캐싱하여 즉시 재사용하도록 렌더링 과정 중에 처리한다. |

---

# 1. Introduction

## 1.1 Document Purpose

본 문서는 미니 React 프로젝트의 기능, 품질, 인터페이스 및 기술적 제약사항을 정의한다. 과제에서 제시한 요구사항을 프로젝트 요구사항과 SRS 요구사항으로 구체화하고, 구현 및 테스트 과정에서 요구사항 충족 여부를 확인하는 기준을 제공한다.

| 작성 항목 | 작성 내용 |
|---|---|
| 문서 작성 목적 | 미니 React 프로젝트의 요구사항과 검증 기준 정의 |
| 문서 활용 대상 | 프로젝트 참여자, 요구사항 작성자, 구현 담당자, 테스트 담당자 |
| 문서 적용 범위 | Phase 1 (Virtual DOM, Diff, Patch, History) 및 Phase 2 (Component, State, Hooks) 구현 전반 |

## 1.2 Product Scope

브라우저 DOM을 Virtual DOM으로 변환하고, 이전 Virtual DOM과 새로운 Virtual DOM을 비교하여 변경된 부분만 실제 DOM에 반영하는 엔진을 구현한다. Phase 2에서는 함수형 컴포넌트와 State, Hooks를 구축하여 State 변경 시 Phase 1의 핵심 엔진을 재사용해 화면을 자동으로 갱신한다.

| 구분 | 내용 |
|---|---|
| 개발 목적 | React의 핵심 동작 원리를 직접 구현하고 Virtual DOM 기반 상태 렌더링 체계를 이해한다. |
| 구현 범위 | Virtual DOM, DOM 변환, Virtual DOM → DOM 그리기, Diff(key 짝짓기 포함), Patch, History, Function Component, Props, State, useState, useEffect, useMemo |
| 제외 범위 | React, Vue 등 외부 UI 프레임워크 사용, 실제 React의 전체 서드파티 기능 구현, SVG 요소, 공백이 의미를 갖는 `<pre>` 외 요소(`<textarea>`, `<script>`, `<style>`, CSS `white-space`), 이동 횟수 최소화 (ADR-0002, ADR-0004). 검증 페이지를 포함한 모든 화면에서 React·JSX 등 UI 프레임워크 사용 (CON-01) |
| 주요 결과물 | 미니 React 코어 라이브러리, Phase 1·2 검증 페이지, 단위 및 통합/기능 테스트 스위트 |

## 1.3 Definitions and Abbreviations

| 용어 | 영문 명칭 | 정의 |
|---|---|---|
| DOM | Document Object Model | 브라우저가 HTML 문서를 객체 트리로 표현한 구조 |
| Virtual DOM | Virtual Document Object Model | 실제 DOM을 JavaScript 객체로 표현한 구조. 노드는 `type`이 `"element"` 또는 `"text"`인 두 종류뿐이다(ADR-0001) |
| 다섯 키 | Five Screen Keys | 화면 모습을 설명하는 Virtual DOM 키 `type`, `tag`, `attrs`, `text`, `children` (ADR-0001) |
| key | Key | 자식 목록에서 같은 항목끼리 짝짓기 위한 태그 노드의 선택 키. HTML에서는 `key` 속성으로 적고 `attrs`와 분리한다(ADR-0001, ADR-0004) |
| dom 참조 | DOM Reference | 실제 영역에 그려진 트리의 Virtual DOM 노드에만 붙는, 실제 노드를 가리키는 선택 키 `dom`. Diff와 모든 비교는 읽지 않는다(ADR-0001, ADR-0004) |
| FR-01 비교 기준 | FR-01 Equivalence | 두 영역을 ADR-0002 규칙으로 변환한 뒤 다섯 키만 비교하는 화면 동일성 기준. `dom`, `key`는 비교하지 않는다 |
| 실제 영역 | Real Area | Patch의 대상이 되는 화면 영역. 페이지는 틀(`#real-area`)의 첫 자식 요소를 루트로 찾는다(ADR-0006) |
| 테스트 영역 | Test Area | 코드 입력칸(원본)과 미리보기(보기 전용)로 구성된 편집 영역(ADR-0006) |
| 코드 입력칸 | Code Editor | 사용자가 HTML 코드를 고치는 테스트 영역의 원본 |
| 미리보기 | Preview | 코드 입력칸을 Virtual DOM으로 바꾼 뒤 `vdom_to_dom`으로 그린 보기 전용 화면(ADR-0006 g1) |
| 변경 목록 | changes | Diff가 돌려주는 변경 기록 목록. `kind`는 `add`, `remove`, `replace`, `text`, `attrs`, `move` 6종이며 대상은 이전 트리의 Virtual DOM 객체를 가리킨다(ADR-0005) |
| 짝 목록 | pairs | Diff가 돌려주는, 실제 노드를 계속 쓰는 (이전 노드, 새 노드) 쌍 목록. Patch가 `dom`을 복사할 때 쓴다(ADR-0005) |
| State History | State History | Patch마다 그 시점의 Virtual DOM을 저장하는 기록 |
| Diff | Difference | 이전 Virtual DOM과 새로운 Virtual DOM의 차이를 비교하는 과정 |
| Patch | Patch | Diff 결과를 실제 DOM에 반영하는 과정 |
| Component | Component | Props를 입력받아 UI 구조를 반환하는 함수형 화면 구성 단위 |
| Props | Properties | 부모 컴포넌트가 자식 컴포넌트에 전달하는 데이터 |
| State | State | 화면 변화에 영향을 주는 상태 데이터 |
| Hook | Hook | 함수형 컴포넌트에서 State 및 부수 효과 등을 관리하는 함수 |
| Batching | Batching | 여러 State 변경을 모아 렌더링 횟수를 줄이는 처리 방식 |
| ADR | Architecture Decision Record | 설계 결정과 그 이유를 기록한 문서 (MADR 템플릿) |
| SRS | Software Requirements Specification | 소프트웨어 요구사항 명세서 |
| FR | Functional Requirement | 기능 요구사항 |
| NFR | Non-functional Requirement | 비기능 요구사항 |
| IR | Interface Requirement | 인터페이스 요구사항 |
| CON | Constraint | 제약사항 |
| VT | Verification Test | 검증 항목 |
| CF | Conflict | ADR 간 충돌 사항 (6.2) |

## 1.4 References

| 자료명 | 출처 | URL |
|---|---|---|
| Why did we build React? | React Blog | https://legacy.reactjs.org/blog/2013/06/05/why-react.html |
| DOM Introduction | MDN Web Docs | https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction |
| DOM Standard | WHATWG | https://dom.spec.whatwg.org/ |
| ADR-0001~0015 (통합 번호) | 저장소 `docs/adr/` (원본: `somage/works`, `eungi/docs/adr`) | https://github.com/team1-mini-lab/mini-react/tree/somage/works |
| 팀 설계 검토 피드백 01~06 (블로그 97~102) | 저장소 `docs/reviews/` | https://github.com/team1-mini-lab/mini-react/tree/eungi/docs/adr |
| 요구사항 정리 (`리액트 issue.md`) | 팀 저장소 `somage/works` | https://github.com/team1-mini-lab/mini-react/tree/somage/works |
| MADR Template | adr.github.io | https://adr.github.io/madr/ |
| `<template>` 요소 | MDN Web Docs | https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template |
| Node.insertBefore() | MDN Web Docs | https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore |

---

# 2. Product Overview

## 2.1 Product Perspective

프로젝트는 React의 핵심 기능을 외부 프레임워크 없이 구현하는 학습용 프레임워크 시스템이다.

* **Phase 1:** Virtual DOM 변환, Virtual DOM → DOM 그리기, Diff, Patch, History 모듈 구축.
* **Phase 2:** 함수형 컴포넌트, State, Hooks 모듈 구축 및 Phase 1 엔진 연동.

| 작성 항목 | 작성 내용 |
|---|---|
| 개발 배경 | React의 핵심 동작 원리를 직접 구현하여 Virtual DOM 및 상태 기반 렌더링 메커니즘 체득 |
| 기존 기술과의 관계 | React의 Virtual DOM, Component, State, Hooks 개체 개념을 표준 Vanilla Web API 기반으로 자작 |
| 시스템 구성 | Virtual DOM Converter(`dom_to_vdom` = 코드 `domToVNode`), Virtual DOM Renderer(`vdom_to_dom` = `vnodeToDom`), Code Serializer/Parser(`vnodeToHtml`/`htmlToVNode`), Diff Engine, Patch Engine, History Manager, Component Runtime, Hooks Engine |
| 모듈 간 관계 | Phase 1: 코드 입력칸 → `<template>` 파싱 → `dom_to_vdom` → Diff(이전, 새) → `{ changes, pairs }` → Patch로 실제 DOM 갱신 및 `dom` 이어받기<br>Phase 2: State 변경 → 새 Virtual DOM 생성 → Phase 1 Diff 알고리즘 → Patch 엔진을 통한 실제 DOM 갱신 |

## 2.2 Product Functions

| 기능 ID | 기능명 | 기능 설명 | 적용 Phase |
|---|---|---|---|
| PF-01 | DOM 변환 | 브라우저 DOM을 Virtual DOM 객체로 변환 (공백 정리, 주석 제외, 소문자 태그, `key` 분리) | Phase 1 |
| PF-02 | Virtual DOM 비교 | 이전 Virtual DOM과 새 Virtual DOM 간 차이 탐지 (6종 변경, key 짝짓기) | Phase 1 |
| PF-03 | DOM 갱신 | Diff 결과를 실제 DOM에 최소 단위로 반영 | Phase 1 |
| PF-04 | 변경 이력 관리 | Patch 실행 결과를 기록하고 Undo/Redo(뒤로가기/앞으로가기) 지원 | Phase 1 |
| PF-05 | 함수형 컴포넌트 | Function Component 렌더링 및 생명주기 관리 | Phase 2 |
| PF-06 | Props 전달 | 부모 컴포넌트에서 자식 컴포넌트로 데이터 전달 | Phase 2 |
| PF-07 | State 관리 | 루트 컴포넌트에서의 단일 State 관리 및 화면 자동 갱신 | Phase 2 |
| PF-08 | Hooks | useState, useEffect, useMemo 구현 | Phase 2 |
| PF-09 | 테스트 페이지 | 사용자 입력 및 UI 조작을 통한 Phase 1·2 검증 환경 제공 (Phase 1 테스트 영역 = 코드 입력칸 + 미리보기) | Phase 1, 2 |

---

# 3. Requirements

## 3.1 Functional Requirements

### 3.1.1 검증 방법 정의

| 검증 구분 | 검증 방법 | 설명 |
|---|---|---|
| 단위 | Unit Test | 개별 함수 및 모듈 단위의 입출력 자동 검증 테스트 |
| 기능 | Functional Test | 검증 페이지 상에서 사용자 조작을 통한 동작 및 UI 상태 검증 |
| 검토 | Code Review | 소스 코드 구조, 모듈 책임 분리, 제약사항 준수 여부 정적 검토 |

### 3.1.2 Phase 1 Functional Requirements

**Virtual DOM, DOM 변환, Diff, Patch, History**

| 요구사항 ID | 요구사항명 | 요구사항 내용 | 인수 기준 | 검증 | 적용 Phase | 관련 PR ID |
|---|---|---|---|---|---|---|
| FR-01 | 초기 DOM 변환 | 페이지 로드 시 실제 영역의 샘플 구조를 Virtual DOM으로 변환하고(ADR-0002), 실제 영역과 화면에 보이는 모습이 같은 내용을 테스트 영역의 미리보기에 표시해야 한다(ADR-0003, ADR-0006). | 실제 영역과 미리보기를 각각 ADR-0002의 변환 규칙(공백 정리, 주석 제외, 소문자 태그)으로 Virtual DOM으로 바꾸면, 모든 노드에서 `type`, `tag`, `attrs`, `text`, `children`의 개수와 순서가 같다. 그 밖의 키(`dom`, `key` 등)는 비교하지 않는다. (이하 "FR-01 비교 기준") | 단위, 기능 | Phase 1 | PR-01, PR-04 |
| FR-02 | 테스트 영역 수정 | 사용자는 테스트 영역의 코드 입력칸(원본)에서 HTML 코드를 자유롭게 수정할 수 있어야 한다. 미리보기는 보기 전용이다(ADR-0006 방법 3, f1). | 태그, 속성, 글자, `key`, 순서의 추가·삭제·변경이 모두 가능하다. 입력이 0.3초 멈추면 미리보기가 다시 그려진다(ADR-0006 e3). 잘못된 HTML은 브라우저가 고쳐 읽은 결과를 그대로 쓴다(ADR-0006 c1). 단, `<script>` 요소, `on*` 속성, `javascript:`로 시작하는 `href`·`src`는 무시한다(ADR-0002 4절 s2). | 기능 | Phase 1 | PR-05 |
| FR-03 | Patch 실행 | 사용자가 Patch 버튼을 클릭하면 코드 입력칸을 새 Virtual DOM으로 변환하고 미리보기를 즉시 다시 그린 뒤, 실제 영역을 미리보기와 FR-01 비교 기준으로 같은 모습과 내용으로 갱신해야 한다. | Patch 후 실제 영역과 미리보기가 FR-01 비교 기준으로 같다. 아무것도 고치지 않고 Patch하면 변경 목록(changes)이 0개다(ADR-0006 a3). | 기능, 단위 | Phase 1 | PR-06 |
| FR-04 | 변경 부분만 갱신 | Patch 실행 시 변경된 부분만 갱신하고 변경되지 않은 노드는 유지해야 한다. | 변경되지 않은 화면 요소는 Patch 전후에 같은 요소 객체이며, 그 요소의 입력 중인 글자, 커서 위치, 스크롤 위치가 유지된다. | 단위, 기능 | Phase 1 | PR-02, PR-06 |
| FR-05 | 텍스트 및 속성 변경 | 글자나 속성만 달라진 요소를 새로 만들지 않고 해당 내용만 변경해야 한다(ADR-0004 "글자 수정", "속성 수정"). | Patch 전후 해당 DOM 요소의 참조 객체가 동일함 | 단위 | Phase 1 | PR-02, PR-06 |
| FR-06 | 태그 종류 변경 | 태그 종류(`tag`) 또는 노드 종류(`type`)가 달라진 요소는 새 요소로 교체해야 한다(ADR-0004 "교체"). | Patch 후 해당 위치의 DOM 노드가 새 종류로 교체되며, 교체된 노드의 자식은 따로 비교하지 않는다. | 단위 | Phase 1 | PR-02, PR-06 |
| FR-07 | History 저장 | Patch 실행 시마다 그 시점의 Virtual DOM을 State History에 저장해야 한다. | 변경이 있는 Patch를 n번 실행하면 기록이 n개 늘어난다(첫 로드 상태가 0번 기록). 변경이 없는 Patch(changes 0개)는 기록하지 않고 "변경 사항 없음"을 표시한다(ADR-0008 k1). 분기 후 Patch 시 이후 기록 처리는 TBD-01 정책을 따른다. | 단위 | Phase 1 | PR-06 |
| FR-08 | Undo/Redo | 뒤로가기(Undo)/앞으로가기(Redo) 버튼 클릭 시 이전/다음 기록으로 이동하고, 실제 영역과 테스트 영역(코드 입력칸·미리보기)이 FR-01 비교 기준으로 같은 모습이 되어야 한다. 실제 영역은 지금 그려진 트리를 "이전"으로 하는 Diff → Patch로 갱신하고(ADR-0004 `dom` 규칙 7), 코드 입력칸은 기록의 Virtual DOM을 코드로 바꿔 다시 채우고 미리보기도 다시 그린다(ADR-0006 a3·g1). 코드 입력칸에 Patch하지 않은 수정이 있으면 두 버튼을 끄고 이유를 안내하며, 입력 직후 판단 전(0.3초)에도 끈다(ADR-0008 m3·n2). | 이동 후 두 영역이 FR-01 비교 기준으로 해당 기록과 일치하며, 처음·끝 기록에서 더 이동하려 하면 아무 일도 일어나지 않는다. 수정 여부는 `diff(지금 트리, 코드의 새 트리)`의 changes가 0개인지로 판단한다(들여쓰기만 바꾸면 수정 없음, `key`만 바꾸면 수정 있음). | 기능, 단위 | Phase 1 | PR-07 |
| FR-09 | 목록 항목 key 짝짓기 | 자식 목록을 비교할 때 `key`가 있는 자식은 key로, key가 없는 자식끼리는 그들 사이의 순서로 짝짓고, 자리가 바뀐 항목은 새로 만들지 않고 이동해야 한다(ADR-0004 결정 3-나). | 목록 맨 앞에 항목을 추가하면 변경 목록은 `add` 1개뿐이고 기존 항목의 입력값이 같은 항목에 남는다. 순서를 바꾸면 `move`로 처리되어 요소 객체가 유지된다. 같은 부모 안의 중복 key는 경고 후 그 부모의 자식 전체를 자리 비교로 처리한다. | 단위, 기능 | Phase 1 | PR-02, PR-06 |

### 3.1.3 Phase 2 Functional Requirements

**Function Component, Props, State, Hooks**

| 요구사항 ID | 요구사항명 | 요구사항 내용 | 인수 기준 | 검증 | 적용 Phase | 관련 PR ID |
|---|---|---|---|---|---|---|
| FR-10 | 선언적 화면 갱신 | 개발자는 화면 요소 조작 명령 없이 상태에 따른 화면 구조만 선언해야 한다. | 상태 변경 코드 내에 명령형 DOM 조작 코드가 존재하지 않음 | 검토 | Phase 2 | PR-11 |
| FR-11 | 컴포넌트 실행 | 시스템은 Hook 배열을 관리하는 FunctionComponent를 구현하고, mount()와 update()를 실행해야 한다. | 컴포넌트 생명주기 함수가 정상 동작하고 UI를 반환함 | 단위 | Phase 2 | PR-08 |
| FR-12 | 컴포넌트 렌더링 | 시스템은 함수형 컴포넌트의 실행 결과를 실제 UI로 렌더링해야 한다. | 컴포넌트 렌더링 결과가 화면에 정상 표시됨 | 단위, 기능 | Phase 2 | PR-08 |
| FR-13 | Props 전달 | 부모 컴포넌트는 자식 컴포넌트에 Props를 전달하고, 자식은 이를 활용할 수 있어야 한다. | 자식 컴포넌트에 전달된 Props 값과 사용 값이 일치함 | 단위 | Phase 2 | PR-10 |
| FR-14 | 컴포넌트 재렌더링 | 시스템은 State 변경 시 컴포넌트를 다시 실행하고 화면을 자동으로 갱신해야 한다. | State 변경 시 컴포넌트 재실행 및 화면 업데이트 자동 구동 | 기능, 단위 | Phase 2 | PR-11 |
| FR-15 | State 관리 | 루트 컴포넌트에서 State를 관리하고 자식 컴포넌트에는 Props로 전달해야 한다 (Lifting State Up). | 상태 데이터의 진실의 원천이 루트에 위치하여 데이터 불일치를 방지함 | 단위, 기능 | Phase 2 | PR-10 |
| FR-16 | useState 초기값 | useState는 초기값으로 상태를 설정하고 상태값과 변경 함수(setter)를 반환해야 한다. | initialValue 설정 및 [state, setState] 튜플 반환 검증 | 단위 | Phase 2 | PR-12 |
| FR-17 | State 변경 | setter 실행을 통해 State를 변경하고 화면 갱신 프로세스를 유발해야 한다. | setter 호출 시 새로운 상태 반영 및 재렌더링 수행 | 단위, 기능 | Phase 2 | PR-11, PR-12 |
| FR-18 | useEffect 실행 | 시스템은 화면 갱신(Patch) 완료 후 useEffect에 전달된 Effect 함수를 실행해야 한다. | DOM 반영 완료 시점에 Effect 함수가 실행됨 | 단위 | Phase 2 | PR-13 |
| FR-19 | useEffect 의존성 | 의존성 배열의 변경 여부에 따라 Effect 실행을 제어해야 한다. | 의존성 미변경 시 건너뜀, 빈 배열은 최초 1회만 실행됨 | 단위 | Phase 2 | PR-13 |
| FR-20 | useMemo 계산 재사용 | 의존성 변경 시 재계산하고, 미변경 시 이전 계산 결과를 재사용해야 한다. | 의존성이 동일하면 계산 로직을 건너뛰고 캐싱 값 반환 | 단위 | Phase 2 | PR-14 |
| FR-21 | Hook 호출 규칙 | Hook은 루트 함수형 컴포넌트의 최상위 레벨에서만 호출되어야 한다. | 조건문/반복문 내 Hook 호출 시 제한/예외 처리 | 단위 | Phase 2 | PR-09 |
| FR-22 | Phase 1 기능 재사용 | Phase 2의 State 변경에 따른 화면 갱신은 Phase 1의 Virtual DOM, Diff, Patch를 재사용해야 한다. Phase 2 컴포넌트도 ADR-0001의 노드 모양(`key` 포함)을 반환한다. | Phase 2 화면 갱신 프로세스가 Phase 1 코어 모듈을 호출함 | 통합 | Phase 2 | PR-15 |
| FR-23 | Phase 2 테스트 페이지 | 테스트 페이지에서 사용자 입력을 통해 State 변경 및 화면 갱신을 확인해야 한다. | 사용자 인터랙션에 의한 상태 및 UI 정상 갱신 | 기능 | Phase 2 | PR-16 |

## 3.2 Non-functional Requirements

| 요구사항 ID | 품질 특성 | 요구사항 내용 | 측정 및 검증 기준 | 관련 PR ID |
|---|---|---|---|---|
| NFR-01 | Performance | DOM 갱신 시 변경되지 않은 영역의 불필요한 업데이트를 최소화해야 한다. 화면 요소 조작 횟수는 변경된 부분의 수에 비례해야 하며 전체 요소 수에 비례하면 안 된다. | 노드 100개 중 1개 수정 시 실제 DOM 조작 횟수가 변경 부분에만 비례함(상수 회). 조작 횟수는 Diff의 변경 목록(changes) 개수로 센다(이동 포함, ADR-0004·0005). 화면 부착은 노드 수와 무관하게 1회다(ADR-0003). | PR-02, PR-06, PR-15 |
| NFR-02 | Reliability | 모든 모듈은 단위 및 기능 테스트를 통해 정상 및 예외 입력을 처리해야 한다. | 각 요구사항(FR)에 대응하는 테스트 케이스가 1개 이상 존재 | PR-18, PR-19, PR-20 |
| NFR-03 | Robustness | 엣지 케이스(자식 없음, 깊은 중첩, 한 번의 Patch에 추가·삭제·글자 변경이 섞인 복합 동시 변경, 실제 영역에 주석이 있을 때의 Patch, 순서 변경과 교체의 동시 발생 등)에서도 FR-03~FR-06, FR-09가 성립해야 한다. 실제 영역의 원래 DOM에는 주석이 남아 자식 자리 번호가 어긋나지만, Patch는 `dom`으로 노드를 찾아 이 문제를 피한다(ADR-0002, ADR-0004). | 팀 정의 엣지 케이스 목록(ADR-0005 Confirmation의 D1~D15, P1~P12, ADR-0002 T1~T15, ADR-0006 TA1~TA12)이 모두 통과한다. | PR-20 |
| NFR-04 | Maintainability | Virtual DOM, Diff, Patch, Component, Hooks 모듈 간 단일 책임 원칙을 준수해야 한다. Diff는 읽기만(`dom`을 읽지 않음), Patch는 쓰기만 한다(ADR-0003·0004·0005). | 모듈별 역할 및 함수 인터페이스 검토 | PR-18 |

## 3.3 Interface Requirements

| 인터페이스 ID | 대상 | 요구사항 내용 | 입력 | 출력 |
|---|---|---|---|---|
| IR-01 | 테스트 영역 UI | 사용자는 코드 입력칸(원본, `#editor`)에서 테스트용 HTML을 수정 및 입력하고, 입력이 0.3초 멈추면 미리보기(`#preview`)가 다시 그려진다. Patch 클릭 시 대기 중이어도 미리보기를 즉시 다시 그린다(ADR-0006). | HTML Text / 입력 이벤트 | 입력된 HTML 텍스트, 갱신된 미리보기 |
| IR-02 | Patch 버튼 UI | 사용자는 Patch 실행 조작을 수행한다. | 버튼 Click | Patch 알고리즘 수행 |
| IR-03 | Undo/Redo 버튼 UI | 사용자는 변경 이력을 이전/이후로 이동시킨다 (뒤로가기/앞으로가기). | 버튼 Click | 이력 상태 복원/적용 |
| IR-04 | DOM Converter (`dom_to_vdom`, 코드 `domToVNode`) | 실제 DOM 노드를 읽어 Virtual DOM 객체를 생성한다. 공백 정리(`/[ \t\n\r\f]+/g` → `" "`, `<pre>` 예외), 주석 제외, `localName` 소문자 태그, `key` 속성의 `attrs` 분리를 적용하고, 실제 영역 첫 변환 시에만 `dom`을 기록한다(ADR-0002). `<script>` 요소, 이름이 `on`으로 시작하는 속성, 값이 `javascript:`로 시작하는 `href`·`src` 속성은 넣지 않는다(ADR-0002 4절 s2). | DOM Node, 기록 여부(기본: 기록 안 함) | Virtual DOM 객체 |
| IR-05 | Diff Engine (`diff`) | 이전/신규 Virtual DOM을 비교하여 변경 사항을 생성한다. `dom`은 읽지 않으며 변경 기록의 대상은 이전 트리의 Virtual DOM 객체를 가리킨다(ADR-0004, ADR-0005). | Old/New Virtual DOM | `{ changes, pairs }` (`kind`: `add`, `remove`, `replace`, `text`, `attrs`, `move`) |
| IR-06 | Patch Engine (`applyPatch`, `recordDom`, `recoverPatch`) | Diff 결과를 실제 DOM에 반영한다. 부모마다 삭제 → 새 자식을 앞에서부터 [자리 맞추기 → 자신의 변경 → 자식] 순서로 적용하고, 짝 목록대로 `dom`을 복사하며 추가·교체로 만든 노드의 `dom`을 기록한다(ADR-0005). 적용 도중 오류가 나면 적용을 멈추고 컨테이너의 루트를 새 트리로 다시 그린 뒤 새 트리 전체에 `dom`을 기록하고, 원래 오류를 `console.error`로 남긴다(ADR-0005 6절 t3). 오류는 호출자에게 다시 던지지 않는다. | 컨테이너, 새 트리, `{ changes, pairs }`, 옵션(하이라이트) | Updated DOM, `dom`이 채워진 새 트리, `{ applied, recovered }` |
| IR-07 | Phase 2 UI | 사용자 입력을 통한 State 변경 테스트 환경을 제공한다. | User Interaction | Changed State & UI |
| IR-08 | State Interface | 컴포넌트 내에서 setter 함수를 통한 State 변경을 요청한다. | New State Value | Re-render Trigger |
| IR-09 | Virtual DOM Renderer (`vdom_to_dom`, 코드 `vnodeToDom`) | Virtual DOM 노드를 화면 밖에서 재귀로 실제 DOM 트리로 완성해 반환한다. 화면 부착은 호출 측이 한 번만 한다. `key`는 `key` 속성으로 다시 붙이고, `dom`은 읽지도 기록하지도 않는다(ADR-0003). | Virtual DOM 노드 | 실제 DOM 노드 (화면 미부착) |
| IR-10 | Code Serializer / Parser (`vnodeToHtml`, `htmlToVNode`) | Virtual DOM → 코드: 원래 공백 노드 자리만 줄바꿈·2칸 들여쓰기(`<pre>` 제외), `<`·`&`·`"` 이스케이프, `key` 속성 기록, 빈 요소는 닫는 태그 생략. 코드 → Virtual DOM: `<template>`에서 파싱한 첫 요소를 `dom_to_vdom`(기본 모드)으로 변환(ADR-0006 a3, g1). | Virtual DOM / HTML Text | HTML Text / Virtual DOM |

## 3.4 Constraints

| 제약사항 ID | 구분 | 제약 조건 | 사유 | 관련 PR ID |
|---|---|---|---|---|
| CON-01 | 기술 스택 | React, ReactDOM, Preact, Vue, Svelte 등 외부 UI 프레임워크와 JSX 런타임을 사용하지 않는다. 엔진(`core`, `component`)뿐 아니라 Phase 1·2 검증 페이지와 `package.json`의 의존 패키지에도 두지 않으며, 화면은 Vanilla TypeScript와 브라우저 표준 DOM API로만 만든다. | 핵심 원리 직접 구현, 과제 원문(외부 프레임워크 금지) | PR-17 |
| CON-02 | 개발 환경 | HTML5, CSS3, Vanilla JavaScript(또는 TypeScript) 사용. 구현 언어는 TypeScript로 결정(ADR-0007). | 과제 기본 환경 | PR-17 |
| CON-03 | 구현 범위 | Phase 1 (VDOM, Diff, Patch, History) 및 Phase 2 (Component, State, Hooks) | 지정 구현 범위 | PR-01~16, 21 |
| CON-04 | 실행 환경 | 브라우저 표준 DOM API 기반 동작 환경 | DOM 직접 조작 | PR-01, PR-04 |
| CON-05 | 테스트 환경 | DOM 테스트 환경(jsdom 등)을 구성하여 단위 테스트 실행 | 브라우저 API 테스트 | PR-18, 19, 20 |
| CON-06 | 상태 제어 | 단일 루트 컴포넌트 중심의 State 관리 및 하위 Props 전달 | 상태 동기화 유지 | PR-10 |
| CON-07 | 영역 탐색 | 페이지 코드는 샘플 안의 `id`로 요소를 찾지 않고, 페이지가 만든 틀(`#real-area`, `#preview`)의 첫 자식 요소를 루트로 찾는다(ADR-0006 h1, i1). | 실제 영역과 미리보기에 같은 `id`가 두 개씩 생기고 루트가 교체될 수 있음 | PR-03, PR-05 |

---

# 4. Verification

## 4.1 Phase 1 검증 항목

| 검증 ID | 요구사항 ID | 검증 방법 | 테스트 조건 | 예상 결과 | 합격 기준 |
|---|---|---|---|---|---|
| VT-01 | FR-01 | Unit Test | DOM 요소를 Virtual DOM으로 변환 | VDOM 객체 생성 | type, tag, attrs, text, children 정보 정확히 변환. 기본 모드에서 `dom` 키 없음, `key`는 `attrs`에서 분리됨 (ADR-0002 T6, T11, T14, T15) |
| VT-02 | FR-01, FR-02 | Unit Test | Element, Text 노드 등 변환 | 노드별 정보 추출 | 공백 정리·`<pre>` 예외·`&nbsp;` 보존·주석 제외 규칙에 부합함 (ADR-0002 T1~T8, T12) |
| VT-03 | FR-03 | Unit Test | 이전·새 VDOM 객체 비교 | Diff 알고리즘 작동 | `{ changes, pairs }` 반환, 변경 대상이 이전 트리의 그 객체를 가리킴, `dom` 키 없는 입력으로도 통과 (ADR-0005 D1, D2, D12) |
| VT-04 | FR-04, FR-05 | Unit Test | 노드 추가/삭제/속성/텍스트/이동 탐지 | 변경 감지 정확도 | `add`, `remove`, `attrs`, `text`, `move` 기록이 정확히 생성됨 (ADR-0005 D3, D6, D7, D13, D15) |
| VT-05 | FR-06 | Unit Test | 태그 종류 또는 노드 종류 변경 탐지 | Replace 노드 분류 | `replace` 1개, 자식 기록 없음, 짝 목록에 없음 (ADR-0005 D4, D5) |
| VT-06 | FR-03, FR-07 | Integration Test | Diff 결과를 Patch Engine에 전달 | DOM 반영 | 실제 DOM의 변경 대상만 최소 업데이트되고 Patch 후 두 영역이 FR-01 비교 기준으로 같음 (ADR-0005 P1, P3, P9) |
| VT-07 | FR-07 | Integration Test | Patch 후 History 적재 확인 | State History 업데이트 | 변경이 있는 Patch마다 기록이 1개 늘고, 저장된 것은 Patch가 `dom`을 채운 그 트리 객체다(복사본 아님). 변경이 없는 Patch는 기록하지 않는다 (ADR-0008 k1·4절, H1·H2·H6) |
| VT-08 | FR-08 | Functional Test | Undo 실행 | 이전 상태 복원 | 실제 및 테스트 영역이 이전 이력과 FR-01 비교 기준으로 동일함 |
| VT-09 | FR-08 | Functional Test | Redo 실행 | 이후 상태 재적용 | 실제 및 테스트 영역이 다음 이력과 FR-01 비교 기준으로 동일함 |
| VT-32 | PR-03 | Functional Test | Phase 1 검증 페이지 렌더링 | UI 조작 요소 확인 | 실제 영역(`#real-area`), 테스트 영역(코드 입력칸 `#editor`·미리보기 `#preview`), Patch/뒤로가기/앞으로가기 버튼, 기록 표시, 상태 문구(`#status`)가 표시된다. 페이지는 React 없이 그려진다 (CON-01) |
| VT-33 | PR-04 | Functional Test | 최초 로드 | 초기 DOM 동기화 | 두 영역에 동일 샘플 UI 정상 표시 |
| VT-34 | PR-05 | Functional Test | 테스트 영역 HTML 직접 수정 | 격리 변경 검증 | Patch 전까지 실제 영역은 미변경 상태 유지 |
| VT-36 | FR-09 | Unit Test, Functional Test | key 목록 앞 추가·순서 변경·중복 key·key 변경·key 혼합 목록 | key 짝짓기 | ADR-0005 D6~D11 통과, 바나나 입력칸의 값이 사과 추가 후에도 바나나 옆에 남음 (P2) |
| VT-37 | FR-01 | Unit Test | 실제 영역과 미리보기를 각각 변환 | FR-01 비교 기준 | 다섯 키 기준으로 같음, `dom`·`key`는 비교하지 않음 (ADR-0002 T10) |
| VT-38 | FR-01, IR-09 | Unit Test | `dom_to_vdom(vdom_to_dom(v))` 왕복 | 정보 손실 없음 | 다섯 키 + `key` 기준으로 같음, 입력의 `dom` 불변, 미리보기 부착 `childList` 변경 1건 (ADR-0003) |
| VT-39 | FR-03, NFR-01 | Unit Test | 첫 로드 후 아무것도 고치지 않고 Patch, 코드 ↔ VDOM 왕복 | 변경 없음 | `changes` 0개, 왕복 결과 동일 (ADR-0006 TA1~TA6) |
| VT-40 | FR-02, IR-01 | Functional Test | 입력 직후 0.3초 전/후, 대기 중 Patch | 미리보기 갱신 시점 | 0.3초 전에는 그대로, 후에는 갱신, 대기 중 Patch 시 즉시 갱신 (ADR-0006 TA8, TA9) |
| VT-41 | FR-03, CON-07 | Functional Test, Code Review | 루트 `div` → `section` 교체 후 재 Patch | 틀 기반 탐색 | 두 번 모두 성공, 샘플 `id`로 찾는 코드 없음, 미리보기 노드가 어떤 `dom`에도 없음 (ADR-0006 TA10~TA12) |
| VT-42 | FR-02 | Functional Test | 잘못된 HTML(`<p>안녕<div>세상</div></p>`) 입력 후 Patch | 브라우저 보정 결과 사용 | 미리보기와 실제 영역이 FR-01 비교 기준으로 같음 (ADR-0006 TA7) |
| VT-47 | FR-07 | Integration Test | 고치지 않고(또는 들여쓰기만 바꾸고) Patch, [A, B, C]에서 B로 돌아와 고치지 않고 Patch | 변경 없는 Patch 미기록 | 기록 수 그대로, "변경 사항 없음" 표시, C가 남아 앞으로가기 가능 (ADR-0008 k1) |
| VT-48 | FR-08 | Integration Test | 코드 입력 직후, 0.3초 후(글자 수정 / 들여쓰기만 수정 / `key`만 수정) | 수정 중 이동 금지 | 입력 즉시 두 버튼 꺼짐, 0.3초 후 들여쓰기만이면 다시 켜지고 글자·`key` 수정이면 꺼진 채 안내 표시 (ADR-0008 m3·n2) |
| VT-49 | FR-08 | Integration Test | Patch 2회 후 뒤로가기 | 미리보기 갱신 | 미리보기와 코드 입력칸이 이동한 기록과 FR-01 비교 기준으로 같음 (ADR-0008 3절) |

## 4.2 Phase 2 검증 항목

| 검증 ID | 요구사항 ID | 검증 방법 | 테스트 조건 | 예상 결과 | 합격 기준 |
|---|---|---|---|---|---|
| VT-10 | FR-11, FR-12 | Unit Test | FunctionComponent mount/update 실행 | 컴포넌트 생명주기 | mount 및 update 렌더링 정상 실행 |
| VT-11 | FR-13, FR-15 | Unit Test | 부모에서 자식으로 Props 전달 | 자식 내 Props 사용 | 전달된 Props 데이터와 사용 결과 일치 |
| VT-12 | FR-16 | Unit Test | useState 초기 값 전달 | state, setter 반환 | initialValue 저장 및 setter 함수 반환 |
| VT-13 | FR-14, FR-17 | Integration Test | setter 호출을 통한 State 변경 | 재렌더링 트리거 | 컴포넌트 재실행 및 화면 갱신 완료 |
| VT-14 | FR-18, FR-19 | Unit Test | useEffect 의존성 평가 | Effect 실행 제어 | 의존성 배열 변경 시에만 Effect 구동 |
| VT-15 | FR-20 | Unit Test | useMemo 연산 재사용 | 캐싱 평가 | 의존성 동일 시 연산 생략 및 이전 값 반환 |
| VT-16 | FR-21 | Unit Test | Hook 최상위 레벨 외 호출 시도 | 호출 규칙 제어 | 규칙 위반 호출 시 예외 발생 또는 제약 |
| VT-17 | FR-22 | Integration Test | Phase 2 State 변경 갱신 연동 | Phase 1 엔진 구동 | Phase 1 VDOM Diff/Patch를 통해 UI 반영 |
| VT-18 | FR-23 | Functional Test | Phase 2 페이지 조작 | 입력 및 버튼 클릭 | 상태 변경 및 화면 UI 정상 업데이트 |
| VT-19 | TBD-05 | Functional Test | 한 핸들러 내 다중 State 변경 | Batching 검증 | (구현 결정 시) 렌더링 1회 및 UI 최종 반영 |

## 4.3 품질 및 엣지 케이스 검증

| 검증 ID | 요구사항 ID | 검증 방법 | 테스트 조건 | 예상 결과 | 합격 기준 |
|---|---|---|---|---|---|
| VT-20 | NFR-01 | Integration Test | 노드 1개 수정 Patch 실행 | 갱신 최소화 | 미변경 DOM 노드의 불필요한 조작 미발생 |
| VT-21 | NFR-02, NFR-03 | Boundary Test | 빈 값, 잘못된 노드 전달 | 예외 안전성 | 정의된 예외 처리 및 시스템 다운 방지 |
| VT-22 | FR-10, NFR-04 | Code Review, 자동 검사 | VDOM, Diff, Patch, Hooks 분리 | 단일 책임 원칙 | 각 모듈간 역할 및 인터페이스 독립, Diff가 `dom`·`events`를 읽지 않음, 실제 영역 DOM 쓰기는 `core/patch.ts`에만 있음, 상태 변경 코드에 명령형 DOM 조작 없음, FR-01 비교와 왕복 비교가 다른 함수임 |
| VT-23 | CON-01, CON-02 | 자동 검사, Code Review | 기술 스택 검토 | 외부 프레임워크 미사용 | `package.json`의 `dependencies`·`devDependencies`에 UI 프레임워크(React, ReactDOM, Preact, Vue, Svelte, 그 플러그인)가 없고, `src/`·`tests/`에 `.tsx`·`.jsx` 파일과 해당 패키지 import가 없다 (`check:stack`). `tsconfig.json`이 `strict: true`다 |
| VT-24 | CON-04 | Functional Test | 브라우저 DOM 렌더링 | DOM API 연동 | 실제 브라우저 환경에서 화면 정상 반영 |
| VT-25 | NFR-03 | Unit Test | 자식 노드 없는 요소 변환 | 빈 자식 배열 생성 | 에러 없이 VDOM 변환 완료 |
| VT-26 | NFR-03 | Unit Test | 속성 없는 요소 변환 | 빈 속성 객체 생성 | 에러 없이 VDOM 변환 완료 |
| VT-27 | NFR-03 | Unit Test | 기존 속성 삭제 탐지 | Diff 산출 | 속성 제거 명령이 Diff 결과 포함 |
| VT-28 | NFR-03 | Unit Test | 동일 VDOM 비교 | Diff 산출 | `changes`가 빈 배열이고 `pairs`에 모든 노드가 있다 (ADR-0005 D1) |
| VT-29 | NFR-03 | Unit Test | 동일 값 입력을 통한 Patch | DOM 조작 미발생 | 실제 DOM 조작 횟수 0회 |
| VT-30 | NFR-03 | Functional Test | Empty History 상태 Undo/Redo | 이동 불가 처리 | 무동작 및 이전/이후 이력 유지 |
| VT-31 | NFR-03 | Unit Test | 지금 트리의 객체 하나에서 `dom`을 지운 뒤 Patch, 이어서 한 번 더 Patch | 실패 복구 | 오류가 호출자에게 나가지 않고 실제 영역이 새 트리와 FR-01 비교 기준으로 같으며 새 트리의 모든 객체에 `dom`이 있다. `console.error` 1회, `recovered: true`. 다음 Patch는 복구 없이 성공한다 (ADR-0005 6절 t3, R1·R2) |
| VT-35 | CON-05 | Test Env Check | JSDOM 기반 테스트 환경 수행 | DOM API 테스트 | 자동화 단위 테스트 스위트 정상 통과 |
| VT-43 | NFR-03 | Unit Test | 실제 영역에 주석이 있을 때 둘째 항목 글자 변경, `[A,B,C,D]` → `[A]` | `dom` 참조로 대상 탐색 | 둘째 항목만 바뀜, B·C·D 삭제 후 A는 같은 요소 객체 (ADR-0005 P4, P5) |
| VT-44 | NFR-03 | Unit Test | `[A(p), B]` → `[B, A(h1)]` | 적용 순서 | `insertBefore` 오류 없이 `[B, A(h1)]` (ADR-0005 P6) |
| VT-45 | FR-07, FR-08, NFR-03 | Unit Test | 아무 Patch 후, Patch 연속 3회 | `dom` 이어받기 | 새 트리의 모든 객체에 `dom`이 있고 매번 성공 (ADR-0005 P7, P8) |
| VT-50 | TBD-14 | Unit Test | 무작위 두 트리를 시간 분할로 Diff, 도중 취소 | 결과 동일성 | 동기 Diff와 변경 목록·짝 목록이 같고, 양보·재개·취소가 동작함 (ADR-0020 SL1~SL4) |
| VT-51 | TBD-12, TBD-14 | Integration Test | 성능 실험실에서 동기·협력적·통째 교체 비교 | 결과 화면과 DOM 노드 수 | 세 방식의 화면이 같고, 1개 변경 시 Patch는 수정 1·통째 교체는 전부 새로 생성, 실행 중 새 업데이트는 최신 상태로 끝남 (ADR-0020 LB1~LB4). 가상 스크롤은 데이터 1만 개에서 DOM이 보이는 줄만 유지(LB5), Signals 데모는 가격 하나 변경 시 비교 0·DOM 수정 1(LB6) |
| VT-46 | NFR-03 | Unit Test | 빈 요소에 추가 후 다시 비우기, 1,000겹 중첩의 가장 깊은 글자 변경, 추가·삭제·글자 수정 동시 발생 | 견고성 | ADR-0005 D13~D15, P10~P12 통과 (깊이 기준은 TBD-09) |

---

# 5. Appendixes

## 5.1 Requirements Traceability Matrix

### 5.1.1 프로젝트 요구사항 (PR) vs SRS & VT

| 프로젝트 요구사항 ID | SRS 요구사항 ID | 검증 ID (VT) | 비고 |
|---|---|---|---|
| PR-01 | FR-01, FR-02, IR-04 | VT-01, VT-02, VT-37, VT-38 | DOM 변환 모듈 |
| PR-02 | FR-03, FR-04, FR-05, FR-09 | VT-03~VT-05, VT-36 | Diff 알고리즘 (key 짝짓기 포함) |
| PR-03 | IR-01, IR-02, IR-03, CON-07 | VT-32, VT-40, VT-41 | Phase 1 검증 페이지 |
| PR-04 | FR-01, FR-02, IR-09 | VT-01, VT-02, VT-33, VT-37, VT-38 | 초기 렌더링 동기화 |
| PR-05 | IR-01, IR-10, CON-07 | VT-34, VT-39, VT-40, VT-42 | 테스트 영역 편집 (코드 입력칸 + 미리보기) |
| PR-06 | FR-06, FR-07, FR-08, FR-09, IR-06, IR-09 | VT-06, VT-07, VT-36, VT-45, VT-47 | Patch Engine & History 저장 |
| PR-07 | FR-08, IR-03 | VT-08, VT-09, VT-48, VT-49 | History 이동 (Undo/Redo) |
| PR-08 | FR-11, FR-12 | VT-10 | Function Component |
| PR-09 | FR-21 | VT-16 | Hook 호출 규칙 제어 |
| PR-10 | FR-13, FR-15 | VT-11 | Props & State 관리 |
| PR-11 | FR-14, FR-17 | VT-13 | State 변경 렌더링 구동 |
| PR-12 | FR-16, FR-17, IR-08 | VT-12, VT-13 | useState Hook |
| PR-13 | FR-18, FR-19 | VT-14 | useEffect Hook |
| PR-14 | FR-20 | VT-15 | useMemo Hook |
| PR-15 | FR-22 | VT-17 | Phase 1 코어 엔진 재사용 |
| PR-16 | FR-23, IR-07 | VT-18 | Phase 2 검증 페이지 |
| PR-17 | CON-01, CON-02 | VT-23 | 순수 기술 스택 준수 |
| PR-18 | NFR-02, NFR-04, CON-05 | VT-01~05, VT-10~16, VT-21~22, VT-35~38 | 모듈 설계 및 단위 테스트 |
| PR-19 | NFR-02 | VT-06~09, VT-13, VT-17~19, VT-24, VT-32~34, VT-39~42, VT-47~49 | 통합 및 기능 테스트 |
| PR-20 | NFR-03 | VT-25~VT-31, VT-43~VT-46 | 엣지 케이스 처리 |
| PR-21 | TBD-05 | VT-19 | Batching 검증 선택 구현 |

### 5.1.2 원본 과제 요구사항 (R) vs SRS & VT

| 원본 요구사항 ID | SRS 요구사항 ID | 검증 ID (VT) | 비고 |
|---|---|---|---|
| R17 | CON-01, CON-02 | VT-23 | Vanilla JS/TS 기반 외부 프레임워크 사용 금지 |
| R18 | NFR-02, NFR-04 | VT-01~05, VT-10~16, VT-21, VT-22, VT-36~38 | 모듈별 단위 테스트 |
| R19 | NFR-02 | VT-06~09, VT-13, VT-17~19, VT-24, VT-32~34, VT-39~42, VT-47~49 | 통합 및 기능 테스트 |
| R20 | NFR-03 | VT-25~VT-31, VT-43~VT-46 | 엣지 케이스 대응 |
| R01 ~ R16 | FR-01 ~ FR-23 | VT-01 ~ VT-18, VT-36 ~ VT-42, VT-47 ~ VT-49 | Phase 1 & 2 상세 기능 세부 할당 |

### 5.1.3 ADR vs SRS & VT

| ADR (통합 번호) | 원래 위치 | 제목 | 상태 | 반영 SRS 항목 | 검증 ID (VT) |
|---|---|---|---|---|---|
| ADR-0001 | `somage/works` ADR 0001 | Virtual DOM 노드 모양 (`type`, `key`, `dom`, `events`) | accepted | 1.3, FR-01, FR-22, IR-04, IR-05 | VT-01, VT-37 |
| ADR-0002 | `somage/works` ADR 0002 | DOM → Virtual DOM 변환, 공백 정리, 4절 실행 내용 건너뛰기(s2) | accepted | FR-01, FR-02, IR-04, NFR-03 | VT-01, VT-02, VT-21, VT-25, VT-26, VT-37 |
| ADR-0003 | `somage/works` ADR 0003 | Virtual DOM → 실제 DOM 그리기 | accepted | FR-01, IR-09, NFR-01 | VT-38 |
| ADR-0004 | `somage/works` ADR 0004 | Diff·Patch 분리, `dom` 참조, key 짝짓기, `value`·`checked` 프로퍼티 | accepted | 0장, FR-04~FR-06, FR-08, FR-09, IR-05, NFR-01, NFR-03, TBD-03, TBD-04 | VT-03~VT-05, VT-36 |
| ADR-0005 | `somage/works` ADR 0005 | Patch 적용 순서, `{ changes, pairs }`, 6절 실패 복구(t3) | accepted | IR-05, IR-06, NFR-01, NFR-03, TBD-07 | VT-03~VT-06, VT-31, VT-43~VT-46 |
| ADR-0006 | `somage/works` ADR 0006 | 테스트 영역 = 코드 입력칸 + 미리보기, 8절 시연 기능 | accepted | FR-01~FR-03, FR-08, IR-01, IR-10, CON-07, TBD-02 | VT-39~VT-42 |
| ADR-0007 | `eungi` adr_001 + `somage/works` ADR_0001 (중복 병합) | 프로그래밍 언어 (TypeScript) | accepted | CON-01, CON-02 | VT-23 |
| ADR-0008 | `eungi` adr_002 + 피드백 01(블로그 97) | History 정책: 선형, 변경 없으면 기록 안 함, 수정 중 이동 금지 | accepted | FR-07, FR-08, TBD-01 | VT-07~VT-09, VT-30, VT-47~VT-49 |
| ADR-0009 | `eungi` adr_006 + 피드백 05 | State 변경 Batching (microtask) | accepted | TBD-05 | VT-19 |
| ADR-0010 | `eungi` adr_007 + 피드백 04·05 | Hook 상태 저장 방식과 호출 규칙 강제 | accepted | FR-15~FR-21 | VT-12~VT-16 |
| ADR-0011 | `eungi` adr_008 | 테스트 하네스 (Vitest + jsdom) | accepted | CON-05 | VT-35 |
| ADR-0012 | `eungi` adr_009 | 설계 준수 검증 하네스 자동화 | accepted | NFR-02, NFR-04, CON-01 | VT-22, VT-23 |
| ADR-0015 | 피드백 03·06(블로그 99·102) | 컴포넌트 렌더링 (`h` 즉시 펼침, `mount`·`update`, `events`) | accepted | FR-11~FR-14, FR-22 | VT-10, VT-11, VT-13, VT-17 |
| ADR-0016 | 설계 검토 반례 1·2·3 (2026-11-10) | 건너뛴 노드 양옆 글자 노드 합치기, ADR-0002 보완 | accepted | FR-01, FR-03, IR-04, IR-10 | VT-33, VT-37, VT-39, VT-47 |
| ADR-0017 | 설계 검토 반례 5 | 뒤로·앞으로가기 중 t3 복구 시 History 유지, ADR-0005 6절 보완 | accepted | FR-08, IR-06 | VT-31, VT-45 |
| ADR-0018 | 설계 검토 반례 4 | `<pre>` 첫 줄바꿈 왕복, ADR-0006 a3 보완 | accepted | IR-10 | VT-39 |
| ADR-0019 | 설계 검토 반례 6, SDD 11장 | Phase 1 페이지 경계 동작 4가지 | accepted | FR-02, FR-08, IR-01, IR-03 | VT-30, VT-48 |
| ADR-0020 | 팀 제안 (2026-11-11) | 협력적 스케줄링: Diff 시간 분할 + 성능 실험실 | accepted | TBD-12, TBD-14 | VT-50, VT-51 |
| ADR-0013 | `eungi` adr_005에서 복구 | Patch 적용 전 검증 (t2) | superseded by ADR-0005 6절 t3 (v1.4) | — | — |
| ADR-0014 | `eungi` adr_003에서 복구 | 입력 정제 | superseded by ADR-0002 4절 s2 (v1.4) | — | — |
| (superseded) | `eungi` adr_003 | 테스트 영역 수정 방식 | superseded by ADR-0006 (삭제) | 입력 정제는 ADR-0002 4절 | — |
| (superseded) | `eungi` adr_004 | Diff 비교 전략 (위치 + 5종) | superseded by ADR-0004 (삭제) | — | — |
| (superseded) | `eungi` adr_005 | Patch 경로 해석 후 일괄 적용 | superseded by ADR-0005 (삭제) | 실패 처리는 ADR-0005 6절 | — |

### 5.1.4 요구사항 정리(`리액트 issue.md`) ID vs SRS ID

| issue.md ID | SRS ID | 비고 |
|---|---|---|
| FR-01 ~ FR-08 | FR-01 ~ FR-08 | 1.2에서 문구 일치. 1.3의 FR-07 k1 예외·FR-08 m3는 issue.md에도 추가 필요 |
| FR-10 (선언적 화면) | FR-10 | 일치 |
| FR-11 (표시 장소 자동 갱신) | FR-14 | 번호 다름 |
| FR-12 (표시 장소 추가 시 상태 코드 무수정) | — | ⚠️ SRS 미반영 (TBD-10) |
| FR-13 (조각 재사용 3회 이상) | FR-12, FR-13 | 번호 다름 |
| FR-14 (같은 데이터 같은 값) | FR-15 | 번호 다름 |
| FR-15 (재계산 후 상태 유지) | FR-16, FR-17 | 번호 다름 |
| FR-16 (여러 상태가 섞이지 않음) | FR-21 | 번호 다름 |
| FR-17 (화면 밖 작업) | FR-18, FR-19 | 번호 다름 |
| FR-18 (오래 걸리는 계산) | FR-20 | 번호 다름 |
| NFR-01 ~ NFR-03 | NFR-01 ~ NFR-03 | 1.2에서 문구 일치 |
| NFR-04 (완성도·포트폴리오) | TBD-06 | ⚠️ SRS NFR-04는 유지보수성으로 의미가 다름 (TBD-10) |
| C-01 | CON-01, CON-02 | |
| C-02 | FR-01, IR-04 | |
| C-03 | FR-03~FR-06, IR-05, IR-06 | |
| C-04 | IR-01~IR-03, PF-09 | |
| C-05 | FR-11 | |
| C-06 | FR-15, FR-21, CON-06 | |
| C-07 | FR-16~FR-20 | |
| C-08 | FR-22 | |

---

# 6. 미결 사항 (TBD)

| ID | 질문 및 이슈 내용 | 결정이 필요한 이유 | 결정 상태 / 방향 |
|---|---|---|---|
| TBD-01 | History 분기 처리: A→B→C 쌓인 상태에서 Undo 2회로 A 이동 후 새 Patch D 발생 시, 기존 B, C 처리 | 이력 구조 (Linear Stack vs Tree) 결정 필요 | **선형 이력, 분기 시 B·C 삭제**(j1)로 확정. 같은 ADR에서 변경 없는 Patch 미기록(k1), 수정 중 이동 금지(m3·n2)도 결정. 근거 ADR-0008(proposed, 팀 설계 검토 반영) → accepted 전환 필요. 잘린 기록 보관(`archive[]`)은 확장 후보(SDD 부록 C) |
| TBD-02 | 테스트 영역 수정 방식: HTML 코드 에디터 입력 vs 브라우저 화면 직접 편집 | DOM Converter 호출 방식 차이 발생 | **방법 3: 코드 입력칸(원본) + Virtual DOM을 거쳐 그린 미리보기**로 확정 (ADR-0006) |
| TBD-03 | Diff 탐지 변경 유형 정의 | Patch 결과 구조 및 노드 변형 범위 결정 | **6가지 유형**(추가, 삭제, 교체, 글자 수정, 속성 수정, 이동) 확정 (ADR-0004). 구 eungi adr_004(5종)와의 충돌은 CF-01 |
| TBD-04 | 목록 재정렬 대응을 위한 `key` 속성 지원 여부 | 동일 위치 노드 짝짓기 시 입력 상태 남는 문제 방지 | **`key` 속성 지원** 및 key 기반 reconciliation 적용 확정 (ADR-0004, FR-09). 알려진 한계: 이동 횟수 최소화 안 함, key 없는 노드(글자·공백)의 밀림, key 변경 시 삭제 + 추가 |
| TBD-05 | 단일 이벤트 핸들러 내 다중 State 변경 시 Batching 적용 여부 | 불필요한 연쇄 재렌더링 방지 (선택 구현) | microtask Batching 제안됨 (ADR-0009, proposed). 구현 여부 최종 결정 대기 |
| TBD-06 | 포트폴리오 완성도 평가 기준 | 객관적 완료 조건 산정 필요 | 단위 테스트 커버리지 90% 이상 및 VT-01~49 통과로 확정 |
| TBD-07 | Patch 대상(`dom`)이 없을 때의 실패 처리 (CF-03) | 실패하면 실제 영역이 반쯤 바뀐 채 남아 다음 Patch도 어긋난다. VT-31 합격 기준이 이에 달림 | **t3로 확정**: 적용 중 오류가 나면 컨테이너 루트를 새 트리로 다시 그리고 `dom`을 새로 기록한다(ADR-0005 6절, 피드백 02). 적용 전 검사(t2, 구 ADR-0013)는 다음 Patch도 계속 실패하고 적용 순서 버그를 잡지 못해 기각. ADR-0005 6절 재확인 필요 |
| TBD-08 | 입력 HTML의 `<script>`와 `on*` 속성 처리 (CF-04) | `vdom_to_dom`이 `setAttribute("onclick", …)`를 하면 핸들러가 실제로 동작함 | **s2로 확정**: `dom_to_vdom`에서 `<script>`, `on*` 속성, `javascript:`로 시작하는 `href`·`src`를 건너뛴다(ADR-0002 4절, 구 ADR-0014 대체). 4절 재확인 필요 |
| TBD-09 | 재귀 깊이 기준 | ADR-0002 T9, ADR-0003, ADR-0005 D14·P11이 같은 기준을 공유함 | 결정 (2026-11-11): 1,000겹. jsdom에서 1,500겹부터 호출 스택 초과(재귀 구현) |
| TBD-10 | issue.md와 SRS의 ID 체계 정렬 | Phase 2 FR 번호, NFR-04 의미, C-xx ↔ CON-xx가 서로 달라 ADR이 인용하는 ID가 문서마다 다른 요구를 가리킴. issue.md FR-12는 SRS에 대응 항목이 없음 | 미결. 5.1.4 대응표를 기준으로 두 문서 중 하나로 통일 필요 |
| TBD-11 | (제안 요구사항) 산출물 `README.md` | 과제 원문의 제출물이자 4분 발표 자료. 중점 포인트(DOM·Window, 변화 감지 API, Reflow·Repaint, Virtual DOM 구조·필요성, Diff 핵심 케이스, 실제 React와의 차이, Batching)에 답해야 함 | **채택 (2026-11-10)**. Phase 2 완료 후 작성. 코드 검토 체크리스트로 확인 |
| TBD-12 | (채택) 통째 교체(`innerHTML`) vs Patch 비교 화면 | 같은 변경을 두 방식으로 적용해 `MutationObserver` 기록 수와 입력값 유지 여부를 나란히 보여 줌. 과제 원문 "실제 DOM의 변화를 감지하는 브라우저 API"와 "다른 팀과의 차별점"에 대응 | 구현 (ADR-0020 proposed, 성능 실험실 `pages/lab`), VT-51 |
| TBD-14 | (채택) 협력적 스케줄링 | 큰 목록을 다시 그리는 동안에도 입력이 막히지 않도록 Diff를 시간 단위로 나눠 실행하고(Commit은 동기), 동기 방식과 Long Task·입력 반응성을 비교해 보여 줌. 결과는 동기 Diff와 같아야 함 | 구현 (ADR-0020 proposed, 팀 승인 대기), VT-50, VT-51 |
| TBD-13 | (채택) key 있음·없음 비교 시연 | 같은 목록 변경을 key 유무로 Patch해 입력값이 따라가는지 보여 줌 (FR-09 시연) | 채택 (2026-11-10, 팀 차별화 1·4·5번 결정). `pages/phase1/key-demo.ts`, 통합 테스트 `[VT-36] key 데모` |

## 6.2 ADR 간 충돌 사항 (CF)

> 상세 내용과 표기 규칙은 `docs/adr/README.md`를 따른다.

| ID | 충돌 내용 | 구 eungi ADR | somage ADR | 심각도 | 처리 상태 | 관련 SRS |
|---|---|---|---|---|---|---|
| CF-01 | 자식 짝짓기와 변경 종류 | adr_004: 위치 비교 + 5종, key는 확장 과제 (proposed) | ADR-0004: key 짝짓기 + 6종 (accepted) | 높음 | 해소: ADR-0004 채택 (SRS 1.1 TBD-03·04와도 일치) | FR-09, TBD-03, TBD-04 |
| CF-02 | Patch 대상 지정 방식 | adr_005: `path: number[]` 경로를 해석한 뒤 일괄 적용. "노드 참조 저장"은 Diff가 DOM에 의존한다는 이유로 기각 | ADR-0004·0005: 변경 기록이 이전 Virtual DOM 객체를 가리키고 Patch가 `dom`으로 실제 노드를 찾음. Diff는 `dom`을 읽지 않아 기각 사유를 해소 | 높음 | 해소: ADR-0004·0005 채택 | IR-05, IR-06 |
| CF-03 | Patch 실패 처리 | adr_005: 대상이 하나라도 없으면 DOM 변경 0건 후 `PatchError` (t2, 구 ADR-0013) | ADR-0005 6절: 실패 시 컨테이너 재구축 (t3) | 중간 | 해소: t3 채택 (피드백 02 5-1절). 구 ADR-0013 superseded | IR-06, VT-31 |
| CF-04 | 입력 정제 (보안) | adr_003: `on*` 속성과 `<script>` 제거 (구 ADR-0014) | ADR-0002 4절 s2: `<script>`·`on*`·`javascript:` `href`·`src` 건너뛰기 | 중간 | 해소: s2 채택 (피드백 02 5-1절). 구 ADR-0014 superseded | IR-04, FR-02 |
| CF-05 | 파서와 미리보기 갱신 시점 | adr_003: `DOMParser`, 실시간 미리보기 | ADR-0006: `<template>`, 0.3초 debounce | 낮음 | 해소: ADR-0006 채택 (둘 다 스크립트 미실행, 실시간을 debounce로 구체화) | IR-01, IR-10 |
| CF-06 | ADR 번호 중복 | ADR-001~009 | ADR 0001~0006 + 언어 ADR_0001 | 낮음 | 해소: 통합 번호 부여 (5.1.3) | 전체 |
| CF-07 | 함수 이름·표기 | `htmlToVNode`, `vnodeToHTML`, `applyPatches` (camelCase, TS) | `dom_to_vdom`, `vdom_to_dom` (snake_case, Python dict 표기) | 낮음 | 해소: 코드는 camelCase, ADR 이름 병기 (SDD 1.6 이름 대응표) | IR-04, IR-09, IR-10 |
| CF-08 | 용어·ID 체계 | SRS: Undo/Redo, CON-xx | issue.md: 뒤로가기/앞으로가기, C-xx, 다른 Phase 2 번호 | 낮음 | 일부 해소 (5.1.4 대응표), 나머지 TBD-10 | 5.1.4 |
| CF-09 | 루트 교체 | v0.3 SDD: 루트 REPLACE는 `PatchError` | ADR-0006 h1: 루트도 교체 가능, 틀로 찾기 | 중간 | 해소: ADR-0006 채택 (FR-02 태그 자유 수정) | CON-07, VT-41 |
| CF-10 | `value`·`checked` 반영 | v0.3 SDD: 프로퍼티로 쓰고 같으면 생략 | ADR-0005: `setAttribute`만 | 낮음 | 해소: 속성과 프로퍼티를 함께 쓰되 프로퍼티는 다를 때만 (SDD 3.4) | FR-04 |

---

# 7. 최종 검토 항목

- [x] 기능 요구사항(FR)과 비기능 요구사항(NFR)이 명확히 구분되었는가?
- [x] Phase 1과 Phase 2의 기능 요구사항이 명확히 구분되었는가?
- [x] 프로젝트 요구사항(PR), 원본 요구사항(R), SRS 요구사항(FR/NFR/CON) 간 추적성이 설정되었는가?
- [x] 모듈 간 인터페이스(IR)의 입력과 출력이 명시되었는가?
- [x] 제약사항(CON)이 과제 제반 조건과 완전하게 일치하는가?
- [x] 모든 FR 및 NFR에 상응하는 검증 항목(VT) 및 합격 기준이 1:1 이상으로 매핑되었는가?
- [x] 엣지 케이스 시나리오(VT-25~31, VT-43~46)가 독립 검증 항목으로 명세화되었는가?
- [x] TBD 항목들에 대한 영향도 및 확정 방향이 반영되었는가?
- [x] (1.2) ADR-0001~0006의 요구사항 변경안이 FR/NFR/TBD에 반영되었는가?
- [x] (1.2) ADR과 SRS 항목 간 추적표(5.1.3)가 작성되었는가?
- [x] (1.2) 미결 충돌 CF-03, CF-04에 결정안이 있는가? (1.3: ADR-0013, ADR-0014 제안)
- [x] (1.3) SDD v0.5(`SDD.md`, `SDD_fixed_phase2.md`)와 ID·결정·용어 정합성을 검토했는가?
- [x] (1.4) CF-03·CF-04 결정(t3, s2)이 IR-04·IR-06·VT-31·TBD-07·TBD-08에 반영되었는가?
- [x] (1.4) CON-01이 검증 페이지와 의존 패키지까지 포함하고 자동 검사(VT-23)로 확인되는가?
- [x] (1.4) 기준 SDD(`docs/specs/SDD_final_phase1.md`, `SDD_final_phase2.md`)와 ID 정합성을 하네스(`check:docs`)로 검사했는가?
- [x] proposed 상태인 ADR-0008~0012·0015가 accepted로 전환되고, ADR-0001·0002·0004·0005·0006의 "재확인 필요" 절이 재확인되었는가?
- [ ] (1.2) issue.md와 SRS의 ID 체계가 통일되었는가? (TBD-10)
