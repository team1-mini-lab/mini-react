const { document } = require('./spec');
const flush = () => new Promise(r => setTimeout(r, 0));
(async () => {
  const ul = document.createElement('ul'); ul.innerHTML = '<li>a</li><li>b</li><li>c</li>'; document.body.append(ul);
  let recs = []; const mo = new (document.defaultView.MutationObserver)(r => recs.push(...r));
  mo.observe(ul, { childList: true, attributes: true, characterData: true, subtree: true });
  ul.insertBefore(ul.children[2], ul.children[0]); await flush(); console.log('move 1회 → 기록', recs.length, '건'); recs = [];
  const li = ul.children[0]; li.setAttribute('class', 'x'); li.setAttribute('title', 't'); li.removeAttribute('id'); await flush();
  console.log('attrs 변경 1건(set 2, remove 1·없는 속성) → 기록', recs.length, '건'); recs = [];
  li.firstChild.remove(); await flush(); console.log('remove 1회 → 기록', recs.length, '건'); recs = [];
  const n = document.createElement('b'); ul.children[1].replaceWith(n); await flush(); console.log('replaceWith 1회 → 기록', recs.length, '건');
  console.log('jsdom Element.animate 존재?', typeof document.createElement('div').animate);
})();
