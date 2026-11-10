# 미니 React 최종 소프트웨어 설계 문서 — 공통 (요약 · 표준 · 검증 전략 · 차별화 · 역할)

2026-11-10 · **Final v1.1** · 프로젝트 팀 · 기준 요구사항: SRS v1.4 (`docs/SRS_fixed.md`)

> **이 문서가 생긴 이유**: 보관용 `SDD-3.md`(v0.6)에는 있었지만 `SDD_final_phase1.md`·`SDD_final_phase2.md`로 옮겨지지 않은 공통 내용이 있었다(쉬운 요약, 참고 표준, 이슈 대응, 측정 도구, 대표 시나리오, 수동 체크리스트, 하네스 7계층, 역할 분담, 질문 카드, 차별화 제안, 표준 점검표, 이슈 매핑). 이 문서는 그 내용을 **지금 결정(ADR-0001~0015, 피드백 01~06)에 맞게 고쳐서** 옮긴 것이다. Phase별 설계는 두 final 문서가 기준이고, 이 문서는 그 둘을 묶는 공통 부분이다.
>
> | 문서 | 역할 |
> | --- | --- |
> | `SDD_final_common.md` (이 문서) | 요약, 표준, 검증 전략(하네스·설계 반증·교차 검증·보증 점수), 차별화, 역할, 이슈 |
> | `SDD_final_phase1.md` | Phase 1 설계, SRS 추적표(9.3), VT 위치(9.4), 하네스 명령(10장), 열린 항목(11장) |
> | `SDD_final_phase2.md` | Phase 2 설계, SRS 추적표(6장), 열린 항목(7장) |

---

## 0. 한 장 요약 (쉬운 말)

**최종 목표 (LMS 과제 요구사항)**

- 사용자의 입력·클릭에 따라 **부분 업데이트되는, 실제로 동작하는 웹 페이지**를 만든다.
- 핵심은 **전체를 다시 그리지 않고 필요한 부분만 업데이트**하는 것이다.
- **뒤로가기·앞으로가기**로 State History의 특정 Virtual DOM으로 이동하고, 그때 **실제 영역과 테스트 영역이 함께** 바뀐다.
- **"함수는 매번 새로 실행되는데, 상태는 어떻게 유지할까?"** 에 답하는 것이 Hooks의 핵심이다.
- React·JSX 등 UI 프레임워크는 **엔진과 검증 페이지 어디에도** 쓰지 않는다 (CON-01).

레고 집으로 생각하면 쉽다. 설계도(종이)를 두 장 놓고 틀린 그림을 찾은 다음, 달라진 블록만 갈아끼운다.

| 어려운 말 | 쉬운 비유 | 우리 코드에서 |
| --- | --- | --- |
| 실제 DOM | 실제로 쌓아 올린 레고 집 | 브라우저 화면 |
| Virtual DOM (VNode) | 레고 집의 설계도 | `VNode` 객체 |
| `dom` 참조 | 설계도 블록 옆에 적은 "실제 블록 위치" 메모 | `vnode.dom` |
| key | 블록마다 붙인 이름표 | `vnode.key` |
| Diff | 틀린 그림 찾기 | `diff(옛, 새)` → `{ changes, pairs }` |
| Patch | 틀린 곳의 블록만 갈아끼기 | `applyPatch` |
| State History | 게임 세이브 슬롯 | `History` |
| Component / State | 부품 틀 / 점수판 | `App` 등 함수 / `useState` |
| 하네스 | 자동 채점기 | `npm run report` |
| 참조 모델 | 설계도를 그대로 따라 지은 모형 집 | `reference/` (4.2) |
| ADR | "왜 이렇게 정했는지" 일기장 | `docs/adr/` |

## 1. 참고 표준과 검증 단계

SRS는 ISO/IEC/IEEE 29148, SDD는 IEEE 1016의 관점 구조를 과제 규모에 맞게 줄여 따른다. 검증 전체는 **IEEE 1012(V&V)의 단계별 V&V 활동**을 뼈대로 한다. 표준 원문은 유료라 목차와 활동 구분만 참고했다.

| 표준 | 대상 | 이 프로젝트에서 쓰는 곳 |
| --- | --- | --- |
| ISO/IEC/IEEE 29148:2018 | 요구사항, 추적성 | SRS, `check:docs`·`check:trace` |
| IEEE 1016-2009 | 설계 문서 | SDD 세 문서의 구성 |
| ISO/IEC/IEEE 42010:2022 | 아키텍처 기술 | 모듈 경계·의존 방향, `check:arch` |
| IEEE 1012-2016 | 검증·확인(V&V) | 관문 G1~G4 (3장) |
| IEEE 1028-2008 | 검토·감사 | AI 검토 + 사람 판정 (`*.review.md`) |
| ISO/IEC/IEEE 29119-3:2021 | 테스트 문서 | VT 증거표, `report/REPORT.md` |
| MADR | ADR 템플릿 | `docs/adr/` |

## 2. GitHub Issue 대응

| Issue | 완료 조건 | 충족하는 곳 |
| --- | --- | --- |
| [#10 구조·함수 인터페이스](https://github.com/team1-mini-lab/mini-react/issues/10) | 디렉터리, 함수 인터페이스, 모듈 책임 | phase1 2.1·2.3, 부록 A / phase2 부록 A |
| [#11 핵심 자료구조](https://github.com/team1-mini-lab/mini-react/issues/11) | 필드·역할, 관계, 확장 방향 | phase1 2.2, phase2 2.1~2.2 |
| [#12 테스트 환경](https://github.com/team1-mini-lab/mini-react/issues/12) | 환경 실행, 실행 방법, 기능별 테스트 구조 | phase1 9.4·10장, 이 문서 3장, `docs/VERIFICATION_GUIDE.md` |
| [#13 역할 분담·설계 문서](https://github.com/team1-mini-lab/mini-react/issues/13) | 담당 확정, 중복·누락, 결정 기록 | 이 문서 6장, ADR-0001~0015 |

## 3. 검증 전략 (IEEE 1012 단계 → 관문)

검증은 **"문서와 코드가 설계대로인가(준수)"**와 **"설계가 옳은가(타당성)"**를 따로 다룬다. 준수는 하네스가, 타당성은 설계 반증(4장)과 사람 판정이 맡는다.

| 관문 | IEEE 1012 단계 | 🤖 자동 | 🧠 AI 검토 | 🙋 사람 | 통과 조건 |
| --- | --- | --- | --- | --- | --- |
| G1 | 요구사항·설계 V&V (추적성) | `check:docs` [1]~[7], `test:harness` | `1-docs` | 지적마다 판정 | 하네스 실패 0, 미판정 0 |
| G2 | 설계 V&V (타당성) | **참조 모델 실행**(4.2): ADR 표 생성 테스트, 메타모픽, 모델 기반 | `2-design` A~F, **모델 2개 이상** | 반례마다 판정, ADR accepted | 미판정 0, 진짜 반례는 ADR 테스트 ID로 등록, 열린 항목 0 |
| G3 | 구현 V&V | `typecheck`, `check:stack`, `check:arch`, `lint`, 시그니처 검사 | `4-code` | PR 리뷰, 질문 카드(부록 B) | 전부 통과, PR 승인 |
| G4 | 시험 V&V | `test`, `check:vt`, `check:trace`, 커버리지 90%, **3-way 교차 검증**(4.3), **요구사항 보증 점수**(4.4) | `5-tests` | 수동 체크리스트 + 화면 캡처 | VT 49개 증거, 사슬 끊김 0, 보증 점수 기준 |

- 보고서는 `scripts/report.py`가 만든다. **결론은 생성기만 쓴다.** 증거가 없는 칸은 "확인 불가"다.
- 모든 결과에 커밋 해시를 남긴다. CI는 push·PR·main 머지마다 돈다 (`scripts/ci/verify.yml`).
- 관문을 넘지 못하면 다음 단계로 가지 않는다. 필수 관문은 `REQUIRED_GATES`로 늘려 간다.

### 3.1 하네스 계층 (SDD-3 8.2를 지금 상태로 고침)

| 계층 | 검사 | 도구 | 명령 | 상태 |
| --- | --- | --- | --- | --- |
| L1 타입 계약 | 부록 A 시그니처 = 코드 | `tsc --noEmit`(strict), `expectTypeOf` | `typecheck` | 있음 (strict 꺼짐 → Phase 1 구현 때 켬) |
| L2 아키텍처 | core→component 금지, 실제 영역 DOM 쓰기는 `patch.ts`만, Diff는 `.dom` 읽기 금지, UI 프레임워크 0 | dependency-cruiser, ESLint, `check_stack.py` | `check:arch`, `lint`, `check:stack` | `check:stack`만 있음 |
| L3 동작 | VT·ADR 테스트 | Vitest + jsdom | `test` | 있음 |
| L4 불변식 | phase1 10.3, phase2 4.2 | fast-check | `test` | 구현 때 |
| L5 추적성 | SRS↔SDD↔ADR, SRS→ADR→SDD→코드→VT | `check_docs.py`, `check_trace.py`, `check_vt_tests.py` | `check:docs`, `check:trace`, `check:vt` | 있음 |
| L6 브라우저 | 스크롤·커서, jsdom 차이 | Playwright (Chromium) | `test:e2e` | 구현 때 (4.3과 함께) |
| L7 하네스 검증 | 하네스·테스트가 버그를 잡는가 | `selftest_harness.py`, Stryker | `test:harness`, `test:mutation` | `test:harness` 있음 |

### 3.2 측정 도구 (`tests/helpers/`)

| 도우미 | 하는 일 | 쓰는 곳 |
| --- | --- | --- |
| `sameNode(before, after)` | Patch 전 `vnode.dom`을 잡아 두고 Patch 후 `toBe`로 같은 객체인지 확인 | FR-04, FR-05, VT-43 |
| `countMutations(root, fn)` | `MutationObserver`로 `fn` 동안의 기록 수를 센다(전달을 기다린 뒤). `move` 1건 = 기록 2건, `attrs` 1건 = 바뀐 속성 수 | NFR-01, VT-20, VT-29, VT-38 |
| `stripDom(v)` | `dom` 키를 지운 복사본 (D12) | VT-03 |
| `fixture(html)` | 틀 + 샘플을 jsdom 문서에 붙이고 `init()`까지 실행 | 통합 테스트 |

### 3.3 대표 시나리오 (사람이 따라가 보는 용도)

| 시나리오 | VT·ADR 테스트 | 핵심 |
| --- | --- | --- |
| 첫 로드 후 아무것도 안 고치고 Patch | VT-39, VT-47, TA1, H6 | `changes` 0개, 기록 그대로, "변경 사항 없음" (**공식 샘플에서 깨짐 — 설계 검토 반례 1**) |
| 바나나 입력칸에 3 → 맨 앞 사과 추가 → Patch | VT-36, D6, P2 | `add` 1개, 3은 바나나 옆 |
| 실제 영역에 주석이 있을 때 둘째 항목 수정 | VT-43, P4 | 둘째 항목만 바뀜 |
| `[A(p), B]` → `[B, A(h1)]` | VT-44, P6 | 오류 없이 적용 |
| 대상 `dom`을 지운 뒤 Patch, 이어서 다시 Patch | VT-31, R1, R2 | t3 복구 후 다음 Patch 정상 |
| Patch 2번 → 뒤로가기 → 앞으로가기 | VT-08, VT-09, VT-49, H3, H4 | 실제 영역·코드·미리보기 모두 해당 기록과 같음 |
| 코드 수정 직후(0.3초 전) 뒤로가기 | VT-48, H12 | 버튼이 이미 꺼져 있음 |
| `<script>`·`onclick`·`javascript:` 입력 | VT-21, S1~S4 | 변환 시 건너뜀 |

수동 체크리스트는 `docs/verification/checklist-phase1.md`, `checklist-phase2.md`에 있다. `check:vt`가 체크된 항목(`- [x] VT-xx`)을 증거로 센다.

## 4. 설계 반증과 교차 검증 (차별화의 핵심)

> **우선순위**: 이 프로젝트의 합격선은 SRS(`docs/SRS_fixed.md`)의 FR·NFR·IR·CON 전부와 VT 49개다. 4장의 기법은 **그 요구사항이 정말 지켜진다는 것을 더 강하게 보이기 위한 수단**이며, 4.2(참조 모델로 설계 반증)와 4.4(요구사항별 보증 점수)가 SRS 충족에 직접 붙는다. 5장의 8~10번처럼 SRS에 없는 추가 기능은 SRS를 모두 만족한 뒤에 한다.

하네스는 "설계대로인가"까지만 본다. 이 프로젝트는 그 위에 **설계 자체를 실행해서 반증**하고, **요구사항마다 검증 강도를 숫자로** 보여 준다. 기법 하나하나(모델 기반 테스트, 메타모픽 테스트, 차분 테스트, 뮤테이션 테스트)는 알려진 것이고, **SRS→ADR→SDD→코드→VT 추적 사슬 위에 이것들을 묶어 push마다 보고하는 구성**이 이 프로젝트의 고유한 부분이다.

### 4.1 기계가 읽는 ADR 표

ADR Confirmation 표(T, S, D, P, R, TA, H, U, HL, TV, C, B, K, HR, TD — 127개)는 지금도 `| ID | 입력 | 기대 결과 | 출처 |` 모양이다. 이 모양을 규칙으로 고정하고, 하네스가 표에서 **테스트 목록(이름·입력·기대)을 생성**한다. ADR에 줄이 하나 늘면 테스트 목록도 늘고, 테스트가 없으면 `check:vt`·`check:trace`가 빨간불을 켠다.

### 4.2 참조 모델 (Executable SDD)

- SDD 3~6장 규칙을 **문서 문장과 1:1로** 옮긴 작은 구현(`reference/`)을 만든다. 성능·구조보다 "문서와 같은가"만 본다.
- 구현 전에 4.1의 테스트, 메타모픽 관계, 모델 기반 테스트를 참조 모델에 돌린다. **실패하면 설계 결함**이다(구현이 아직 없으므로).
- 첫 사례: 시제품(`docs/verification/results/prototype/`)으로 공식 샘플에서 FR-01이 깨지는 것을 구현 전에 찾았다(설계 검토 반례 1).

| 메타모픽 관계 (예) | 근거 |
| --- | --- |
| 들여쓰기만 바꾼 코드 → `changes` 0개 | ADR-0002 T2, ADR-0008 H10 |
| key 있는 형제의 순서만 바꿈 → `move`만, 요소 객체 그대로 | ADR-0004 3-나, D7 |
| 같은 트리로 Patch 두 번 → 두 번째는 `changes` 0개 | D1, P7 |
| 코드 왕복 두 번 = 한 번 | ADR-0006 TA2 |
| 핸들러만 다른 두 렌더 → DOM 기록 0건 | ADR-0015 C9 |

**모델 기반 테스트**: fast-check `fc.commands`로 "입력 → 0.3초 → Patch → 뒤로가기 → …" 조작 순서를 무작위로 수천 개 만들고, 단순한 상태 모델(기록 배열 + 위치 + `dirty` + `pending`)과 페이지 상태를 매 단계 비교한다 (ADR-0008 H1~H12, 반례 5·6 같은 종류).

### 4.3 3-way 교차 검증 (구현 후, G4)

같은 무작위 입력을 **① 참조 모델 ② 실제 구현 ③ 실제 Chromium(Playwright)**에 넣고 결과 트리와 DOM을 비교한다.

| 어긋난 곳 | 뜻 |
| --- | --- |
| ②만 다름 | 구현 버그 |
| ①만 다름 | 설계(참조 모델) 결함 또는 참조 모델 버그 → 사람 판정 |
| ③만 다름 | jsdom과 실제 브라우저의 차이 → 테스트 환경 한계로 기록 |

### 4.4 요구사항 보증 점수 (Requirement Assurance Score)

Stryker로 `src/`에 인위적 버그(뮤턴트)를 넣고, 그 버그를 잡은 테스트의 `[VT-xx]`를 `check:trace` 사슬로 SRS 요구사항까지 올려 집계한다.

```
FR-04 보증 점수 = (FR-04 사슬의 코드 파일에 넣은 뮤턴트 중, FR-04의 VT 테스트가 잡은 수) / (그 뮤턴트 수)
```

- 커버리지는 "몇 줄이 실행됐나"를 말하고, 이 점수는 "그 요구사항이 깨지면 테스트가 알아채는가"를 말한다.
- 기준(예: 요구사항마다 80% 이상)은 팀이 정하고 G4 조건에 넣는다.

## 5. 다른 팀과 차별되는 추가 구현 (SDD-3 부록 C를 지금 결정으로 갱신)

| # | 아이디어 | 발표에서 보이는 것 | 지금 상태 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | Patch 하이라이트 | 바뀐 블록만 0.6초 반짝임 | **채택** (`animate()`, `y2`) | phase1 5.3, 피드백 02·06 |
| 2 | 통째 교체 vs Patch 비교 | 같은 변경을 innerHTML과 우리 방식으로 적용해 DOM 기록 수·입력값 유지를 나란히 | 미정 (추천) | NFR-01, 3.2 `countMutations` |
| 3 | 타임머신 슬라이더 (`goTo`) | 아무 시점으로나 이동 | **제외** (`goTo` 제거) | ADR-0008, 피드백 01 |
| 4 | 트리 보기 (이전/새 나란히) | 바뀐 노드 색칠 | **채택** (`v2+w1`, TV1~TV4) | phase1 7.4 |
| 5 | key 유무 비교 시연 | 같은 목록 변경을 key 있음/없음으로 Patch | 미정 (추천) | FR-09, ADR-0004 |
| 6 | 하네스 실패 시연 | 규칙을 어긴 PR에서 CI 빨간불 | 미정 (ADR-0012 Confirmation이 요구) | ADR-0012 |
| 7 | 잘린 기록 보관 (`archive[]`) | 잘린 기록 되살리기 | **제외** (확장 후보) | ADR-0008 j3 |
| 8 | **검증 보고서 대시보드** | push마다 G1~G4, SRS→ADR→SDD→코드→VT 사슬, VT 49개 증거 | 진행 중 (`report.py`) | 3장 |
| 9 | **설계 반증 시연** | "구현 전에 설계를 실행해 FR-01 결함을 찾았다" 사례와 그 ADR 수정 과정 | 진행 중 (반례 1) | 4.2 |
| 10 | **요구사항 보증 점수** | 요구사항별 뮤테이션 점수 막대 | 계획 | 4.4 |

정해지면 SRS에 선택 요구사항(Should/Could)으로 추가하고, 추적표와 VT를 붙인다.

## 6. 역할 분담 제안 (Issue #13)

모듈 경계를 담당 경계로 삼는다. 중복·누락은 `check:trace`가 확인한다. 테스트 파일 소유자를 `CODEOWNERS`로 지정하면 VT별 담당자가 정해진다.

| 역할 | 담당 | FR | VT (테스트 책임) | ADR | 담당자 |
| --- | --- | --- | --- | --- | --- |
| A. VDOM·변환·Diff | `core/vnode`, `core/dom`, `core/html`, `core/diff` | FR-01, FR-02, FR-04~FR-06, FR-09 | VT-01~VT-05, VT-25~VT-28, VT-36~VT-39, VT-42 | 0001~0004, 0006(a3·g1) | |
| B. Patch·History·Phase 1 페이지 | `core/patch`, `core/history`, `pages/phase1` | FR-03, FR-07, FR-08 | VT-06~VT-09, VT-20, VT-29~VT-34, VT-40, VT-41, VT-43~VT-49 | 0005, 0006, 0008 | |
| C. Component·Hooks | `component/*` | FR-10~FR-22 | VT-10~VT-17, VT-19 | 0009, 0010, 0015 | |
| D. 검증·Phase 2 페이지·문서 | 하네스, CI, 참조 모델, `pages/phase2`, SRS·SDD | FR-23 | VT-18, VT-21~VT-24, VT-35 | 0007, 0011, 0012 | |

- [ ] 담당자 이름 기입 후 `CODEOWNERS` 등록
- [ ] ADR-0008~0012·0015 팀 리뷰 후 accepted, ADR-0001·0002·0004·0005·0006 "재확인 필요" 절 재확인

## 부록 B. 원리 설명 질문 카드 (공통·Phase 1)

담당자는 자기 모듈 질문에 코드를 보지 않고 말로 답할 수 있어야 PR을 병합한다. Phase별 Q&A는 각 final 문서 부록 B에 있다.

| 모듈 | 질문 | 힌트 |
| --- | --- | --- |
| 전체 | React는 왜 만들어졌을까? 화면을 통째로 다시 그리면 무엇이 문제일까? | 0장 |
| 전체 | 실제 화면을 바꾸는 코드는 왜 한 파일에만 있어야 할까? | phase1 2.1 |
| 노드 | `key`와 `dom`은 왜 `attrs`에 넣지 않을까? | ADR-0001 |
| 변환 | 공백만 있는 글자를 버리면 왜 안 될까? | ADR-0002 선택지 1·2 |
| 변환 | 입력칸에 `<script>`나 `onclick`을 넣으면 왜 실행되지 않을까? | ADR-0002 4절 |
| 비교 | 목록 맨 앞에 항목을 넣으면 Diff는 몇 개의 변경을 만들까? key가 없으면? | ADR-0004 |
| 비교 | Diff는 왜 실제 노드(`dom`)를 보지 않을까? | ADR-0004 결정 1·2 |
| 적용 | 왜 교체보다 자리 맞추기를 먼저 할까? | ADR-0005 5절 |
| 적용 | Patch 도중 오류가 나면 왜 통째로 다시 그릴까(t3)? 대가는? | ADR-0005 6절 |
| 기록 | 뒤로가기 때 Diff의 "이전" 쪽은 왜 지금 트리일까? | ADR-0004 `dom` 규칙 7 |
| 기록 | 바뀐 게 없는 Patch는 왜 기록하지 않을까? 코드를 고치면 왜 이동 버튼이 꺼질까? | ADR-0008 |
| 검증 | 테스트가 통과했는데도 버그가 있을 수 있을까? 어떻게 확인할까? | 3·4장 |
| 검증 | 설계가 틀렸다는 것을 구현 전에 어떻게 알 수 있을까? | 4.2 |

## 부록 D. 표준 적합성 점검 (다시 채점 필요)

IEEE 1016·ISO 29148에는 공식 점수가 없다. 표준이 "들어 있어야 한다"고 하는 항목을 스스로 점검한 값이며, **숫자는 하네스 출력에서 가져온다**.

| 측정 | 값 (2026-11-10, `report/REPORT.md`) |
| --- | --- |
| SRS ID가 설계 추적표에 있는 비율 | 103/103 (`check:docs` [1]) |
| 테스트 위치가 정해진 VT | 49/49 (`check:docs` [3]) |
| ADR·피드백 테스트 ID가 설계에 있는 비율 | 127/127 (`check:docs` [4]) |
| 결정이 정해진 TBD | 8/10 (TBD-09, TBD-10 대기) |
| 승인된 ADR (재확인 필요 없음) | ADR-0003, 0007 (README 기준) |
| 끝까지 이어진 요구사항 사슬 | 보고서 3절 (구현 진행에 따라 변함) |

## 부록 E. 이슈 ↔ ADR 매핑

| 이슈 | 관련 ADR | 설계 절 | 검증 |
| --- | --- | --- | --- |
| [#23 P1-7 Undo](https://github.com/team1-mini-lab/mini-react/issues/23) | ADR-0008 | phase1 6장, 7.3 | VT-08, VT-30, VT-49 |
| [#25 P1-8 Redo](https://github.com/team1-mini-lab/mini-react/issues/25) | ADR-0008 | phase1 6장, 7.3 | VT-09, VT-30, VT-49 |
| [#26 P1-9 이동 버튼 비활성화](https://github.com/team1-mini-lab/mini-react/issues/26) | ADR-0008 (m3, 0.3초 틈 막기) | phase1 7.3 | VT-30, VT-48 |
| [#27 P1-10 화면 구성](https://github.com/team1-mini-lab/mini-react/issues/27) | ADR-0006, 피드백 02 | phase1 7.1~7.4 | VT-32~VT-34, VT-41 |
| P1-1~P1-6 | ADR-0001~0005 | phase1 2~5장 | phase1 9.3 |
