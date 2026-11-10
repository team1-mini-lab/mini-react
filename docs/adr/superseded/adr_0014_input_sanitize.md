# ADR-0014: DOM → Virtual DOM 변환은 `<script>` 요소, `on*` 속성, `javascript:` 주소를 Virtual DOM에 넣지 않는다

| 항목 | 값 |
|---|---|
| status | superseded |
| superseded by | ADR-0002 4절 s2 (피드백 02 5-1절, 2026-11-10) |
| date | 2026-11-10 |
| decision-makers | [팀원 이름] |
| consulted | @ksomang, @hnjee, @onekindalpha |
| informed | [팀원 전체] |
| 보완 대상 | ADR-0002 (DOM → Virtual DOM 변환), ADR-0006 (테스트 영역) |
| 복구 출처 | 구 eungi adr_003 "테스트 영역 수정 방식"의 입력 정제 부분 ([원문](https://github.com/team1-mini-lab/mini-react/blob/067122b05a3fb1804ee9aaa7fb5e95501acdebef/docs/adr/adr_003_test_area_input.md)) |

## Context and Problem Statement

테스트 영역의 원본은 사용자가 타이핑하는 HTML 코드다(ADR-0006). 코드는 `<template>`에서 읽기 때문에 읽는 순간에는 아무것도 실행되지 않는다. 하지만 그 결과는 `dom_to_vdom`(ADR-0002)을 거쳐 Virtual DOM이 되고, `vdom_to_dom`(ADR-0003)과 Patch가 **실제 문서에 붙는 노드**로 다시 만든다.

ADR-0002는 `key`를 뺀 모든 속성을 `attrs`에 넣는다. 그래서 다음 일이 생긴다.

| 입력 | 결과 |
|---|---|
| `<button onclick="alert(1)">` | `vdom_to_dom`이 `setAttribute("onclick", …)`를 하면 브라우저가 핸들러를 등록한다. 미리보기와, Patch 후 실제 영역에서 클릭하면 실행된다 |
| `<img src="x" onerror="…">` | 붙는 즉시 이미지 로드가 실패하며 실행된다. 클릭도 필요 없다 |
| `<script>…</script>` | `createElement("script")`로 만든 뒤 글자를 붙여 문서에 넣으면 실행된다 |
| `<a href="javascript:…">` | 클릭하면 실행된다 |

혼자 쓰는 검증 페이지라 위험이 크지 않다고 볼 수도 있지만, 시연 중 붙여 넣은 샘플 하나로 페이지가 멈추거나 이상하게 동작할 수 있다. 구 eungi adr_003은 변환 단계에서 `on*` 속성과 `<script>`를 제거하기로 했으나, 그 ADR이 ADR-0006으로 대체되면서 이 결정이 사라졌다(SRS TBD-08, CF-04).

## Decision Drivers

- 입력한 코드가 페이지에서 실행되지 않을 것
- FR-01 비교 기준(실제 영역과 미리보기가 같은 규칙으로 변환되면 같다)을 깨지 않을 것
- ADR-0002·0003·0006의 흐름을 바꾸지 않고 규칙 하나를 더하는 수준일 것
- Phase 2의 이벤트 처리(함수 핸들러)와 충돌하지 않을 것

## Considered Options

- 옵션 1. 정제하지 않는다 (ADR-0002 그대로)
- 옵션 2. `dom_to_vdom`에서 걸러 Virtual DOM에 넣지 않는다
- 옵션 3. 미리보기를 격리된 공간(`iframe sandbox`)에 그린다
- 옵션 4. 페이지에 Content-Security-Policy를 걸어 인라인 스크립트를 막는다

## Decision Outcome

Chosen option: "옵션 2. `dom_to_vdom`에서 걸러 Virtual DOM에 넣지 않는다", because 실제 영역과 테스트 영역이 모두 같은 변환 함수를 거치므로 한 곳에서 거르면 두 영역에 똑같이 적용되어 FR-01 비교 기준이 그대로 성립하고, 걸러진 것은 Virtual DOM에 없으니 미리보기·Patch·코드 입력칸 어디에도 다시 나타나지 않기 때문이다.

### 정제 규칙 (ADR-0002 2) 변환 함수에 추가)

| 대상 | 처리 | 이유 |
|---|---|---|
| `<script>` 요소 | 주석과 똑같이 부모가 건너뛴다. `dom_to_vdom`을 부르지 않는다 | 화면에 그려지지 않으므로 화면 동일성에 영향이 없다 |
| 이름이 `on`으로 시작하는 속성 (대소문자 무관) | `attrs`에 넣지 않는다 | 브라우저가 문자열 핸들러로 등록한다 |
| `href`, `src`, `action`, `formaction`, `xlink:href`의 값이 앞뒤 공백을 뺀 뒤 `javascript:`로 시작 (대소문자 무관) | 그 속성을 `attrs`에 넣지 않는다 | 클릭이나 로드 시 실행된다 |

- 건너뛴 `<script>`는 주석처럼 실제 영역 DOM에 남을 수 있지만, Patch는 `dom`으로 노드를 찾으므로 자리 번호 문제가 없다(ADR-0004).
- Phase 2의 이벤트 핸들러는 `dom_to_vdom`을 거치지 않고 `h()`가 만드는 별도 키(`on`)로 다룬다(SDD_fixed_phase2 2.1). 이 규칙과 충돌하지 않는다.

### Consequences

- Good, because 사용자가 입력한 코드가 미리보기, 실제 영역 어디에서도 실행되지 않는다.
- Good, because 두 영역이 같은 함수를 거치므로 FR-01 비교 기준과 ADR-0002 T10이 그대로 성립한다.
- Good, because ADR-0003, ADR-0006은 바꿀 필요가 없다. 걸러진 것은 Virtual DOM에 없으니 a3로 코드에 다시 적히지도 않는다.
- Bad, because 사용자가 입력한 `onclick`이 코드 입력칸에서 조용히 사라진다. 다음 Patch나 뒤로가기 때 코드가 Virtual DOM에서 다시 적히면서 없어지므로, 상태 문구에 "실행 코드는 제거됩니다"를 한 줄 안내한다.
- Bad, because 실제 영역의 처음 HTML에 `on*` 속성이 있으면 실제 DOM에는 남고 Virtual DOM에는 없어서, Patch로 지울 수 없다. 샘플 HTML에 이런 속성을 쓰지 않는 것을 전제로 한다(ADR-0002의 `<textarea>` 전제와 같은 방식).
- Neutral, because 완전한 보안 장치(HTML 새니타이저)는 아니다. `style`의 `url()` 등은 다루지 않는다. 검증 페이지의 실수 방지 수준이 목표다.

### Confirmation

- `dom.test.ts`: `<div><script>x</script><p>a</p></div>` → `div.children`이 `p` 하나뿐 (ADR-0002 T7과 같은 모양).
- `dom.test.ts`: `<button onclick="x" onMouseOver="y" class="b">` → `attrs`가 `{ class: "b" }`.
- `dom.test.ts`: `<a href="  JavaScript:alert(1)">` → `attrs`에 `href` 없음. `<a href="/x">`는 그대로.
- 기능 테스트: 코드 입력칸에 `<img src="x" onerror="document.title='X'">`를 넣고 Patch → 탭 제목이 바뀌지 않는다.

## Pros and Cons of the Options

### 옵션 1. 정제하지 않는다

- Good, because ADR-0002 그대로라 할 일이 없다.
- Bad, because 입력한 코드가 미리보기와 실제 영역에서 실행된다.

### 옵션 2. `dom_to_vdom`에서 거른다 (채택)

- Good, because 한 곳에서 걸러 두 영역에 똑같이 적용된다.
- Good, because 규칙 표 하나를 더하는 수준이다.
- Bad, because 걸러진 내용이 사용자에게 조용히 사라진다(안내 문구로 보완).

### 옵션 3. `iframe sandbox`

- Good, because 미리보기 안의 스크립트를 브라우저가 완전히 막는다.
- Bad, because ADR-0006 i2에서 이미 기각했다. 바깥 CSS가 적용되지 않아 두 영역의 모습이 달라진다.
- Bad, because 실제 영역은 격리할 수 없어서, Patch 후 실제 영역에서는 여전히 실행된다.

### 옵션 4. Content-Security-Policy

- Good, because 인라인 핸들러와 `javascript:` 주소를 브라우저가 막는다.
- Bad, because 개발 서버·배포 환경마다 헤더 설정이 필요하고, Vite 개발 모드의 인라인 스크립트와 충돌할 수 있다.
- Neutral, because 옵션 2와 함께 쓰는 추가 방어로는 의미가 있다.

## More Information

- 보완 대상: ADR-0002, ADR-0006. 이 ADR이 accepted가 되면 ADR-0002의 2) 변환 함수에 "정제 규칙: ADR-0014"를 추가한다.
- 관련: SRS IR-04, TBD-08, CF-04
- 설계 위치: SDD 3.2 변환, 5장 예외 처리
- [MDN — `<template>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template), [OWASP — XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- 템플릿: [MADR](https://adr.github.io/madr/)
