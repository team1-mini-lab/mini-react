# 목표: 실제 DOM을 Virtual DOM으로 변환하는 함수를 설계하기 위해 Virtual DOM 노드의 모양을 정한다.

# Optional metadata

status: accepted
date: 2026-11-09
decision-makers: [@ksomang ]
consulted: [@hnjee @onekindalpha ]
informed: [이름]

---

# ADR-0001: Virtual DOM 노드를 type으로 종류를 구별하는 dict로 표현한다

## Context and Problem Statement

실제 DOM을 Virtual DOM으로 변환하는 함수를 만들려면 먼저 변환 결과인 Virtual DOM 노드 하나를 어떤 데이터 모양으로 표현할지 정해야 합니다.

DOM 트리에는 태그 노드(div, h1, p)와 글자 노드("장바구니") 두 종류가 있고 태그 노드에는 속성과 여러 개의 자식이 붙습니다.

이 모양은 변환 함수뿐 아니라 이후 Diff와 Patch가 모두 공유하는 기준이므로 나중에 바꾸면 관련 코드를 전부 고쳐야 하기 때문에 가장 처음에 결정해야 합니다.

노드 하나를 어떤 키와 자료형을 가진 dict로 표현해야 화면에 보이는 모습이 같은 HTML을 다시 적을 수 있고 Diff가 글자, 속성, 태그 변경을 구분할 수 있을까요?

## Decision Drivers

- dict만 보고 화면에 보이는 모습이 같은 HTML을 다시 적을 수 있어야 한다.
  - 처음에는 "원래 HTML을 그대로 다시 적을 수 있어야 한다"였다. ADR-0002에서 공백을 한 칸으로 정리하기로 하면서 글자 단위 복원이 불가능해졌으므로, 기준을 화면 동일성으로 바꿨다.
- Diff가 글자 변경, 속성 변경, 태그 종류 변경을 구분할 수 있어야 한다.
- Diff/Patch가 노드를 받으면 태그 노드인지 글자 노드인지 바로 구별할 수 있어야 한다.
- AI가 만든 Diff/Patch 코드를 사람이 읽고 검토하기 쉬워야 한다.
- Phase 2에서 노드 종류가 늘어날 때 쉽게 확장할 수 있어야 한다.
- Patch가 고칠 실제 노드를 자리 번호 없이 바로 찾을 수 있어야 한다.
  - ADR-0004에서 추가했다. 자리 번호로 찾으면 주석 때문에 번호가 어긋나는 문제(ADR-0002)와 여러 개 삭제 시 번호가 밀리는 문제가 생기기 때문이다.
- 자식 목록에서 같은 항목을 순서와 상관없이 알아볼 수 있어야 한다.
  - ADR-0004에서 추가했다. 자리 번호로만 짝지으면 목록 앞에 항목이 끼어들 때 사용자 입력값이 엉뚱한 줄로 가기 때문이다(FR-04).

## Considered Options

- 선택지 A: 키 존재 여부로 구별 (글자 노드는 text 키만, 태그 노드는 tag/attrs/children)
- 선택지 B: type 키로 구별 (모든 노드에 "type": "element" 또는 "type": "text")

## Decision Outcome

Chosen option: "B: type 키로 구별", because 노드 종류가 코드에 node["type"] == "text"처럼 그대로 드러나 구별 실수가 적고 AI가 만든 코드를 검토하기 쉬우며, 새 노드 종류는 type 값 하나만 추가하면 되기 때문이다.

확정한 노드 모양:

| 노드 종류 | 키 | 값의 자료형 | 이유 |
|---|---|---|---|
| 공통 | `type` | 문자열 `"element"` 또는 `"text"` | Diff/Patch가 종류를 바로 구별하고, 종류 추가에 대비 |
| 태그 노드 | `tag` | **소문자** 문자열 (예: `"div"`) | 태그 종류가 달라졌는지 판단. 대소문자가 섞이면 같은 태그를 다르다고 판단하므로 소문자로 통일 |
| 태그 노드 | `attrs` | 해시(dict), 없으면 `{}` | 이름으로 바로 꺼내 비교, 순서 무관, 이름 중복 없음 |
| 태그 노드 | `children` | 노드의 list, 없으면 `[]` | 자식이 여러 개일 수 있고 순서가 중요 |
| 글자 노드 | `text` | 문자열 | 글자가 달라졌는지 판단 |
| 태그 노드 (선택) | `key` | 문자열. 없으면 키 자체가 없다 | 자식 목록을 비교할 때 같은 항목끼리 짝짓기 위한 이름표(ADR-0004). 화면에는 영향이 없으므로 `attrs`와 분리한다 |
| 공통 (선택) | `dom` | 실제 영역의 실제 노드를 가리키는 참조. 실제 영역에 그려진 트리에만 있고, 없으면 키 자체가 없다 | Patch가 고칠 실제 노드를 자리 번호로 찾지 않고 바로 꺼내기 위해(ADR-0004) |
| 태그 노드 (선택) | `events` | `{ 이벤트 이름: 함수 }`. 없으면 키 자체가 없다 | Phase 2 컴포넌트의 이벤트 핸들러를 화면 데이터(`attrs`)와 분리해 두기 위해(ADR-0013, 2026-11-10 추가) |

Virtual DOM 노드는 위 두 종류(`"element"`, `"text"`)뿐이다. 주석 노드 등 그 밖의 실제 DOM 노드는 Virtual DOM에 넣지 않는다(ADR-0002).

### 키의 세 무리

키는 성격에 따라 세 무리로 나뉜다. (2026-11-10에 네 번째 무리 "동작"이 추가되었다.) 성격이 다른 정보를 섞지 않는다는 원칙은 읽기/쓰기 분리(ADR-0003), Diff/Patch 분리(ADR-0004)와 같다.

| 무리 | 키 | 하는 일 |
|---|---|---|
| **화면 데이터** | `type`, `tag`, `attrs`, `text`, `children` (다섯 키) | 화면 모습을 설명한다 |
| **짝짓기 정보** | `key` | 자식 목록에서 "이 항목이 누구인지"를 알려 준다. 화면에는 영향이 없다 |
| **참조** | `dom` | 그 모습이 그려진 실제 노드가 어디 있는지 가리킨다 |
| **동작** | `events` | 사용자가 조작했을 때 실행할 함수를 담는다. 화면 모습에는 영향이 없다 (ADR-0013) |

어떤 비교가 어떤 키를 보는지는 다음과 같다.

| 비교 | 다섯 키 | `key` | `dom` | `events` | 목적 |
|---|---|---|---|---|---|
| FR-01 인수 기준, ADR-0002 T10 | ✅ | ❌ | ❌ | ❌ | 화면이 같은가 |
| ADR-0003 왕복 테스트 | ✅ | ✅ | ❌ | ❌ | 변환 함수가 정보를 잃지 않는가 |
| Diff (ADR-0004) | ✅ | 자식을 짝지을 때만 ✅ | ❌ (Patch만 읽는다) | ❌ (Patch가 핸들러만 바꿔 끼운다, ADR-0013) | 무엇이 바뀌었나 |

### `key` 규칙

- 태그 노드에만 있다. 글자 노드는 HTML에서 속성을 가질 수 없기 때문이다.
- HTML에서는 `<li key="banana">`처럼 `key` 속성으로 적는다. `dom_to_vdom`은 이 속성을 `key`로 옮기고 `attrs`에서는 뺀다(ADR-0002). `vdom_to_dom`은 `key`가 있으면 `key` 속성으로 다시 붙인다(ADR-0003).

### `events` 규칙 (2026-11-10 추가)

- 태그 노드에만 있다. Phase 2의 `h`가 `onClick`처럼 `on`으로 시작하고 값이 함수인 것을 옮겨 담는다(ADR-0013).
- Diff와 모든 비교는 `events`를 보지 않는다. 렌더링마다 함수가 새로 만들어져 비교하면 매번 변경으로 잡히기 때문이다.
- `dom_to_vdom`은 `events`를 만들지 않는다. HTML의 `on*` 속성은 건너뛴다(ADR-0002 4절).

### `dom` 규칙

`dom`은 다른 키와 성격이 다르다. 나머지 키는 데이터이고, `dom`은 브라우저 안의 실제 노드를 가리키는 참조다. 그래서 다음 규칙을 따른다.

- Diff와 모든 비교는 `dom`을 읽지도 비교하지도 않는다.
- `dom`은 **실제 영역**의 노드만 가리킨다. 테스트 영역 노드는 기록하지 않는다.
- `dom`은 **지금 실제 영역에 그려진 트리**에서만 믿는다. State History에 저장된 다른 시점의 트리에 남은 `dom`은 의미가 없다.
- `dom`을 채우고 옮기는 책임은 ADR-0002(`dom_to_vdom`)와 ADR-0004(Patch)에 있다.

예시 (`<div id="app"><h1>장바구니</h1><p class="price">3000원</p></div>`):

```python
{
  "type": "element",
  "tag": "div",
  "attrs": { "id": "app" },
  "children": [
    {
      "type": "element",
      "tag": "h1",
      "attrs": {},
      "children": [ { "type": "text", "text": "장바구니" } ]
    },
    {
      "type": "element",
      "tag": "p",
      "attrs": { "class": "price" },
      "children": [ { "type": "text", "text": "3000원" } ]
    }
  ]
}
```

위 예시는 `dom`이 없는 모양이다. `dom`은 실제 노드 참조라 글로 적을 수 없다.

`key`가 있는 예시 (`<li key="banana" class="item">바나나</li>`):

```python
{
  "type": "element",
  "tag": "li",
  "key": "banana",
  "attrs": { "class": "item" },
  "children": [ { "type": "text", "text": "바나나" } ]
}
```

> **표기 안내**: 이 ADR의 예시와 코드는 설계 단계에서 익숙한 Python dict 문법으로 적었다. 실제 구현은 JavaScript 객체다(C-01). 키와 값의 의미는 같고 표기만 다르다.
>
> | Python 표기 | JavaScript 표기 |
> |---|---|
> | dict, 해시 | 객체 `{}` |
> | list | 배열 `[]` |
> | `node["type"]` | `node.type` (또는 `node["type"]`) |
> | `None` | `null` |

### Consequences

- Good, because Diff/Patch의 분기 조건이 `node["type"]` 하나로 통일되어 읽기 쉽다.
- Good, because Phase 2에서 노드 종류가 늘어도 `type` 값만 추가하면 된다.
- Good, because 글자 노드에 의미 없는 빈 값(`"tag": None` 등)이 생기지 않는다.
- Good, because `tag`를 소문자로 통일해 대소문자 차이로 같은 태그를 다르게 판단하는 일이 없다.
- Good, because Patch가 `dom`으로 실제 노드를 바로 꺼내므로, 주석 때문에 자리 번호가 어긋나는 문제와 여러 개 삭제 시 번호가 밀리는 문제가 생기지 않는다.
- Good, because `key`를 `attrs`와 분리해, 속성 비교에 `key`가 섞여 짝짓기 정보를 속성 변경으로 착각하는 일이 없다. Phase 2 컴포넌트도 리액트처럼 `key`를 따로 적는다.
- Bad, because 모든 노드에 `type` 키를 매번 적어야 해 데이터가 조금 길어진다.
- Bad, because `dom`은 데이터가 아니라 참조라서, 비교 코드가 실수로 `dom`까지 비교하면 같은 화면을 다르다고 판단한다.
- Bad, because Patch가 끝날 때마다 새 트리에 `dom`을 빠짐없이 채워야 한다. 하나라도 빠지면 다음 Patch에서 오류가 난다(ADR-0004).
- Bad, because `key`가 `attrs`에 없으므로 `vdom_to_dom`이 `key` 속성을 따로 다시 붙여야 한다. 빠뜨리면 미리보기와 Patch로 만든 실제 영역 노드에서 `key` 속성이 사라진다(ADR-0003).
- Neutral, because 실제 브라우저는 태그 사이의 줄바꿈, 공백도 글자 노드로 만든다. 이 처리 규칙은 ADR-0002에서 정했다.

### Confirmation

- 위 예시 HTML을 변환 함수에 기본 모드(`dom` 기록 안 함)로 넣었을 때 결과가 위 예시 dict와 정확히 같은지 테스트로 확인한다.
- `key` 예시 HTML을 변환했을 때 `key`가 `"banana"`이고 `attrs`에 `key`가 없는지 확인한다.
- 코드 리뷰에서 Diff/Patch가 노드 종류를 `node["type"]`으로만 구별하는지 확인한다. (`"text" in node` 같은 키 존재 검사가 없어야 한다.)
- 코드 리뷰에서 Diff와 비교 함수가 `dom`을 읽지 않는지 확인한다.
- 태그 노드에는 항상 `attrs`와 `children`이 있는지(비어 있으면 `{}`, `[]`) 확인한다.
- 모든 태그 노드의 `tag`가 소문자인지 확인한다. (SVG는 범위 밖, ADR-0002)

## Pros and Cons of the Options

### A: 키 존재 여부로 구별

글자 노드 `{ "text": "3000원" }`, 태그 노드 `{ "tag": "p", "attrs": {...}, "children": [...] }`, 구별 코드 `"text" in node`

- Good, because 키가 적고 간단하다.
- Bad, because 노드 종류가 늘면 어떤 키가 무슨 종류를 뜻하는지 규칙을 계속 외워야 한다.
- Bad, because 구별 코드만 보고는 노드 종류를 판단한다는 의도가 잘 드러나지 않는다.

### B: `type` 키로 구별

글자 노드 `{ "type": "text", "text": "3000원" }`, 태그 노드 `{ "type": "element", "tag": "p", ... }`, 구별 코드 `node["type"] == "text"`

- Good, because 노드 종류가 눈에 바로 보인다.
- Good, because 종류 추가 시 `type` 값만 늘리면 된다.
- Bad, because 키가 하나 늘고 매번 적어야 한다.

## More Information

- 설계 과정 기록: [미니 리액트 개발 일지 ㅡ Virtual DOM 노드의 모양을 정하기](https://eutopiaa.tistory.com/91)
- `dom`, `key` 추가 과정: [미니 리액트 개발 일지 ㅡ Diff: 두 Virtual DOM 비교하기](https://eutopiaa.tistory.com/94)
- 속성 자료형은 해시 외에 list of tuple(`[("id", "app")]`)도 검토했으나, 이름으로 바로 꺼낼 수 없고 순서가 다르면 같은 태그를 다르게 판단할 수 있어 해시를 택했다.
- `key`의 위치는 `attrs` 안에 두는 방법도 검토했다. ADR-0001 수정이 필요 없다는 장점이 있었지만, 화면 데이터와 짝짓기 정보가 섞이고 속성 비교에서 `key`를 따로 빼야 해서 별도 키를 택했다(ADR-0004).
- 후속 결정: ADR-0002 (공백 정리 규칙, 주석 노드 처리, 태그 이름 읽는 법, `dom`·`key` 기록), ADR-0004 (Diff·Patch, `dom`·`key` 도입)
- 후속 결정: ADR-0013 (컴포넌트 렌더링, `events` 도입)
- 관련 이슈: [#18](https://github.com/team1-mini-lab/mini-react/issues/18)
- 템플릿: [MADR - Full Template](https://adr.github.io/madr/#full-template)

### 변경 이력

| 날짜 | 내용 | 상태 |
|---|---|---|
| 2026-11-10 | 선택 키 `events`, 네 번째 무리 "동작", 비교 표 `events` 열, `events` 규칙 추가 (ADR-0013) | 통과 후 추가된 내용이라 팀 재확인 필요 |
