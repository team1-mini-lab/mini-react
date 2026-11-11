# 목표: 코드 ↔ Virtual DOM 왕복(a3 → g1)에서 `<pre>`의 글자가 바뀌지 않아야 한다.

---
# Optional metadata
status: accepted
date: 2026-11-10
decision-makers: [팀원 이름]
consulted: [Claude (설계 검토 반례 4)]
informed: [팀원 전체]
보완 대상: ADR-0006 3절 (a3)
---

# ADR-0018: a3는 `<pre>`의 첫 글자가 줄바꿈이면 여는 태그 뒤에 줄바꿈을 하나 더 쓴다

## Context and Problem Statement

HTML 파서는 `<pre>` 여는 태그 **바로 뒤의 줄바꿈 하나를 버린다**(HTML 표준의 `<pre>`·`<textarea>`·`<listing>` 규칙). 그래서 Virtual DOM의 `<pre>` 글자가 `"\nabc"`로 시작하면, a3가 `<pre>\nabc</pre>`로 쓰고 g1이 다시 읽을 때 `"abc"`가 된다. 고친 것 없이 Patch해도 `text` 변경이 생겨 TA1·TA3이 실패한다. 시제품에서 확인했다(`"\nabc"` → `"abc"`).

이런 글자는 사용자가 `<pre>⏎⏎abc</pre>`처럼 쓰면 생긴다(파서가 첫 줄바꿈만 버려 `"\nabc"`가 남음).

## Considered Options

- **w1**. 알려진 한계로 둔다
- **w2**. a3에서 `<pre>`의 첫 자식이 줄바꿈으로 시작하는 글자 노드면, 여는 태그 뒤에 `"\n"`을 하나 더 쓴다 (파서가 그것을 버리고 원래 글자가 남는다)

## Decision Outcome

Chosen option: **w2** (2026-11-10 채택), because 브라우저 규칙을 그대로 되돌리는 한 줄 규칙이라 비용이 없고, 왕복 안정성(TA1·TA2)이 FR-03·NFR-01과 직결되기 때문이다.

### Consequences

- Good, because 줄바꿈으로 시작하는 `<pre>`도 왕복 후 같은 트리가 된다.
- Neutral, because 코드 입력칸에는 `<pre>` 뒤에 빈 줄이 하나 더 보인다(브라우저가 버리는 줄이라 화면에는 영향 없음).

### Confirmation

| # | 입력 | 기대 결과 | 출처 |
| --- | --- | --- | --- |
| TA14 | `<div><pre>⏎⏎abc</pre></div>` → `htmlToVNode` → `vnodeToHtml` → `htmlToVNode` | 두 트리가 `equalTree`로 같고 `<pre>` 글자가 `"\nabc"` 그대로 | w2 |

## More Information

- 발견: 설계 검토 반례 4. 근거: HTML Living Standard, "pre" 요소의 첫 줄바꿈 무시 규칙.
- accepted가 되면 SDD_final_phase1 3.3 a3 규칙의 `<pre>` 예외에 한 줄을 더한다.
