/*
 * REBUILD · Telemetry hooks
 * Plain (non-module) script. Depends on window.RebuildTelemetry.
 *
 * The learning modules are minified, so we observe them from the outside:
 *   - RebuildNotebook.unlock()  -> NOTEBOOK_PART_UNLOCKED   (clean, shared file)
 *   - RebuildJourney.complete() -> MODULE_COMPLETED         (clean, shared file)
 *   - DOM clicks on the signature decision buttons -> MISCONCEPTION_RECORDED
 *   - DOM clicks on the "How sure?" confidence pills -> CRI_RECORDED
 *
 * Decision/CRI detection matches against both English and Kannada so it keeps
 * working after the voice layer swaps the visible language.
 */
(function () {
  'use strict';

  function norm(s) {
    // Fold curly quotes/dashes to ASCII so rendered button text matches the
    // dictionary regardless of typographic punctuation or active language.
    return (s == null ? '' : String(s))
      .replace(/[‘’‚‛ʼ′`´]/g, "'")
      .replace(/[“”„″]/g, '"')
      .replace(/[–—−]/g, '-')
      .replace(/…/g, '...')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function emit(event, payload) {
    if (window.RebuildTelemetry && typeof window.RebuildTelemetry.emit === 'function') {
      window.RebuildTelemetry.emit(event, payload || {});
    }
  }
  function detectChapter() {
    var qs; try { qs = new URLSearchParams(location.search); } catch (e) { qs = null; }
    var q = qs && (qs.get('chapter') || qs.get('journey'));
    if (q && ['water', 'power', 'ration'].indexOf(q) >= 0) return q;
    var p = (location.pathname || '').toLowerCase();
    if (p.indexOf('water') >= 0) return 'water';
    if (p.indexOf('power') >= 0) return 'power';
    if (p.indexOf('ration') >= 0) return 'ration';
    return undefined;
  }
  var CHAPTER = detectChapter();

  // --- 1. Notebook unlocks ---------------------------------------------------
  function hookNotebook() {
    var NB = window.RebuildNotebook;
    if (!NB || NB.__rvHooked || typeof NB.unlock !== 'function') return !!NB;
    var orig = NB.unlock.bind(NB);
    NB.unlock = function (id) {
      var was = typeof NB.isUnlocked === 'function' ? NB.isUnlocked(id) : false;
      var result = orig(id);
      if (result && !was) emit('NOTEBOOK_PART_UNLOCKED', { partId: id });
      return result;
    };
    NB.__rvHooked = true;
    return true;
  }

  // --- 2. Module completion --------------------------------------------------
  function hookJourney() {
    var J = window.RebuildJourney;
    if (!J || J.__rvHooked || typeof J.complete !== 'function') return !!J;
    var orig = J.complete.bind(J);
    var done = false;
    J.complete = function () {
      if (!done) { done = true; emit('MODULE_COMPLETED', { chapter: CHAPTER }); }
      return orig();
    };
    J.__rvHooked = true;
    return true;
  }

  // Both shared scripts may load after us; poll briefly.
  function pollFor(fn) {
    if (fn()) return;
    var iv = setInterval(function () { if (fn()) clearInterval(iv); }, 150);
    setTimeout(function () { clearInterval(iv); }, 10000);
  }
  pollFor(hookNotebook);
  pollFor(hookJourney);

  // --- 3. Misconception + CRI click detection --------------------------------
  // Trigger strings (EN + KN) for the signature misconception of each chapter.
  var misconceptionStrings = Object.create(null); // normalized text -> misconceptionId
  var firedMisconception = Object.create(null);

  function addMisTrigger(mid, strs) {
    strs.forEach(function (s) { if (s) misconceptionStrings[norm(s)] = mid; });
  }

  fetch('../shared/dialogues.json').then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; })
    .then(function (d) {
      if (!d) return;
      try { var y = d.water.modal.water_modal_issafe.options.yes; addMisTrigger('clear_means_safe', [y.en, y.kn]); } catch (e) { /* */ }
      try { var w = d.power.quiz.power_quiz_q2.options[0]; addMisTrigger('current_consumed', [w.en, w.kn]); } catch (e) { /* */ }
      // ration's "1/8" choice is not in the dictionary — handled by heuristic below.
    });

  function criFromElement(el) {
    // Confidence pills expose value="0|1|2"; accept only within a "How sure" widget
    // or when the pill text itself is a confidence label.
    var val = el.getAttribute && el.getAttribute('value');
    if (val === null || !/^[0-2]$/.test(val)) return null;
    var txt = norm(el.textContent || '').toLowerCase();
    var looksConfidence = /\bsure\b/.test(txt);
    if (!looksConfidence) {
      var host = el.closest ? el.closest('[class*="conf"],[class*="cri"],[id*="conf"],[id*="cri"]') : null;
      if (!host) {
        // last resort: a nearby "How sure" prompt
        var p = el.parentElement, hops = 0;
        while (p && hops < 4) { if (/how sure/i.test(p.textContent || '')) { looksConfidence = true; break; } p = p.parentElement; hops++; }
      } else { looksConfidence = true; }
    }
    if (!looksConfidence) return null;
    return (parseInt(val, 10) + 1); // 0/1/2 -> 1/2/3
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t) return;
    var el = (t.closest && t.closest('button,[role="button"],[value],.opt,.option,.choice,.pc-opt,a')) || t;
    var txt = norm(el.textContent || '');

    // CRI confidence tap
    var cri = criFromElement(el);
    if (cri) { emit('CRI_RECORDED', { cri: cri }); return; }

    // Known misconception option (EN or KN)
    var mid = misconceptionStrings[txt];
    if (!mid && CHAPTER === 'ration' && /\b1\s*\/\s*8\b/.test(txt) && /bigger|ದೊಡ್ಡ|ಹೆಚ್ಚು/.test(txt + ' ' + txt)) {
      mid = 'bigger_denominator_bigger';
    }
    if (mid && !firedMisconception[mid]) {
      firedMisconception[mid] = true;
      emit('MISCONCEPTION_RECORDED', { misconceptionId: mid, cri: 3 });
    }
  }, true);
})();
