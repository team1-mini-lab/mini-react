// key 있음·없음 비교 시연 (SDD_final_common 5장 5번, SRS TBD-13, FR-09)
// 같은 목록 변경(맨 앞에 사과 추가)을 key 있는 목록과 없는 목록에 각각 Diff → Patch한다.
// 사용자가 입력칸에 친 값이 key 있음에서는 자기 항목을 따라가고, key 없음에서는 자리에 남는다.
import { diff } from '../../core/diff';
import { applyPatch, mountTree } from '../../core/patch';
import type { VElement } from '../../core/vnode';
import { h } from '../../core/vnode';
import { formatChange } from './format';

const FRUITS = ['바나나', '딸기'];

export function fruitList(names: string[], withKey: boolean): VElement {
  return h('ul', null, ...names.map((n) => h('li', withKey ? { key: n } : null, `${n} `, h('input', { type: 'text', value: '' }))));
}

export interface KeyDemo {
  addFirst(): { keyed: number; unkeyed: number };
  reset(): void;
}

export function startKeyDemo(doc: Document = document): KeyDemo | null {
  const keyedBox = doc.getElementById('kd-keyed');
  const unkeyedBox = doc.getElementById('kd-unkeyed');
  const log = doc.getElementById('kd-log');
  if (!keyedBox || !unkeyedBox) return null;
  let keyed = fruitList(FRUITS, true);
  let unkeyed = fruitList(FRUITS, false);

  const reset = () => {
    keyed = fruitList(FRUITS, true);
    unkeyed = fruitList(FRUITS, false);
    mountTree(keyedBox, keyed);
    mountTree(unkeyedBox, unkeyed);
    if (log) log.textContent = '입력칸에 숫자를 적은 뒤 "맨 앞에 사과 추가"를 누르세요.';
  };

  const addFirst = () => {
    const names = ['사과', ...FRUITS];
    const nk = fruitList(names, true);
    const nu = fruitList(names, false);
    const rk = diff(keyed, nk);
    const ru = diff(unkeyed, nu);
    applyPatch(keyedBox, nk, rk, { highlight: true });
    applyPatch(unkeyedBox, nu, ru, { highlight: true });
    keyed = nk;
    unkeyed = nu;
    if (log) {
      log.textContent = [
        `key 있음: 변경 ${rk.changes.length}개 — ${rk.changes.map(formatChange).join(' · ')}`,
        `key 없음: 변경 ${ru.changes.length}개 — ${ru.changes.map(formatChange).join(' · ')}`,
      ].join('\n');
    }
    return { keyed: rk.changes.length, unkeyed: ru.changes.length };
  };

  doc.getElementById('kd-add')?.addEventListener('click', addFirst);
  doc.getElementById('kd-reset')?.addEventListener('click', reset);
  reset();
  return { addFirst, reset };
}
