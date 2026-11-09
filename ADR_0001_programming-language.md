# ADR-0001: 프로그래밍 언어 선택

## Status

Accepted

## Context and Problem Statement

미니 React 프로젝트는 Virtual DOM, Diff, Patch, Function Component, Hooks 등을 직접 구현해야 한다.

여러 모듈을 나누어 개발하므로 브라우저 DOM API뿐 아니라 모듈 간 데이터 구조와 함수 인터페이스를 명확하게 정의하고 공유할 필요가 있다.

프로젝트의 구현 환경과 협업 방식을 고려하여 JavaScript와 TypeScript 중 프로그래밍 언어를 선택한다.

## Decision Drivers

- 브라우저 DOM API 사용 가능 여부
- Virtual DOM 등 객체 구조 표현
- 함수의 입력과 반환 타입 정의
- 모듈 간 데이터 구조 및 인터페이스 공유
- 초기 개발 환경 설정과 구현 난이도

## Considered Options

- JavaScript
- TypeScript

## Decision Outcome

**TypeScript를 프로젝트의 프로그래밍 언어로 선택한다.**

TypeScript의 Interface와 Type을 사용하여 Virtual DOM 노드, Diff 결과, Patch 명령 등의 데이터 구조를 정의한다.

함수의 매개변수와 반환 타입을 지정하여 모듈 간 인터페이스를 통일하고, 개발 단계에서 타입 오류를 확인한다.

JavaScript는 별도 컴파일 과정 없이 브라우저에서 실행할 수 있고 초기 환경 설정이 간단하다는 장점이 있다. 반면 데이터 구조와 함수 인터페이스를 코드 수준에서 명시적으로 관리하려면 별도의 규칙이 필요하다.

프로젝트에서는 여러 모듈이 공통 데이터 구조와 함수 인터페이스를 사용하므로 TypeScript를 선택한다.

## Consequences

### Positive

- 공통 데이터 구조를 타입으로 정의할 수 있다.
- 함수의 입력과 반환 형태를 명확하게 알 수 있다.
- 잘못된 자료형이나 속성 사용을 개발 단계에서 확인할 수 있다.
- 팀원 간 코드 인터페이스를 공유하기 쉽다.

### Negative

- 초기 타입 정의 작업이 필요하다.
- JavaScript로 컴파일하는 환경을 설정해야 한다.
- 타입을 정의하고 관리하는 데 추가 시간이 필요하다.

## Pros and Cons of the Options

### JavaScript

- Good: 별도 컴파일 과정 없이 브라우저에서 바로 실행할 수 있다.
- Good: 초기 개발 환경 설정이 간단하다.
- Good: 브라우저 DOM API를 직접 사용할 수 있다.
- Bad: 데이터 구조와 함수 인터페이스를 별도로 관리해야 한다.
- Bad: 타입 관련 오류를 개발 단계에서 확인하기 어렵다.

### TypeScript

- Good: Interface와 Type으로 객체의 데이터 구조를 정의할 수 있다.
- Good: 함수의 매개변수와 반환 타입을 지정할 수 있다.
- Good: IDE 자동완성과 타입 검사를 활용할 수 있다.
- Good: 모듈 간 데이터 구조와 인터페이스를 통일하기 쉽다.
- Bad: JavaScript 컴파일 환경이 필요하다.
- Bad: 초기 타입 정의 작업이 추가된다.

## More Information

- [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
- [TypeScript DOM 조작 문서](https://www.typescriptlang.org/docs/handbook/dom-manipulation.html)
- [미니 React 프로젝트 요구사항](https://jungle-lms.krafton.com/learning/1258)
