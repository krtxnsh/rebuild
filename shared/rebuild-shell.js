(() => {
  'use strict';
  const path = location.pathname.toLowerCase();
  const current = path.includes('water') ? 0 : path.includes('power') ? 1 : 2;
  const journey = new URLSearchParams(location.search).get('journey');
  const chapters = ['water', 'power', 'ration'];
  const modules = [{ name: 'Clean Water' }, { name: 'Power for Palampur' }, { name: 'Fair Rations' }];
  const nextChapter = chapters[current + 1] || null;
  window.RebuildJourney = {
    active: Boolean(journey),
    hasNext: Boolean(nextChapter),
    nextLabel: nextChapter ? `Walk with Rio to ${modules[current + 1].name}` : 'Journey complete · Return to REBUILD',
    complete() { location.href = nextChapter ? `../preview/?chapter=${nextChapter}` : '../'; return true; }
  };
  function addNavigation() {
    if (document.querySelector('.rebuild-shell-nav')) return;
    const nav = document.createElement('nav'); nav.className = 'rebuild-shell-nav';
    nav.setAttribute('aria-label', 'REBUILD journey navigation');
    const map = document.createElement('a'); map.href = './'; map.textContent = '☰ Module map';
    nav.append(map); document.body.append(nav);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', addNavigation, { once: true }) : addNavigation();
})();
