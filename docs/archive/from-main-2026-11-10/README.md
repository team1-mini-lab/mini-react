# main에서 온 옛 문서 (2026-11-10 병합 때 보관)

PR #54를 main과 병합할 때 main에만 있던 옛 버전 문서를 지우지 않고 여기에 모았다.
기준 문서는 `docs/SRS_fixed.md`, `docs/specs/SDD_final_*.md`, `docs/adr/ADR-00xx-*.md`다 (final이 기준, 나머지는 보관).

- `SDD.md` (v0.5), `SDD_fixed_phase2.md`, `SDD_one_page.md`, `issue.md`, `리액트 issue.md`
- `adr/`: main의 `adr_00xx_*.md`와 루트에 올렸던 `ADR 00xx [설계] ….md` (내용은 `docs/adr/ADR-00xx-*.md`로 옮겨져 있음)

충돌한 `SRS_fixed.md`(main 1.3 → 이 브랜치 1.6), `docs/adr/README.md`, `scripts/check_docs.py`, ADR 파일 이름 변경은 이 브랜치 쪽을 썼다. 이 브랜치가 main의 내용을 이어서 고친 최신본이기 때문이다.
