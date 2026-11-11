---
# Optional metadata
status: proposed
date: 2026-11-09
decision-makers: [팀원 이름]
consulted: []
informed: [팀원 전체]
---

# ADR-0010: Hook 상태 저장 방식과 호출 규칙 강제

## Context and Problem Statement

SRS FR-15, FR-21은 State를 루트 컴포넌트에서만 관리하고, Hook은 루트 함수형 컴포넌트의 최상위에서만 호출하도록 정한다. Hook 상태를 어디에 어떤 구조로 저장할지, 규칙 위반을 어떻게 막을지 결정해야 한다.

## Decision Drivers

* FR-21 위반을 VT-16에서 검증할 수 있어야 함
* Hook 상태 구조의 단순함
* 자식 컴포넌트는 Props만 받는 순수 함수라는 설계 유지
* 정적 분석 도구 의존 최소화

## Considered Options

* 컴포넌트 인스턴스의 Hook 배열 + 호출 순서 인덱스 + 런타임 검사
* Hook마다 고유 이름(key)을 받는 방식 — `useState('count', 0)`
* 배열 방식 + ESLint 규칙(`rules-of-hooks` 유사)만으로 검사

## Decision Outcome

Chosen option: "컴포넌트 인스턴스의 Hook 배열 + 호출 순서 인덱스 + 런타임 검사", because React와 같은 호출 순서 모델을 유지하면서, 컴포넌트 밖·자식 컴포넌트·호출 수 변화·종류 불일치를 런타임에 오류로 잡아 VT-16을 자동 테스트로 검증할 수 있기 때문이다.

### Consequences

* Good, because `HookSlot[]` 하나로 useState, useEffect, useMemo 상태를 모두 저장한다.
* Good, because `HookCallError`, `HookOrderError`로 위반 종류가 구분된다.
* Bad, because 호출 수와 종류가 우연히 같은 조건부 호출은 런타임에 잡을 수 없다 (코드 리뷰로 보완).

### Confirmation

* VT-16: 컴포넌트 밖 호출, 자식 컴포넌트 안 호출 → `HookCallError` / 조건부 호출로 개수 변화 → `HookOrderError`.
* 하네스 `check:arch`: `pages/` 아래 자식 컴포넌트 파일에서 `use*` import가 없는지 확인 (선택).

## Pros and Cons of the Options

### Hook 배열 + 인덱스 + 런타임 검사

* Good, because 실제 React의 동작 원리와 같다.
* Good, because 위반이 테스트 가능한 오류로 드러난다.
* Bad, because 일부 위반은 런타임에 감지되지 않는다.

### 이름 기반 Hook

* Good, because 호출 순서에 의존하지 않아 조건부 호출도 안전하다.
* Bad, because React의 Hook 모델과 달라 학습 목적에 맞지 않는다.
* Bad, because 이름 충돌을 관리해야 한다.

### 배열 + ESLint만

* Good, because 실행 전에 위반을 찾는다.
* Neutral, because 커스텀 ESLint 규칙 작성 경험을 얻는다.
* Bad, because 규칙 작성 비용이 크고, 런타임 위반(동적 호출)은 놓친다.

## More Information

* SRS FR-15, FR-21, PR-09, VT-16
* SDD 4.2 FunctionComponent, 4.6 Hook 호출 규칙 검사
* [React 문서: Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
