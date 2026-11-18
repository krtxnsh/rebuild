/*
 * REBUILD · Bilingual voice + text engine
 * Plain (non-module) script. Exposes window.RebuildVoice.
 *
 * The learning modules ship as minified bundles whose dialogue helpers (C/w and
 * the local `ie` UI object) are not reachable from an outside script. Rather
 * than patch minified internals, this engine works at the DOM level: it watches
 * the dialogue surface, and whenever a known English (or Kannada) line appears
 * it (1) plays the matching audio clip and (2) swaps the visible text to the
 * active language. It covers both Rio's narration (from dialogues.json) and the
 * static UI chrome (title screen, HUD labels, buttons) from a built-in map.
 * Audio is best-effort — a missing/404 mp3 is caught silently.
 *
 * A floating EN <-> ಕನ್ನಡ toggle (top-right) switches language; the choice is
 * persisted to localStorage['rebuild.lang'] and shared with the dashboard.
 */
window.RebuildVoice = (function () {
  'use strict';

  var LANG_KEY = 'rebuild.lang';

  // Static UI chrome shared across the sphere, the village preview and modules.
  // These strings are not in dialogues.json (which holds only Rio's narration).
  var UI_STRINGS = {
    // Title / shell chrome
    'Tap to Start': 'ಪ್ರಾರಂಭಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
    'A storm wrecked the village. Use science to bring it back.':
      'ಬಿರುಗಾಳಿ ಹಳ್ಳಿಯನ್ನು ಹಾಳುಮಾಡಿದೆ. ವಿಜ್ಞಾನ ಬಳಸಿ ಅದನ್ನು ಮರಳಿ ತನ್ನಿ.',
    'Sound on for the best experience': 'ಉತ್ತಮ ಅನುಭವಕ್ಕಾಗಿ ಧ್ವನಿ ಆನ್ ಮಾಡಿ',
    'Module map': 'ಮಾಡ್ಯೂಲ್ ನಕ್ಷೆ',
    '☰ Module map': '☰ ಮಾಡ್ಯೂಲ್ ನಕ್ಷೆ',
    'STEM · Class 6': 'STEM · ತರಗತಿ 6',
    'STEM - Class 6': 'STEM - ತರಗತಿ 6',
    'Module 1 · Clean Water': 'ಮಾಡ್ಯೂಲ್ 1 · ಶುದ್ಧ ನೀರು',
    'Module 2 · Power': 'ಮಾಡ್ಯೂಲ್ 2 · ವಿದ್ಯುತ್',
    'Module 3 · Rationing': 'ಮಾಡ್ಯೂಲ್ 3 · ಪಡಿತರ',
    "Engineer's Notebook": 'ಇಂಜಿನಿಯರ್ ನೋಟ್‌ಬುಕ್',
    'Engineer Rio': 'ಇಂಜಿನಿಯರ್ ರಿಯೋ',
    tap: 'ಟ್ಯಾಪ್',
    'tap ▸': 'ಟ್ಯಾಪ್ ▸',
    Close: 'ಮುಚ್ಚಿ',
    'Keep playing': 'ಆಟ ಮುಂದುವರಿಸಿ',
    Restart: 'ಮರುಪ್ರಾರಂಭಿಸಿ',
    Resume: 'ಪುನರಾರಂಭಿಸಿ',
    Paused: 'ವಿರಾಮ',
    'Module complete!': 'ಮಾಡ್ಯೂಲ್ ಪೂರ್ಣಗೊಂಡಿದೆ!',
    // Confidence (CRI) widget
    'How sure are you?': 'ನೀವು ಎಷ್ಟು ಖಚಿತ?',
    'Not sure': 'ಖಚಿತವಿಲ್ಲ',
    'A bit sure': 'ಸ್ವಲ್ಪ ಖಚಿತ',
    'Very sure': 'ತುಂಬಾ ಖಚಿತ',
    // Water module HUD
    Collect: 'ಸಂಗ್ರಹಿಸಿ',
    Settle: 'ನೆಲೆಗೊಳಿಸಿ',
    Filter: 'ಸೋಸಿ',
    Boil: 'ಕುದಿಸಿ',
    Deliver: 'ತಲುಪಿಸಿ',
    MAGNIFIER: 'ಭೂತಗನ್ನಡಿ',
    'Boils at 100°C': '100°C ನಲ್ಲಿ ಕುದಿಯುತ್ತದೆ',
    // Power module HUD
    'Lights Restored': 'ದೀಪಗಳು ಮರಳಿವೆ',
    'CURRENT IN': 'ಒಳ ಪ್ರವಾಹ',
    'CURRENT OUT': 'ಹೊರ ಪ್ರವಾಹ',
    // Ration module HUD
    'Rations Solved': 'ಪರಿಹರಿಸಿದ ಪಡಿತರ',
    OBJECTIVE: 'ಗುರಿ',
    // Module names
    'Clean Water': 'ಶುದ್ಧ ನೀರು',
    'Power for Palampur': 'ಪಾಲಂಪುರಕ್ಕೆ ವಿದ್ಯುತ್',
    'Fair Rations': 'ನ್ಯಾಯಯುತ ಪಡಿತರ',
  };

  var state = {
    lang: 'en',
    audioBase: '../audio',
    module: null,
    dialogues: null,
    section: null,
    byEn: {},        // normalized EN -> { id, en, kn, ui }
    byKn: {},        // normalized KN -> { id, en, kn, ui }
    byId: {},        // id -> { id, en, kn, ui }
    textToIdMap: {}, // normalized EN -> id  (public, per INTEGRATION.md)
    activeAudio: null,
    langListeners: [],
    observer: null,
    tracked: [],     // elements currently showing a known string
    ready: false
  };

  function normalize(s) {
    // Fold typographic punctuation to ASCII so the dictionary (straight quotes)
    // matches the modules' rendered text (curly quotes), then collapse space.
    return (s == null ? '' : String(s))
      .replace(/[‘’‚‛ʼ′`´]/g, "'")
      .replace(/[“”„″]/g, '"')
      .replace(/[–—−]/g, '-')
      .replace(/…/g, '...')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  function register(id, en, kn, ui) {
    var ne = normalize(en);
    if (!ne) return;
    var nk = normalize(kn);
    var entry = { id: id, en: ne, kn: nk || ne, ui: !!ui };
    if (!state.byEn[ne]) state.byEn[ne] = entry;
    if (nk && !state.byKn[nk]) state.byKn[nk] = entry;
    if (!state.byId[id]) state.byId[id] = entry;
    if (!(ne in state.textToIdMap)) state.textToIdMap[ne] = id;
  }

  // Collect every { en, kn } leaf under a dialogue id, including nested shapes
  // (toast {title,body}, modal {title,body,options}, quiz {question,options,...}).
  function collect(node, id) {
    if (!node || typeof node !== 'object') return;
    if (typeof node.en === 'string') {
      register(id, node.en, typeof node.kn === 'string' ? node.kn : node.en);
      return;
    }
    if (Array.isArray(node)) { node.forEach(function (n) { collect(n, id); }); return; }
    Object.keys(node).forEach(function (k) { collect(node[k], id); });
  }

  function indexSection(section) {
    if (!section || typeof section !== 'object') return;
    Object.keys(section).forEach(function (groupKey) {
      var group = section[groupKey];
      if (!group || typeof group !== 'object') return;
      Object.keys(group).forEach(function (id) { collect(group[id], id); });
    });
  }

  function registerUiStrings() {
    var i = 0;
    for (var en in UI_STRINGS) {
      if (Object.prototype.hasOwnProperty.call(UI_STRINGS, en)) {
        register('ui.' + (i++), en, UI_STRINGS[en], true);
      }
    }
  }

  function resolve(text) {
    var n = normalize(text);
    if (!n) return null;
    return state.byEn[n] || state.byKn[n] || null;
  }

  // ---- audio ----------------------------------------------------------------
  function stop() {
    if (state.activeAudio) {
      try { state.activeAudio.pause(); state.activeAudio.currentTime = 0; } catch (e) { /* ignore */ }
      state.activeAudio = null;
    }
  }

  function play(id) {
    if (!id) return;
    stop();
    if (!state.audioBase || !state.module) return;
    try {
      var url = state.audioBase + '/' + state.lang + '/' + state.module + '/' + id + '.mp3';
      var a = new Audio(url);
      a.addEventListener('error', function () { /* missing clip — stay on subtitles */ }, { once: true });
      state.activeAudio = a;
      var p = a.play();
      if (p && typeof p.catch === 'function') p.catch(function () { /* autoplay/404 — ignore */ });
    } catch (e) { /* ignore */ }
  }

  // ---- DOM text substitution ------------------------------------------------
  // Translation works at TEXT-NODE granularity: each text node is matched and
  // swapped independently. This naturally handles mixed content — an icon+label
  // button (<svg/> + "Tap to Start"), a step tab (<b>1</b> Collect) or a speaker
  // name — without disturbing sibling numbers, icons or markup.
  var SKIP_PARENTS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1 };

  function applyToText(tn) {
    if (!tn || tn.nodeType !== 3 || tn.__rvSwapping) return;
    var parent = tn.parentNode;
    if (parent && SKIP_PARENTS[parent.nodeName]) return;
    var raw = tn.nodeValue;
    if (!raw || raw.length > 400) return; // dialogue/labels are short; skip bundles
    var n = normalize(raw);
    if (!n) return;
    var entry = state.byEn[n] || state.byKn[n];
    if (!entry) return;

    // Play audio once, when a NEW narration line first appears here.
    if (tn.__rvId !== entry.id) {
      if (!entry.ui) play(entry.id);
      tn.__rvId = entry.id;
      if (state.tracked.indexOf(tn) < 0) state.tracked.push(tn);
    }

    // Swap to the active language (both directions), preserving whitespace.
    var target = state.lang === 'kn' ? entry.kn : entry.en;
    if (target && n !== target) {
      var m = raw.match(/^(\s*)[\s\S]*?(\s*)$/);
      tn.__rvSwapping = true;
      tn.nodeValue = (m ? m[1] : '') + target + (m ? m[2] : '');
      tn.__rvSwapping = false;
    }
  }

  function eachText(root, fn) {
    if (!root) return;
    if (root.nodeType === 3) { fn(root); return; }
    if (root.nodeType !== 1 || typeof document.createTreeWalker !== 'function') return;
    if (SKIP_PARENTS[root.nodeName]) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var list = [], tn;
    while ((tn = walker.nextNode())) list.push(tn);
    for (var i = 0; i < list.length; i++) fn(list[i]);
  }

  function applyDeep(node) { eachText(node, applyToText); }

  function scanMutations(records) {
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.type === 'characterData') applyToText(r.target);
      if (r.addedNodes) {
        for (var j = 0; j < r.addedNodes.length; j++) applyDeep(r.addedNodes[j]);
      }
    }
  }

  function startObserver() {
    if (state.observer || typeof MutationObserver === 'undefined') return;
    // Translate whatever is already on screen, then watch for changes.
    if (document.body) applyDeep(document.body);
    state.observer = new MutationObserver(scanMutations);
    state.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // Re-apply the active language to everything already seen (used on toggle).
  function refreshTracked() {
    state.tracked = state.tracked.filter(function (tn) { return tn && tn.isConnected; });
    state.tracked.forEach(applyToText);
    if (document.body) applyDeep(document.body);
  }

  // ---- language -------------------------------------------------------------
  function getLang() { return state.lang; }

  function setLang(lang) {
    if (lang !== 'en' && lang !== 'kn') return;
    if (lang === state.lang) return;
    state.lang = lang;
    lsSet(LANG_KEY, lang);
    stop();
    updateToggle();
    refreshTracked();
    state.langListeners.forEach(function (cb) { try { cb(lang); } catch (e) { /* ignore */ } });
    try { window.dispatchEvent(new CustomEvent('rebuild:langchange', { detail: { lang: lang } })); } catch (e) { /* ignore */ }
  }

  function onLangChange(cb) { if (typeof cb === 'function') state.langListeners.push(cb); }

  function getText(id) {
    var e = state.byId[id];
    return e ? e[state.lang] : undefined;
  }

  // Raw dictionary entry by id (for dynamic strings, e.g. sack names).
  function lookup(id) {
    if (!state.section) return undefined;
    var groups = Object.keys(state.section);
    for (var i = 0; i < groups.length; i++) {
      var g = state.section[groups[i]];
      if (g && typeof g === 'object' && Object.prototype.hasOwnProperty.call(g, id)) return g[id];
    }
    return undefined;
  }

  // ---- floating toggle ------------------------------------------------------
  var toggleEl = null;
  function updateToggle() {
    if (!toggleEl) return;
    var toKn = state.lang === 'en';
    toggleEl.textContent = toKn ? 'EN · ಕನ್ನಡ' : 'ಕನ್ನಡ · EN';
    toggleEl.setAttribute('aria-label', toKn ? 'Switch to Kannada' : 'Switch to English');
  }
  function injectToggle() {
    if (toggleEl || !document.body) return;
    toggleEl = document.createElement('button');
    toggleEl.type = 'button';
    toggleEl.className = 'rebuild-voice-toggle';
    toggleEl.style.cssText = [
      'position:fixed', 'top:12px', 'right:12px', 'z-index:2147483000',
      'font:600 13px/1 system-ui,"Noto Sans Kannada",sans-serif',
      'padding:8px 12px', 'border-radius:999px', 'border:1px solid rgba(0,0,0,.12)',
      'background:#fffdf8', 'color:#33251f', 'box-shadow:0 4px 12px rgba(0,0,0,.14)',
      'cursor:pointer', 'touch-action:manipulation'
    ].join(';');
    toggleEl.addEventListener('click', function () { setLang(state.lang === 'en' ? 'kn' : 'en'); });
    document.body.appendChild(toggleEl);
    updateToggle();
  }

  // ---- optional: patch a reachable UI object (best-effort) ------------------
  function patchDialogueSystem(ui) {
    if (!ui || typeof ui !== 'object') return ui;
    ['say', 'tell'].forEach(function (m) {
      if (typeof ui[m] !== 'function' || ui[m].__rvPatched) return;
      var orig = ui[m].bind(ui);
      ui[m] = function (text) {
        var rest = Array.prototype.slice.call(arguments, 1);
        var plain = Array.isArray(text) ? text.join(' ') : text;
        var entry = resolve(plain);
        if (entry && !entry.ui) play(entry.id);
        if (entry && state.lang === 'kn' && entry.kn) {
          return orig.apply(null, [Array.isArray(text) ? [entry.kn] : entry.kn].concat(rest));
        }
        return orig.apply(null, [text].concat(rest));
      };
      ui[m].__rvPatched = true;
    });
    if (typeof ui.toast === 'function' && !ui.toast.__rvPatched) {
      var origToast = ui.toast.bind(ui);
      ui.toast = function (title, body) {
        var rest = Array.prototype.slice.call(arguments, 2);
        var te = resolve(title), be = resolve(body);
        if (te && !te.ui) play(te.id);
        var t2 = (state.lang === 'kn' && te && te.kn) ? te.kn : title;
        var b2 = (state.lang === 'kn' && be && be.kn) ? be.kn : body;
        return origToast.apply(null, [t2, b2].concat(rest));
      };
      ui.toast.__rvPatched = true;
    }
    return ui;
  }

  // ---- init -----------------------------------------------------------------
  function readInitialLang() {
    var qs;
    try { qs = new URLSearchParams(location.search); } catch (e) { qs = null; }
    var fromUrl = qs && qs.get('lang');
    if (fromUrl === 'en' || fromUrl === 'kn') { lsSet(LANG_KEY, fromUrl); return fromUrl; }
    var stored = lsGet(LANG_KEY);
    return stored === 'kn' ? 'kn' : 'en';
  }

  function init(opts) {
    opts = opts || {};
    state.audioBase = opts.audioBase || state.audioBase;
    state.module = opts.module || state.module;
    state.lang = readInitialLang();

    var url = opts.dialoguesUrl || '../shared/dialogues.json';
    return fetch(url)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (json) {
        if (json) {
          state.dialogues = json;
          state.section = state.module ? json[state.module] : null;
          if (state.section) indexSection(state.section);
        }
        registerUiStrings();
        var boot = function () { injectToggle(); startObserver(); };
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', boot, { once: true });
        } else { boot(); }
        state.ready = true;
        return api;
      });
  }

  var api = {
    init: init,
    getLang: getLang,
    setLang: setLang,
    onLangChange: onLangChange,
    play: play,
    stop: stop,
    getText: getText,
    lookup: lookup,
    resolve: resolve,
    patchDialogueSystem: patchDialogueSystem,
    get textToIdMap() { return state.textToIdMap; }
  };
  return api;
})();
