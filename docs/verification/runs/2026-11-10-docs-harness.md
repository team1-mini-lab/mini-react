# 하네스 실행 기록 — 문서 정합성 (2026-11-10)

| 항목 | 값 |
| --- | --- |
| 실행자 | Claude (Cowork), 사용자 로컬 폴더 `~/Desktop/jungle/react/mini-react` |
| 브랜치 | `feature/phase1-hermes-setup` (기준 커밋 `8186796` + 커밋 안 된 문서 수정) |
| 대상 | `docs/SRS_fixed.md` v1.4, `docs/specs/SDD_final_phase1.md` v1.1, `docs/specs/SDD_final_phase2.md` v1.1, `docs/adr/` |

## 1. 고치기 전 (SRS v1.3 + SDD Final v1.0) — 새 `check_docs.py`로 검사

실패 45건. 요약:

- [구조] 두 SDD 모두 SRS ID 추적표와 VT별 테스트 위치 표가 없음 → SRS ID 103개 전부 "설계에 없음", VT 49개 전부 "테스트 위치 없음"
- [5] ADR-0013·0014: README는 superseded, 파일은 proposed
- [5] SRS IR-04·IR-06·VT-31이 superseded ADR-0013·0014를 근거로 인용 (t3·s2 결정이 SRS에 반영 안 됨)
- (따로 발견) ADR-0007 파일이 이 폴더에 없음, ADR-0001·0005가 컴포넌트 렌더링 ADR을 옛 번호 ADR-0013으로 인용

> 이전 `check_docs.py`는 ID 65개를 코드에 박아 두고 보관용 `SDD-3.md`에 문자열이 있는지만 봐서 위 문제를 잡지 못했다.

## 2. 고친 뒤

```
check:docs — SRS ↔ SDD ↔ ADR 정합성 검사
  · [1] SRS 정의 ID 103개, 설계 추적표 ID 103개
  · [2] SRS 요구사항→VT 연결 62건 대조
  · [3] VT 49개 중 위치 지정 49개
  · [4] ADR·피드백 테스트 ID 127개 중 설계 반영 127개
  · [5] ADR 15개 상태 대조, superseded ['ADR-0013', 'ADR-0014']
모든 검사 통과
```

## 3. 하네스 자체 점검 (`npm run test:harness`)

문서·코드를 일부러 망가뜨린 11가지 변형을 모두 잡음. 첫 실행에서 "[5] superseded ADR 인용"을 놓쳐 검사 규칙을 고친 뒤 통과.

## 4. 기술 스택 (`npm run check:stack`)

실패 16건 (예상된 실패): `react`, `react-dom`, `@vitejs/plugin-react`, `lucide-react`, `motion`, `@types/react*` 의존, `src/App.tsx`·`src/main.tsx`(JSX), `index.html`의 React 진입점, `tsconfig.json`의 `jsx: react-jsx`와 `strict` 꺼짐. → Phase 1 구현 단계에서 제거.

## 5. 하네스가 판정하지 않은 것

설계가 옳은지(반례). → Hermes 2단계(`scripts/hermes/review.sh 2-design A~F`)와 팀 검토. 열린 항목은 `SDD_final_phase1.md` 11장, `SDD_final_phase2.md` 7장.
