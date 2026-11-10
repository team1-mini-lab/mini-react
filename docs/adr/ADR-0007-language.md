# ADR-0007: 프로그래밍 언어 선택

| 항목 | 값 |
|---|---|
| status | accepted |
| date | YYYY-MM-DD  # 실제 결정일로 수정 |
| decision-makers | [팀원 이름] |
| consulted | [팀원 이름] |
| informed | [팀원 전체] |

## Context and Problem Statement

미니 React 프로젝트는 Virtual DOM, Diff, Patch, Component, Hooks 등을 직접 구현해야 한다.

여러 모듈을 나누어 개발하므로 브라우저 DOM 접근뿐 아니라 모듈 간 데이터 구조와 함수 인터페이스를 관리하기 쉬운 언어를 선택할 필요가 있다. (SRS CON-02: HTML, CSS, Vanilla JavaScript 또는 TypeScript)

## Decision Drivers

* 브라우저 DOM API 사용 가능 여부
* Virtual DOM 등 객체 구조 표현
* 함수의 입력과 반환 타입 정의
* 모듈 간 데이터 구조 및 인터페이스 공유
* 초기 개발 환경 설정과 구현 난이도

## Considered Options

* JavaScript
* TypeScript

## Decision Outcome

Chosen option: "TypeScript", because Interface와 Type으로 Virtual DOM 노드, Diff 결과, Patch 명령 등의 데이터 구조와 함수 인터페이스를 코드로 명시할 수 있어 모듈 간 협업과 오류 확인에 유리하기 때문이다.

### Consequences

* Good, because 공통 데이터 구조를 타입으로 정의할 수 있다.
* Good, because 함수의 입력과 반환 형태를 명확하게 알 수 있다.
* Good, because 잘못된 자료형이나 속성 사용을 개발 단계에서 확인할 수 있다.
* Good, because 팀원 간 코드 인터페이스를 공유하기 쉽다.
* Bad, because 초기 타입 정의 작업이 필요하다.
* Bad, because JavaScript로 컴파일하는 환경을 설정해야 한다.
* Bad, because 타입을 정의하고 관리하는 데 추가 시간이 필요하다.

### Confirmation

* `tsconfig.json`에 `"strict": true`가 설정되어 있다.
* CI에서 `tsc --noEmit`이 오류 없이 통과한다.
* `src/` 아래에 `.js` 소스 파일이 없다 (하네스 `check:stack`에서 확인).

## Pros and Cons of the Options

### JavaScript

* Good, because 별도 컴파일 과정 없이 브라우저에서 바로 실행할 수 있다.
* Good, because 초기 개발 환경 설정이 간단하다.
* Good, because 브라우저 DOM API를 직접 사용할 수 있다.
* Neutral, because 과제에서 허용한 언어이고 TypeScript도 결국 JavaScript로 바뀌어 실행된다.
* Bad, because 데이터 구조와 함수 인터페이스를 별도로 관리해야 한다.
* Bad, because 타입 관련 오류를 개발 단계에서 확인하기 어렵다.

### TypeScript

* Good, because Interface와 Type으로 객체의 데이터 구조를 정의할 수 있다.
* Good, because 함수의 매개변수와 반환 타입을 지정할 수 있다.
* Good, because IDE 자동완성과 타입 검사를 활용할 수 있다.
* Good, because 모듈 간 데이터 구조와 인터페이스를 통일하기 쉽다.
* Neutral, because 브라우저 DOM API 타입(`lib.dom.d.ts`)이 기본 제공된다.
* Bad, because JavaScript 컴파일 환경이 필요하다.
* Bad, because 초기 타입 정의 작업이 추가된다.

## More Information

* [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
* [TypeScript DOM 조작 문서](https://www.typescriptlang.org/docs/handbook/dom-manipulation.html)
* [미니 React 프로젝트 요구사항](https://jungle-lms.krafton.com/learning/1258)
* 관련: SRS CON-01, CON-02 / VT-23
* 출처: `~/dev/mini-react` eungi 브랜치 `docs/adr/adr_0007_language.md`에서 복사 (2026-11-10, 이 폴더에 빠져 있었음)
