'use strict';
/* Данные из data/*.json. Заполняются в loadData(), дальше только читаются */

let LETTERS, WORDS, PATTERNS, TONES, LESSON_IDEA, TWINS, TWINHINT, LBY;
let MAXL = 20;   // число уроков — пересчитывается из letters.json

async function loadJSON(name){
  const r = await fetch('data/' + name + '.json', {cache:'no-cache'});
  if (!r.ok) throw new Error(name + '.json: HTTP ' + r.status);
  return r.json();
}
async function loadData(){
  const [letters, words, patterns, tones, lessons, twins] = await Promise.all(
    ['letters','words','patterns','tones','lessons','twins'].map(loadJSON));
  LETTERS = letters; WORDS = words; PATTERNS = patterns; TONES = tones; LESSON_IDEA = lessons;
  TWINS = twins.twins; TWINHINT = twins.hints;
  LBY = Object.fromEntries(LETTERS.map(l => [l.c, l]));
  MAXL = Math.max(...LETTERS.map(l => l.lesson));
  // у каждого слова: домашний урок, тон последнего слога, число слогов
  WORDS.forEach(x => {
    [...x.t].forEach(c => { if (!LBY[c]) console.warn('Нет буквы в letters.json:', c, 'в слове', x.t); });
    x.home = homeLesson(x);
    const st = syllTones(x.r); x.tone = st[st.length-1] || 'mid'; x.syl = st.length;
  });
}
