# 통합 ADR (Architecture Decision Records) 번호표

이 디렉터리는 미니 React 프로젝트의 모든 아키텍처 결정 문서(`ADR-0001` ~ `ADR-0015`)와 팀 설계 검토 피드백(`docs/reviews/feedback-01` ~ `06`)의 통합 기준표이다.

> **참고**: `ADR-0001` 본문 일부 변경 이력에는 번호 통합 전 명칭인 `ADR-0013`이 남아 있으나, 통합 번호표 기준 **컴포넌트 렌더링(`h`, `mount`, `update`, `events`)은 `ADR-0015`**이며, 구 `eungi` 브랜치의 `ADR-0013`·`ADR-0014`는 `superseded` 처리되었다.

| 번호 | 제목 | 상태 | 핵심 결정 | 반영 문서 |
| --- | --- | --- | --- | --- |
| **ADR-0001** | Virtual DOM 노드 모양 | Accepted (+2026-11-10 `events` 추가 재확인 필요) | `type` 구별(`element`/`text`), 키의 네 무리(화면 데이터 5키 · `key` · `dom` · `events`), 비교 기준표 | Phase 1 · 2 |
| **ADR-0002** | 실제 DOM → Virtual DOM 변환 & 공백 · 정제 규칙 | Accepted (+4절 `s2` 재확인 필요) | 선택지 4(연속 공백 1칸 + `<pre>` 예외), 주석 제외, `key` 분리, **4절 `s2`**: `<script>`, `on*`, `javascript:` 건너뛰기 (`S1~S4`) | Phase 1 · 2 |
| **ADR-0003** | Virtual DOM → 실제 DOM (`vnodeToDom`) | Accepted | 화면 밖 재귀 완성 후 1회 부착, `key` 속성 재부착, `dom` 미읽기/미기록 | Phase 1 · 2 |
| **ADR-0004** | Diff · Patch 구조 & `dom` · `key` · `value`/`checked` | Accepted (+1절 `value`/`checked` 재확인 필요) | Diff/Patch 분리(A), `dom` 기반 이전 dict 참조(3+), key 우선 짝짓기(3-나), **1절 `value`/`checked` 프로퍼티 동기화** (`TD3~TD5`) | Phase 1 · 2 |
| **ADR-0005** | Patch 적용 순서 · `pairs` · 실패 복구(`t3`) | Accepted (+6절 `t3` & 컨테이너 인자 재확인 필요) | `A1` 이동 판단, `B2` `before` 기준 dict, `D1` `{ changes, pairs }`, `C2` [삭제 → 자리 → 자신 → 자식], `F1` `recordDom`, **6절 `t3` `recoverPatch(container, nextTree, err)`** (`D1~D15`, `P1~P12`, `R1~R2`) | Phase 1 · 2 |
| **ADR-0006** | 테스트 영역 구성 & 시연 기능(8절) | Accepted (+8절 시연 기능 재확인 필요) | `#editor` + `#preview`, `f1` 단방향, `e3` 0.3s 디바운스, `a3` 공백 보존 HTML, `c1`, `g1`, `h1`, `i1`, **8절 시연**: `formatChange` 요약, `#status`, `y2` `animate()` 하이라이트, `v2+w1` 트리 뷰어 (`TA1~TA12`, `U1~U2`, `HL1~HL2`, `TV1~TV4`) | Phase 1 · 2 |
| **ADR-0007** | 프로그래밍 언어 (TypeScript) | Accepted | TypeScript strict 컴파일 + 순수 브라우저 DOM / Vite 기반 (외부 프레임워크 0, `C-01`) | 공통 |
| **ADR-0008** | State History (`피드백 01` / 블로그 97) | Accepted (2026-11-10, 팀 재확인 예정) | 선형 배열 + `index`, `j1` 분기 시 뒤 삭제, `k1` 무변경 미기록, `m3·n2` 미패치/0.3초 대기 이동 차단, `goTo`/`limit=100`/`archive[]` 제외 (`archive[]`는 확장 후보) (`H1~H12`) | Phase 1 |
| **ADR-0009** | Batching (`피드백 05` / 블로그 101) | Proposed | `b1` `queueMicrotask` 자동 Batching, `flushSync()`, 렌더 중 setter 경고+유예, **내부 연쇄만 카운트(>50 오류)** (`B1~B6`) | Phase 2 |
| **ADR-0010** | Hooks (`피드백 04~05` / 블로그 100·101) | Proposed | `hooks[]` 순서 저장, `useEffect` `f1`(생략=매렌더) + `g1`(cleanup) + 예외 격리, `useMemo`, `HookCallError`(`renderingChild > 0` 포함)·`HookOrderError`(Diff/Patch 전 중단) (`K1~K14`, `HR1~HR6`) | Phase 2 |
| **ADR-0011** | 테스트 환경 (Vitest + jsdom) | Accepted (2026-11-10, 팀 재확인 예정) | 단위/통합/속성 테스트 환경 구성 | 공통 |
| **ADR-0012** | 아키텍처 검증 하네스 (L1~L4) | Accepted (2026-11-10, 팀 재확인 예정) | L1(경계), L2(Patch만 DOM 쓰기), L3(정적 분석), L4(불변식 검증) | 공통 |
| **ADR-0013** | *(Superseded)* Patch 사전 확인 (`t2`) | Superseded | `ADR-0005` 6절 `t3`(`recoverPatch`)로 대체됨 (`피드백 02` 5-1절) | `docs/adr/superseded/` |
| **ADR-0014** | *(Superseded)* 입력 정제 | Superseded | `ADR-0002` 4절 `s2`로 통합됨 (`피드백 02` 5-1절) | `docs/adr/superseded/` |
| **ADR-0015** | 컴포넌트 렌더링 (`피드백 03·06` / 블로그 99·102) | Proposed | `h()` 자식 즉시 펼침 + **컴포넌트 `key` 루트 부착(props 미전달)**, `events` 키(e2) & 고정 리스너 `__handlers`, `mount()`(`dom` 기록), `update()`, **`unmount()` 미도입** (`C1~C10`, `TD1~TD11`) | Phase 2 |
| **ADR-0016** | 건너뛴 노드 양옆 글자 노드 합치기 (설계 검토 반례 1·2·3) | Accepted (2026-11-10, 팀 재확인 예정) | `dom_to_vdom`이 주석·`<script>`를 건너뛴 뒤 나란히 남은 글자 노드를 하나로 합친다(u1). 공백끼리만 합칠지 함께 결정 (`T16`, `T17`, `S5`, `TA13`) | Phase 1 · 2 |
| **ADR-0017** | 뒤로·앞으로가기 중 t3 복구 시 History (설계 검토 반례 5) | Accepted (2026-11-10, 팀 재확인 예정) | Patch 버튼 복구만 `push`, 이동 중 복구는 위치 그대로(v2) (`R3`, `R4`) | Phase 1 |
| **ADR-0018** | `<pre>` 첫 줄바꿈 왕복 (반례 4) | Accepted (2026-11-10, 팀 재확인 예정) | a3가 `<pre>` 첫 글자가 줄바꿈이면 줄바꿈 하나를 더 쓴다(w2) (`TA14`) | Phase 1 |
| **ADR-0019** | Phase 1 페이지 경계 동작 4가지 (반례 6, SDD 11장) | Accepted (2026-11-10, 팀 재확인 예정) | 빈 코드 Patch(x1), 여러 최상위 요소(x2), 복구 실패(x3), "수정 취소" 버튼(x4) (`H13`, `H14`, `TA15`, `R5`) | Phase 1 |

## 블로그 설계 검토 일지 ↔ 저장소 피드백 매핑

외부 URL(`https://eutopiaa.tistory.com/97~102`)의 팀 설계 검토 내용은 저장소 내 다음 문서로 전문 보관되어 `SDD_final_phase1.md` 및 `SDD_final_phase2.md`에 모두 반영되었다.

- `tistory.com/97` → `docs/reviews/feedback-01-history.md` (`ADR-0008`)
- `tistory.com/98` → `docs/reviews/feedback-02-screen-layout.md` (`ADR-0002` §4, `ADR-0005` §6, `ADR-0006` §8)
- `tistory.com/99` → `docs/reviews/feedback-03-mount-update-h.md` (`ADR-0015`, `ADR-0001`, `ADR-0005` §6 일반화)
- `tistory.com/100` → `docs/reviews/feedback-04-hooks.md` (`ADR-0010` 전반)
- `tistory.com/101` → `docs/reviews/feedback-05-batching-hook-rules.md` (`ADR-0009`, `ADR-0010` 규칙 검사)
- `tistory.com/102` → `docs/reviews/feedback-06-todo-page.md` (`ADR-0004` §1, `ADR-0006` §8, `ADR-0015` §1)
