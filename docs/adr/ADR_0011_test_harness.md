---
# Optional metadata
status: proposed
date: 2026-11-09
decision-makers: [팀원 이름]
consulted: []
informed: [팀원 전체]
---

# ADR-0011: 테스트 하네스 선정 (Vitest + jsdom)

## Context and Problem Statement

SRS CON-05는 DOM API를 쓰는 모듈의 테스트를 DOM 테스트 환경에서 수행하도록 정한다. Unit, Integration, Boundary 테스트를 자동으로 실행할 테스트 러너와 DOM 환경을 선택해야 한다 (GitHub Issue #12).

## Decision Drivers

* TypeScript를 별도 설정 없이 실행할 수 있는가 (ADR-0007)
* `<template>`, MutationObserver 등 DOM API 지원 (CON-05)
* 개발 서버·빌드 도구와 설정 공유
* 실행 속도와 watch 모드
* 팀원의 학습 비용

## Considered Options

* Vitest + jsdom
* Jest + ts-jest + jsdom
* 실제 브라우저 테스트만 사용 (Playwright / Vitest Browser Mode)

## Decision Outcome

Chosen option: "Vitest + jsdom", because Vite 설정을 그대로 공유해 TypeScript를 바로 실행하고, jsdom이 이 프로젝트에 필요한 DOM API(`<template>`, MutationObserver)를 제공하며, Jest와 거의 같은 API라 학습 비용이 낮기 때문이다. 레이아웃이 필요한 검증(스크롤 위치)만 Playwright로 보완한다.

### Consequences

* Good, because `npm test` 하나로 모든 자동 테스트가 실행된다.
* Good, because `expectTypeOf`로 함수 인터페이스 타입 테스트도 같은 러너에서 실행된다.
* Bad, because jsdom은 레이아웃을 계산하지 않아 스크롤·커서 위치 유지(FR-04 일부)는 검증할 수 없다.
* Bad, because 실제 브라우저와 미세하게 다른 동작이 있을 수 있다.

### Confirmation

* VT-35: `npm test`가 jsdom 환경에서 실행되고 CI 로그에 결과가 남는다.
* `vitest.config.ts`에 `environment: 'jsdom'`이 설정되어 있다.
* README의 "테스트 실행 방법" 절에 명령어가 문서화되어 있다 (Issue #12 산출물).

## Pros and Cons of the Options

### Vitest + jsdom

* Good, because 설정이 가장 적고 빠르다.
* Good, because Jest 호환 API다.
* Bad, because 레이아웃 관련 테스트는 불가능하다.

### Jest + ts-jest + jsdom

* Good, because 자료와 사용 사례가 가장 많다.
* Neutral, because 기능 면에서 Vitest와 큰 차이가 없다.
* Bad, because TypeScript·ESM 설정이 Vite와 별도로 필요하다.

### 실제 브라우저만

* Good, because 실제 환경과 완전히 같다.
* Bad, because 실행이 느리고 CI 설정(브라우저 설치)이 무겁다.
* Bad, because 순수 함수(diff, history) 테스트에는 과하다.

## More Information

* SRS CON-05, NFR-02, VT-35, PR-18
* SDD 6장 검증 설계, 8장 설계 검증 하네스
* [Vitest 공식 문서](https://vitest.dev/)
* [jsdom](https://github.com/jsdom/jsdom)
