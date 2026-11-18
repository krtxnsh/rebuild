import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/game/shared/rebuild-shell.js', import.meta.url), 'utf8');

function openLesson(file, chapter) {
  const location = new URL('http://localhost/rebuild/modules/' + file + (chapter ? '?journey=' + chapter : ''));
  const destinations = [], listeners = {};
  location.assign = value => destinations.push(new URL(value, location).pathname + new URL(value, location).search);
  const window = { addEventListener: (type, callback) => { listeners[type] = callback; } };
  const document = { readyState: 'loading', addEventListener() {} };
  runInNewContext(source, { location, window, document, URLSearchParams });
  return { journey: window.RebuildJourney, destinations, listeners };
}

for (const [file, chapter, destination] of [
  ['water-purification.html', 'water', '/rebuild/preview/?chapter=power'],
  ['power-palampur.html', 'power', '/rebuild/preview/?chapter=ration'],
  ['rationing-palampur.html', 'ration', '/rebuild/'],
]) {
  test(chapter + ' completion callback hands off once and can be reused after browser back', () => {
    const { journey, destinations, listeners } = openLesson(file, chapter);
    assert.equal(journey.active, true);
    assert.equal(journey.hasNext, chapter !== 'ration');
    assert.equal(journey.complete(), true);
    assert.equal(journey.complete(), false);
    assert.deepEqual(destinations, [destination]);
    listeners.pageshow();
    assert.equal(journey.complete(), true);
    assert.deepEqual(destinations, [destination, destination]);
  });
}

test('standalone and mismatched journeys do not activate completion navigation', () => {
  for (const chapter of [undefined, 'ration']) {
    const { journey, destinations } = openLesson('water-purification.html', chapter);
    assert.equal(journey.active, false);
    assert.equal(journey.complete(), false);
    assert.deepEqual(destinations, []);
  }
});
