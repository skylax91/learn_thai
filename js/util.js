'use strict';
/* Общие мелочи: DOM, экранирование, перемешивание, localStorage */

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }

const store = {
  get(k, d){ try { const v = localStorage.getItem('thai.'+k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem('thai.'+k, JSON.stringify(v)); } catch(e){} },
};
