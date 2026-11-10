---
# Optional metadata
status: proposed
date: 2026-11-09
decision-makers: [팀원 이름]
consulted: []
informed: [팀원 전체]
---

# ADR-0012: 설계 준수 검증을 하네스로 자동화

## Context and Problem Statement

설계 문서(SDD)는 모듈 의존 방향, 함수 인터페이스, DOM 변경 경로(patch만), Hook 규칙 등을 정한다. 문서로만 남기면 구현이 진행되며 설계와 코드가 어긋나도 알 수 없다. 특히 여러 팀원과 AI 코딩 도구가 함께 코드를 작성하므로, 설계 규칙을 사람이 매번 리뷰로 확인하기 어렵다.

설계 준수 여부를 어떻게 검증할지 결정해야 한다.

## Decision Drivers

* 설계 규칙이 깨지면 PR 단계에서 즉시 알 수 있는가
* 사람(팀원)과 AI 도구가 같은 기준으로 검사받는가
* SRS VT와 테스트의 추적성을 기계적으로 확인할 수 있는가
* 설정·유지 비용

## Considered Options

* 하네스 자동화 — 설계 규칙을 타입 테스트·아키텍처 규칙·속성 기반 테스트·추적성 검사로 코드화하고 CI에서 실행
* 코드 리뷰 체크리스트만 사용
* 설계 문서에서 코드를 생성 (모델 기반 개발)

## Decision Outcome

Chosen option: "하네스 자동화", because 설계 문서의 규칙 대부분(의존 방향, 인터페이스 시그니처, DOM 쓰기 위치, diff/patch 불변식, VT 추적성)이 기계적으로 판정 가능하며, 한 번 만들면 모든 PR에서 사람과 AI 도구를 같은 기준으로 검사할 수 있기 때문이다. 기계로 판정할 수 없는 항목(설계가 적절한가, 이름이 좋은가)은 코드 리뷰와 ADR로 남긴다.

### Consequences

* Good, because 설계 위반이 리뷰 전에 CI에서 실패로 드러난다.
* Good, because 설계 문서가 "실행되는 명세"가 되어 문서와 코드의 차이가 줄어든다.
* Good, because AI 코딩 도구의 출력도 같은 검사를 통과해야 병합된다.
* Bad, because 초기 구성에 약 1일이 든다.
* Bad, because 설계를 바꿀 때 하네스 규칙도 함께 고쳐야 한다 (ADR로 기록).

### Confirmation

* `npm run verify`가 다음을 모두 실행하고 CI 필수 체크로 등록되어 있다: `typecheck`, `lint`, `check:arch`, `test`, `check:trace`.
* 의도적으로 규칙을 깨는 PR(예: `core/`에서 `component/` import)이 CI에서 실패하는 것을 한 번 시연한다.

## Pros and Cons of the Options

### 하네스 자동화

* Good, because 반복 검사가 무료가 된다.
* Good, because 규칙이 코드로 남아 새 팀원·AI 도구에게 설명이 필요 없다.
* Bad, because 규칙 자체에 버그가 있으면 잘못된 안심을 준다 (규칙도 리뷰 대상).

### 코드 리뷰 체크리스트만

* Good, because 추가 도구가 필요 없다.
* Neutral, because 설계 적절성 같은 판단은 어차피 리뷰가 필요하다.
* Bad, because 사람마다 기준이 다르고 놓치기 쉽다.

### 설계 문서에서 코드 생성

* Good, because 설계와 코드가 항상 일치한다.
* Bad, because 과제 목적(직접 구현)과 맞지 않고 도구 비용이 크다.

## More Information

* SDD 8장 설계 검증 하네스
* SRS NFR-03, VT-22, VT-23 (코드 리뷰 항목 일부를 자동화)
* [Harness engineering 정리 (OpenAI 사례 요약)](https://zby.github.io/commonplace/sources/harness-engineering-leveraging-codex-agent-first-world)
* [dependency-cruiser](https://github.com/sverweij/dependency-cruiser), [fast-check](https://fast-check.dev/)
* GitHub Issue: #12, #13
