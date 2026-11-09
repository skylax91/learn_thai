'use strict';
/* =====================================================================
   ВСПОМОГАТЕЛЬНОЕ
   ===================================================================== */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PRE = 'เแโไใ';
const COMB = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;
// Данные — загружаются из data/*.json в init()
let LETTERS, WORDS, PATTERNS, TONES, LESSON_IDEA, TWINS, TWINHINT, LBY;
const ATTACHED = new Set(['ะ','า','\u0E33']); // не комбинирующиеся, но тоже «при согласной»

function disp(c){
  if (c == null) return '';
  if (PRE.includes(c)) return c + '◌';
  if (COMB.test(c) || ATTACHED.has(c)) return '◌' + c;
  return c;
}
function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }

function charLesson(ch){ return LBY[ch] ? LBY[ch].lesson : 99; }
function homeLesson(wd){
  const m = Math.max(...[...wd.t].map(charLesson));
  return wd.L ? Math.max(wd.L, m) : m;
}

// Тоны по слогам из диакритики транскрипции.
const MARK_TONE = {'̀':'low','̂':'fall','́':'high','̌':'rise'};
const VOW = /[aeiouɛɔɯə]/;
function syllTones(r){
  const s = r.normalize('NFD'); const out = []; let inV = false;
  for (const ch of s){
    if (/[̀-ͯ]/.test(ch)){ if (out.length && MARK_TONE[ch]) out[out.length-1] = MARK_TONE[ch]; continue; }
    if (VOW.test(ch)){ if (!inV){ out.push('mid'); inV = true; } }
    else inV = false;
  }
  return out;
}
const stripTones = r => r.normalize('NFD').replace(/[̀-ͯ]/g,'').normalize('NFC');

// Щадящая нормализация латиницы.
function normLat(s){
  s = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  s = s.replace(/[^a-zɛɔɯə]/g,'');
  s = s.replace(/ae/g,'ɛ').replace(/ue|eu/g,'ɯ').replace(/oe|er/g,'ə');
  s = s.replace(/ɛ/g,'e').replace(/ɔ/g,'o').replace(/ɯ/g,'u').replace(/ə/g,'e');
  s = s.replace(/dt/g,'t').replace(/bp/g,'p').replace(/ch|j/g,'c').replace(/(^|[^n])g/g,'$1k');
  s = s.replace(/([aeiou])w(?![aeiou])/g,'$1o').replace(/([aeiou])y(?![aeiou])/g,'$1i');
  return s.replace(/(.)\1+/g,'$1');
}
function latOk(inp, wd){
  const n = normLat(inp); if (!n) return false;
  return [wd.r, ...(wd.alt||[])].some(v => normLat(v) === n);
}
function normTh(s){
  return s.normalize('NFC').replace(/[\s​-‍]/g,'')
    .replace(/\u0E4Dา/g,'\u0E33')
    .replace(/\u0E33([\u0E48-\u0E4B])/g,'$1\u0E33')
    .replace(/([\u0E48-\u0E4B])([\u0E31\u0E34-\u0E37\u0E47])/g,'$2$1');
}

// Разбивка на графемы (база + верхние/нижние знаки) с подсветкой позиции idx.
function markAt(s, idx){
  const cl = []; let i = 0;
  for (const ch of s){
    if (cl.length && COMB.test(ch)) cl[cl.length-1].s += ch; else cl.push({s:ch, at:i});
    i += ch.length;
  }
  let hit = false;
  const html = cl.map((c,k) => {
    const end = k+1 < cl.length ? cl[k+1].at : s.length;
    if (!hit && idx >= c.at && idx < end){ hit = true; return '<mark>'+esc(c.s)+'</mark>'; }
    return esc(c.s);
  }).join('');
  return hit ? html : html + (idx >= s.length ? '<mark>◌</mark>' : '');
}

function sndOf(c){ const l = LBY[c]; return l ? l.snd : ''; }
function thaiHint(inp, t){
  let i = 0; while (i < inp.length && i < t.length && inp[i] === t[i]) i++;
  const e = t[i], g = inp[i];
  const nm = c => `<b class="th">${esc(disp(c))}</b>`;
  let msg;
  if (e === undefined) msg = `Лишнее в конце: ${nm(g)}.`;
  else if (g === undefined){
    msg = `Не хватает конца: дальше идёт ${nm(e)} (${esc(sndOf(e))}).`;
    if (e === 'อ' && t[i-1] === '\u0E37') msg += ' ◌ื в открытом слоге пишется с немой อ.';
  }
  else if (PRE.includes(e) && g === t[i+1] && inp[i+1] === e) msg = `${nm(e)} пишется ПЕРЕД согласной, хотя читается после неё.`;
  else if (TWINS[e] && TWINS[e].includes(g)) msg = `${nm(g)} — двойняшка: ${esc(TWINHINT[e] || '')}.`;
  else if (g === t[i+1]) msg = `Пропущен знак ${nm(e)} (${esc(sndOf(e))}).`;
  else if (inp[i+1] === e) msg = `Лишний знак ${nm(g)}.`;
  else if (e === 'อ' && t[i-1] === '\u0E37') msg = `После ◌ื в открытом слоге нужна немая อ.`;
  else msg = `Знак №${i+1}: нужен ${nm(e)} (${esc(sndOf(e))}), а у тебя ${nm(g)}.`;
  return {i, msg};
}
function latHint(inp, wd){
  const a = normLat(inp), b = normLat(wd.r);
  if (a.replace(/h/g,'') === b.replace(/h/g,'')) return 'Почти! Проверь придыхание: k/kh, p/ph, t/th.';
  if (a.replace(/l/g,'r') === b.replace(/l/g,'r')) return 'Почти! Перепутаны r и l.';
  if (a.replace(/[aeiou]/g,'') === b.replace(/[aeiou]/g,'')) return 'Согласные верны — проверь гласные.';
  return 'Разбери слово по буквам ниже.';
}

/* =====================================================================
   СОСТОЯНИЕ
   ===================================================================== */
const store = {
  get(k, d){ try { const v = localStorage.getItem('thai.'+k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem('thai.'+k, JSON.stringify(v)); } catch(e){} },
};
const S = {
  tab:'practice',
  lesson: store.get('lesson', 1),        // число или 'all'
  dir:    store.get('dir', 'th'),        // 'th' | 'lat'
  askTone:store.get('askTone', false),
  kbd:    store.get('kbd', true),
  stats:  store.get('stats', {ok:0, tries:0, streak:0, best:0}),
  queue:[], cur:null, phase:'ask', lastInput:null, tone:null,
};

const maxLesson = () => S.lesson === 'all' ? 20 : S.lesson;
function pool(){
  let p = S.lesson === 'all' ? WORDS.slice() : WORDS.filter(x => x.home === S.lesson);
  if (S.askTone){ const mono = p.filter(x => x.syl === 1); if (mono.length >= 4) p = mono; }
  return p;
}

/* =====================================================================
   РЕНДЕР
   ===================================================================== */
function renderLessons(){
  const box = $('lessons'); let h = '';
  for (let n=1;n<=20;n++) h += `<button data-l="${n}" class="${S.lesson===n?'on':''}">${n}</button>`;
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
  const chips = L.map(l => `<span class="chip${l.trap?' trap':''}"><span class="g">${esc(disp(l.c))}</span><span class="s">${esc(l.snd)}</span></span>`)
    .concat(P.map(p => `<span class="chip"><span class="g">${esc(p.c)}</span><span class="s">${esc(p.snd)}</span></span>`)).join('');
  b.innerHTML = `<div class="ttl">Урок ${S.lesson} · новое · ${WORDS.filter(x=>x.home===S.lesson).length} слов</div>
    <div class="chips">${chips}</div><div class="idea">${esc(LESSON_IDEA[S.lesson]||'')}</div>`;
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
  if (!(S.kbd && S.dir === 'th')) a.focus({preventScroll:true});
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
      ${S.askTone ? `<div class="row"><span class="lbl">тоны:</span>${esc(fmtSyllTones(wd))}</div>` : ''}`;
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
      h += `<div class="hint">${spellOk?'Написание верно, но т':'Т'}он — <b>${want.ru}</b> (${want.ex}), а ты выбрал ${got.ru}.</div>`;
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
    ${wrong}<div class="row"><span class="lbl">тоны:</span>${esc(fmtSyllTones(wd))}</div>${partsHTML(wd)}`;
}
function onEnter(){
  if (S.phase === 'done') return nextWord();
  if (S.phase === 'wrong' && $('ans').value === S.lastInput) return reveal();
  check();
}

function renderLetters(){
  const ml = maxLesson();
  const open = LETTERS.filter(l => l.lesson <= ml);
  const card = l => `<div class="lc${l.trap?' trap':''}"><span class="ls">ур.${l.lesson}</span>
    <div class="g">${esc(disp(l.c))}</div><div class="snd">${esc(l.snd)}</div><div class="nm">${esc(l.nm)}</div>
    <div class="note">${esc(l.note)}</div>
    ${TWINS[l.c] ? `<span class="tw">двойняшка: <b>${TWINS[l.c].map(c=>esc(disp(c))).join(' ')}</b></span>` : ''}</div>`;
  const sec = (title, items) => `<div class="sec">${title} · ${items.length}</div>` +
    (items.length ? `<div class="grid">${items.join('')}</div>` : '<div class="empty">Пока нет — откроются в следующих уроках.</div>');
  const pats = PATTERNS.filter(p => p.lesson <= ml).map(p => `<div class="lc"><span class="ls">ур.${p.lesson}</span>
    <div class="g">${esc(p.c)}</div><div class="snd">${esc(p.snd)}</div><div class="note">${esc(p.note)}</div></div>`);
  $('letters').innerHTML =
    `<div class="empty">Открыто до урока ${ml}. Жёлтая рамка — буква-двойняшка, легко спутать.</div>` +
    sec('Согласные', open.filter(l=>l.kind==='cons').map(card)) +
    sec('Гласные', open.filter(l=>l.kind==='vow').map(card)) +
    sec('Гласные-сочетания', pats) +
    sec('Тоновые знаки', open.filter(l=>l.kind==='tone').map(card));
}

function setLesson(l){
  S.lesson = l; store.set('lesson', l); S.queue = [];
  renderLessons(); renderBanner(); renderKeys();
  if (S.tab === 'letters') renderLetters();
  nextWord();
}

/* =====================================================================
   СОБЫТИЯ
   ===================================================================== */
$('tabs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  S.tab = b.dataset.tab;
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  $('practice').classList.toggle('hidden', S.tab !== 'practice');
  $('letters').classList.toggle('hidden', S.tab !== 'letters');
  if (S.tab === 'letters') renderLetters();
});
$('lessons').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  setLesson(b.dataset.l === 'all' ? 'all' : +b.dataset.l);
});
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
$('bReset').addEventListener('click', () => { S.stats = {ok:0, tries:0, streak:0, best:0}; saveStats(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing || S.tab !== 'practice') return;
  e.preventDefault(); onEnter();
});

/* =====================================================================
   СТАРТ
   ===================================================================== */
async function loadJSON(name){
  const r = await fetch('data/' + name + '.json');
  if (!r.ok) throw new Error(name + '.json: HTTP ' + r.status);
  return r.json();
}
async function init(){
  const [letters, words, patterns, tones, lessons, twins] = await Promise.all(
    ['letters','words','patterns','tones','lessons','twins'].map(loadJSON));
  LETTERS = letters; WORDS = words; PATTERNS = patterns; TONES = tones; LESSON_IDEA = lessons;
  TWINS = twins.twins; TWINHINT = twins.hints;
  LBY = Object.fromEntries(LETTERS.map(l => [l.c, l]));
  WORDS.forEach(x => {
    [...x.t].forEach(c => { if (!LBY[c]) console.warn('Нет буквы в letters.json:', c, 'в слове', x.t); });
    x.home = homeLesson(x);
    const st = syllTones(x.r); x.tone = st[st.length-1] || 'mid'; x.syl = st.length;
  });
  if (!(S.lesson === 'all' || (S.lesson >= 1 && S.lesson <= 20))) S.lesson = 1;
  renderLessons(); renderBanner(); renderToggles(); renderStats(); renderKeys();
  nextWord();
}
init().catch(err => {
  console.error(err);
  $('prompt').textContent = 'Не удалось загрузить данные';
  $('meaning').textContent = location.protocol === 'file:'
    ? 'Открой через локальный сервер: python3 -m http.server' : String(err.message || err);
});
