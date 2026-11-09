'use strict';
/* Вкладка «Буквы»: карточки открытых букв по разделам */

function renderLetters(){
  const ml = maxLesson();
  const open = LETTERS.filter(l => l.lesson <= ml);
  const card = l => `<div class="lc${l.trap?' trap':''}"><span class="ls">ур.${l.lesson}</span>
    <div class="g">${esc(disp(l.c))}</div><div class="snd">${esc(l.snd)} ${l.cls ? clsBadge(l.cls) : ''}</div><div class="nm">${esc(l.nm)}</div>
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
