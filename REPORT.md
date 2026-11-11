> 브랜치 `feat/cooperative-scheduling` · 커밋 `9b944e8` · 2026-11-12 00:27 KST · [실행 기록](https://github.com/team1-mini-lab/mini-react/actions/runs/43046311217)

<!-- mini-react-verify-report -->
# mini-react 검증 보고서

| 항목 | 값 |
| --- | --- |
| 커밋 | `9b944e8` (feat/cooperative-scheduling) |
| 생성 | 2026-11-11 15:27 UTC · GitHub Actions |
| 필수 관문 | G1 |

> 이 보고서는 `scripts/report.py`가 명령 결과로 만든다. 결론 칸을 손으로 고치지 않는다.

## 0. 이 보고서가 검사한 방법

| 칸 | 무엇을 어떻게 확인했나 | 근거 파일 |
| --- | --- | --- |
| SRS ↔ SDD | SRS에 정의된 FR·NFR·IR·CON·VT·TBD ID 전부가 SDD 추적표(phase1 9.3, phase2 6.1)에 하나씩 있는지, SRS 4장의 요구사항→VT 연결 62건이 SDD에도 있는지, VT 49개의 테스트 위치가 정해졌는지 | `scripts/check_docs.py` [1]~[3], `report/check-docs.txt` |
| ADR ↔ SDD | ADR·피드백 문서 Confirmation 표의 테스트 ID 전부(T·S·D·P·R·TA·H·U·HL·TV·C·B·K·HR·TD)가 SDD에 있는지, ADR 상태가 README와 파일에서 같은지, superseded ADR(0013·0014)을 근거로 쓰지 않는지, 인용한 ADR 절이 실제로 있는지 | `check_docs.py` [4]·[5]·[7] |
| 하네스 자체 | 문서·코드를 일부러 12가지로 망가뜨려 하네스가 모두 실패로 잡는지 | `scripts/selftest_harness.py`, `report/test-harness.txt` |
| 설계 타당성 | AI 검토(반례 찾기) 결과 파일의 반례 줄 수와, 옆의 `*.review.md`에 사람이 적은 판정 수를 센다. 판정 내용 자체는 사람이 확인한다 | `docs/verification/results/` |
| SDD ↔ 코드 | SDD 부록 A의 함수 이름이 적힌 파일에 실제로 정의돼 있는지, 부록 A에 없는 export가 있는지 | `scripts/check_trace.py`, `report/check-trace.txt` |
| 코드 ↔ VT | 테스트 이름의 `[VT-xx]`, 그 테스트 파일이 import 하는 src 파일, vitest 결과(통과·실패)를 요구사항마다 이어 본다 | `check_trace.py`, `report/vitest.json` |
| CON-01 | `package.json`·`src`·`tests`·`index.html`·`tsconfig.json`에 React·JSX 흔적이 있는지 | `scripts/check_stack.py` |

## 관문 요약

| 관문 | 판정 | 무엇으로 판정했나 |
| --- | --- | --- |
| G1 SRS–SDD 정합성 | ✅ 통과 | check:docs ✅ 통과, test:harness ✅ 통과, AI 지적 판정 0/0 |
| G2 SDD 설계 검증 | ✅ 통과 | 검토 영역 ABCDEF/ABCDEF, 검토자 2명/2명 이상, 반례 판정 17/17, ADR proposed 0개·재확인 필요 0개, 열린 설계 항목 0개 |
| G3 구현 | ✅ 통과 | typecheck ✅ 통과, check:stack ✅ 통과, check:arch ✅ 통과, lint ✅ 통과 |
| G4 VT 검증 | ✅ 통과 | 커버리지 ✅ 통과, 뮤테이션 ✅ 통과, 테스트 ✅ 통과 (202/202), VT 증거 51/51, 요구사항 사슬 44/44 |

## 1. 하네스 실행 결과

| 명령 | 결과 | 시간 | 로그 |
| --- | --- | --- | --- |
| `check:docs` | ✅ 통과 | 0.2s | report/check-docs.txt |
| `test:harness` | ✅ 통과 | 1.2s | report/test-harness.txt |
| `typecheck` | ✅ 통과 | 2.2s | report/typecheck.txt |
| `check:stack` | ✅ 통과 | 0.1s | report/check-stack.txt |
| `check:arch` | ✅ 통과 | 0.8s | report/check-arch.txt |
| `lint` | ✅ 통과 | 1.4s | report/lint.txt |
| `vitest` | ✅ 통과 | 8.2s | report/test.txt |
| `test:coverage` | ✅ 통과 | 8.6s | report/test-coverage.txt |
| `test:mutation` | ✅ 통과 | 698.9s | report/test-mutation.txt |
| `check:vt` | ✅ 통과 | 0.0s | report/check-vt.txt |
| `check:trace` | ✅ 통과 | 0.0s | report/check-trace.txt |

## 2. 설계 검토 (AI + 사람 판정)

| 결과 파일 | 검토자 | 영역 | 지적 | 사람 판정 |
| --- | --- | --- | --- | --- |
| `2026-11-10-1854-2-design-C-2cb5814.md` | default: gemini-3-flash-preview provider | C | 3 | 3/3 |
| `2026-11-10-1855-2-design-D-2cb5814.md` | default: gemini-3-flash-preview provider | D | 3 | 3/3 |
| `2026-11-10-2-design-ALL-claude.md` | Claude (Cowork 세션). Hermes 크레딧 문제로 대신 실행 | A~F 전부 | 11 | 11/11 |

- 실패한 AI 실행(`results/failed/`): 14건 — 검토로 세지 않는다
- ADR proposed: 없음 / 재확인 필요: 없음
- 열린 설계 항목: Phase 1 0개 (SDD 11장), Phase 2 0개 (Phase 2 문서 7장)

## 3. 정합성 사슬 (SRS → ADR → SDD → 코드 → VT)

✓ 이어짐 · ✗ 끊김 · △ ADR 승인 대기 또는 설계 칸에 함수 이름 없음 · — 해당 없음 · 검사 ✓ = 하네스 스크립트(check:stack·lint·check:arch·jsdom 실행)가 통과 · 수동 ✓ = 브라우저 체크리스트에서 확인 · 수동 = 아직 확인 안 된 수동·검토 VT · ? 결과 미확인

| 요구사항 | ADR | 설계 | 코드 | 테스트 | 연결 | 결과 | 끊긴 곳 | 근거 ADR · 함수 · 테스트 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-01 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0001(accepted), ADR-0002(accepted), ADR-0003(accepted), ADR-0006(accepted), ADR-0016(accepted); domToVNode, vnodeToDom, equalScreen; dom.test.ts, vnode.test.ts |
| FR-02 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0002(accepted), ADR-0006(accepted), ADR-0019(accepted); htmlToVNode; phase1.test.ts, dom.test.ts, html.test.ts |
| FR-03 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0006(accepted), ADR-0016(accepted); diff, applyPatch; phase1.test.ts, diff.test.ts, html.test.ts, mutation-gaps.test.ts, patch.test.ts |
| FR-04 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0004(accepted); diff, applyPatch; phase1.test.ts, diff.test.ts, mutation-gaps.test.ts, patch.test.ts |
| FR-05 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0004(accepted); diff, applyPatch; diff.test.ts |
| FR-06 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0004(accepted); diff, applyPatch, recordDom; diff.test.ts |
| FR-07 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0008(accepted); History; phase1.test.ts, history.test.ts, mutation-gaps.test.ts, patch.test.ts |
| FR-08 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0004(accepted), ADR-0006(accepted), ADR-0008(accepted), ADR-0017(accepted), ADR-0019(accepted); undo, redo, diff, applyPatch, vnodeToHtml, renderPreview; phase1.test.ts, history.test.ts, patch.test.ts |
| FR-09 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0004(accepted); diff; phase1.test.ts, diff.test.ts |
| NFR-01 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0003(accepted), ADR-0004(accepted), ADR-0005(accepted); diff, vnodeToDom, applyPatch; html.test.ts, mutation-gaps.test.ts, patch.test.ts |
| NFR-02 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0012(accepted); domToVNode, htmlToVNode, recoverPatch; phase1.test.ts, dom.test.ts, html.test.ts |
| NFR-03 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0002(accepted), ADR-0004(accepted), ADR-0005(accepted); diff, applyPatch, recoverPatch; phase1.test.ts, diff.test.ts, dom.test.ts, history.test.ts, html.test.ts, patch.test.ts |
| NFR-04 | ✓ | — | — | 검사 ✓ | — | ✓ |  | ADR-0012(accepted) |
| IR-01 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0006(accepted), ADR-0019(accepted); htmlToVNode, renderPreview; phase1.test.ts |
| IR-02 | — | — | — | 수동 ✓ | — | ✓ |  |  |
| IR-03 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0019(accepted); canUndo, canRedo; phase1.test.ts, history.test.ts |
| IR-04 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0001(accepted), ADR-0002(accepted), ADR-0016(accepted); domToVNode; dom.test.ts, vnode.test.ts |
| IR-05 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0001(accepted), ADR-0004(accepted), ADR-0005(accepted); diff; diff.test.ts |
| IR-06 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0005(accepted), ADR-0017(accepted); applyPatch, recordDom, recoverPatch; phase1.test.ts, mutation-gaps.test.ts, patch.test.ts |
| IR-09 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0003(accepted); vnodeToDom; dom.test.ts |
| IR-10 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0006(accepted), ADR-0016(accepted), ADR-0018(accepted); htmlToVNode, vnodeToHtml; html.test.ts, mutation-gaps.test.ts |
| CON-01 | ✓ | — | — | 검사 ✓ | — | ✓ |  | ADR-0007(accepted), ADR-0012(accepted) |
| CON-02 | ✓ | — | — | 검사 ✓ | — | ✓ |  | ADR-0007(accepted) |
| CON-03 | — | — | — | 수동 | — | — |  |  |
| CON-04 | — | — | — | 수동 ✓ | — | ✓ |  |  |
| CON-05 | ✓ | — | — | 검사 ✓ | — | ✓ |  | ADR-0011(accepted) |
| CON-07 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0006(accepted); init, renderPreview; phase1.test.ts |
| FR-10 | — | — | — | 검사 ✓ | — | ✓ |  |  |
| FR-11 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0015(accepted); mount, update; component.test.ts, mutation-gaps.test.ts |
| FR-12 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0015(accepted); render, mountTree; component.test.ts, mutation-gaps.test.ts |
| FR-13 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0015(accepted); h; phase2.test.ts, h.test.ts |
| FR-14 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0015(accepted); scheduleUpdate, update, diff, applyPatch; phase2.test.ts, hooks.test.ts |
| FR-15 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0010(accepted); useState, HookCallError; phase2.test.ts, h.test.ts |
| FR-16 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0010(accepted); useState; hooks.test.ts |
| FR-17 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0010(accepted); useState, scheduleUpdate; phase2.test.ts, hooks.test.ts |
| FR-18 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0010(accepted); useEffect, update; phase2.test.ts, hooks.test.ts |
| FR-19 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0010(accepted); useEffect, depsChanged; phase2.test.ts, hooks.test.ts |
| FR-20 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0010(accepted); useMemo; phase2.test.ts, hooks.test.ts |
| FR-21 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0010(accepted); HookCallError, HookOrderError; hooks.test.ts |
| FR-22 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ADR-0001(accepted), ADR-0015(accepted); update, diff, applyPatch, recoverPatch; phase2.test.ts, component.test.ts, mutation-gaps.test.ts |
| FR-23 | — | — | — | 수동 ✓ | — | ✓ |  |  |
| IR-07 | — | — | — | 수동 ✓ | — | ✓ |  |  |
| IR-08 | — | ✓ | ✓ | ✓ | ✓ | ✓ |  | useState, scheduleUpdate; phase2.test.ts, hooks.test.ts |
| CON-06 | — | ✓ | ✓ | ✓ | ✓ | ✓ |  | useState, HookCallError; phase2.test.ts, h.test.ts, hooks.test.ts |

## 4. VT 49개 증거

| VT | 요구사항 | 증거 종류 | 상태 | 근거 |
| --- | --- | --- | --- | --- |
| VT-01 | FR-01 | 자동 | 통과 | 테스트 통과 12건; tests/unit/dom.test.ts, tests/unit/vnode.test.ts |
| VT-02 | FR-01, FR-02 | 자동 | 통과 | 테스트 통과 24건; tests/unit/dom.test.ts |
| VT-03 | FR-03 | 자동 | 통과 | 테스트 통과 6건; tests/unit/diff.test.ts |
| VT-04 | FR-04, FR-05 | 자동 | 통과 | 테스트 통과 6건; tests/unit/diff.test.ts |
| VT-05 | FR-06 | 자동 | 통과 | 테스트 통과 4건; tests/unit/diff.test.ts |
| VT-06 | FR-03, FR-07 | 자동 | 통과 | 테스트 통과 14건; tests/unit/mutation-gaps.test.ts, tests/unit/patch.test.ts |
| VT-07 | FR-07 | 자동 | 통과 | 테스트 통과 6건; tests/unit/history.test.ts |
| VT-08 | FR-08 | 자동 | 통과 | 테스트 통과 4건; tests/integration/phase1.test.ts |
| VT-09 | FR-08 | 자동 | 통과 | 테스트 통과 4건; tests/integration/phase1.test.ts |
| VT-10 | FR-11, FR-12 | 자동 | 통과 | 테스트 통과 7건; tests/unit/component.test.ts, tests/unit/mutation-gaps.test.ts |
| VT-11 | FR-13, FR-15 | 자동 | 통과 | 테스트 통과 17건; tests/integration/phase2.test.ts, tests/unit/h.test.ts |
| VT-12 | FR-16 | 자동 | 통과 | 테스트 통과 4건; tests/unit/hooks.test.ts |
| VT-13 | FR-14, FR-17 | 자동 | 통과 | 테스트 통과 20건; tests/integration/phase2.test.ts, tests/unit/hooks.test.ts |
| VT-14 | FR-18, FR-19 | 자동 | 통과 | 테스트 통과 21건; tests/integration/phase2.test.ts, tests/unit/hooks.test.ts |
| VT-15 | FR-20 | 자동 | 통과 | 테스트 통과 9건; tests/integration/phase2.test.ts, tests/unit/hooks.test.ts |
| VT-16 | FR-21 | 자동 | 통과 | 테스트 통과 12건; tests/unit/hooks.test.ts |
| VT-17 | FR-22 | 자동 | 통과 | 테스트 통과 16건; tests/integration/phase2.test.ts, tests/unit/component.test.ts, tests/unit/mutation-gaps.test.ts |
| VT-18 | FR-23 | 수동 | 통과 | 수동 체크리스트 체크됨 |
| VT-19 | TBD-05 | 자동 | 통과 | 테스트 통과 19건; tests/unit/mutation-gaps.test.ts, tests/unit/scheduler.test.ts |
| VT-20 | NFR-01 | 자동 | 통과 | 테스트 통과 7건; tests/unit/mutation-gaps.test.ts, tests/unit/patch.test.ts |
| VT-21 | NFR-02, NFR-03 | 자동 | 통과 | 테스트 통과 8건; tests/integration/phase1.test.ts, tests/unit/dom.test.ts, tests/unit/html.test.ts |
| VT-22 | FR-10, NFR-04 | 검토/자동 | 통과 | 테스트 통과 4건; tests/unit/vnode.test.ts |
| VT-23 | CON-01, CON-02 | 스크립트 | 통과 | 하네스 스크립트 통과 |
| VT-24 | CON-04 | 수동 | 통과 | 수동 체크리스트 체크됨 |
| VT-25 | NFR-03 | 자동 | 통과 | 테스트 통과 3건; tests/unit/dom.test.ts |
| VT-26 | NFR-03 | 자동 | 통과 | 테스트 통과 3건; tests/unit/dom.test.ts |
| VT-27 | NFR-03 | 자동 | 통과 | 테스트 통과 3건; tests/unit/diff.test.ts |
| VT-28 | NFR-03 | 자동 | 통과 | 테스트 통과 3건; tests/unit/diff.test.ts |
| VT-29 | NFR-03 | 자동 | 통과 | 테스트 통과 2건; tests/unit/patch.test.ts |
| VT-30 | NFR-03 | 자동 | 통과 | 테스트 통과 4건; tests/unit/history.test.ts |
| VT-31 | NFR-03 | 자동 | 통과 | 테스트 통과 12건; tests/integration/phase1.test.ts, tests/unit/patch.test.ts |
| VT-32 | PR-03 | 수동 | 통과 | 수동 체크리스트 체크됨 |
| VT-33 | PR-04 | 수동 | 통과 | 수동 체크리스트 체크됨 |
| VT-34 | PR-05 | 수동 | 통과 | 수동 체크리스트 체크됨 |
| VT-35 | CON-05 | 스크립트 | 통과 | 하네스 스크립트 통과 |
| VT-36 | FR-09 | 자동 | 통과 | 테스트 통과 14건; tests/integration/phase1.test.ts, tests/unit/diff.test.ts |
| VT-37 | FR-01 | 자동 | 통과 | 테스트 통과 6건; tests/unit/dom.test.ts |
| VT-38 | FR-01, IR-09 | 자동 | 통과 | 테스트 통과 8건; tests/unit/dom.test.ts |
| VT-39 | FR-03, NFR-01 | 자동 | 통과 | 테스트 통과 24건; tests/unit/html.test.ts, tests/unit/mutation-gaps.test.ts |
| VT-40 | FR-02, IR-01 | 자동 | 통과 | 테스트 통과 7건; tests/integration/phase1.test.ts |
| VT-41 | FR-03, CON-07 | 자동 | 통과 | 테스트 통과 9건; tests/integration/phase1.test.ts |
| VT-42 | FR-02 | 자동 | 통과 | 테스트 통과 2건; tests/unit/html.test.ts |
| VT-43 | NFR-03 | 자동 | 통과 | 테스트 통과 4건; tests/unit/patch.test.ts |
| VT-44 | NFR-03 | 자동 | 통과 | 테스트 통과 2건; tests/unit/patch.test.ts |
| VT-45 | FR-07, FR-08, NFR-03 | 자동 | 통과 | 테스트 통과 4건; tests/unit/patch.test.ts |
| VT-46 | NFR-03 | 자동 | 통과 | 테스트 통과 12건; tests/unit/diff.test.ts, tests/unit/dom.test.ts, tests/unit/patch.test.ts |
| VT-47 | FR-07 | 자동 | 통과 | 테스트 통과 6건; tests/integration/phase1.test.ts |
| VT-48 | FR-08 | 자동 | 통과 | 테스트 통과 14건; tests/integration/phase1.test.ts |
| VT-49 | FR-08 | 자동 | 통과 | 테스트 통과 4건; tests/integration/phase1.test.ts |
| VT-50 | TBD-14 | 자동 | 통과 | 테스트 통과 8건; tests/unit/slice.test.ts |
| VT-51 | TBD-12, TBD-14 | 자동 | 통과 | 테스트 통과 14건; tests/integration/lab.test.ts, tests/integration/signals.test.ts, tests/integration/virtual.test.ts |

## 5. 다음에 할 일 (자동 추출)

