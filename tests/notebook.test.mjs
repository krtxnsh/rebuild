import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/game/shared/rebuild-notebook.js', import.meta.url), 'utf8');

function createNotebookContext(initialStorage = {}) {
  const storage = { ...initialStorage };
  const listeners = {};
  const window = {
    localStorage: {
      getItem: key => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null),
      setItem: (key, val) => { storage[key] = String(val); },
      removeItem: key => { delete storage[key]; }
    }
  };
  const document = {
    addEventListener: (type, cb) => { listeners[type] = cb; },
    querySelectorAll: () => []
  };

  runInNewContext(source, { window, document, console, Date, JSON, Object });
  return { NB: window.RebuildNotebook, storage, listeners };
}

test('notebook initializes with 10 total parts across 3 modules', () => {
  const { NB } = createNotebookContext();
  assert.equal(NB.total(), 10);
  assert.equal(NB.total('water'), 4);
  assert.equal(NB.total('power'), 3);
  assert.equal(NB.total('ration'), 3);
  assert.equal(NB.count(), 0);
  assert.equal(NB.count('water'), 0);
  assert.equal(NB.count('power'), 0);
  assert.equal(NB.count('ration'), 0);
});

test('unlocks valid parts and increments module and total counts', () => {
  const { NB, storage } = createNotebookContext();
  
  assert.equal(NB.unlock('water.sedimentation'), true);
  assert.equal(NB.isUnlocked('water.sedimentation'), true);
  assert.equal(NB.count('water'), 1);
  assert.equal(NB.count(), 1);

  // Duplicate unlock returns false and does not double-count
  assert.equal(NB.unlock('water.sedimentation'), false);
  assert.equal(NB.count('water'), 1);

  // Unlock remaining parts
  assert.equal(NB.unlock('water.decantation'), true);
  assert.equal(NB.unlock('water.filtration'), true);
  assert.equal(NB.unlock('water.boiling'), true);
  assert.equal(NB.count('water'), 4);

  assert.equal(NB.unlock('power.circuit'), true);
  assert.equal(NB.unlock('power.current'), true);
  assert.equal(NB.unlock('power.conductors'), true);
  assert.equal(NB.count('power'), 3);

  assert.equal(NB.unlock('ration.variable'), true);
  assert.equal(NB.unlock('ration.fractions'), true);
  assert.equal(NB.unlock('ration.equation'), true);
  assert.equal(NB.count('ration'), 3);

  assert.equal(NB.count(), 10);

  // Check persisted JSON in storage
  const persisted = JSON.parse(storage['rebuild.notebook.v1']);
  assert.equal(persisted.v, 1);
  assert.equal(Object.keys(persisted.unlocked).length, 10);
});

test('handles unknown part IDs safely without throwing', () => {
  const { NB } = createNotebookContext();
  assert.equal(NB.unlock('nonexistent.part'), false);
  assert.equal(NB.count(), 0);
});

test('reloads existing unlocked state from localStorage', () => {
  const seed = {
    'rebuild.notebook.v1': JSON.stringify({
      v: 1,
      unlocked: {
        'water.sedimentation': 1700000000000,
        'power.circuit': 1700000001000
      }
    })
  };
  const { NB } = createNotebookContext(seed);
  assert.equal(NB.isUnlocked('water.sedimentation'), true);
  assert.equal(NB.isUnlocked('power.circuit'), true);
  assert.equal(NB.isUnlocked('ration.variable'), false);
  assert.equal(NB.count('water'), 1);
  assert.equal(NB.count('power'), 1);
  assert.equal(NB.count('ration'), 0);
  assert.equal(NB.count(), 2);
});

test('reset() clears all unlocked parts from memory and storage', () => {
  const { NB, storage } = createNotebookContext();
  NB.unlock('water.sedimentation');
  assert.equal(NB.count(), 1);
  NB.reset();
  assert.equal(NB.count(), 0);
  assert.equal(NB.isUnlocked('water.sedimentation'), false);
  const persisted = JSON.parse(storage['rebuild.notebook.v1']);
  assert.deepEqual(persisted.unlocked, {});
});

test('html() renders cards in open and locked states appropriately', () => {
  const { NB } = createNotebookContext();
  NB.unlock('water.sedimentation');

  const markup = NB.html('water');
  assert.match(markup, /rnb-open/);
  assert.match(markup, /Sedimentation/);
  assert.match(markup, /rnb-locked/);
  assert.match(markup, /1 \/ 10 parts unlocked/);
});
