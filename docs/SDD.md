미니 React Phase 1 소프트웨어 설계 문서
2026-11-09 · 프로젝트 팀 (초안: AI, 검토·결정: 팀)

한 장 요약은 SDD_one_page.md, 설계 지도는 design_map.svg, 결정 이유는 adr/를 참고한다.

본 문서는 Phase 1의 Virtual DOM, DOM 변환, Diff, Patch, History 설계만 다룬다.

   

0. 한 장 요약 (쉬운 말)
목표 (LMS 과제 요구사항)

사용자의 HTML 입력에 따라 Virtual DOM을 생성한다.
Diff로 이전 Virtual DOM과 새 Virtual DOM의 차이를 찾는다.
Patch로 실제 DOM의 필요한 부분만 업데이트한다.
History에 변경 상태를 저장하고 Undo/Redo로 이전·다음 상태를 복원한다.
Undo/Redo 실행 시 실제 영역과 테스트 영역을 함께 갱신한다.
우리가 만드는 것은 "화면에서 바뀐 곳만 골라서 고치는 도구"다. 화면 전체를 다시 그리면 입력하던 글자나 커서가 사라질 수 있기 때문이다.

레고 집으로 생각하면 쉽다. 설계도(종이)를 두 장 놓고 틀린 그림을 찾은 다음, 달라진 블록만 갈아끼운다.

어려운 말	쉬운 비유	우리 코드에서
실제 DOM	실제로 쌓아 올린 레고 집	브라우저 화면
Virtual DOM (VNode)	레고 집의 설계도 (종이 그림)	VNode 객체
Diff	틀린 그림 찾기	diff(옛 설계도, 새 설계도)
Patch	틀린 곳의 블록만 갈아끼기	applyPatches
History	게임 세이브 슬롯	History (Undo = 이전 슬롯, Redo = 다음 슬롯)
하네스	자동 채점기	npm run verify
ADR	"왜 이렇게 정했는지" 적어 둔 기록	docs/adr/
Phase 1의 핵심 흐름은 다음과 같다.

HTML 입력을 Virtual DOM으로 변환한다.
이전 Virtual DOM과 새 Virtual DOM을 비교해 Patch 목록을 만든다.
Patch 목록을 실제 DOM에 적용하고 변경 이력을 History에 저장한다.
Undo/Redo로 History의 상태를 이동하고 실제 영역과 테스트 영역을 갱신한다.
1. 문서 개요
본 문서는 SRS v1.0의 Phase 1 관련 요구사항을 TypeScript(ADR-0001) 모듈과 함수 단위로 구체화한다. SRS 3.3.2와 5.2에서 "설계 문서에서 확정"으로 남긴 함수명, 매개변수, 반환 형식, 예외 처리 결과 중 Phase 1에 해당하는 내용을 정의한다.

항목	내용
기준 문서	SRS v1.0 (2026-11-07), ADR-0001 프로그래밍 언어 선택 (TypeScript)
적용 범위	Phase 1 (Virtual DOM, DOM 변환, Diff, Patch, History, 검증 페이지)
문서 상태	Draft: TBD 제안안은 팀 승인 후 확정
1.1 TBD 제안안
SRS 6장의 미결 사항 중 Phase 1 설계가 전제로 삼는 제안안이다. 팀이 다른 안을 채택하면 영향받는 절을 수정한다.

TBD	제안안	근거	영향 절
TBD-01	분기 시 B, C를 삭제한다 (브라우저 뒤로가기와 동일).	기록이 단일 선형 배열로 유지되어 Redo 의미가 명확하다.	3.5
TBD-02	HTML 코드 입력칸(textarea) + 실시간 미리보기로 수정한다.	contenteditable은 속성·태그 수정이 어렵고, 코드 입력은 FR-02의 태그·속성·글자 변경을 모두 지원한다.	3.2, 3.6
TBD-03	CREATE, REMOVE, REPLACE, TEXT, PROPS 5종으로 확정한다.	FR-03~FR-06과 VT-04, VT-27을 모두 표현할 수 있는 최소 집합이다.	3.3, 3.4
TBD-04	기본은 위치(index) 비교, key는 확장 과제(Should)로 둔다.	필수 요구사항은 위치 비교로 충족되며, key는 MOVE 패치가 추가되어 복잡도가 크게 오른다.	3.3
1.2 문서 템플릿과 참고 표준
본 문서의 구성은 IEEE 1016-2009 (Software Design Descriptions)의 설계 관점(viewpoint) 구조를 과제 규모에 맞게 축약한 것이다. SRS가 ISO/IEC/IEEE 29148을 따르므로, 그 다음 단계 문서로 짝을 맞춘다.

표준 / 템플릿	대상	본 문서에서 쓴 부분
IEEE 1016-2009 Software Design Descriptions	설계 문서(SDD)	전체 목차: 구성(2장), 인터페이스·정보(3장 타입/함수), 상호작용·상태(History), 설계 근거(1.1)
ISO/IEC/IEEE 42010:2022 Architecture description	아키텍처 기술	2장 모듈 구성과 의존 방향
ISO/IEC/IEEE 29119-3:2021 Test documentation	테스트 문서	테스트 설계·테스트 케이스 양식(입력, 절차, 기대 결과)
ISO/IEC/IEEE 29148:2018 Requirements engineering	요구사항(SRS)	요구사항 추적성 (FR ↔ 설계 ↔ VT)
MADR Markdown Architectural Decision Records	ADR	ADR-0001 형식. 설계 중 주요 결정은 docs/adr/에 기록한다.
IEEE·ISO 표준 원문은 유료이므로, 본 문서는 목차와 관점 구분만 참고했다. 전체 양식을 그대로 따른 것은 아니다.

1.3 GitHub Issue 대응
Issue	완료 조건	충족하는 절	산출물
#10 프로젝트 구조 및 함수 인터페이스 설계	Phase 1 디렉터리 확정, 주요 함수 인터페이스, 모듈 책임	2.1, 2.2, 3.2~3.5	본 문서 2·3장, check:arch 규칙
#11 핵심 자료구조 설계	Phase 1 자료구조의 필드·역할·관계 확정	3.1, 3.3, 3.5	본 문서 3장 및 관련 ADR
#12 테스트 환경 구성	환경 실행, 실행 방법 문서화, 기능별 테스트 구조	테스트 설계 및 검증 문서	ADR-0008, README "테스트 실행" 절
#13 팀 역할 분담 및 설계 문서 작성	담당 확정, 중복·누락 확인, 결정 기록	문서 전체	역할 분담 기록, 관련 ADR (docs/adr/)
1.4 이 문서를 읽는 사람과 궁금한 점
IEEE 1016은 "누가 이 설계에서 무엇을 알고 싶어 하는가"를 먼저 적도록 한다. 각 사람은 오른쪽 열의 절부터 읽으면 된다.

읽는 사람	궁금한 점	먼저 볼 곳
구현 담당 팀원	내가 만들 함수의 입력·출력, 다른 모듈과의 약속	2장, 3장
테스트 담당 팀원	VT를 어떻게 확인하나, 예외는 어떻게 처리하나	3장 및 테스트 설계 문서
발표자 / 새 팀원	전체가 어떻게 돌아가나, 왜 이렇게 정했나	0장, 그림, 1.1
코치 / 평가자	Phase 1 요구사항을 충족했나, 원리를 설명할 수 있나	요구사항 추적성 및 설계 내용
AI 코딩 도구	지켜야 할 규칙과 통과해야 할 검사	2장, AGENTS.md
1.5 변경 이력
버전	날짜	바뀐 내용
0.1	2026-11-09	초안
0.2	2026-11-09	하네스, 역할 분담, ADR 관련 내용 추가
0.3	2026-11-09	쉬운 요약, 설계 그림, 읽는 사람, 부록 추가
1.0	(팀 검토 후)	Phase 1 범위 검토 및 SRS 불일치 반영 후 확정 예정
2. 아키텍처 개요
의존성은 pages → core → DOM 한 방향으로 흐른다. 실제 DOM을 변경하는 코드는 core/patch.ts 한 곳뿐이다.

 

2.1 디렉터리 구조
mini-react/
  src/
    core/
      vnode.ts       VNode 타입, h()
      dom.ts         domToVNode, htmlToVNode, createElement, vnodeToHTML
      diff.ts        diff, Patch 타입
      patch.ts       applyPatches, setProp
      history.ts     History<T>
      errors.ts      PatchError
    pages/
      phase1/
        index.html
        main.ts
        init.ts
  tests/                 테스트 설계 및 검증 항목
  docs/
    SRS.md
    phase1.md
    SDD_one_page.md
    design_map.svg
    adr/
2.2 모듈별 책임
모듈	책임	DOM 접근	의존
vnode	데이터 타입, VNode 생성	없음	—
dom	DOM ↔ VNode 변환	읽기, 새 노드 생성	vnode
diff	두 VNode 비교 → Patch[]	없음 (순수 함수)	vnode
patch	Patch[]를 실제 DOM에 적용	쓰기 (유일)	vnode, dom, errors
history	상태 기록, Undo/Redo 커서	없음	—
pages/phase1	입력·버튼 이벤트 처리 및 core 호출	화면 요소 조회	core
3. Phase 1 설계
Phase 1은 "HTML → VNode → diff → Patch[] → 실제 DOM" 흐름이며, Undo/Redo도 같은 diff/patch 경로를 재사용한다. 실제 영역을 innerHTML로 통째 교체하는 코드는 초기화 1회 외에는 없다.

3.1 Virtual DOM 데이터 구조 (core/vnode.ts)
export type PropValue = string | number | boolean | null;
export type Props = Record<string, PropValue>;

export interface VElement {
  type: 'element';
  tag: string;            // 항상 소문자 ('div', 'li')
  props: Props;           // 속성이 없으면 {}
  children: VNode[];      // 자식이 없으면 []
  key?: string;           // TBD-04 확장용, Phase 1 기본 미사용
}

export interface VText {
  type: 'text';
  text: string;
}

export type VNode = VElement | VText;

export function h(tag: string, props?: Props | null, ...children: (VNode | string)[]): VElement;
props와 children은 항상 존재한다 (undefined 없음). VT-25, VT-26의 기준이다.
VNode는 불변(immutable)으로 다룬다. History에 저장된 객체를 수정하지 않는다.
3.2 DOM 변환 (core/dom.ts)
함수	입력 → 출력	역할	FR / IR
domToVNode(node: Node): VNode | null	DOM 노드 → VNode	Element·Text만 변환. 주석과 공백만 있는 Text는 null(제외)	FR-01, IR-04
htmlToVNode(html: string, rootTag = 'div'): VElement	HTML 문자열 → 루트 VNode	DOMParser로 비활성 문서에서 파싱 후 루트로 감싼다	FR-02
createElement(v: VNode): Node	VNode → 실제 DOM	새 노드 생성 (CREATE, REPLACE에서 사용)	FR-06
vnodeToHTML(v: VNode): string	VNode → HTML	Undo/Redo 후 테스트 영역 textarea 갱신	FR-08
정규화 규칙 (변환 결과와 실제 DOM의 자식 인덱스가 일치해야 path가 동작한다):

주석 노드와 공백만 있는 Text 노드는 제외한다.
on으로 시작하는 속성과 <script>는 제거한다 (입력칸 HTML 실행 방지).
페이지 초기화 시 실제 영역을 domToVNode로 변환한 뒤, 그 VNode로 실제 영역을 1회 다시 그린다. 이후 실제 DOM과 VNode의 자식 순서가 항상 일치한다.
3.3 Diff (core/diff.ts)
export type Path = number[];  // 루트로부터의 자식 인덱스 경로, [] = 루트

export type Patch =
  | { type: 'CREATE';  path: Path; node: VNode }        // path = 새 노드가 놓일 위치
  | { type: 'REMOVE';  path: Path }
  | { type: 'REPLACE'; path: Path; node: VNode }
  | { type: 'TEXT';    path: Path; text: string }
  | { type: 'PROPS';   path: Path; set: Props; remove: string[] };

export function diff(oldV: VNode | undefined, newV: VNode | undefined, path?: Path): Patch[];
비교 규칙 (같은 path끼리, 깊이 우선):

조건	결과	관련
old 없음, new 있음	CREATE	VT-04
old 있음, new 없음	REMOVE	VT-04
type이 다르거나 tag가 다름	REPLACE (자식 비교 안 함)	FR-06
둘 다 Text, 내용 다름	TEXT	FR-05
둘 다 Element, 속성 다름	PROPS (바뀐 값은 set, 사라진 이름은 remove)	FR-05, VT-27
Element 자식	0..max(old,new)-1까지 인덱스별 재귀	FR-04
완전히 같음	빈 배열 []	VT-28
위치 비교이므로 한 부모에서 CREATE는 끝에 추가된 자식, REMOVE는 끝에서 사라진 자식에만 생긴다. 두 종류가 같은 부모에서 동시에 나오지 않는다. 목록 중간 삽입은 "뒤쪽 요소 TEXT/REPLACE + 마지막 CREATE"로 표현되며, 이것이 TBD-04(key)가 해결하려는 문제다.

Diff 

TEXT와 PROPS는 노드를 교체하지 않고 내용이나 속성만 수정한다. 따라서 입력하던 글자나 커서가 유지될 수 있다 (FR-04, FR-05).

3.4 Patch (core/patch.ts)
export interface PatchResult {
  applied: number;
}

export class PatchError extends Error {
  constructor(public patch: Patch, message: string);
}

export function applyPatches(root: Element, patches: Patch[]): PatchResult;
적용은 두 단계로 나뉘어, 인덱스 밀림과 부분 적용을 막는다.

해석(resolve): DOM을 바꾸기 전에 모든 패치의 path를 실제 노드 참조로 바꾼다 (CREATE는 부모 노드). 하나라도 없으면 PatchError를 던지고 DOM은 전혀 바꾸지 않는다 (VT-31).
적용(apply): 참조로 작업하므로 REMOVE 순서에 상관없이 안전하다.
패치	DOM 조작	노드 객체 유지
CREATE	parent.appendChild(createElement(node))	—
REMOVE	target.remove()	—
REPLACE	target.replaceWith(createElement(node))	교체 (FR-06)
TEXT	target.nodeValue = text	유지 (FR-05)
PROPS	setProp / removeAttribute	유지 (FR-05)
setProp(el, name, value) 규칙: value, checked는 속성이 아닌 프로퍼티로 쓰고, 현재 값과 같으면 쓰지 않는다 (커서 위치 유지, FR-04).

3.5 History (core/history.ts)
export class History<T> {
  constructor(initial: T, limit = 100);
  get current(): T;
  push(state: T): void;              // index 뒤 기록 삭제 후 추가 (TBD-01)
  undo(): T | null;                  // 처음이면 null, index 변화 없음
  redo(): T | null;                  // 끝이면 null
  goTo(index: number): T | null;     // 특정 기록으로 바로 이동, 범위 밖이면 null
  canUndo(): boolean;
  canRedo(): boolean;
  get size(): number;
}
초기 상태가 0번 기록이다. Patch를 n번 하면 변경 이력 n개 + 초기 1개, size === n + 1 (FR-07의 기록 정책).
diff 결과가 빈 Patch는 기록하지 않는다 (VT-29). SRS FR-07 문구에 이 예외를 추가해야 한다.
한도(100)를 넘으면 가장 오래된 기록부터 버린다.
History  

현재 선택된 칸이 화면에 표시되는 상태다. 첫 칸에서는 Undo가, 마지막 칸에서는 Redo가 비활성화된다 (#26). 뒤로 간 다음 새로 Patch하면 그 뒤 칸은 지워진다 (ADR-0002).

3.6 Phase 1 검증 페이지 (pages/phase1)
Patch  

페이지는 입력과 버튼 이벤트를 처리하고 core 모듈을 호출한다. 실제 DOM을 수정하는 코드는 patch.ts 하나뿐이다.

UI 요소	동작	FR / IR / VT
실제 영역 #real	샘플 HTML(제목, 목록, input, 스크롤 박스 포함). Patch로만 바뀜	FR-01, VT-33
테스트 영역 #editor (textarea) + #preview	입력할 때마다 미리보기만 갱신, 실제 영역은 그대로	FR-02, IR-01, VT-34
Patch 버튼	next = htmlToVNode(editor) → diff(history.current, next) → applyPatches → history.push	FR-03, IR-02
Undo / Redo 버튼	target = history.undo() → diff/patch로 실제 영역 갱신 → textarea에 vnodeToHTML(target). 끝에서는 비활성화	FR-08, IR-03
기록 표시 2 / 4	현재 index / 전체	FR-07
Patch 로그	마지막 Patch[]를 JSON으로 표시	VT-05, 시연용
