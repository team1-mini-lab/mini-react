import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, RotateCw, CheckCircle, AlertTriangle, Layers, Code, Eye, RefreshCw } from 'lucide-react';
import { domToVNode } from './core/dom';
import { htmlToVNode, vnodeToHtml } from './core/html';
import { diff, Change } from './core/diff';
import { applyPatch, recoverPatch } from './core/patch';
import { History } from './core/history';
import { VNode } from './core/vnode';

// 샘플 HTML 5대 요건 탑재 기본 마크업
const INITIAL_HTML = `<div id="app">
  <h1>장바구니 목록</h1>
  <!-- 1. key 목록 및 줄마다 수량 입력: 맨 앞 추가 시에도 바나나 입력값 보존 (D6, P2) -->
  <ul>
    <li key="b">바나나 <input type="text" class="qty border px-1 rounded w-16 inline ml-2" value="3" /></li>
    <li key="s">딸기 <input type="text" class="qty border px-1 rounded w-16 inline ml-2" value="1" /></li>
  </ul>
  <!-- 2. 주석 노드 하나: 실제 DOM에 주석이 있어도 정확히 수정 (P4) -->
  <!-- 배송 및 보관 안내 -->
  <!-- 3. 스크롤 박스: 스크롤 위치 유지 시연 (FR-04) -->
  <div id="scroll-box" class="h-16 overflow-y-auto border p-2 my-2 bg-slate-50 text-xs text-slate-600 rounded">
    <p>배송 안내 1: 당일 배송 원칙</p>
    <p>배송 안내 2: 신선 냉장 포장</p>
    <p>배송 안내 3: 부재 시 문 앞 보관</p>
    <p>배송 안내 4: 고객센터 운영시간 09~18시</p>
  </div>
  <!-- 4. <pre> 블록: 공백 및 줄바꿈 보존 시연 (TA3, T4) -->
  <pre class="bg-gray-100 p-2 text-xs rounded font-mono">공지사항:
  - 교환 환불 7일 이내
  - 신선 식품 특성 유의</pre>
  <!-- 5. 들여쓰기된 HTML 구조: 무수정 Patch 시 '변경 사항 없음' 시연 (TA1) -->
</div>`;

export default function App() {
  const realAreaRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [editorCode, setEditorCode] = useState(INITIAL_HTML);
  const [historyPos, setHistoryPos] = useState('기록 1 / 1');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'info' | 'warn' | 'error'>('info');
  const [changeLogs, setChangeLogs] = useState<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const historyRef = useRef<History<VNode> | null>(null);
  const debounceTimerRef = useRef<any>(null);

  // 초기화: 첫 로드 시 실제 영역에 INITIAL_HTML 렌더링 및 History 슬롯 0 생성
  useEffect(() => {
    if (!realAreaRef.current) return;

    realAreaRef.current.innerHTML = INITIAL_HTML;
    const firstEl = realAreaRef.current.firstElementChild;
    if (firstEl) {
      const initialVNode = domToVNode(firstEl, { recordDom: true });
      historyRef.current = new History(initialVNode);
      updateHistoryState();
      renderPreview(initialVNode);
    }
  }, []);

  // 에디터 타이핑 시 0.3초 debounce 및 pending 상태 관리 (e3, n2)
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setEditorCode(newCode);
    setIsPending(true);
    setCanUndo(false);
    setCanRedo(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setIsPending(false);
      const parsed = htmlToVNode(newCode);
      if (parsed) {
        renderPreview(parsed);
        // dirty 검사
        if (historyRef.current) {
          const { changes } = diff(historyRef.current.current, parsed);
          if (changes.length > 0) {
            setStatusMsg('Patch하거나 수정을 되돌리면 이동할 수 있습니다');
            setStatusType('warn');
          } else {
            setStatusMsg('');
          }
        }
      }
      updateHistoryState();
    }, 300);
  };

  const renderPreview = (vnode: VNode) => {
    if (!previewRef.current) return;
    previewRef.current.innerHTML = vnodeToHtml(vnode);
  };

  const updateHistoryState = () => {
    if (!historyRef.current) return;
    setHistoryPos(`기록 ${historyRef.current.index + 1} / ${historyRef.current.size}`);
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  };

  // formatChange: 한 줄 요약 포맷팅
  const formatChange = (ch: Change): string => {
    switch (ch.kind) {
      case 'text':
        return `글자 수정: "${ch.text}"`;
      case 'attrs': {
        const setKeys = Object.keys(ch.set);
        return `속성 수정: <${ch.target.tag}> ${setKeys.length > 0 ? setKeys.join(', ') + ' 추가/변경' : ''} ${ch.remove.length > 0 ? ch.remove.join(', ') + ' 제거' : ''}`.trim();
      }
      case 'add': {
        const keyInfo = ch.node.type === 'element' && ch.node.key ? ` key="${ch.node.key}"` : '';
        const beforeInfo = ch.before ? `(${ch.before.type === 'element' ? `<${ch.before.tag}>` : '텍스트'} 앞)` : '(끝)';
        return `추가: <${ch.node.type === 'element' ? ch.node.tag : 'text'}${keyInfo}> ${beforeInfo}`;
      }
      case 'remove': {
        const keyInfo = ch.target.type === 'element' && ch.target.key ? ` key="${ch.target.key}"` : '';
        return `삭제: <${ch.target.type === 'element' ? ch.target.tag : 'text'}${keyInfo}>`;
      }
      case 'replace': {
        const oldTag = ch.target.type === 'element' ? `<${ch.target.tag}>` : 'text';
        const newTag = ch.node.type === 'element' ? `<${ch.node.tag}>` : 'text';
        return `교체: ${oldTag} → ${newTag}`;
      }
      case 'move': {
        const keyInfo = ch.target.type === 'element' && ch.target.key ? ` key="${ch.target.key}"` : '';
        const beforeInfo = ch.before ? `(${ch.before.type === 'element' ? `<${ch.before.tag}>` : '텍스트'} 앞)` : '(끝)';
        return `이동: <${ch.target.type === 'element' ? ch.target.tag : 'text'}${keyInfo}> ${beforeInfo}`;
      }
    }
  };

  // Patch 버튼 클릭
  const handlePatch = () => {
    if (!historyRef.current || !realAreaRef.current) return;

    const nextTree = htmlToVNode(editorCode);
    if (!nextTree) {
      setStatusMsg('루트 요소가 필요합니다.');
      setStatusType('error');
      return;
    }

    const currentTree = historyRef.current.current;
    const diffResult = diff(currentTree, nextTree);

    // 무변경 Patch 예외 (k1, VT-47)
    if (diffResult.changes.length === 0) {
      setStatusMsg('변경 사항 없음');
      setStatusType('info');
      setChangeLogs(['변경 사항이 없습니다 (DOM 조작 0회).']);
      return;
    }

    try {
      applyPatch(diffResult);
      historyRef.current.push(nextTree);
      updateHistoryState();
      setStatusMsg(`Patch 성공: ${diffResult.changes.length}개 변경 반영`);
      setStatusType('info');
      setChangeLogs(diffResult.changes.map(formatChange));
      renderPreview(nextTree);
    } catch (err) {
      // t3 복구 프로토콜 (CF-03)
      recoverPatch(realAreaRef.current, nextTree, err);
      historyRef.current.push(nextTree);
      updateHistoryState();
      setStatusMsg('오류가 나서 실제 영역을 다시 그렸습니다');
      setStatusType('error');
      setChangeLogs(['[t3 복구 프로토콜] 실제 영역 통째 재구축 완료.']);
    }
  };

  // 뒤로가기 (Undo)
  const handleUndo = () => {
    if (!historyRef.current || !realAreaRef.current || !canUndo || isPending) return;

    const currentOnScreen = historyRef.current.current;
    const prevTree = historyRef.current.undo();
    if (!prevTree) return;

    const diffResult = diff(currentOnScreen, prevTree);
    applyPatch(diffResult);

    const serialized = vnodeToHtml(prevTree);
    setEditorCode(serialized);
    renderPreview(prevTree);
    updateHistoryState();
    setStatusMsg('뒤로가기 완료');
    setStatusType('info');
    setChangeLogs(diffResult.changes.map(formatChange));
  };

  // 앞으로가기 (Redo)
  const handleRedo = () => {
    if (!historyRef.current || !realAreaRef.current || !canRedo || isPending) return;

    const currentOnScreen = historyRef.current.current;
    const nextTree = historyRef.current.redo();
    if (!nextTree) return;

    const diffResult = diff(currentOnScreen, nextTree);
    applyPatch(diffResult);

    const serialized = vnodeToHtml(nextTree);
    setEditorCode(serialized);
    renderPreview(nextTree);
    updateHistoryState();
    setStatusMsg('앞으로가기 완료');
    setStatusType('info');
    setChangeLogs(diffResult.changes.map(formatChange));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* 상단 네비게이션 헤더 */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white p-2 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 leading-tight">mini-react Engine — Phase 1</h1>
            <p className="text-xs text-slate-500">Virtual DOM, Diff Engine, Incremental Patch, State History</p>
          </div>
        </div>

        {/* 조작 바 및 상태 표시 */}
        <div className="flex items-center space-x-3">
          <button
            id="patch"
            onClick={handlePatch}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-xs transition"
          >
            <Play className="w-4 h-4" />
            <span>Patch</span>
          </button>

          <button
            id="undo"
            onClick={handleUndo}
            disabled={!canUndo || isPending}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>뒤로가기</span>
          </button>

          <button
            id="redo"
            onClick={handleRedo}
            disabled={!canRedo || isPending}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg transition"
          >
            <RotateCw className="w-4 h-4" />
            <span>앞으로가기</span>
          </button>

          <span id="history-pos" className="text-xs font-mono font-medium px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-slate-600">
            {historyPos}
          </span>
        </div>
      </header>

      {/* 상태 안내 문구 배너 (#status) */}
      {statusMsg && (
        <div
          id="status"
          className={`px-6 py-2.5 text-xs font-medium border-b flex items-center space-x-2 ${
            statusType === 'error'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : statusType === 'warn'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {statusType === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {statusType === 'info' && <CheckCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg}</span>
        </div>
      )}

      {/* 메인 3단 뷰 레이아웃 */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* 1. 실제 영역 (#real-area) */}
        <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-100/70 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h2 className="text-sm font-bold text-slate-800">실제 영역 (#real-area)</h2>
            </div>
            <span className="text-xs text-slate-500">부분 갱신(Patch) 대상</span>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <section id="real-area" ref={realAreaRef} className="border border-dashed border-slate-200 p-4 rounded-lg min-h-[300px]">
              {/* 브라우저 실제 DOM이 Patch에 의해 직접 갱신되는 곳 */}
            </section>
          </div>
        </div>

        {/* 2. 테스트 영역: 코드 입력칸 (#editor) */}
        <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-100/70 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Code className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800">코드 입력칸 (#editor)</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">0.3s debounce</span>
          </div>
          <div className="flex-1 p-3 flex flex-col">
            <textarea
              id="editor"
              value={editorCode}
              onChange={handleEditorChange}
              spellCheck={false}
              className="flex-1 w-full p-3 font-mono text-xs leading-relaxed bg-slate-900 text-slate-100 rounded-lg resize-none outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* 3. 테스트 영역: 미리보기 (#preview) */}
        <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-100/70 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-sky-600" />
              <h2 className="text-sm font-bold text-slate-800">미리보기 (#preview)</h2>
            </div>
            <span className="text-xs text-slate-500">보기 전용 (VDOM 렌더)</span>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <section
              id="preview"
              ref={previewRef}
              className="border border-dashed border-slate-200 p-4 rounded-lg min-h-[300px] pointer-events-none select-none bg-slate-50/50"
            >
              {/* 미리보기 렌더링 */}
            </section>
          </div>
        </div>
      </main>

      {/* 하단 패치 로그 (#change-log) */}
      <footer className="bg-white border-t border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Patch 변경 목록 로그 (#change-log)</h3>
          <span className="text-xs text-slate-400 font-mono">{changeLogs.length}개 기록</span>
        </div>
        <pre
          id="change-log"
          className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono h-28 overflow-y-auto leading-relaxed border border-slate-800"
        >
          {changeLogs.length > 0 ? changeLogs.join('\n') : '// 아직 적용된 Patch가 없습니다. 코드를 수정하고 Patch 버튼을 눌러보세요.'}
        </pre>
      </footer>
    </div>
  );
}
