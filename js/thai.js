'use strict';
/* Тайское письмо и транскрипция: отображение знаков, уроки слов, тоны по диакритике, нормализация ввода */

const PRE = 'เแโไใ';
const COMB = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;
const ATTACHED = new Set(['ะ','า','\u0E33']); // не комбинирующиеся, но тоже «при согласной»
const CLASSES = {mid:'средний', high:'высокий', low:'низкий'};
const clsBadge = c => `<span class="badge cls-${c}">${CLASSES[c]}</span>`;

function disp(c){
  if (c == null) return '';
  if (PRE.includes(c)) return c + '◌';
  if (COMB.test(c) || ATTACHED.has(c)) return '◌' + c;
  return c;
}

function charLesson(ch){ return LBY[ch] ? LBY[ch].lesson : 99; }
function homeLesson(wd){
  const m = Math.max(...[...wd.t].map(charLesson));
  return wd.L ? Math.max(wd.L, m) : m;
}

// Тоны по слогам из диакритики транскрипции.
const MARK_TONE = {'\u0300':'low','\u0302':'fall','\u0301':'high','\u030C':'rise'};
const VOW = /[aeiouɛɔɯə]/;
function syllTones(r){
  const s = r.normalize('NFD'); const out = []; let inV = false;
  for (const ch of s){
    if (/[\u0300-\u036F]/.test(ch)){ if (out.length && MARK_TONE[ch]) out[out.length-1] = MARK_TONE[ch]; continue; }
    if (VOW.test(ch)){ if (!inV){ out.push('mid'); inV = true; } }
    else inV = false;
  }
  return out;
}
const stripTones = r => r.normalize('NFD').replace(/[\u0300-\u036F]/g,'').normalize('NFC');

// Щадящая нормализация латиницы.
function normLat(s){
  s = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036F]/g,'');
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
function sndOf(c){ const l = LBY[c]; return l ? l.snd : ''; }
