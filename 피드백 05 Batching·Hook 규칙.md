# 설계 피드백 05: Batching (#42) + Hook 규칙 검사 (#43)

> **표시 안내**: `🙋 확인 필요`는 아직 합의하지 않은 부분이다. 표시가 없는 내용은 검토 대화에서 결정했다.

- 검토 대상: `batching.md`(통합 번호 ADR-0009), `hook_rule_enforcement.md`(통합 번호 ADR-0010), SDD 4.1 `renderingChild`, 4.4 스케줄러, 4.6 Hook 호출 규칙 검사, 5장 해당 행
- 기준 문서: 리액트 issue.md(TBD-05, FR-11, FR-16, C-06, C-07), ADR-0013, 피드백 04
- 공통 사항(issue.md 기준, ADR 통합 번호표)은 피드백 01의 0절과 같다.

## 1. 결론 요약

| 결정 | 내용 | 이유 |
|---|---|---|
| Batching (TBD-05) | **b1**: setter는 "다시 그리기 필요" 표시만 하고, 지금 실행 중인 코드가 끝난 직후(`queueMicrotask`) 한 번에 다시 그린다 | 구현은 20줄쯤이고, 테스트에서 화면을 확인하기 전에 `flushSync()` 한 줄을 더하는 정도라 큰 비용이 아니다. 대신 다시 그리기 횟수가 줄고(NFR-01), 리액트 18과 같은 동작을 얻고, 과제의 선택 항목을 수행한다 |
| Hook 규칙 검사 | 팀원 설계대로 실행 중 검사 4가지를 둔다 | 비용이 작고, 검사하지 않으면 상태가 조용히 섞이는 문제(FR-16)를 막을 방법이 없다 |

## 2. 그대로 가져갈 것

### 2-1. Batching

| 팀원 설계 | 평가 |
|---|---|
| `queueMicrotask`로 같은 순간의 변경을 모아 `update()` 한 번 (batching.md) | 1절 결론 b1 |
| 테스트용 `flushSync()` | 어떤 방식이든 테스트에서 결과를 확인하려면 필요하다 |
| 연속 50회를 넘으면 오류 (SDD 4.4) | effect 안 setter가 끝없이 도는 것을 페이지 멈춤 대신 분명한 오류로 알린다 |
| 렌더링 도중 setter를 부르면 다음 차례로 미루고 경고 (SDD 4.4) | 실수인 경우가 많고, 실제 리액트도 경고한다 |
| Batching을 끄려면 예약 함수 한 줄만 바꾼다 (batching.md) | 결정을 되돌리기 쉽다 |

### 2-2. Hook 규칙 검사

| 잘못된 호출 | 잡는 방법 | 오류 |
|---|---|---|
| 컴포넌트 밖에서 호출 (버튼 핸들러, effect 안 등) | 지금 렌더링 중인 컴포넌트가 없음 | `HookCallError` |
| 자식 컴포넌트에서 호출 | `h`의 "자식 실행 중" 표시가 켜져 있음 | `HookCallError` |
| 렌더링마다 Hook 개수가 다름 (if문 안 호출) | 렌더링 후 이번 개수 ≠ 칸 개수 | `HookOrderError` |
| 같은 칸의 종류가 다름 (순서가 바뀜) | 칸에 적힌 종류 ≠ 이번에 부른 종류 | `HookOrderError` |

- 두 번째 줄이 특히 중요하다. 자식 컴포넌트는 `h` 안에서 바로 실행되므로(ADR-0013), 그동안에도 "지금 렌더링 중인 컴포넌트"는 루트다. 표시가 없으면 자식의 `useState`가 루트의 칸을 조용히 가져다 쓴다.
- 개수와 종류가 우연히 같은 조건부 호출은 실행 중에 잡을 수 없다. 이 한계를 코드 검토 항목으로 보완한다는 팀원 판단도 그대로 가져간다.
- ESLint 규칙만으로 검사하는 방법은 규칙 작성 비용이 크고 실행 중 위반을 놓친다는 팀원 판단에 동의한다.

## 3. 고칠 것

### 3-1. 요구사항 ID와 ADR 번호

| 팀원 문서 | 수정 |
|---|---|
| FR-21 (Hook 규칙) | issue.md C-06, FR-16 |
| FR-14·FR-17 (상태 변경 → 다시 그리기) | issue.md FR-11 |
| VT-16, VT-19 | 7절 테스트 |
| "ADR-0006 Batching", "ADR-0007 Hook 규칙" | ADR-0009, ADR-0010 (통합 번호표) |

### 3-2. `unmount` 관련 내용 삭제

`unmount()`를 두지 않으므로(ADR-0013) 스케줄러와 Hook 규칙 문서의 `unmount` 관련 문장을 지운다.

## 4. 추가할 것

### 4-1. "연속 50회"의 뜻

| 규칙 | 이유 |
|---|---|
| 다시 그리기가 실행되는 도중(렌더링이나 effect 안)에 새 다시 그리기가 예약될 때만 1씩 센다 | effect 안 setter 같은 자기 반복만 세기 위해서다 |
| 사용자 조작이나 타이머처럼 다시 그리기 밖에서 새로 예약되면 0으로 되돌린다 | 사용자가 버튼을 50번 누르는 정상적인 경우를 오류로 착각하지 않기 위해서다 |

### 4-2. Hook 규칙 오류가 나면 화면은 그대로

Hook 규칙 검사는 렌더링 도중, 즉 Diff·Patch 전에 오류를 낸다. 그래서 화면은 바뀌지 않고 이전 상태로 남으며, 콘솔에 오류가 남는다.

### 4-3. 테스트 작성 규칙

setter를 부르거나 클릭한 뒤 화면·상태를 확인하는 테스트는, 확인 전에 `flushSync()`를 부른다. 빠뜨리면 코드가 맞아도 테스트가 실패한다. 피드백 03의 C8, 피드백 04의 K2~K5·K7~K11 등에 적용한다.

## 5. 뺄 것

| 팀원 설계 | 제안 | 이유 |
|---|---|---|
| `unmount` 관련 문장 | 뺀다 | 3-2 |
| 하네스 `check:arch`의 "자식 컴포넌트 파일에서 `use*` import 금지" (hook_rule_enforcement.md, 선택) | 테스트 환경(#12) 검토로 넘긴다 | 하네스 도입 여부와 함께 정한다 |

## 6. 문서 변경

| 대상 | 변경 |
|---|---|
| issue.md TBD-05 | "→ 결정(ADR-0009): Batching을 구현한다. 같은 순간의 변경을 모아 한 번만 다시 그린다(`queueMicrotask`)." 추가 |
| ADR-0009 (Batching) | 팀원 `batching.md`를 바탕으로 3절·4-1절·4-3절 반영 |
| ADR-0010 (Hooks로 넓힘) | 팀원 `hook_rule_enforcement.md`를 바탕으로, 피드백 04 결정(useState·useEffect·useMemo 동작)과 이번 2-2절·3절·4-2절을 함께 담는다 |
| SDD 4.4, 4.6, 5장 | 3·4절 반영 |

## 7. 테스트 후보

결정마다 그 결정이 깨졌을 때 잡아낼 테스트를 하나 이상 두었다. 아래 B1~B6, HR1~HR6을 모두 채택한다.

| # | 상황 | 기대 결과 | 출처 |
|---|---|---|---|
| B1 | 버튼 핸들러에서 setter 3번 → `flushSync()` | 다시 그리기 1번, 화면에 세 변경이 모두 반영 | b1 |
| B2 | 타이머 안에서 setter 2번 → 기다림 | 다시 그리기 1번 | b1 |
| B3 | setter 호출 직후 / `flushSync()` 후 | 직후에는 화면 그대로, 후에는 바뀜 | b1, 4-3 |
| B4 | 의존성 목록 없이 매번 상태를 바꾸는 effect | 연속 50회를 넘으면 오류, 페이지는 멈추지 않음 | 4-1 |
| B5 | 버튼을 60번 차례로 누름 (매번 다시 그리기) | 오류 없음 | 4-1 |
| B6 | 컴포넌트 본문에서 setter 호출 | 경고 1번, 변경은 다음 차례에 반영 | 2-1 |
| HR1 | 버튼 핸들러 안에서 `useState` | `HookCallError` | 2-2 |
| HR2 | effect 안에서 `useState` | `HookCallError` | 2-2 |
| HR3 | 자식 컴포넌트 안에서 `useState` | `HookCallError` (루트 칸을 쓰지 않음) | 2-2, C-06 |
| HR4 | 조건에 따라 Hook 개수가 바뀜 | `HookOrderError` | 2-2, FR-16 |
| HR5 | 두 렌더링에서 `useState`와 `useMemo`의 순서가 바뀜 | `HookOrderError` | 2-2 |
| HR6 | HR4 상황에서 | 화면이 이전 상태 그대로, 콘솔에 오류 | 4-2 |

## 8. 참고 문서

- 기준 문서: 리액트 issue.md(TBD-05, FR-11, FR-16, C-06), ADR-0013(`h`가 자식을 바로 실행, `unmount` 제외), 피드백 04(Hook 저장 칸)
- 검토 대상: `batching.md`, `hook_rule_enforcement.md`, SDD.md 4.1, 4.4, 4.6, 5장
- 검토 과정: [미니 리액트 개발 일지 ㅡ 팀 설계 검토: Batching(#42)과 Hook 규칙 검사(#43)](https://eutopiaa.tistory.com/101)
- 팀원 문서의 참고 링크: [React 18: Automatic Batching](https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching), [MDN queueMicrotask](https://developer.mozilla.org/en-US/docs/Web/API/Window/queueMicrotask), [React 문서: Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
