// Phase 2 페이지 시작 (SDD_final_phase2 3장). 변경 로그는 Patch가 끝난 뒤에야 알 수 있으므로
// 컴포넌트 트리 밖의 #change-log에 페이지가 쓴다 (Phase 1 페이지와 같은 방식, TD11).
import { render } from '../../component/function-component';
import type { FunctionComponent } from '../../component/function-component';
import { formatChange } from '../phase1/format';
import { createTodoApp } from './App';

export function startPhase2(doc: Document = document) {
  const root = doc.getElementById('app-root');
  if (!root) throw new Error('#app-root가 없습니다');
  const log = doc.getElementById('change-log');
  const effects = doc.getElementById('effect-count');
  let comp: FunctionComponent<object> | null = null;
  const app = createTodoApp({ renderCount: () => comp?.renderCount ?? 0 }, doc);
  comp = render(app.App, {}, root, {
    onCommit: (c) => {
      if (log) log.textContent = c.lastChanges.length ? c.lastChanges.map(formatChange).join('\n') : '변경 없음';
      if (effects) effects.textContent = `📌 브라우저 탭 제목 바꾼 횟수 ${app.counters.effectRuns}`;
    },
  });
  return { component: comp, counters: app.counters };
}
