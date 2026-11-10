// SDD 6.3 — fn 실행 동안 root 아래에서 일어난 DOM 기록 수를 센다 (NFR-01, VT-20, VT-29, VT-31, VT-38)
export async function countMutations(root: Node, fn: () => void): Promise<number> {
  const records: MutationRecord[] = [];
  const observer = new MutationObserver((list) => records.push(...list));
  observer.observe(root, { childList: true, attributes: true, characterData: true, subtree: true });
  try {
    fn();
    await Promise.resolve();               // 전달을 기다린 뒤 센다
    records.push(...observer.takeRecords());
  } finally {
    observer.disconnect();
  }
  return records.length;
}
