'use strict';
/* Общий каркас: список уроков, плашка урока, вкладки, Enter, сброс счётчика */

function renderLessons(){
  const box = $('lessons'); let h = '';
  for (let n=1;n<=MAXL;n++) h += `<button data-l="${n}" class="${S.lesson===n?'on':''}">${n}</button>`;
  h += `<button data-l="all" class="${S.lesson==='all'?'on':''}">Всё</button>`;
  box.innerHTML = h;
  const on = box.querySelector('.on');
  if (on) box.scrollLeft = on.offsetLeft - box.offsetLeft - box.clientWidth/2 + on.offsetWidth/2;
}
function renderBanner(){
  const b = $('banner');
  if (S.lesson === 'all'){
    b.innerHTML = `<div class="ttl">Все уроки</div><div class="idea">Все ${WORDS.length} слов вперемешку.</div>`;
    return;
  }
  const L = LETTERS.filter(l => l.lesson === S.lesson), P = PATTERNS.filter(p => p.lesson === S.lesson);
  // согласные окрашены цветом своего класса
  const chips = L.map(l => `<span class="chip${l.trap?' trap':''}${l.cls?' k-'+l.cls:''}"><span class="g">${esc(disp(l.c))}</span><span class="s">${esc(l.snd)}</span></span>`)
    .concat(P.map(p => `<span class="chip"><span class="g">${esc(p.c)}</span><span class="s">${esc(p.snd)}</span></span>`)).join('');
  b.innerHTML = `<div class="ttl">Урок ${S.lesson} · новое · ${WORDS.filter(x=>x.home===S.lesson).length} слов</div>
    <div class="chips">${chips}</div>${clsLegend(L)}<div class="idea">${esc(LESSON_IDEA[S.lesson]||'')}</div>`;
}
// легенда цветов — только для классов, которые есть среди новых букв
function clsLegend(L){
  const ks = ['mid','high','low'].filter(k => L.some(l => l.cls === k));
  if (!ks.length) return '';
  return '<div class="legend">' + ks.map(k => `<span class="k-${k}"><i></i>${CLASSES[k]}</span>`).join('') + '</div>';
}

function setLesson(l){
  S.lesson = l; store.set('lesson', l); S.queue = []; C.queue = [];
  renderLessons(); renderBanner(); renderKeys();
  if (S.tab === 'letters') renderLetters();
  nextWord(); cRenderFilter(); cRenderMemo(); cNext();
}

$('tabs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  S.tab = b.dataset.tab;
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  ['practice','classes','letters'].forEach(id => $(id).classList.toggle('hidden', S.tab !== id));
  if (S.tab === 'letters') renderLetters();
  if (S.tab === 'classes'){ cRenderMemo(); if (C.dir === 'fwd' && C.phase !== 'done') $('cans').focus({preventScroll:true}); }
});
$('lessons').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  setLesson(b.dataset.l === 'all' ? 'all' : +b.dataset.l);
});
$('bReset').addEventListener('click', () => {
  const z = {ok:0, tries:0, streak:0, best:0};
  if (S.tab === 'classes'){ C.stats = z; cSaveStats(); } else { S.stats = z; saveStats(); }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing) return;
  if (S.tab === 'practice'){ e.preventDefault(); onEnter(); }
  else if (S.tab === 'classes'){ e.preventDefault(); cOnEnter(); }
});
