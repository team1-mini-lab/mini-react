# 목표: 시스템은 Virtual DOM 객체 트리를 실제 DOM 노드 트리로 변환해 테스트 영역의 미리보기에 표시해야 한다.

# Optional metadata

status: accepted
date: 2026-11-09
decision-makers: [@ksomang]
consulted: [@hnjee @onekindalpha]
informed: [이름]

---

# ADR-0003: Virtual DOM → 실제 DOM 변환(vdom_to_dom)은 화면 밖에서 트리를 재귀로 완성한 뒤 한 번만 화면에 붙인다


## Context and Problem Statement

페이지를 열면 실제 영역을 `dom_to_vdom`으로 Virtual DOM으로 바꾼 뒤, 그 Virtual DOM으로 테스트 영역의 미리보기에 실제 DOM을 새로 만들어 넣어야 합니다(테스트 영역 구성은 ADR-0006). 이를 위해 `dom_to_vdom`의 반대 방향 함수인 `vdom_to_dom`이 필요합니다.

```
1단계:  실제 DOM     ──dom_to_vdom──▶  Virtual DOM
2단계:  Virtual DOM  ──vdom_to_dom──▶  실제 DOM (새로 만듦)
```

정해야 할 것은 두 가지입니다.

1. `vdom_to_dom`이 글자 노드와 태그 노드를 각각 어떻게 만들고, 자식은 어떻게 처리하는가?
2. 만든 노드를 **언제** 화면(미리보기)에 붙이는가? 트리를 다 만든 뒤 한 번 붙이는가, 부모부터 화면에 올려 두고 자식을 하나씩 붙이는가?

저는 설계 중 "createElement가 dict에서 태그 이름을 읽는다"고 잘못 이해할 뻔했습니다. 실제로는 **우리가 dict에서 값을 읽고(읽기), 그 값을 DOM API에 넘겨 노드를 만든다(쓰기)**입니다. 이 구분은 이후 Patch(이전·새 Virtual DOM을 읽어 비교하고, 다른 곳만 실제 DOM에 쓰기) 설계의 전제가 됩니다.

| 구분 | 무엇으로 | 대상 |
|---|---|---|
| 읽기 | `node["tag"]`, `node["attrs"]`, `node["key"]`, `node["children"]` | Virtual DOM |
| 쓰기 | `document.createElement`, `document.createTextNode`, `setAttribute`, `appendChild` | 실제 DOM |

이 함수는 미리보기를 그릴 때뿐 아니라, Patch가 실제 영역에 노드를 **추가**하거나 **교체**할 때 새 노드를 만드는 부품으로도 쓰인다(ADR-0004).

## Decision Drivers

- **정확성**: 만든 미리보기가 FR-01의 비교 기준(ADR-0002 변환 규칙을 적용한 Virtual DOM끼리 같음)으로 실제 영역과 같아야 한다.
- **렌더링 비용**: 화면에 붙어 있는 트리를 건드리는 횟수를 적게, 예측 가능하게 유지한다 (NFR-01의 취지, 과제 중점 포인트 Reflow/Repaint).
- **구조의 단순함**: `dom_to_vdom`과 거울 모양으로 짜서 읽고 검증하기 쉬워야 한다.
- **제약 준수**: Vanilla JavaScript와 브라우저 DOM API만 사용한다 (C-01).

## Considered Options

- 선택지 1: 화면 밖에서 재귀로 트리를 완성하고, 마지막에 미리보기 틀에 한 번 `appendChild`
- 선택지 2: 부모를 먼저 미리보기 틀에 붙이고, 자식을 만들 때마다 화면 위의 부모에 하나씩 `appendChild`

## Decision Outcome

Chosen option: "선택지 1: 화면 밖에서 재귀로 트리를 완성하고 마지막에 한 번 붙이기", because 화면에 붙이는 횟수가 노드 수와 상관없이 항상 1번으로 보장되고, 재귀로 짠 `vdom_to_dom`은 원래 화면 밖에서 트리를 완성하는 구조라 추가 장치 없이 자연스럽게 이 방식이 되기 때문이다.

### 함수 명세

`vdom_to_dom(node)` = Virtual DOM 노드(객체) 하나를 받아 실제 DOM 노드 하나를 반환한다.

1. `node.type`을 보고 글자 노드인지 태그 노드인지 나눈다.
2. `"text"`이면 `text` 값을 읽어 `document.createTextNode(text)`로 글자 노드를 만들어 반환한다. (재귀의 멈춤 조건, base case)
3. `"element"`이면
   1. `tag` 값을 읽어 `document.createElement(tag)`로 빈 태그 노드를 만든다.
   2. `attrs`의 이름=값 쌍마다 `setAttribute(이름, 값)`을 반복한다.
   3. `key`가 있으면 `setAttribute("key", key)`로 다시 붙인다. `key`는 `attrs`에 없으므로(ADR-0001) 따로 붙이지 않으면 미리보기와, Patch가 추가·교체로 만든 실제 영역 노드에서 `key` 속성이 사라진다. 코드 입력칸의 `key`는 Virtual DOM → 코드 변환(ADR-0006 a3)이 따로 붙인다.
   4. `children`의 노드를 순서대로 하나씩 `vdom_to_dom`에 넣어(재귀) 실제 노드를 돌려받고 `appendChild`로 붙인다.
   5. 완성된 태그 노드를 반환한다. (반환해야 부모가 `appendChild`할 수 있다)
4. 화면에는 **완성된 트리를 마지막에 한 번** 붙인다.
5. `vdom_to_dom`은 `dom` 키를 **읽지도 기록하지도 않는다.** 미리보기를 그릴 때도 쓰이므로, 기록하면 실제 영역을 가리키던 `dom`을 미리보기 노드로 덮어쓰게 된다. Patch가 추가·교체로 실제 영역에 새 노드를 만들었을 때 `dom`을 기록하는 일은 Patch가 한다(ADR-0004).

```js
// AI로 생성한 참고용 스케치 — 이후 팀 코드 컨벤션에 맞춰 수정
function vdom_to_dom(node) {
  if (node.type === "text") {
    return document.createTextNode(node.text);
  }
  const el = document.createElement(node.tag);
  for (const [name, value] of Object.entries(node.attrs)) {
    el.setAttribute(name, value);
  }
  if (node.key !== undefined) {
    el.setAttribute("key", node.key);            // key는 attrs와 분리되어 있으므로 따로 붙인다 (ADR-0001)
  }
  for (const child of node.children) {
    el.appendChild(vdom_to_dom(child));
  }
  return el;                                     // node.dom은 건드리지 않는다
}

// 페이지 열림 (흐름은 ADR-0006 1절)
const realRoot = document.getElementById("real-area").firstElementChild;  // 루트는 틀로 찾는다 (ADR-0006)
const vdom = dom_to_vdom(realRoot, { recordDom: true });  // 공백 정리 + 실제 영역 노드를 dom에 기록 (ADR-0002)
// 코드 입력칸 ← vdom을 코드로 (ADR-0006 a3)
// previewVdom ← 코드 → 브라우저가 읽음 → dom_to_vdom, 기본 모드 (ADR-0006 g1)
document.getElementById("preview").appendChild(vdom_to_dom(previewVdom));  // 화면에 붙이는 건 여기서 1번
```


`dom_to_vdom`과 나란히 놓으면 거울 모양이다.

| | `dom_to_vdom` | `vdom_to_dom` |
|---|---|---|
| 읽는 곳 | 실제 DOM | Virtual DOM |
| 만드는 것 | Virtual DOM | 실제 DOM 노드 |
| 자식 처리 | 자식마다 자기 자신을 호출하고 배열에 넣는다 | 자식마다 자기 자신을 호출하고 `appendChild`로 붙인다 |
| `key` | `key` 속성을 `key`로 옮기고 `attrs`에서 뺀다 | `key`를 `key` 속성으로 다시 붙인다 |
| `dom` | "기록함"일 때만 기록한다 | 읽지도 기록하지도 않는다 |

### Consequences

- Good, because 노드가 몇 개든 화면(라이브 DOM)에 붙이는 작업은 1번이라 비용이 예측 가능하다.
- Good, because `dom_to_vdom`과 대칭이라 왕복 테스트(`dom_to_vdom(vdom_to_dom(v))`가 `v`와 같은지)로 두 함수를 함께 검증할 수 있다.
- Bad, because 재귀이므로 중첩이 아주 깊으면 JavaScript 호출 스택 한계에 걸릴 수 있다 (NFR-03). `dom_to_vdom`과 같은 한계이므로, ADR-0002 T9에서 정할 깊이 기준을 이 함수에도 그대로 적용한다.
- Bad, because `key`를 따로 다시 붙이는 단계를 빠뜨리기 쉽다. 왕복 테스트에 `key`를 포함해 이를 잡는다.

### Confirmation

- **단위 테스트 — 왕복 일치**: 샘플 Virtual DOM `v`에 대해 `dom_to_vdom(vdom_to_dom(v))`가 `v`와 **다섯 키(`type`, `tag`, `attrs`, `text`, `children`) + `key`** 기준의 깊은 비교로 같다. `dom`은 비교하지 않는다. (글자 노드만, 속성 여러 개, 자식 없음, 깊은 중첩, 공백 한 칸 `" "` 글자 노드, `<pre>` 안의 줄바꿈, `key`가 있는 자식과 없는 자식이 섞인 목록 케이스 포함)
  - 전제: 샘플 `v`의 글자는 공백 정리 규칙(ADR-0002)을 이미 적용한 모양이어야 한다. `<pre>` 밖에 `"a␣␣b"`처럼 연속 공백이 있으면 돌아올 때 `"a␣b"`가 되어 실패하는데, 이는 규칙대로의 정상 동작이다.
  - FR-01 비교(다섯 키, `key` 제외)와 같은 비교 함수를 쓰지 않는다. 목적이 다르다: FR-01은 "화면이 같은가", 왕복 테스트는 "변환 함수가 정보를 잃지 않는가".
- **단위 테스트 — 반환값**: `"text"` 노드는 `Text` 노드를, `"element"` 노드는 `localName`이 `tag`와 같은 `Element`를 반환한다.
- **단위 테스트 — `dom` 불변**: `dom`이 채워진 `v`를 `vdom_to_dom`에 넣은 뒤에도 `v`의 모든 `dom`이 그대로다.
- **단위 테스트 — 부착 횟수 1번**: 미리보기 틀에 `MutationObserver`(`childList: true`, `subtree: true`)를 걸고 초기 렌더링 후 기록된 `childList` 변경이 1건인지 센다. 선택지 2로 짜면 노드 수만큼 나오므로 차이가 드러난다. 기록이 전달될 때까지 기다린 뒤 센다.
- **단위 테스트 — FR-01 인수 기준**: ADR-0002 Confirmation의 T10(실제 영역과, 그 결과로 렌더링한 미리보기를 각각 변환한 결과가 다섯 키 기준으로 같다)이 통과한다. T10은 `vdom_to_dom`이 있어야 실행할 수 있으므로 이 ADR의 구현이 끝난 시점에 함께 확인한다.
- **코드 검토**: `vdom_to_dom` 안에서 미리보기(라이브 DOM)에 직접 붙이는 코드가 없다. 화면 부착은 호출하는 쪽에서 한 번만 한다.

## Pros and Cons of the Options

### 선택지 1: 화면 밖에서 완성 후 한 번 붙이기

- Good, because 화면에 붙이는 횟수가 항상 1번이다. 브라우저는 화면(문서)에 붙어 있는 트리만 레이아웃을 계산하므로, 붙이기 전까지는 계산할 일이 없다.
- Good, because 브라우저의 최적화(변경을 모았다가 한 번에 계산하는 동작)에 기대지 않고도 비용이 보장된다.
- Good, because 재귀 구조와 자연스럽게 맞는다. 자식을 먼저 완성해서 반환받아 부모에 붙이는 순서이기 때문이다.
- Bad, because 트리가 완성될 때까지 화면에 아무것도 보이지 않는다. 다만 이 과제 규모에서는 체감 차이가 없다고 본다.

### 선택지 2: 부모부터 화면에 붙이고 자식을 하나씩 붙이기

- Good, because 만든 노드가 바로 화면에 나타나므로 디버깅 중 진행 상황을 눈으로 볼 수 있다.
- Bad, because 화면에 붙이는 횟수가 노드 개수만큼이다.
- Bad, because 중간에 어떤 코드가 레이아웃 정보(예: 요소의 가로·세로 크기)를 물어보면 브라우저가 그 자리에서 레이아웃을 강제로 계산한다. 이것이 노드마다 반복되면 크게 느려진다.


## More Information

- 설계 과정 기록: [미니 리액트 개발 일지 ㅡ Virtual DOM → 실제 DOM 그리기 함수 설계](https://eutopiaa.tistory.com/93)
- 선행 결정: ADR-0001 (Virtual DOM 노드 모양), ADR-0002 (DOM → Virtual DOM 변환과 공백 정리 규칙)
- 후속 결정: ADR-0004 (Diff·Patch. 이 함수를 추가·교체의 부품으로 쓰고, `dom`·`key` 규칙을 정함), ADR-0006 (테스트 영역 = 코드 입력칸 + 미리보기)
- 선행 설계 과정: [DOM → Virtual DOM 변환 함수 설계](https://eutopiaa.tistory.com/92), [Virtual DOM 노드의 모양을 정하기](https://eutopiaa.tistory.com/91)
- 요구사항: [미니 리액트 프로젝트 ㅡ 요구사항 정리](https://eutopiaa.tistory.com/90) — 관련 ID: FR-01, NFR-01, NFR-03, C-01, C-03
- GitHub Issue: [#22](https://github.com/team1-mini-lab/mini-react/issues/22)
- 템플릿: [MADR - Full Template](https://adr.github.io/madr/#full-template)
