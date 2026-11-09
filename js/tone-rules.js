'use strict';
/* Объяснение тона односложного слова: класс + тоновый знак + тип слога */

const TONE_MARKS = {'\u0E48':'ek', '\u0E49':'tho', '\u0E4A':'tri', '\u0E4B':'chattawa'};
const MARK_NAME = {ek:'◌\u0E48 (mái èek)', tho:'◌\u0E49 (mái thoo)', tri:'◌\u0E4A (mái trii)', chattawa:'◌\u0E4B (mái jàttawaa)'};
const SONOR = 'งญนมยรลว';
function syllInfo(wd){
  // начальная согласная: пропускаем гласные, которые пишутся перед ней
  const t = [...wd.t].filter(c => !PRE.includes(c));
  let c0 = t[0], cls = LBY[c0] && LBY[c0].cls, lead = '';
  if (c0 === 'ห' && SONOR.includes(t[1])){ cls = 'high'; lead = `немая ห перед ${t[1]} делает слог высоким`; c0 = 'ห' + t[1]; }
  else if (c0 === 'อ' && t[1] === 'ย'){ cls = 'mid'; lead = 'немая อ перед ย делает слог средним'; c0 = 'อย'; }
  const markCh = [...wd.t].find(c => TONE_MARKS[c]);
  const mark = markCh ? TONE_MARKS[markCh] : null;
  // живой / мёртвый — по транскрипции
  const r = stripTones(wd.r).toLowerCase();
  let live, why, long = false;
  const vow = (r.match(/[aeiouɛɔɯə]+/g) || ['']).pop();
  if (/[kpt]$/.test(r)){ live = false; long = vow.length >= 2; why = `кончается на ${r.slice(-1)}`; }
  else if (/(m|n|ng)$/.test(r)){ live = true; why = `кончается на ${r.match(/(ng|m|n)$/)[0]}`; }
  else if (vow.length >= 2){ live = true; why = 'долгая гласная / дифтонг в конце'; }
  else { live = false; why = 'краткая гласная без конечной'; }
  return {c0, cls, lead, mark, live, long, why};
}
function predictTone(i){
  if (!i.cls) return null;
  if (i.mark === 'ek')  return i.cls === 'low' ? 'fall' : 'low';
  if (i.mark === 'tho') return i.cls === 'low' ? 'high' : 'fall';
  if (i.mark === 'tri') return 'high';
  if (i.mark === 'chattawa') return 'rise';
  if (i.cls === 'mid')  return i.live ? 'mid' : 'low';
  if (i.cls === 'high') return i.live ? 'rise' : 'low';
  return i.live ? 'mid' : (i.long ? 'fall' : 'high');
}
function explainTone(wd){
  const tn = id => TONES.find(t => t.id === id);
  if (wd.syl !== 1){
    return 'Правила: средний класс — живой слог средний, мёртвый низкий; высокий — живой восходящий, мёртвый низкий; '
      + 'низкий — живой средний, мёртвый краткий высокий, мёртвый долгий падающий. ◌่: средн./высок. → низкий, низк. → падающий; '
      + '◌้: средн./высок. → падающий, низк. → высокий.';
  }
  const i = syllInfo(wd), p = predictTone(i);
  if (!p || p !== wd.tone) return `Тон — ${tn(wd.tone).ru}: это исключение, его надо запомнить.`;
  const parts = [`<b class="th">${esc(i.c0)}</b> — ${CLASSES[i.cls]} класс` + (i.lead ? ` (${esc(i.lead)})` : '')];
  if (i.mark) parts.push(`знак ${esc(MARK_NAME[i.mark])}`);
  else parts.push(`без тонового знака, слог ${i.live ? 'живой' : 'мёртвый'}${!i.live && i.cls === 'low' ? (i.long ? ' долгий' : ' краткий') : ''} (${esc(i.why)})`);
  return parts.join(' · ') + ` → <b>${tn(wd.tone).ru}</b> (${tn(wd.tone).ex})`;
}
