'use strict';
/* Старт: загрузить данные и отрисовать все вкладки */

loadData().then(() => {
  if (!(S.lesson === 'all' || (S.lesson >= 1 && S.lesson <= MAXL))) S.lesson = 1;
  renderLessons(); renderBanner(); renderToggles(); renderStats(); renderKeys();
  nextWord();
  cRenderDir(); cRenderFilter(); cRenderStats(); cNext();
}).catch(err => {
  console.error(err);
  $('prompt').textContent = 'Не удалось загрузить данные';
  $('meaning').textContent = location.protocol === 'file:'
    ? 'Открой через локальный сервер: python3 -m http.server' : String(err.message || err);
});
