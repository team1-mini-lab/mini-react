# 코드 검토 체크리스트 (SDD_final_phase1.md 9.4 "코드 검토")

PR 리뷰에서 확인한 뒤 `[x]`로 바꾸고 커밋과 확인한 사람을 적는다. `check:vt`는 `- [x] VT-xx` 줄만 증거로 센다.

- [ ] VT-22 Diff가 `dom`·`events`를 읽지 않는다, 실제 영역 DOM 쓰기는 `core/patch.ts`에만 있다, 상태 변경 코드에 명령형 DOM 조작이 없다, `equalScreen`과 `equalTree`가 다른 함수다 — 커밋: · 확인:
