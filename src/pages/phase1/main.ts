// Phase 1 페이지 컨트롤러 (SDD_final_phase1 7.3, ADR-0006·0008·0017·0019)
import { diff } from '../../core/diff';
import type { DiffResult } from '../../core/diff';
import { parseCode, vnodeToHtml } from '../../core/html';
import { applyPatch } from '../../core/patch';
import type { VNode } from '../../core/vnode';
import { formatChange } from './format';
import { init } from './init';
import { startKeyDemo } from './key-demo';
import { renderPreview } from './preview';
import { renderTreeDiff } from './tree-view';

export const MSG = {
  noChange: '변경 사항 없음',
  dirty: 'Patch하거나 수정을 되돌리면 이동할 수 있습니다',
  recovered: '오류가 나서 실제 영역을 다시 그렸습니다',
  needRoot: '루트 요소가 필요합니다',
  firstOnly: '첫 번째 요소만 사용합니다',
  recoverFailed: '복구하지 못했습니다. 새로고침이 필요합니다',
} as const;

export interface Phase1Page {
  readonly state: { current: VNode; dirty: boolean; pending: boolean; broken: boolean };
  readonly history: ReturnType<typeof init>['history'];
  onInput(): void;
  evaluate(): void;
  onPatch(): void;
  onUndo(): void;
  onRedo(): void;
  onRevert(): void;
}

export function startPhase1(doc: Document = document, opts: { debounceMs?: number } = {}): Phase1Page {
  const wait = opts.debounceMs ?? 300; // e3
  const byId = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const realArea = byId<HTMLElement>('real-area');
  const editor = byId<HTMLTextAreaElement>('editor');
  const btn = { patch: byId<HTMLButtonElement>('patch'), undo: byId<HTMLButtonElement>('undo'), redo: byId<HTMLButtonElement>('redo'), revert: byId<HTMLButtonElement>('revert') };
  const statusEl = byId<HTMLElement>('status');
  const posEl = byId<HTMLElement>('history-pos');
  const logEl = byId<HTMLElement>('change-log');

  const { history, current } = init(doc);
  const state = { current, dirty: false, pending: false, broken: false };
  let timer: ReturnType<typeof setTimeout> | null = null;
  let message = '';

  const setStatus = (m: string) => {
    message = m;
    if (statusEl) statusEl.textContent = m;
  };
  const updateButtons = () => {
    const blocked = state.broken || state.dirty || state.pending;
    btn.undo.disabled = blocked || !history.canUndo();
    btn.redo.disabled = blocked || !history.canRedo();
    btn.patch.disabled = state.broken;
    btn.revert.disabled = state.broken || !(state.dirty || state.pending);
    if (posEl) posEl.textContent = `기록 ${history.index + 1} / ${history.size}`;
    if (state.dirty && !state.broken && !message) setStatus(MSG.dirty); // m3 안내
  };
  const showResult = (prev: VNode, next: VNode, res: DiffResult) => {
    if (logEl) logEl.textContent = res.changes.map(formatChange).join('\n');
    renderTreeDiff(prev, next, res, doc);
  };
  const cancelTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const fail = (err: unknown) => {
    // ADR-0019 x3: 복구 자체가 실패
    console.error('[phase1] 복구 실패:', err);
    state.broken = true;
    setStatus(MSG.recoverFailed);
    updateButtons();
  };

  function evaluate(): void {
    timer = null;
    state.pending = false;
    const { root, extraRoots } = parseCode(editor.value);
    renderPreview(root, doc);
    state.dirty = root ? diff(state.current, root).changes.length > 0 : true; // m3 판단 = k1 판단 (ADR-0008 2절)
    setStatus(!root ? MSG.needRoot : extraRoots ? MSG.firstOnly : state.dirty ? MSG.dirty : '');
    updateButtons();
  }

  function onInput(): void {
    state.pending = true; // 틈 막기: 입력 즉시 두 버튼을 끈다 (ADR-0008 3절)
    setStatus('');
    updateButtons();
    cancelTimer();
    timer = setTimeout(evaluate, wait);
  }

  function onPatch(): void {
    if (state.broken) return;
    cancelTimer();
    const { root, extraRoots } = parseCode(editor.value);
    if (!root) {
      // ADR-0019 x1
      state.pending = false;
      state.dirty = true;
      renderPreview(null, doc);
      setStatus(MSG.needRoot);
      updateButtons();
      return;
    }
    renderPreview(root, doc); // 미리보기 즉시 (e3)
    const prev = state.current;
    const res = diff(prev, root);
    if (res.changes.length === 0) {
      // k1: 기록하지 않음
      state.dirty = false;
      state.pending = false;
      setStatus(extraRoots ? MSG.firstOnly : MSG.noChange);
      showResult(prev, root, res);
      updateButtons();
      return;
    }
    let r;
    try {
      r = applyPatch(realArea, root, res, { highlight: true, highlightExcludeTags: [] });
    } catch (err) {
      fail(err);
      return;
    }
    history.push(root); // 복구했어도 Patch 버튼이면 저장 (ADR-0005 6절, ADR-0017)
    state.current = root;
    state.dirty = false;
    state.pending = false;
    setStatus(r.recovered ? MSG.recovered : extraRoots ? MSG.firstOnly : '');
    showResult(prev, root, res);
    updateButtons();
  }

  function navigate(step: -1 | 1): void {
    if (state.broken || state.dirty || state.pending) return;
    const prev = state.current;
    const target = step < 0 ? history.undo() : history.redo();
    if (!target) return;
    const res = diff(prev, target); // "이전"은 언제나 지금 트리 (ADR-0004 dom 규칙 7)
    let r;
    try {
      r = applyPatch(realArea, target, res, { highlight: true }); // 변경 0개여도 부른다 (dom 이어받기)
    } catch (err) {
      fail(err);
      return;
    }
    state.current = target; // ADR-0017: 복구해도 History는 그대로
    editor.value = vnodeToHtml(target); // a3
    renderPreview(parseCode(editor.value).root, doc); // g1
    state.dirty = false;
    state.pending = false;
    setStatus(r.recovered ? MSG.recovered : '');
    showResult(prev, target, res);
    updateButtons();
  }

  function onRevert(): void {
    // ADR-0019 x4
    if (state.broken) return;
    cancelTimer();
    editor.value = vnodeToHtml(state.current);
    renderPreview(parseCode(editor.value).root, doc);
    state.dirty = false;
    state.pending = false;
    setStatus('');
    updateButtons();
  }

  editor.addEventListener('input', onInput);
  btn.patch.addEventListener('click', onPatch);
  btn.undo.addEventListener('click', () => navigate(-1));
  btn.redo.addEventListener('click', () => navigate(1));
  btn.revert.addEventListener('click', onRevert);
  updateButtons();
  startKeyDemo(doc); // 차별화 5번 (TBD-13)

  return {
    state,
    history,
    onInput,
    evaluate,
    onPatch,
    onUndo: () => navigate(-1),
    onRedo: () => navigate(1),
    onRevert,
  };
}
