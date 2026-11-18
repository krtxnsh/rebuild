/*
 * REBUILD · Telemetry bridge
 * Plain (non-module) script. Exposes window.RebuildTelemetry.
 *
 * Posts REBUILD_TELEMETRY messages up to the parent React dashboard and relays
 * telemetry from a nested frame (the village preview) up toward the dashboard,
 * so the sphere -> preview -> module chain all reaches the same listener.
 * Everything is same-origin (served by the one Vite/Pages origin), so messages
 * are targeted at location.origin. Degrades silently when not embedded.
 */
(function () {
  'use strict';

  var ORIGIN = location.origin;
  var STORAGE_KEY = 'rebuild.telemetry.v1';
  var STUDENT_KEY = 'rebuild.student';
  var LANG_KEY = 'rebuild.lang';
  var NOTEBOOK_KEY = 'rebuild.notebook.v1';

  function safeParse(raw) {
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function lsGet(key) {
    try { return window.localStorage ? window.localStorage.getItem(key) : null; } catch (e) { return null; }
  }
  function lsSet(key, value) {
    try { if (window.localStorage) window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  function readStudent() {
    var s = safeParse(lsGet(STUDENT_KEY));
    if (s && s.name) return { name: String(s.name), rollNo: String(s.rollNo || '') };
    return { name: 'Student', rollNo: '' };
  }

  function detectChapter() {
    var qs;
    try { qs = new URLSearchParams(location.search); } catch (e) { qs = null; }
    var fromQuery = qs && (qs.get('chapter') || qs.get('journey'));
    if (fromQuery && ['water', 'power', 'ration'].indexOf(fromQuery) >= 0) return fromQuery;
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('water') >= 0) return 'water';
    if (path.indexOf('power') >= 0) return 'power';
    if (path.indexOf('ration') >= 0) return 'ration';
    return undefined;
  }

  var state = {
    student: readStudent(),
    chapter: detectChapter(),
    log: []
  };

  var prior = safeParse(lsGet(STORAGE_KEY));
  if (prior && Array.isArray(prior.events)) state.log = prior.events.slice(-500);

  function persist() {
    lsSet(STORAGE_KEY, JSON.stringify({ v: 1, student: state.student, events: state.log.slice(-500) }));
  }

  function postToParent(msg) {
    try {
      if (window.parent && window.parent !== window) window.parent.postMessage(msg, ORIGIN);
    } catch (e) { /* ignore */ }
  }

  function emit(event, payload) {
    payload = payload || {};
    var msg = {
      type: 'REBUILD_TELEMETRY',
      student: state.student,
      event: event,
      timestamp: Date.now()
    };
    if (state.chapter) msg.chapter = state.chapter;
    for (var k in payload) {
      if (Object.prototype.hasOwnProperty.call(payload, k) && payload[k] !== undefined) msg[k] = payload[k];
    }
    state.log.push(msg);
    persist();
    postToParent(msg);
    return msg;
  }

  function notebookParts() {
    var nb = safeParse(lsGet(NOTEBOOK_KEY));
    return nb && nb.unlocked ? Object.keys(nb.unlocked) : [];
  }

  function snapshot() {
    return {
      v: 1,
      student: state.student,
      lang: lsGet(LANG_KEY) || 'en',
      events: state.log.slice(),
      notebookParts: notebookParts(),
      exportedAt: Date.now()
    };
  }

  // Receive REBUILD_INIT from the dashboard and relay nested-frame telemetry up.
  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN) return;
    var d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'REBUILD_INIT') {
      if (d.student && d.student.name) {
        state.student = { name: String(d.student.name), rollNo: String(d.student.rollNo || '') };
      }
    } else if (d.type === 'REBUILD_TELEMETRY' && e.source && e.source !== window.parent) {
      // A child frame (village preview) reported an event — bubble it upward.
      state.log.push(d);
      persist();
      postToParent(d);
    }
  });

  function announceReady() {
    postToParent({ type: 'REBUILD_READY', page: location.pathname });
  }
  if (document.readyState === 'complete') announceReady();
  else window.addEventListener('load', announceReady, { once: true });

  window.RebuildTelemetry = {
    emit: emit,
    setStudent: function (s) { if (s && s.name) state.student = { name: String(s.name), rollNo: String(s.rollNo || '') }; },
    getStudent: function () { return state.student; },
    getChapter: function () { return state.chapter; },
    setChapter: function (c) { if (['water', 'power', 'ration'].indexOf(c) >= 0) state.chapter = c; },
    snapshot: snapshot,
    reset: function () { state.log = []; persist(); }
  };
})();
