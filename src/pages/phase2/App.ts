// Phase 2 Todo 테스트 앱 (SDD_final_phase2 3장, FR-23). React·JSX 없이 이 프로젝트의 h()로만 적는다 (CON-01).
// State와 Hook은 App 하나에만 있고, 자식은 props만 받는 순수 함수다 (CON-06, Lifting State Up).
import { h } from '../../component/h';
import { useEffect, useMemo, useState } from '../../component/hooks';
import type { VElement } from '../../core/vnode';

export interface Todo {
  id: number;
  text: string;
  done: boolean;
}
export type Filter = 'all' | 'active' | 'done';
export interface Stats {
  total: number;
  remaining: number;
}
/** DebugPanel에 보여 줄 숫자. 앱 바깥(페이지)이 채운다 */
export interface DebugSource {
  renderCount(): number;
}
export interface Counters {
  memoRuns: number; // filteredTodos 계산 횟수 (TD7)
  effectRuns: number; // 제목 effect 실행 횟수 (TD8)
}

export const INITIAL_TODOS: Todo[] = [
  { id: 1, text: '장보기', done: false },
  { id: 2, text: '운동하기', done: true },
  { id: 3, text: '책 읽기', done: false },
];

// ---- 자식 컴포넌트: 모두 순수 함수 ----

export function Header({ stats }: { stats: Stats }): VElement {
  return h('header', { class: 'todo-header', 'data-c': 'Header' }, h('h1', null, '할 일 목록'), h('p', { id: 'remaining' }, `남은 일 ${stats.remaining}개 / 전체 ${stats.total}개`));
}

export function TodoInput(props: { value: string; onInput: (v: string) => void; onAdd: () => void; onAddThree: () => void }): VElement {
  return h(
    'div',
    { class: 'todo-input', 'data-c': 'TodoInput' },
    h('input', {
      id: 'todo-text',
      type: 'text',
      placeholder: '할 일을 입력하세요',
      value: props.value, // TD3·TD4: Patch가 value 프로퍼티를 다를 때만 맞춘다
      onInput: (e: Event) => props.onInput((e.target as HTMLInputElement).value),
      onKeydown: (e: Event) => {
        if ((e as KeyboardEvent).key === 'Enter') props.onAdd();
      },
    }),
    h('button', { id: 'add', type: 'button', onClick: props.onAdd }, '추가'),
    h('button', { id: 'add-three', type: 'button', onClick: props.onAddThree }, '3개 한 번에 추가'),
  );
}

function FilterButton({ value, label, active, onChange }: { value: Filter; label: string; active: boolean; onChange: (f: Filter) => void }): VElement {
  return h('button', { type: 'button', class: active ? 'filter active' : 'filter', 'data-filter': value, 'data-c': 'FilterButton', onClick: () => onChange(value) }, label);
}

export function FilterBar({ filter, onChange }: { filter: Filter; onChange: (f: Filter) => void }): VElement {
  const items: [Filter, string][] = [
    ['all', '전체'],
    ['active', '진행'],
    ['done', '완료'],
  ];
  return h('nav', { class: 'filters', 'data-c': 'FilterBar' }, items.map(([value, label]) => h(FilterButton, { key: value, value, label, active: filter === value, onChange })));
}

export function TodoItem({ todo, onToggle, onRemove }: { todo: Todo; onToggle: (id: number) => void; onRemove: (id: number) => void }): VElement {
  return h(
    'li',
    { class: todo.done ? 'todo done' : 'todo', 'data-c': 'TodoItem' },
    h('input', { type: 'checkbox', class: 'toggle', checked: todo.done, onChange: () => onToggle(todo.id) }), // TD5
    h('span', { class: 'text' }, todo.text),
    h('button', { type: 'button', class: 'remove', onClick: () => onRemove(todo.id) }, '삭제'),
  );
}

export function TodoList({ todos, onToggle, onRemove }: { todos: Todo[]; onToggle: (id: number) => void; onRemove: (id: number) => void }): VElement {
  return h(
    'ul',
    { id: 'todo-list', 'data-c': 'TodoList' },
    todos.map((todo) => h(TodoItem, { key: todo.id, todo, onToggle, onRemove })), // TD1·TD2: key는 <li>로, props에는 없다
    todos.length === 0 && h('li', { class: 'empty' }, '할 일이 없습니다'),
  );
}

export function DebugPanel({ stats, renderNo, memoRuns }: { stats: Stats; renderNo: number; memoRuns: number }): VElement {
  return h(
    'aside',
    { id: 'debug', 'data-c': 'DebugPanel' },
    h('h2', null, '엔진 계기판'),
    h('p', { id: 'debug-remaining' }, `남은 일 ${stats.remaining}개`), // TD9: 같은 값을 두 번째 장소에
    h('p', { id: 'debug-render' }, `🔄 화면 다시 그린 횟수 ${renderNo}`),
    h('p', { id: 'debug-memo' }, `🧮 목록 다시 거른 횟수 ${memoRuns} (useMemo가 건너뛴 횟수 ${renderNo - memoRuns})`),
  );
}

// ---- 루트 컴포넌트 ----

export function createTodoApp(debug: DebugSource, doc: Document = document) {
  const counters: Counters = { memoRuns: 0, effectRuns: 0 };
  let seq = INITIAL_TODOS.length + 1;

  function App(): VElement {
    const [todos, setTodos] = useState<Todo[]>(() => INITIAL_TODOS.map((t) => ({ ...t })));
    const [input, setInput] = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    const filtered = useMemo(() => {
      counters.memoRuns += 1;
      return filter === 'all' ? todos : todos.filter((t) => (filter === 'done' ? t.done : !t.done));
    }, [todos, filter]); // TD7: 타이핑(input)에는 다시 계산하지 않는다
    const stats = useMemo<Stats>(() => ({ total: todos.length, remaining: todos.filter((t) => !t.done).length }), [todos]);

    useEffect(() => {
      counters.effectRuns += 1;
      doc.title = `할 일 ${stats.remaining}개 남음`; // TD8: 남은 개수가 바뀔 때만
    }, [stats.remaining]);

    const add = (text: string) => setTodos((list) => [...list, { id: seq++, text, done: false }]);
    const onAdd = () => {
      const text = input.trim();
      if (!text) return;
      add(text);
      setInput(''); // TD3
    };
    const onAddThree = () => {
      // TD6: setter 3번 → 렌더 1번 (Batching)
      for (let i = 1; i <= 3; i++) add(`새 할 일 ${seq}`);
    };
    const onToggle = (id: number) => setTodos((list) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    const onRemove = (id: number) => setTodos((list) => list.filter((t) => t.id !== id));

    return h(
      'div',
      { id: 'todo-app', 'data-c': 'App · State는 여기만' },
      h(Header, { stats }),
      h(TodoInput, { value: input, onInput: setInput, onAdd, onAddThree }),
      h(FilterBar, { filter, onChange: setFilter }),
      h(TodoList, { todos: filtered, onToggle, onRemove }),
      h(DebugPanel, { stats, renderNo: debug.renderCount() + 1, memoRuns: counters.memoRuns }),
    );
  }

  return { App, counters };
}
