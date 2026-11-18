(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const embedded = window.parent !== window && params.get('embed') === '1';
  const chapter = params.get('journey') || params.get('chapter') || 'water';
  const moduleId = ['water', 'power', 'ration'].includes(chapter) ? chapter : 'water';
  let student;
  const pending = [];
  const targetOrigin = location.origin;
  const id = () => Array.from(crypto.getRandomValues(new Uint32Array(3)), n => n.toString(16).padStart(8, '0')).join('');

  function send(message) {
    if (embedded) window.parent.postMessage(message, targetOrigin);
  }

  function emit(event, details = {}) {
    if (!embedded) return;
    const entry = { type: 'REBUILD_TELEMETRY', id: id(), moduleId, event, timestamp: Date.now(), ...details };
    if (!student) pending.push(entry);
    else send({ ...entry, student });
  }

  window.RebuildTelemetry = {
    embedded,
    emit,
    send,
    prediction(questionId) {
      const attemptId = id();
      return {
        choice(choice) { emit('PREDICTION_RECORDED', { questionId, attemptId, choice }); },
        confidence(cri) { emit('CRI_RECORDED', { questionId, attemptId, cri }); },
        confirm(choice, cri, answer, misconceptionId, misconceptionChoice) {
          emit('PREDICTION_CONFIRMED', { questionId, attemptId, choice, cri, correct: choice === answer });
          if (cri === 3 && misconceptionId && choice === misconceptionChoice) {
            emit('MISCONCEPTION_RECORDED', { misconceptionId, cri });
          }
        }
      };
    },
    async waterPrediction(modal) {
      const prediction = this.prediction('safe-water');
      const choice = await modal(
        '<h2>Is it safe to drink now?</h2><p>The water in the cup looks clean and clear.</p>',
        [{ label: 'Yes, it’s clean!', icon: 'water' }, { label: 'Let’s check first', icon: 'search', color: 'blue' }]
      );
      prediction.choice(choice);
      const rating = await modal('<h2>How sure are you?</h2>', [
        { label: 'Not Sure' }, { label: 'A Bit Sure' }, { label: 'Very Sure' }
      ]);
      prediction.confidence(rating + 1);
      prediction.confirm(choice, rating + 1, 1, 'clear_means_safe', 0);
      return choice;
    },
    complete(score) { emit('MODULE_COMPLETED', { score }); },
  };

  if (!embedded) return;
  document.addEventListener('DOMContentLoaded', () => {
    for (const link of document.querySelectorAll('a[href*="../preview/"], a[href="../modules/"]')) {
      const url = new URL(link.href);
      url.searchParams.set('embed', '1');
      link.href = url.href;
    }
  });
  window.addEventListener('message', message => {
    if (message.source !== window.parent || message.origin !== targetOrigin || message.data?.type !== 'REBUILD_INIT') return;
    const data = message.data;
    if (typeof data.student?.name !== 'string' || typeof data.student?.rollNo !== 'string' || !Array.isArray(data.notebookParts)) return;
    student = data.student;
    window.RebuildNotebook?.hydrate(data.notebookParts);
    for (const entry of pending.splice(0)) send({ ...entry, student });
  });
  window.addEventListener('DOMContentLoaded', () => send({ type: 'REBUILD_READY' }), { once: true });
  window.addEventListener('pageshow', event => { if (event.persisted) send({ type: 'REBUILD_READY' }); });
})();
