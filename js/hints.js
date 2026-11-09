'use strict';
/* Подсказки при ошибке: подсветка места, двойняшки, разбор транскрипции */

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
