import { describe, it, expect, vi } from 'vitest';

describe('[VT-35] 환경 점검 5대 테스트', () => {
  it('1. document가 존재한다', () => {
    expect(document).toBeDefined();
    expect(document.createElement).toBeTypeOf('function');
  });

  it('2. <template> 요소가 파싱 가능하다', () => {
    const template = document.createElement('template');
    template.innerHTML = '<div><span>테스트</span></div>';
    expect(template.content.children.length).toBe(1);
    expect(template.content.querySelector('span')?.textContent).toBe('테스트');
  });

  it('3. MutationObserver가 동작한다', async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    let mutated = false;
    const observer = new MutationObserver(() => {
      mutated = true;
    });
    observer.observe(div, { childList: true });

    div.appendChild(document.createElement('p'));
    await new Promise((r) => setTimeout(r, 10));

    expect(mutated).toBe(true);
    observer.disconnect();
    div.remove();
  });

  it('4. 가짜 타이머로 0.3초 debounce를 검증할 수 있다', () => {
    vi.useFakeTimers();
    let called = false;
    setTimeout(() => {
      called = true;
    }, 300);

    expect(called).toBe(false);
    vi.advanceTimersByTime(300);
    expect(called).toBe(true);
    vi.useRealTimers();
  });

  it('5. JSDOM 환경에서 노드 조작이 정상 동작한다', () => {
    const p = document.createElement('p');
    p.textContent = 'hello';
    document.body.appendChild(p);
    expect(p.parentNode).toBe(document.body);
    p.remove();
  });
});
