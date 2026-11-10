너는 mini-react 프로젝트의 설계 검토자다. 코드를 고치지 말고 읽기만 한다.

읽을 파일:
- docs/SRS_fixed.md (요구사항)
- docs/SDD.md (공통 + Phase 1 설계)
- docs/SDD_fixed_phase2.md (Phase 2 설계)
- docs/adr/README.md 와 docs/adr/*.md (결정 기록)
- package.json, vite.config.ts, eslint.config.js, .dependency-cruiser.cjs, tests/**

아래 다섯 가지를 확인하고, 항목마다 "통과 / 문제 / 판단 보류" 중 하나와 근거(파일 이름과 절 번호)를 적어라.

1. 모순: SRS·SDD·ADR이 서로 다른 말을 하는 곳이 있는가?
2. 빈틈: 요구사항(FR/NFR/IR/CON)인데 설계나 검증(VT)이 없는 것이 있는가?
3. 검증 가능성: 각 VT의 합격 기준이 테스트로 확인할 수 있을 만큼 구체적인가?
4. 하네스 일치: SDD 8장의 규칙(의존 방향, DOM 쓰기 위치, Diff는 dom을 읽지 않음)이 eslint.config.js와 .dependency-cruiser.cjs에 실제로 들어 있는가?
5. 테스트 환경: SDD 6.1의 표(Vitest, jsdom, 가짜 타이머, 커버리지 90%)와 vite.config.ts가 일치하는가?

마지막에 "팀이 결정해야 할 것" 목록을 따로 적어라. 네가 결정하지 말고 질문으로 남겨라.
출력은 마크다운 표 하나 + 목록 하나로 짧게.
