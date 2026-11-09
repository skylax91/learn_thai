'use strict';
/* Вкладка «Практика»: слово → написание (тайским или транскрипцией) + тон */

function pool(){
  let p = S.lesson === 'all' ? WORDS.slice() : WORDS.filter(x => x.home === S.lesson);
  if (S.askTone){ const mono = p.filter(x => x.syl === 1); if (mono.length >= 4) p = mono; }
  return p;
}
function renderStats(){
  const s = S.stats;
  $('stats').innerHTML = `<span>Верно <b>${s.ok}</b></span><span>Попыток <b>${s.tries}</b></span><span>Серия <b>${s.streak}</b> · рекорд <b>${s.best}</b></span>`;
}
function renderToggles(){
  document.querySelectorAll('#dir button').forEach(b => b.classList.toggle('on', b.dataset.dir === S.dir));
  $('tgTone').classList.toggle('on', S.askTone);
  $('tgKbd').classList.toggle('on', S.kbd);
  $('tgKbd').classList.toggle('hidden', S.dir !== 'th');
  const kb = S.kbd && S.dir === 'th';
  $('kbd').classList.toggle('hidden', !kb);
  const a = $('ans');
  a.classList.toggle('thin', S.dir === 'th');
  a.lang = S.dir === 'th' ? 'th' : 'en';
  a.setAttribute('inputmode', kb ? 'none' : 'text');
  a.placeholder = S.dir === 'th' ? 'пиши тайскими буквами' : 'транскрипция латиницей';
}
function renderTones(){
  const box = $('tones');
  box.classList.toggle('hidden', !S.askTone);
  box.innerHTML = TONES.map(t => `<button data-t="${t.id}" class="${S.tone===t.id?'on':''}"><b>${t.ex}</b>${t.ru}</button>`).join('');
}
function renderKeys(){
  const ml = maxLesson();
  const open = LETTERS.filter(l => l.lesson <= ml);
  const grp = k => open.filter(l => l.kind === k).map(l => `<button data-k="${esc(l.c)}">${esc(disp(l.c))}</button>`).join('');
  $('keys').innerHTML = grp('cons') + '<div class="sep"></div>' + grp('vow') + grp('tone') + `<button class="bs" data-k="BS">⌫</button>`;
}

function fmtSyllTones(wd){ return syllTones(wd.r).map(id => TONES.find(t=>t.id===id).ru).join(' · '); }
function partsHTML(wd){
  return '<div class="parts">' + [...wd.t].map(c => `<span><b>${esc(disp(c))}</b>${esc(sndOf(c))}</span>`).join('') + '</div>';
}

function showWord(){
  const wd = S.cur, a = $('ans');
  const shownR = S.askTone ? stripTones(wd.r) : wd.r;
  const p = $('prompt'), m = $('meaning');
  if (S.dir === 'th'){ p.className = 'prompt'; p.textContent = shownR; m.textContent = wd.m; }
  else { p.className = 'prompt thbig'; p.textContent = wd.t; m.textContent = S.askTone ? '' : ''; }
  $('tonehint').textContent = S.askTone && wd.syl > 1 ? 'тон последнего слога' : '';
  a.value = ''; a.readOnly = false; a.className = S.dir === 'th' ? 'thin' : '';
  S.tone = null; S.phase = 'ask'; S.lastInput = null;
  renderTones();
  const fb = $('fb'); fb.className = 'fb'; fb.innerHTML = '';
  if (!(S.kbd && S.dir === 'th') && S.tab === 'practice') a.focus({preventScroll:true});
}
function nextWord(){
  if (!S.queue.length){
    const p = pool(); if (!p.length){ $('prompt').textContent = 'Нет слов'; return; }
    S.queue = shuffle(p.slice());
    if (S.cur && S.queue.length > 1 && S.queue[0] === S.cur) S.queue.push(S.queue.shift());
  }
  S.cur = S.queue.shift();
  showWord();
}
function requeue(){ if (!S.queue.includes(S.cur)) S.queue.splice(Math.min(3, S.queue.length), 0, S.cur); }
function saveStats(){ store.set('stats', S.stats); renderStats(); }

function check(){
  if (S.phase === 'done') return nextWord();
  const wd = S.cur, a = $('ans'), raw = a.value;
  const fb = $('fb');
  if (!raw.trim()){ a.focus(); return; }
  if (S.askTone && !S.tone){
    fb.className = 'fb show bad'; fb.innerHTML = '<div class="head">Выбери тон ↓</div>'; return;
  }
  const spellOk = S.dir === 'th' ? normTh(raw) === normTh(wd.t) : latOk(raw, wd);
  const toneOk = !S.askTone || S.tone === wd.tone;
  S.lastInput = raw; S.stats.tries++;
  const answer = `<div class="row"><span class="big">${esc(wd.t)}</span> &nbsp;<b>${esc(wd.r)}</b> — ${esc(wd.m)}</div>`;
  if (spellOk && toneOk){
    S.stats.ok++; S.stats.streak++; S.stats.best = Math.max(S.stats.best, S.stats.streak);
    S.phase = 'done'; a.readOnly = true; a.className = (S.dir==='th'?'thin ':'') + 'ok';
    fb.className = 'fb show good';
    fb.innerHTML = `<div class="head">✓ Верно${S.stats.streak>2?' · серия '+S.stats.streak:''}</div>${answer}
      ${S.askTone ? `<div class="row"><span class="lbl">тоны:</span>${esc(fmtSyllTones(wd))}</div><div class="row why">${explainTone(wd)}</div>` : ''}`;
  } else {
    S.stats.streak = 0; S.phase = 'wrong'; a.className = (S.dir==='th'?'thin ':'') + 'bad'; requeue();
    let h = '<div class="head">✗ Не совсем</div>';
    if (!spellOk){
      if (S.dir === 'th'){
        const n = normTh(raw), H = thaiHint(n, wd.t);
        h += `<div class="hint">${H.msg}</div>
          <div class="row"><span class="lbl">у тебя:</span><span class="big">${markAt(n, H.i)}</span></div>`;
      } else {
        h += `<div class="hint">${esc(latHint(raw, wd))}</div>`;
      }
    }
    if (!toneOk){
      const want = TONES.find(t=>t.id===wd.tone), got = TONES.find(t=>t.id===S.tone);
      h += `<div class="hint">${spellOk?'Написание верно, но т':'Т'}он — <b>${want.ru}</b> (${want.ex}), а ты выбрал ${got.ru}.
        <div class="why">${explainTone(wd)}</div></div>`;
    }
    h += '<div class="row"><span class="lbl">Исправь и нажми Enter ещё раз, или «Ответ».</span></div>';
    fb.className = 'fb show bad'; fb.innerHTML = h;
  }
  saveStats();
}
function reveal(){
  if (S.phase === 'done') return;
  const wd = S.cur, a = $('ans'), fb = $('fb');
  if (S.phase === 'ask'){ S.stats.tries++; }
  S.stats.streak = 0; requeue(); saveStats();
  S.phase = 'done'; a.readOnly = true;
  let wrong = '';
  if (S.dir === 'th' && a.value.trim()){
    const n = normTh(a.value), H = thaiHint(n, wd.t);
    if (H.i < Math.max(n.length, wd.t.length)) wrong = `<div class="row"><span class="lbl">правильно:</span><span class="big">${markAt(wd.t, H.i)}</span></div>`;
  }
  fb.className = 'fb show bad';
  fb.innerHTML = `<div class="head">Ответ</div>
    <div class="row"><span class="big">${esc(wd.t)}</span> &nbsp;<b>${esc(wd.r)}</b> — ${esc(wd.m)}</div>
    ${wrong}<div class="row"><span class="lbl">тоны:</span>${esc(fmtSyllTones(wd))}</div>
    ${S.askTone ? `<div class="row why">${explainTone(wd)}</div>` : ''}${partsHTML(wd)}`;
}
function onEnter(){
  if (S.phase === 'done') return nextWord();
  if (S.phase === 'wrong' && $('ans').value === S.lastInput) return reveal();
  check();
}

$('dir').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  S.dir = b.dataset.dir; store.set('dir', S.dir); renderToggles(); showWord();
});
$('tgTone').addEventListener('click', () => { S.askTone = !S.askTone; store.set('askTone', S.askTone); renderToggles(); S.queue = []; nextWord(); });
$('tgKbd').addEventListener('click', () => { S.kbd = !S.kbd; store.set('kbd', S.kbd); renderToggles(); if (!S.kbd) $('ans').focus(); });
$('tones').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || S.phase === 'done') return;
  S.tone = b.dataset.t; renderTones();
});
$('keys').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const a = $('ans'); if (a.readOnly) return;
  const k = b.dataset.k;
  if (k === 'BS'){ const arr = [...a.value]; arr.pop(); a.value = arr.join(''); }
  else a.value += k;
});
$('bCheck').addEventListener('click', () => S.phase === 'done' ? nextWord() : check());
$('bShow').addEventListener('click', reveal);
$('bNext').addEventListener('click', () => { if (S.phase === 'ask' && $('ans').value.trim()) { S.stats.tries++; S.stats.streak = 0; saveStats(); } nextWord(); });
