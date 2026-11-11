// SDD 6.3 — dom 키를 지운 깊은 복사본. Diff 테스트를 dom 없이 돌릴 때 (VT-03, ADR-0005 D12)
// core/vnode.ts의 VNode 타입이 생기면 제네릭 제약을 VNode로 바꾼다.
export function stripDom<T>(v: T): T {
  if (Array.isArray(v)) return v.map(stripDom) as T;
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) if (k !== 'dom') out[k] = stripDom(val);
    return out as T;
  }
  return v;
}
