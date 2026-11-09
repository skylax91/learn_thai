'use strict';
/* Вкладка «Классы». fwd: буква → класс + звук. rev: класс + звук → все подходящие буквы */

const CLS_MEMO = {
  mid:  'ก จ ด ต บ ป อ (+ ฎ ฏ) — «ไก่ จิก เด็ก ตาย บน ปาก โอ่ง»',
  high: 'ข ถ ผ ส ห (+ ฉ ฐ ฝ ศ ษ) — «ผี ฝาก ถุง ข้าว สาร ให้ ฉัน»',
  low:  'все остальные. Проще выучить средние и высокие — остальное низкие.',
};
const C = {
  dir: store.get('cdir', 'fwd'),
  filter: store.get('cfilter', ['mid','high','low']),   // какие классы тренировать
  byLesson: store.get('cbylesson', false),              // false — все 44 согласные, true — только открытые до урока
  stats: store.get('cstats', {ok:0, tries:0, streak:0, best:0}),
  queue:[], cur:null, phase:'ask', cls:null, lastInput:null, sel:new Set(),   // sel — выбранные буквы в режиме rev
};
// все открытые согласные / только выбранных классов
const cOpen = () => LETTERS.filter(l => l.kind === 'cons' && l.cls && (!C.byLesson || l.lesson <= maxLesson()));
const cPool = () => cOpen().filter(l => C.filter.includes(l.cls));
const sndKey = l => normLat(l.snd.split('/')[0]);
function cSndOk(inp, l){
  if (l.c === 'อ' && /^\s*[-—–]\s*$/.test(inp)) return true;   // немая อ
  const n = normLat(inp);
  return !!n && l.snd.split('/').some(s => normLat(s) === n);
}
// все буквы из пула с тем же классом и звуком (พ/ภ, ท/ธ, น/ณ, ย/ญ…)
const cMatches = l => cOpen().filter(x => x.cls === l.cls && sndKey(x) === sndKey(l));

function cRenderStats(){
  const s = C.stats;
  $('cstats').innerHTML = `<span>Верно <b>${s.ok}</b></span><span>Попыток <b>${s.tries}</b></span><span>Серия <b>${s.streak}</b> · рекорд <b>${s.best}</b></span>`;
}
function cSaveStats(){ store.set('cstats', C.stats); cRenderStats(); }
function cScore(ok){
  C.stats.tries++;
  if (ok){ C.stats.ok++; C.stats.streak++; C.stats.best = Math.max(C.stats.best, C.stats.streak); }
  else C.stats.streak = 0;
  cSaveStats();
}
function cRequeue(){ if (!C.queue.includes(C.cur)) C.queue.splice(Math.min(3, C.queue.length), 0, C.cur); }

function cRenderMemo(){
  const p = cOpen();
  const row = k => {
    const ls = p.filter(l => l.cls === k).map(l => l.c).join(' ');
    return `<div class="row">${clsBadge(k)} <span class="th">${esc(ls || '—')}</span></div>`;
  };
  $('cmemo').innerHTML = `<details><summary>Шпаргалка по классам</summary>
    ${row('mid')}${row('high')}${row('low')}
    <div class="row">Средние: ${esc(CLS_MEMO.mid)}</div>
    <div class="row">Высокие: ${esc(CLS_MEMO.high)}</div>
    <div class="row">Низкие: ${esc(CLS_MEMO.low)}</div></details>`;
}
function cRenderClsBtns(){
  $('clsbtns').innerHTML = ['mid','high','low'].map(k =>
    `<button data-c="${k}" class="${C.cls===k?'on':''}">${CLASSES[k]}</button>`).join('');
}
function cRenderDir(){
  document.querySelectorAll('#cdir button').forEach(b => b.classList.toggle('on', b.dataset.cdir === C.dir));
  $('cfwd').classList.toggle('hidden', C.dir !== 'fwd');
  $('crev').classList.toggle('hidden', C.dir !== 'rev');
}
function cInfo(l){
  const also = cMatches(l).filter(x => x !== l).map(x => x.c);
  return `<div class="row"><span class="big">${esc(l.c)}</span> &nbsp;${clsBadge(l.cls)} &nbsp;<b>${esc(l.snd)}</b>
    <span class="lbl">${esc(l.nm)}</span></div>
    ${also.length ? `<div class="row"><span class="lbl">тот же звук и класс:</span><span class="th">${esc(also.join(' '))}</span></div>` : ''}
    <div class="row">${esc(l.note)}</div>`;
}

function cShow(){
  const l = C.cur, fb = $('cfb');
  C.phase = 'ask'; C.cls = null; C.lastInput = null; C.sel = new Set();
  fb.className = 'fb'; fb.innerHTML = '';
  if (C.dir === 'fwd'){
    $('cprompt').className = 'prompt thbig'; $('cprompt').textContent = l.c;
    $('cmeaning').textContent = 'какой класс и какой звук?';
    const a = $('cans'); a.value = ''; a.readOnly = false; a.className = '';
    cRenderClsBtns();
    if (S.tab === 'classes') a.focus({preventScroll:true});
  } else {
    $('cprompt').className = 'prompt';
    $('cprompt').innerHTML = `${esc(l.snd)} &nbsp;${clsBadge(l.cls)}`;
    $('cmeaning').textContent = 'выбери ВСЕ подходящие буквы и нажми «Проверить»';
    // каждый вопрос — новый порядок, чтобы не запоминать позиции
    $('ckeys').innerHTML = shuffle(cOpen()).map(x => `<button data-k="${esc(x.c)}">${esc(x.c)}</button>`).join('');
  }
}
function cRenderFilter(){
  const o = cOpen();
  $('cfilter').innerHTML = 'Тренировать:' + ['mid','high','low'].map(k =>
    `<button data-f="${k}" class="${C.filter.includes(k)?'on':''}">${CLASSES[k]} · ${o.filter(l=>l.cls===k).length}</button>`).join('') +
    `<button class="tg${C.byLesson?' on':''}" id="tgByLesson"><i></i>Только до урока ${maxLesson()}</button>`;
}
function cNext(){
  if (!C.queue.length){
    const p = cPool();
    if (!p.length){
      C.cur = null; C.phase = 'done';
      $('cprompt').className = 'prompt'; $('cprompt').textContent = '—';
      $('cmeaning').textContent = `В уроках до ${maxLesson()} нет букв выбранного класса — выбери другой класс или выключи «Только до урока».`;
      $('ckeys').innerHTML = ''; $('cfb').className = 'fb'; $('cans').value = ''; $('cans').readOnly = true;
      return;
    }
    // в режиме rev — один вопрос на группу «класс + звук» (ส ศ ษ → один вопрос «s · высокий»)
    const uniq = C.dir === 'rev'
      ? [...new Map(p.map(l => [l.cls + '|' + sndKey(l), l])).values()]
      : p;
    C.queue = shuffle(uniq.slice());
    if (C.cur && C.queue.length > 1 && C.queue[0] === C.cur) C.queue.push(C.queue.shift());
  }
  C.cur = C.queue.shift();
  cShow();
}
function cCheck(){
  if (!C.cur) return;
  if (C.phase === 'done') return cNext();
  const l = C.cur, a = $('cans'), fb = $('cfb');
  if (!C.cls){ fb.className = 'fb show bad'; fb.innerHTML = '<div class="head">Выбери класс ↑</div>'; return; }
  if (!a.value.trim()){ fb.className = 'fb show bad'; fb.innerHTML = '<div class="head">Напиши звук</div>'; a.focus(); return; }
  const clsOk = C.cls === l.cls, sndOk = cSndOk(a.value, l);
  C.lastInput = a.value + '|' + C.cls;
  cScore(clsOk && sndOk);
  if (clsOk && sndOk){
    C.phase = 'done'; a.readOnly = true; a.className = 'ok';
    fb.className = 'fb show good';
    fb.innerHTML = `<div class="head">✓ Верно${C.stats.streak>2?' · серия '+C.stats.streak:''}</div>${cInfo(l)}`;
  } else {
    C.phase = 'wrong'; a.className = 'bad'; cRequeue();
    let h = '<div class="head">✗ Не совсем</div>';
    if (!clsOk) h += `<div class="hint">Класс не тот — подумай ещё. Средние: ก จ ด ต บ ป อ; высокие: ข ถ ผ ส ห.</div>`;
    if (!sndOk) h += `<div class="hint">Звук не тот${clsOk ? ' (класс верный)' : ''}.</div>`;
    h += '<div class="row"><span class="lbl">Исправь и нажми Enter, или «Ответ».</span></div>';
    fb.className = 'fb show bad'; fb.innerHTML = h;
  }
}
function cReveal(){
  if (!C.cur || C.phase === 'done') return;
  if (C.phase === 'ask') cScore(false); else { C.stats.streak = 0; cSaveStats(); }
  cRequeue(); C.phase = 'done';
  if (C.dir === 'fwd'){ $('cans').readOnly = true; C.cls = C.cur.cls; cRenderClsBtns(); }
  else {
    const ok = new Set(cMatches(C.cur).map(x => x.c));
    document.querySelectorAll('#ckeys button').forEach(b => {
      b.classList.remove('sel'); if (ok.has(b.dataset.k)) b.classList.add('ok'); });
  }
  const fb = $('cfb'); fb.className = 'fb show bad';
  fb.innerHTML = `<div class="head">Ответ</div>` + (C.dir === 'rev' ? cRevList() : cInfo(C.cur));
}
function cRevList(){
  return cMatches(C.cur).map(x => `<div class="row"><span class="big">${esc(x.c)}</span> &nbsp;${clsBadge(x.cls)}
    &nbsp;<b>${esc(x.snd)}</b> <span class="lbl">${esc(x.nm)}</span></div>`).join('');
}
// тап по букве — выбрать / снять выбор
function cTap(ch){
  if (!C.cur || C.phase === 'done') return;
  const btn = [...document.querySelectorAll('#ckeys button')].find(b => b.dataset.k === ch);
  if (C.sel.has(ch)) C.sel.delete(ch); else C.sel.add(ch);
  btn.classList.toggle('sel', C.sel.has(ch));
  $('cfb').className = 'fb';
}
function cCheckRev(){
  if (!C.cur) return;
  if (C.phase === 'done') return cNext();
  const fb = $('cfb');
  if (!C.sel.size){ fb.className = 'fb show bad'; fb.innerHTML = '<div class="head">Выбери букву ↑</div>'; return; }
  const need = new Set(cMatches(C.cur).map(x => x.c));
  const missed = [...need].filter(c => !C.sel.has(c));
  const extra = [...C.sel].filter(c => !need.has(c));
  const ok = !missed.length && !extra.length;
  cScore(ok); if (!ok) cRequeue();
  C.phase = 'done';
  document.querySelectorAll('#ckeys button').forEach(b => {
    const k = b.dataset.k; b.classList.remove('sel');
    if (need.has(k)) b.classList.add(C.sel.has(k) ? 'ok' : 'miss');
    else if (C.sel.has(k)) b.classList.add('no');
  });
  let h = ok
    ? `<div class="head">✓ Верно${need.size > 1 ? ' — все ' + need.size : ''}${C.stats.streak>2?' · серия '+C.stats.streak:''}</div>`
    : '<div class="head">✗ Не совсем</div>';
  if (missed.length) h += `<div class="hint">Пропущено: <span class="th">${esc(missed.join(' '))}</span> — всего подходит ${need.size}.</div>`;
  if (extra.length) h += `<div class="hint">Лишнее: ${extra.map(c => `<span class="th">${esc(c)}</span> ${clsBadge(LBY[c].cls)} <b>${esc(LBY[c].snd)}</b>`).join(', ')}</div>`;
  fb.className = 'fb show ' + (ok ? 'good' : 'bad');
  fb.innerHTML = h + cRevList();
}
function cOnEnter(){
  if (!C.cur) return;
  if (C.dir === 'rev') return cCheckRev();
  if (C.phase === 'done') return cNext();
  if (C.phase === 'wrong' && $('cans').value + '|' + C.cls === C.lastInput) return cReveal();
  cCheck();
}


$('cfilter').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'tgByLesson'){
    C.byLesson = !C.byLesson; store.set('cbylesson', C.byLesson);
    C.queue = []; cRenderFilter(); cRenderMemo(); cNext(); return;
  }
  const k = b.dataset.f, f = C.filter;
  if (f.includes(k)){ if (f.length === 1) return; C.filter = f.filter(x => x !== k); }   // хотя бы один класс
  else C.filter = ['mid','high','low'].filter(x => x === k || f.includes(x));
  store.set('cfilter', C.filter); C.queue = []; cRenderFilter(); cNext();
});
$('cdir').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  C.dir = b.dataset.cdir; store.set('cdir', C.dir); cRenderDir(); C.queue = []; cNext();
});
$('clsbtns').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || C.phase === 'done') return;
  C.cls = b.dataset.c; cRenderClsBtns(); $('cans').focus({preventScroll:true});
});
$('ckeys').addEventListener('click', e => { const b = e.target.closest('button'); if (b) cTap(b.dataset.k); });
$('cCheck').addEventListener('click', () => C.phase === 'done' ? cNext() : cCheck());
$('cShow').addEventListener('click', cReveal);
$('cShow2').addEventListener('click', cReveal);
$('cCheck2').addEventListener('click', cCheckRev);
$('cNext').addEventListener('click', () => { if (C.phase === 'ask' && $('cans').value.trim()) cScore(false); cNext(); });
$('cNext2').addEventListener('click', () => { if (C.phase === 'ask') cScore(false); cNext(); });
