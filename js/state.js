'use strict';
/* Общее состояние: выбранный урок, вкладка + настройки и счёт вкладки «Практика» */

const S = {
  tab:'practice',
  lesson: store.get('lesson', 1),        // число или 'all'
  dir:    store.get('dir', 'th'),        // 'th' | 'lat'
  askTone:store.get('askTone', false),
  kbd:    store.get('kbd', true),
  stats:  store.get('stats', {ok:0, tries:0, streak:0, best:0}),
  queue:[], cur:null, phase:'ask', lastInput:null, tone:null,
};
const maxLesson = () => S.lesson === 'all' ? MAXL : S.lesson;
