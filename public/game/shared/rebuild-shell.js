(() => {
  'use strict';
  const chapters = [
    { id: 'water', file: 'water-purification.html', title: 'Clean Water' },
    { id: 'power', file: 'power-palampur.html', title: 'Power for Palampur' },
    { id: 'ration', file: 'rationing-palampur.html', title: 'Fair Rations' },
  ];
  const file = location.pathname.toLowerCase().split('/').at(-1);
  const current = chapters.findIndex(chapter => chapter.file === file);
  const journey = new URLSearchParams(location.search).get('journey');
  const active = current >= 0 && journey === chapters[current].id;
  const next = active ? chapters[current + 1] : undefined;
  let leaving = false;
  window.RebuildJourney = {
    active,
    hasNext: Boolean(next),
    nextLabel: next ? `Walk with Rio to ${next.title}` : 'Journey complete · Return to REBUILD',
    complete() {
      if (!active || leaving) return false;
      leaving = true;
      location.assign(next ? `../preview/?chapter=${next.id}` : '../');
      return true;
    }
  };
  window.addEventListener('pageshow', () => { leaving = false; });
  function addNavigation() {
    if (document.querySelector('.rebuild-shell-nav')) return;
    const nav = document.createElement('nav'); nav.className = 'rebuild-shell-nav';
    nav.setAttribute('aria-label', 'REBUILD journey navigation');
    const map = document.createElement('a'); map.href = './'; map.textContent = '☰ Module map';
    nav.append(map); document.body.append(nav);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', addNavigation, { once: true }) : addNavigation();
})();
