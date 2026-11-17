/*
 * REBUILD · Engineer's Notebook
 * Shared, classic (non-module) script. Exposes window.RebuildNotebook.
 * Collects one notebook across all three learning modules and persists the
 * unlocked parts in localStorage so a part stays unlocked between visits.
 * No dependencies, no build step. Safe to load as a plain blocking <script>.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'rebuild.notebook.v1';

  /* ---- Fixed data: 3 modules, 10 parts -------------------------------- */
  var MODULES = [
    {
      key: 'water',
      num: 1,
      name: 'Clean Water',
      tab: 'Module 1 · Clean Water',
      parts: [
        {
          id: 'water.sedimentation',
          title: 'Sedimentation',
          text: 'When water stays still, heavy mud sinks to the bottom.',
          remember: 'Still, calm water lets the heaviest dirt settle to the bottom on its own.',
          village: 'At the water house, let the muddy pot stand quietly before you touch it.'
        },
        {
          id: 'water.decantation',
          title: 'Decantation',
          text: 'Gently pouring off the clear water and leaving the mud behind.',
          remember: 'Pour slowly so the clear water comes off and the settled mud stays behind.',
          village: 'At the water house, tip the clear top layer into a fresh pot for the village.'
        },
        {
          id: 'water.filtration',
          title: 'Filtration',
          text: 'Layers from big to small catch smaller and smaller dirt.',
          remember: 'Stacking layers from coarse to fine traps dirt of every size.',
          village: 'The water house filter uses gravel, sand and charcoal to catch the last specks.'
        },
        {
          id: 'water.boiling',
          title: 'Boiling',
          text: 'Boiling water for a few minutes kills germs too small to see.',
          remember: 'A few minutes at a rolling boil kills germs you cannot see.',
          village: 'Boil the filtered water at the water house before anyone in Palampur drinks it.'
        }
      ]
    },
    {
      key: 'power',
      num: 2,
      name: 'Power for Palampur',
      tab: 'Module 2 · Power',
      parts: [
        {
          id: 'power.circuit',
          title: 'A complete circuit',
          text: 'Electricity needs a complete, closed path to flow. One wire is not enough — you need a full loop.',
          remember: 'Electricity only flows when the path makes a full loop back to the battery.',
          village: 'The solar house lights up only when its wires form one closed loop.'
        },
        {
          id: 'power.current',
          title: 'Current is not used up',
          text: 'The current entering the bulb equals the current leaving it. The bulb turns electrical energy into light — it does not consume the current.',
          remember: 'The same current that enters a bulb leaves it; the bulb uses energy, not current.',
          village: 'Each street lamp in Palampur glows while the same current keeps flowing round the loop.'
        },
        {
          id: 'power.conductors',
          title: 'Conductors & insulators',
          text: 'Conductors (metals) let current pass and light the bulb. Insulators like wood, plastic and rubber do not.',
          remember: 'Metals let current through, but wood, plastic and rubber block it.',
          village: 'At the solar house, metal wires carry the power while plastic grips keep hands safe.'
        }
      ]
    },
    {
      key: 'ration',
      num: 3,
      name: 'Fair Rations',
      tab: 'Module 3 · Rations',
      parts: [
        {
          id: 'ration.variable',
          title: 'A letter stands for a number',
          text: 'x is an unknown number. x added six times is 6x, and 6x = 144 gives x = 24 by dividing. Each family gets 24 kg.',
          remember: 'A letter stands for an unknown number, so 6x = 144 means x = 24.',
          village: 'At the grain store, x is each family’s fair share when 144 kg is split six ways.'
        },
        {
          id: 'ration.fractions',
          title: 'More pieces, smaller parts',
          text: 'Fractions are equal parts of a whole. Splitting the same block into more pieces makes each piece smaller, so 1/4 > 1/8. And 1/2 = 2/4 = 4/8.',
          remember: 'Cutting a whole into more pieces makes each piece smaller, so 1/4 is bigger than 1/8.',
          village: 'At the grain store, a sack split into 4 equal bags gives more than one split into 8.'
        },
        {
          id: 'ration.equation',
          title: 'An equation plans a resource',
          text: 'Using x kg a day for 5 days is 5x. Since 5x = 210, dividing gives x = 42 kg/day — just enough to last the whole week.',
          remember: 'An equation like 5x = 210 lets you plan ahead, giving x = 42 for each day.',
          village: 'At the grain store, 210 kg shared over 5 days means 42 kg handed out each day.'
        }
      ]
    }
  ];

  /* ---- Lookup tables --------------------------------------------------- */
  var MODULE_BY_KEY = {};
  var PART_INDEX = {}; // id -> { part, moduleKey, moduleNum, posInModule }
  MODULES.forEach(function (m) {
    MODULE_BY_KEY[m.key] = m;
    m.parts.forEach(function (p, i) {
      PART_INDEX[p.id] = { part: p, moduleKey: m.key, moduleNum: m.num, pos: i + 1 };
    });
  });

  /* ---- Persistence (localStorage with in-memory fallback) -------------- */
  // state.unlocked: { id: timestamp }. Always kept in memory; mirrored to
  // localStorage when possible. If storage is blocked, we simply keep the
  // in-memory copy for the life of the page.
  var state = { unlocked: {} };

  (function loadState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var obj = JSON.parse(raw);
        if (obj && obj.unlocked && typeof obj.unlocked === 'object') {
          // Keep only ids we still recognise.
          Object.keys(obj.unlocked).forEach(function (id) {
            if (PART_INDEX[id]) state.unlocked[id] = obj.unlocked[id];
          });
        }
      }
    } catch (e) {
      // storage blocked / corrupt -> start empty, in-memory only
    }
  })();

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, unlocked: state.unlocked }));
    } catch (e) {
      // ignore: memory copy still holds the truth for this page
    }
  }

  /* ---- HTML helpers ---------------------------------------------------- */
  var LOCK_SVG = '<svg class="rnb-lockic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10V8a6 6 0 0 1 12 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1zm2 0h8V8a4 4 0 0 0-8 0v2zm4 4a1.6 1.6 0 0 0-.8 3v2.2h1.6V17a1.6 1.6 0 0 0-.8-3z"/></svg>';
  var BOOK_SVG = '<svg class="rnb-bookic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5V4.5zM6.5 16H18V4H6.5a.5.5 0 0 0-.5.5V16z"/></svg>';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---- Public API ------------------------------------------------------ */
  function isUnlocked(id) {
    return Object.prototype.hasOwnProperty.call(state.unlocked, id);
  }

  function unlock(id) {
    if (!PART_INDEX[id]) {
      if (window.console && console.warn) console.warn('[RebuildNotebook] unknown part id:', id);
      return false;
    }
    if (isUnlocked(id)) return false;
    state.unlocked[id] = Date.now();
    persist();
    return true;
  }

  function count(moduleKey) {
    if (moduleKey == null) return Object.keys(state.unlocked).length;
    var m = MODULE_BY_KEY[moduleKey];
    if (!m) return 0;
    var n = 0;
    m.parts.forEach(function (p) { if (isUnlocked(p.id)) n++; });
    return n;
  }

  function total(moduleKey) {
    if (moduleKey == null) {
      return MODULES.reduce(function (a, m) { return a + m.parts.length; }, 0);
    }
    var m = MODULE_BY_KEY[moduleKey];
    return m ? m.parts.length : 0;
  }

  function getModules() {
    // Shallow copy so callers cannot mutate the fixed data.
    return MODULES.map(function (m) {
      return { key: m.key, num: m.num, name: m.name, tab: m.tab, parts: m.parts.slice() };
    });
  }

  function reset() {
    state.unlocked = {};
    persist();
  }

  function partCardHtml(part, pos) {
    if (isUnlocked(part.id)) {
      return '<div class="rnb-card rnb-open">' +
        '<h3 class="rnb-title">' + esc(part.title) + '</h3>' +
        '<p class="rnb-text">' + esc(part.text) + '</p>' +
        '<p class="rnb-note rnb-remember"><b>Remember</b> ' + esc(part.remember) + '</p>' +
        '<p class="rnb-note rnb-village"><b>In the village</b> ' + esc(part.village) + '</p>' +
        '</div>';
    }
    return '<div class="rnb-card rnb-locked">' +
      '<h3 class="rnb-title">' + LOCK_SVG + 'Part ' + pos + ' · Locked</h3>' +
      '<p class="rnb-hint">Finish the task in this module to unlock</p>' +
      '</div>';
  }

  function html(currentModuleKey) {
    var activeKey = MODULE_BY_KEY[currentModuleKey] ? currentModuleKey : MODULES[0].key;

    var tabs = MODULES.map(function (m) {
      var on = m.key === activeKey;
      return '<button type="button" class="rnb-tab' + (on ? ' on' : '') + '" role="tab"' +
        ' aria-selected="' + (on ? 'true' : 'false') + '" data-key="' + m.key + '">' +
        '<span class="rnb-tabname">' + esc(m.tab) + '</span>' +
        '<span class="rnb-tcount">' + count(m.key) + ' / ' + total(m.key) + '</span>' +
        '</button>';
    }).join('');

    var panels = MODULES.map(function (m) {
      var on = m.key === activeKey;
      var cards = m.parts.map(function (p, i) { return partCardHtml(p, i + 1); }).join('');
      return '<div class="rnb-panel' + (on ? ' on' : '') + '" role="tabpanel" data-key="' + m.key + '">' +
        cards + '</div>';
    }).join('');

    return '<div class="rnb">' +
      '<h2 class="rnb-head">' + BOOK_SVG + 'Engineer’s Notebook</h2>' +
      '<p class="rnb-progress">' + count() + ' / ' + total() + ' parts unlocked</p>' +
      '<div class="rnb-tabs" role="tablist">' + tabs + '</div>' +
      '<div class="rnb-panels">' + panels + '</div>' +
      '</div>';
  }

  /* ---- Delegated tab switching ---------------------------------------- */
  // Works no matter when/where the notebook markup is inserted.
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var tab = t.closest('.rnb-tab');
    if (!tab) return;
    var root = tab.closest('.rnb');
    if (!root) return;
    var key = tab.getAttribute('data-key');
    var tabs = root.querySelectorAll('.rnb-tab');
    for (var i = 0; i < tabs.length; i++) {
      var sel = tabs[i] === tab;
      tabs[i].classList.toggle('on', sel);
      tabs[i].setAttribute('aria-selected', sel ? 'true' : 'false');
    }
    var panels = root.querySelectorAll('.rnb-panel');
    for (var j = 0; j < panels.length; j++) {
      panels[j].classList.toggle('on', panels[j].getAttribute('data-key') === key);
    }
  });

  window.RebuildNotebook = {
    STORAGE_KEY: STORAGE_KEY,
    unlock: unlock,
    isUnlocked: isUnlocked,
    count: count,
    total: total,
    getModules: getModules,
    reset: reset,
    html: html
  };
})();
