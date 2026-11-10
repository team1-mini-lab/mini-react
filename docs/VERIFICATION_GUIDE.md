# mini-react 검증 가이드

2026-11-10 · v0.2 · 대상: 팀원 누구나 (처음 하는 사람 기준)

> **v0.2**: 기준 문서를 `docs/specs/SDD_final_phase1.md`·`SDD_final_phase2.md`, SRS v1.4로 바꿈. 하네스 명령(`check:docs`, `check:stack`, `test:harness`) 갱신. Hermes 실행을 `scripts/hermes/review.sh`로 바꿔 오류 결과가 "검토 완료"처럼 남지 않게 함. 2단계(설계 타당성) 절차를 영역별로 다시 씀.
> 3~5단계에 남은 옛 절 번호는 이렇게 읽는다: "SDD 3장" = `SDD_final_phase1.md` 2~7장, "SDD 6.x" = 9.4, "SDD 8.x" = 10장, "부록 A" = 같은 문서 부록 A.

> 이 문서 하나만 보고 **문서 → 설계 → 스크립트 → 구현 → 테스트** 다섯 단계를 순서대로 검토할 수 있게 만들었다.
> 명령은 전부 복사해서 붙여 넣으면 된다. 모든 명령은 **저장소 맨 위 폴더(`mini-react/`)** 에서 실행한다.

---

## 0. 한 장 요약

레고 집 짓기로 생각하자.

| 단계 | 쉬운 말 | 무엇을 검토하나 |
| --- | --- | --- |
| 1. 문서 정합성 | 설계도 여러 장이 서로 맞는가? | SRS·SDD·ADR이 같은 말을 하는가 |
| 2. 설계 타당성 | 이 설계도대로 지으면 집이 서는가? | 규칙에 구멍(반례)이 없는가 |
| 3. 스크립트·환경 | 공구와 채점기가 준비됐는가? | Vitest·jsdom·린트·CI가 설계대로인가 |
| 4. 구현 | 설계도대로 지었는가? | 코드가 SDD 3장 규칙을 지키는가 |
| 5. 테스트 | 채점기가 정말 틀린 걸 잡는가? | 테스트가 버그를 놓치지 않는가 |

단계마다 **검토자 세 명**이 있다. 셋 다 써야 한다. 하나만 쓰면 구멍이 생긴다.

| 검토자 | 비유 | 잘하는 것 | 못하는 것 |
| --- | --- | --- | --- |
| 🤖 하네스 (`npm run ...`) | 자동 채점기 | 빠르고 매번 똑같다. 규칙 위반을 100% 잡는다 | 규칙 자체가 틀렸는지는 모른다 |
| 🧠 Hermes Agent (AI) | 꼼꼼한 친구 | 문서를 다 읽고 모순·반례를 찾아 준다 | 가끔 지어낸다. **결정 권한이 없다** |
| 🙋 사람 (팀원) | 선생님 | 최종 판단, 설계 결정 | 느리고 놓칠 수 있다 |

**규칙**: 하네스가 빨간불이면 무조건 고친다. Hermes가 "문제"라고 하면 **사람이 확인한 뒤에만** 고친다. 결정은 ADR에 남긴다.

```
문서 쓰기 ─▶ 1.정합성 ─▶ 2.설계 ─▶ 3.환경 ─▶ 4.구현 ─▶ 5.테스트 ─▶ PR 병합
               ▲                                                     │
               └──────────── 문제 발견 시 ADR 쓰고 되돌아감 ◀──────────┘
```

---

## 1. 준비하기 (처음 한 번만)

### 1-1. 필요한 프로그램

| 프로그램 | 확인 명령 | 기대 결과 | 없으면 |
| --- | --- | --- | --- |
| Node.js 22 이상 | `node -v` | `v22.x.x` 이상 | https://nodejs.org 에서 LTS 설치 |
| npm | `npm -v` | `10.x` 이상 | Node와 같이 설치됨 |
| Python 3 | `python3 --version` | `Python 3.x` | macOS는 기본 설치됨 |
| Git | `git --version` | 버전 출력 | `xcode-select --install` |

### 1-2. 패키지 설치

```bash
cd ~/Desktop/jungle/react/mini-react
npm install
```

✅ 성공: 마지막에 `added NNN packages` 가 나오고 `node_modules/` 폴더가 생긴다.

### 1-3. 처음 검사 한 번 돌려 보기

```bash
npm run verify
```

✅ 성공하면 마지막에 이렇게 보인다.

문서만 검사하려면 `npm run verify:docs`를 쓴다. 이 명령은 문서 정합성(`check:docs`)과 하네스 자체 점검(`test:harness`: 문서를 일부러 망가뜨려 하네스가 잡는지 확인)을 함께 돌린다.

```
check:docs — SRS ↔ SDD ↔ ADR 정합성 검사
  · [1] SRS 정의 ID 103개, 설계 추적표 ID 103개
  · [2] SRS 요구사항→VT 연결 62건 대조
  · [3] VT 49개 중 위치 지정 49개
  · [4] ADR·피드백 테스트 ID 127개 중 설계 반영 127개
  · [5] ADR 15개 상태 대조, superseded ['ADR-0013', 'ADR-0014']
모든 검사 통과
...
하네스 자체 점검 통과
```

`npm run verify`(전체)는 React를 걷어내기 전까지 `check:stack`에서 실패하는 것이 정상이다 (6장).

여기까지 되면 준비 끝.

### 1-4. Hermes Agent 설치 (AI 검토자)

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.zshrc
hermes setup          # 처음 설정 마법사. 모델·API 키를 고른다
hermes doctor         # 설정이 잘 됐는지 확인
```

- 모델은 **긴 문서를 읽을 수 있는 것**(문맥 64K 토큰 이상)으로 고른다. 우리 문서가 길다.
- 버전에 따라 옵션 이름이 다를 수 있다. 안 되면 `hermes --help`로 확인한다.

---

## 2. 단계별 검토 방법

각 단계는 **목표 → 언제 → 🤖 하네스 → 🧠 Hermes → 🙋 사람 → 합격 기준 → 기록** 순서로 적었다.

Hermes 실행 공통 방법 (단계 이름만 바꾼다):

```bash
scripts/hermes/review.sh 1-docs          # 결과: docs/verification/results/<날짜-시각>-1-docs-<커밋>.md
scripts/hermes/review.sh 2-design C      # 2단계는 영역(A~F)을 나눠 돌린다
```

- 이 스크립트는 `hermes -z`를 실행하고 결과 맨 위에 **날짜·커밋·브랜치·모델**을 붙인다. 커밋을 먼저 해 두면 "무엇을 검토했는지"가 결과에 남는다.
- 결과가 **오류 메시지(크레딧 부족 HTTP 402, "Your request was not processed" 등)이거나 반례 표가 없으면 실패**로 처리하고 `results/failed/`로 옮긴다. 오류 메시지가 검토 결과처럼 남는 것을 막기 위해서다.
- `-z` 는 "한 번 묻고 최종 답만 출력"이다. 대화하면서 보고 싶으면 `hermes` 를 실행하고 프롬프트 파일 내용을 붙여 넣는다.
- 다섯 단계를 한 번에 훑어보고 싶으면 `prompts/0-all-in-one.md`를 쓴다. 자세한 검토는 단계별 프롬프트가 낫다.
- 프롬프트는 전부 "**파일을 고치지 말고 읽기만**" 하라고 적혀 있다. Hermes가 파일을 고치려 하면 거절한다.
- 결과 파일을 열어 **표의 "문제" 줄을 사람이 하나씩 확인**한다. 근거(파일·절 번호)가 실제로 그렇게 적혀 있는지 직접 열어 본다. 근거가 틀리면 그 줄은 버린다.

---

### 1단계. 기획·설계 문서 정합성

**목표**: SRS(무엇을 만들까), SDD(어떻게 만들까), ADR(왜 그렇게 정했나)이 서로 같은 말을 한다.

**언제**: 문서를 고칠 때마다, PR 올리기 전.

**🤖 하네스**

```bash
npm run check:docs
```

이 명령이 하는 일 (`scripts/check_docs.py`, `SDD_final_phase1.md` 10.2):
- SRS의 모든 ID(FR, NFR, IR, CON, VT, TBD)가 설계 추적표(phase1 9.3, phase2 6.1)에 하나씩 있고, 설계에만 있는 ID가 없는지
- SRS 4장의 "요구사항 → VT" 연결이 설계 추적표에도 있는지, 모든 VT의 테스트 위치가 정해졌는지
- ADR·피드백 문서의 테스트 ID(T, S, D, P, R, TA, H, U, HL, TV, C, B, K, HR, TD)가 설계 문서에 있는지
- ADR 목록(README)과 파일의 status가 같고, superseded ADR(0013, 0014)을 근거로 인용하지 않는지
- 지운 설계 용어(`PatchError`, `goTo(`, `unmount(` 등)가 설계 본문에 남지 않았는지

✅ 통과: `모든 검사 통과`
❌ 실패: 항목 번호([1]~[6])와 위치가 출력된다 → 해당 표를 고친다. 하네스 자체가 믿을 만한지는 `npm run test:harness`로 확인한다.

**🧠 Hermes**

```bash
hermes -z "$(cat docs/verification/prompts/1-docs.md)" > docs/verification/results/$(date +%F)-1-docs.md
```

하네스는 "ID가 있는가"만 본다. Hermes는 "**내용이 같은가**"를 본다. 예: SRS는 "기록 50개"라 하고 SDD는 "100개"라고 하는 곳.

**🙋 사람 체크리스트**

- [ ] SRS 6장 TBD의 결정이 ADR status와 맞는다 (proposed인 ADR을 확정처럼 쓰지 않았다)
- [ ] `SDD_final_phase1.md` 1.2 심볼 대응표에 있는 이름만 코드에서 쓴다
- [ ] Hermes 결과의 "문제" 줄을 전부 확인하고, 진짜 문제만 이슈로 만들었다

**합격 기준**: 하네스 통과 + Hermes "문제" 줄이 전부 "고침" 또는 "문제 아님(이유)"으로 처리됨.

---

### 2단계. 설계가 잘 되었는가

**목표**: 설계대로 만들면 요구사항이 정말 충족된다. 규칙에 구멍(반례)이 없다.

**언제**: ADR을 proposed → accepted로 바꾸기 전, 그리고 구현을 시작하기 전.

**🤖 하네스**: 설계가 **옳은지**는 기계가 판정할 수 없다(`SDD_final_phase1.md` 10장). 하네스가 하는 일은 그 앞 단계, 즉 "검토할 문서들이 서로 맞는가"(1단계 `check:docs`)다. 1단계가 통과한 뒤에 2단계를 한다. 구현 후에는 L4 불변식 테스트(10.3)가 간접 증거가 된다.

**🧠 Hermes**: 영역별로 반례를 찾게 한다. 한 번에 전부 맡기면 답이 얕아지고 토큰 한도에 걸린다.

```bash
for A in A B C D E F; do scripts/hermes/review.sh 2-design $A; done
```

| 영역 | 내용 | 설계 위치 |
| --- | --- | --- |
| A | 노드·변환·코드 왕복 | phase1 2.2, 3장 |
| B | Diff 짝짓기·순서 | phase1 4장 |
| C | Patch 적용 순서·`recordDom`·t3 복구 | phase1 5장 |
| D | History·버튼 상태·페이지 흐름 | phase1 6·7장 |
| E | Component·Hooks | phase2 2.1~2.4 |
| F | Batching | phase2 2.5 |

프롬프트(`prompts/2-design.md`)는 Hermes에게 **입력 → 설계대로 손으로 따라간 결과 → 기대 결과 → 근거 절**을 반드시 쓰게 하고, "반례 없음"이면 확인한 시나리오를 적게 한다. 이미 `docs/reviews/`(팀 피드백)에서 다룬 것은 "기존 한계"로만 표시하게 한다.

**검토자를 나눠 쓴다**: 문서를 쓴 AI와 같은 모델이 검토하면 같은 맹점을 공유한다. 같은 영역을 **서로 다른 모델 두 개**(예: Hermes에 연결한 Gemini, 그리고 Claude)로 돌리고, 둘 다 낸 반례부터 본다.

**🙋 사람**: Hermes 반례 표의 줄마다 아래 셋 중 하나를 결과 파일 옆에 적는다(`results/<파일>.review.md`).

| 판정 | 할 일 |
| --- | --- |
| 진짜 반례 | 그 입력을 ADR Confirmation 표에 새 테스트 ID로 추가(예: `P13`) → 설계 수정이 필요하면 ADR·피드백 문서 갱신 → SDD 갱신 → `check:docs` |
| 기존 한계 | ADR "알려진 한계"나 SDD 11장에 이미 있는지 확인, 없으면 추가 |
| 아님 | 손으로 따라가 본 결과와 이유를 한 줄로 적는다 |

- [ ] SDD 11장·Phase 2 7장의 열린 항목마다 팀 결정이 ADR(또는 피드백 문서)에 적혔다
- [ ] "재확인 필요" 절(ADR-0001, 0002 4절, 0004 1절, 0005 6절, 0006 8절)을 팀이 재확인했다
- [ ] 부록 B 질문 카드를 담당자가 문서를 보지 않고 말로 답할 수 있다

**합격 기준**: 영역 A~F 모두 Hermes 결과가 `results/`(failed 아님)에 있고, 반례 표의 모든 줄에 사람 판정이 있으며, 진짜 반례는 전부 테스트 ID로 ADR에 들어갔다. 그 뒤 ADR을 accepted로 바꾸고 `check:docs`를 다시 통과시킨다. **이 기준을 넘어야 Phase 1 구현을 시작한다.**

---

### 3단계. 구현 준비 (스크립트·테스트 환경) 가 잘 구성되었는가

**목표**: 공구(Vite, TypeScript)와 채점기(Vitest, jsdom, 린트, CI)가 SDD 6장·8장대로 준비되었다.

**언제**: 환경 설정 파일을 고칠 때마다.

**🤖 하네스**

```bash
npm run typecheck     # L1: TypeScript strict 타입 검사
npm run lint          # L2: 설계 규칙 (DOM 쓰기 위치, diff의 dom 금지)
npm run check:arch    # L2: 의존 방향 (core → component 금지 등)
npm test              # L3: 테스트 (지금은 환경 확인 테스트 5개)
```

**채점기가 진짜 작동하는지 일부러 틀려 보기** (꼭 해 보자. 3분이면 된다)

| 실습 | 명령 | 기대 결과 |
| --- | --- | --- |
| ① jsdom을 빼면 테스트가 깨지나? | `npx vitest run --environment node` | `FAIL ... document is not defined` 3개 |
| ② diff.ts에서 dom을 읽으면 막히나? | `echo 'export const f = (v: {dom?: Node}) => v.dom;' \| npx eslint --stdin --stdin-filename src/core/diff.ts` | `Diff는 dom을 읽지 않는다` 오류 |
| ③ 페이지에서 innerHTML을 쓰면 막히나? | `echo 'export const g = (e: Element) => { e.innerHTML = "x"; };' \| npx eslint --stdin --stdin-filename src/pages/phase1/main.ts` | `innerHTML 등 직접 대입 금지` 오류 |

세 개 다 빨간불이 나와야 정상이다. 초록불이면 채점기가 고장 난 것이다.

**🧠 Hermes**

```bash
hermes -z "$(cat docs/verification/prompts/3-scripts.md)" > docs/verification/results/$(date +%F)-3-scripts.md
```

**🙋 사람 체크리스트**

- [ ] 위 실습 ①②③을 직접 해 봤다
- [ ] GitHub 저장소 Settings → Branches에서 `main` 보호 규칙에 `verify`를 필수 체크로 등록했다 (SDD 8.6)
- [ ] 새 팀원이 1장만 보고 `npm run verify`까지 성공했다

**합격 기준**: `npm run verify` 통과 + 실습 3개 모두 빨간불 + CI 필수 체크 등록.

---

### 4단계. 구현이 잘 되었는가

**목표**: 코드가 SDD 3장 규칙과 부록 A 함수 명세를 그대로 따른다.

**언제**: 모듈(파일) 하나를 끝낼 때마다, PR마다.

**🤖 하네스**

```bash
npm run verify          # 전부 한 번에
npx vitest              # 개발 중: 저장할 때마다 자동으로 다시 돌아간다 (끄려면 q)
npx vitest -t VT-36     # 특정 VT만
```

- `typecheck`가 부록 A 시그니처와 다른 코드를 잡는다.
- `lint`가 "DOM은 patch.ts만" 규칙 위반을 잡는다.
- 구현 후 L4 불변식(SDD 8.3)을 추가하면 "Patch 후 화면 = 새 트리"를 무작위 입력 300개로 확인한다.

**🧠 Hermes**: 프롬프트의 `{{파일 경로}}` 부분을 리뷰할 파일로 바꿔서 실행한다.

```bash
sed 's#{{파일 경로를 여기에 적는다. 예: src/core/diff.ts}}#src/core/diff.ts#' docs/verification/prompts/4-code.md > /tmp/p.md
hermes -z "$(cat /tmp/p.md)" > docs/verification/results/$(date +%F)-4-code-diff.md
```

**🙋 사람 체크리스트 (PR 리뷰)**

- [ ] PR 작성자가 부록 B 질문 카드 중 자기 모듈 질문에 말로 답했다
- [ ] 설계를 바꿨다면 ADR 링크가 PR에 있다
- [ ] `src/` 어디에도 실제 영역을 `innerHTML`로 통째 바꾸는 코드가 없다
- [ ] SDD 6.5 수동 체크리스트를 브라우저(`npm run dev` → `http://localhost:5173/src/pages/phase1/`)에서 확인했다

**합격 기준**: `npm run verify` 통과 + Hermes "어긴 규칙" 줄 처리 + 리뷰어 1명 승인.

---

### 5단계. 테스트(Vitest + jsdom)로 검증이 잘 되었는가

**목표**: 테스트가 "통과했다"가 아니라 "**틀리면 반드시 실패한다**"를 확인한다. 채점기를 채점하는 단계다.

**언제**: 모듈 테스트를 다 썼을 때, Phase 1 완료 시.

**🤖 하네스**

```bash
npm run check:vt        # SRS의 VT 49개 중 테스트가 없는 것 목록
npm run test:coverage   # 커버리지. core·component 구문 90% 이상이어야 함 (SRS TBD-06)
```

- `check:vt`는 지금 "보고만" 한다. Phase 1이 끝나면 `python3 scripts/check_vt_tests.py --strict`로 바꿔 `verify`에 넣는다 → 빠진 VT가 있으면 실패한다.
- 커버리지 보고서: `coverage/index.html`을 브라우저로 연다. 빨간 줄 = 테스트가 한 번도 안 지나간 코드.

**일부러 버그 넣기 (손으로 하는 뮤테이션 테스트)**

테스트가 진짜 일하는지 보는 가장 쉬운 방법이다. 구현이 끝난 뒤 아래처럼 한 줄씩 망가뜨리고 `npm test`를 돌린다. **반드시 빨간불**이 나와야 한다. 확인 후 `git checkout -- <파일>`로 되돌린다.

| 망가뜨릴 곳 | 이렇게 바꾼다 | 잡아야 할 VT |
| --- | --- | --- |
| `diff.ts` 텍스트 비교 | `!==` → `===` | VT-04 |
| `diff.ts` key 짝짓기 | key 장부를 안 쓰고 순서로만 짝짓기 | VT-36 |
| `patch.ts` 0단계 확인 | 확인 코드 주석 처리 | VT-31 |
| `patch.ts` 2단계 | `n.dom = o.dom` 줄 삭제 | VT-43 |
| `history.ts` push | 뒤쪽 기록 지우는 줄 삭제 | VT-07 |
| `dom.ts` 공백 | 정규식을 `\s+`로 | ADR-0002 T 테스트 |

초록불이 나오면 → 그 VT의 테스트가 부족하다 → 테스트를 보강한다.
여유가 있으면 Stryker(`npx stryker run`, SDD 8.2 L7)로 자동화한다.

**🧠 Hermes**

```bash
hermes -z "$(cat docs/verification/prompts/5-tests.md)" > docs/verification/results/$(date +%F)-5-tests.md
```

"구현이 틀려도 통과할 것 같은 테스트"와 "넣어 볼 버그"를 받는다. 받은 버그를 위 표에 추가해서 직접 넣어 본다.

**🙋 사람 체크리스트**

- [ ] 테스트 이름마다 `[VT-xx]`와 ADR 테스트 ID가 붙어 있다 (예: `[VT-36][D6]`)
- [ ] 위 "일부러 버그 넣기" 표를 전부 해 봤고 모두 빨간불이었다
- [ ] jsdom이 못 하는 것(스크롤, 커서 위치)은 테스트가 아니라 6.5 수동 체크리스트로 확인했다

**합격 기준**: `check:vt --strict` 통과 + 커버리지 90% + 일부러 넣은 버그 전부 잡힘.

---

## 3. 검증 기록 남기기

검증은 **했다는 증거**가 남아야 한다. 단계를 한 번 돌 때마다 `docs/verification/log-YYYY-MM-DD.md`를 만든다. 아래 틀을 복사한다.

```markdown
# 검증 기록 YYYY-MM-DD

검토자: (이름) · 대상 커밋: (git rev-parse --short HEAD 결과)

| 단계 | 🤖 하네스 결과 | 🧠 Hermes 결과 파일 | 🙋 사람 확인 | 판정 |
| --- | --- | --- | --- | --- |
| 1 문서 | check:docs 통과 | results/YYYY-MM-DD-1-docs.md | 문제 3건 중 2건 고침, 1건 문제 아님(이유) | 통과 |
| 2 설계 | (해당 없음) | ... | ... | ... |
| 3 환경 | verify 통과, 실습 3개 빨간불 | ... | ... | ... |
| 4 구현 | ... | ... | ... | ... |
| 5 테스트 | check:vt 누락 N개, 커버리지 N% | ... | ... | ... |

## 발견한 문제와 처리
- (문제) → (처리: 고침 PR #번호 / ADR-00xx / 문제 아님 이유)
```

- 명령 결과는 직접 붙여 넣는다: `npm run verify 2>&1 | tee docs/verification/results/$(date +%F)-verify.txt`
- Hermes 대화 전체가 필요하면: `hermes sessions export`
- 기록 파일도 PR에 같이 올린다.

---

## 3-1. 하네스 루프와 보고서 (`npm run report`, GitHub Actions)

`scripts/report.py`가 모든 검사를 한 번에 돌리고 `report/REPORT.md`를 만든다. **결론(관문 통과/멈춤)은 이 스크립트만 쓴다.**

| 관문 | 통과 조건 | 근거 표준 |
| --- | --- | --- |
| G1 SRS–SDD 정합성 | `check:docs`·`test:harness` 통과, `1-docs` AI 지적 전부 판정 | IEEE 1012 요구사항·설계 V&V(추적성 분석), ISO/IEC/IEEE 29148 추적성 |
| G2 SDD 설계 검증 | `2-design` 영역 A~F, 검토자(모델) 2명 이상, 반례 전부 사람 판정(`*.review.md`), ADR proposed·재확인 0, 열린 설계 항목 0 | IEEE 1012 설계 V&V, IEEE 1028 검토 |
| G3 구현 | `typecheck`·`check:stack`·`check:arch`·`lint` 통과 | IEEE 1012 구현 V&V |
| G4 VT 검증 | 테스트 전부 통과, 커버리지·뮤테이션 기준, VT 49개 증거(`check:vt`), 요구사항 사슬(`check:trace`) 끊김 0 | IEEE 1012 시험 V&V, ISO/IEC/IEEE 29119-3 테스트 완료 보고 |

- **요구사항 사슬** (`check:trace`): SRS 요구사항 → SDD 추적표의 함수 이름 → 부록 A의 파일 → 코드에 그 함수가 있음 → 그 요구사항의 VT 테스트가 그 파일을 import → 테스트 통과. 한 칸이라도 끊기면 표에 ✗.
- **사람 판정 파일**: AI 검토 결과 `X.md` 옆에 `X.review.md`를 두고 번호마다 `진짜 반례 / 기존 한계 / 아님`을 적는다. 판정이 없으면 G1·G2가 통과하지 않는다.
- **필수 관문**: 저장소 Settings → Secrets and variables → Actions → Variables에 `REQUIRED_GATES`를 둔다. 지금은 `G1`. 설계 검증이 끝나면 `G1,G2`, 구현을 시작하면 `G1,G2,G3`, 마지막에 `G1,G2,G3,G4`.
- **CI 설치 (한 번)**: `cp scripts/ci/verify.yml .github/workflows/verify.yml` 후 커밋. PR마다, 그리고 main에 머지될 때마다 실행되고, PR에는 보고서가 댓글로(하나를 계속 고쳐 씀), Actions 화면에는 요약으로, 아티팩트에는 `report/` 전체가 남는다.

## 4. Vitest + jsdom 테스트 환경을 처음부터 만드는 법 (재현 절차)

이미 저장소에 다 되어 있다. **왜 이렇게 했는지 이해하고 싶거나, 새 프로젝트에서 똑같이 하고 싶을 때** 따라 한다.

### 4-1. 패키지 설치

```bash
npm init -y
npm install -D typescript vite vitest @vitest/coverage-v8 jsdom \
  eslint typescript-eslint dependency-cruiser fast-check
```

| 패키지 | 하는 일 | 비유 |
| --- | --- | --- |
| typescript | 타입 검사 (L1) | 맞춤법 검사기 |
| vite | 개발 서버, 빌드 | 작업대 |
| vitest | 테스트 실행기 (L3) | 채점기 |
| jsdom | Node 안의 가짜 브라우저 | 연습용 레고판 |
| @vitest/coverage-v8 | 커버리지 측정 | 형광펜 |
| eslint, typescript-eslint | 설계 규칙 검사 (L2) | 반장 |
| dependency-cruiser | 의존 방향 검사 (L2) | 출입 통제 |
| fast-check | 무작위 입력 테스트 (L4) | 아무 문제나 내는 기계 |

### 4-2. 설정 파일 (저장소에 있는 파일 그대로)

| 파일 | 핵심 내용 | 근거 |
| --- | --- | --- |
| `package.json` | `"type": "module"`, scripts (`typecheck`, `lint`, `check:arch`, `check:docs`, `check:vt`, `test`, `test:coverage`, `verify`) | SDD 8.5 |
| `tsconfig.json` | `strict: true`, `lib`에 `DOM`, `types: ["vitest/globals"]`, `moduleDetection: "force"`(빈 파일도 모듈로) | ADR-0007 |
| `vite.config.ts` | `test.environment: 'jsdom'`, `globals: true`, `include: tests/**/*.test.ts`, 커버리지 대상 core·component, 기준 90% | SDD 6.1 |
| `eslint.config.js` | DOM 쓰기 금지(patch.ts·dom.ts·preview.ts 제외), innerHTML 대입 금지, diff.ts의 `.dom` 금지 | SDD 8.4 |
| `.dependency-cruiser.cjs` | core → component·pages 금지, 순환 금지, React 등 금지 | SDD 8.4 |
| `.github/workflows/verify.yml` | PR마다 `npm ci && npm run verify` | SDD 8.6 |

`environment: 'jsdom'` 한 줄이 핵심이다. 이 줄이 없으면 테스트 안에서 `document`가 없다 (3단계 실습 ①에서 확인).

### 4-3. 테스트 도우미 (`tests/helpers/`, SDD 6.3)

| 파일 | 함수 | 쓰는 법 |
| --- | --- | --- |
| `count-mutations.ts` | `await countMutations(root, () => applyPatch(r))` | DOM이 몇 번 바뀌었는지 센다. "변경 없는 Patch는 0번" 확인용 |
| `same-node.ts` | `const d = captureDom(v)` → Patch → `expectSameNode(d, newV)` | 실제 노드가 그대로인지(입력값 유지) 확인 |
| `strip-dom.ts` | `stripDom(v)` | `dom` 키를 지운 복사본. Diff가 dom을 안 본다는 걸 확인 |
| `fixture.ts` | `mountFrame('<div>…</div>')` | 가짜 문서에 `#real-area` 틀을 붙인다 |

### 4-4. 첫 테스트로 환경 확인 (`tests/env.test.ts`, VT-35)

다섯 가지를 확인한다: `document`가 있다 / `<template>`가 된다 / MutationObserver가 된다 / 가짜 타이머로 0.3초를 건너뛸 수 있다 / `stripDom`이 맞게 동작한다.

```bash
npm test
```

✅ `Tests 5 passed (5)`

### 4-5. 테스트 쓰는 규칙

```ts
// tests/unit/diff.test.ts 예시
import { diff } from '../../src/core/diff';
import { h } from '../../src/core/vnode';

describe('diff', () => {
  it('[VT-04][D3] 글자만 바뀌면 text 변경 1개', () => {
    const a = h('p', null, 'a');
    const b = h('p', null, 'b');
    const { changes } = diff(a, b);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.kind).toBe('text');
  });
});
```

- 파일 위치는 SDD 6.2 표를 따른다 (`tests/unit/모듈이름.test.ts`).
- 이름에 `[VT-xx]`를 붙여야 `check:vt`가 센다.
- 합격 기준은 SRS 4장과 ADR Confirmation 표에서 그대로 가져온다. 테스트에서 새로 만들지 않는다.

---

## 5. 막혔을 때

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| `document is not defined` | jsdom 환경이 아님 | `vite.config.ts`에 `environment: 'jsdom'` 확인 |
| `Cannot find module 'vitest/config'` | 설치 안 됨 | `npm install` |
| `python3: command not found` | Python 없음 | `xcode-select --install` |
| `Resource deadlock avoided` | Desktop 폴더 iCloud 동기화 중 파일이 내려받아지지 않음 | Finder에서 파일 우클릭 → "지금 다운로드", 또는 저장소를 iCloud 밖으로 옮기기 |
| `hermes: command not found` | 설치 후 셸 새로고침 안 함 | `source ~/.zshrc` |
| 결과 파일이 `HTTP 402`, `credits exhausted` | 모델 제공처(OpenRouter 등) 크레딧 부족, 또는 요청한 최대 출력 토큰(max_tokens)이 남은 크레딧보다 큼 | 최대 출력 토큰을 낮추거나(예: 8천), 무료 사용량이 있는 제공처의 키(예: Google AI Studio의 Gemini 키)로 바꾼다. `hermes model`로 지금 연결을 확인 |
| Hermes 옵션 오류 | 버전 차이 | `hermes --help`, `hermes chat --help` |
| Hermes가 근거 없는 말을 함 | AI가 지어냄 | 근거 파일·절을 직접 열어 확인하고 버린다. 프롬프트에 "지어내지 않는다"가 있어도 생긴다 |

---

## 6. 지금 상태 (2026-11-10, v0.2)

| 단계 | 상태 | 다음 할 일 |
| --- | --- | --- |
| 1 문서 | 🤖 `check:docs` 통과 (SRS v1.4 ID 103개, VT 49개 위치, ADR·피드백 테스트 ID 127개, ADR 15개 상태). `test:harness` 통과 (11가지 변형 전부 잡음). 🧠 이전 결과 3개는 크레딧 오류라 무효 | `review.sh 1-docs` |
| 2 설계 | ADR-0008~0012·0015 proposed, 5개 ADR에 "재확인 필요" 절. SDD 11장·Phase 2 7장에 열린 항목 11개 | `review.sh 2-design A`~`F` + 팀 회의 |
| 3 환경 | `check:stack` 실패 16건 (React·JSX·`strict` 꺼짐). eslint·dependency-cruiser 설치 안 됨. 깨끗한 `npm ci`가 esbuild 버전 충돌로 실패 | Phase 1 구현 시작 때 React 제거·하네스 복구 |
| 4 구현 | `src/core`는 이전 설계(t2+t3 혼합) 기준 초안. 페이지는 React(`src/App.tsx`) | 2단계 합격 후 SDD 기준으로 다시 작성 |
| 5 테스트 | 25개 통과, VT 49개 중 자동 테스트 12개 | 구현과 함께 9.4 표대로 작성 |

자세한 실행 기록은 `docs/verification/log-2026-11-10.md`와 `docs/verification/runs/`.
