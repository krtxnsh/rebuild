import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { mergeEvents, notebookParts, parseTelemetry, summarize } from '../src/telemetry/protocol.ts';
import { encodeProgress, ProgressScanner } from '../src/telemetry/qr.ts';

const student = { name: 'आरव', rollNo: '014' };
const id = () => randomBytes(12).toString('hex');
const timestamp = 1700000000000;
const example = {
  student,
  events: [
    { id: id(), moduleId: 'water', event: 'MISCONCEPTION_RECORDED', misconceptionId: 'clear_means_safe', cri: 3, timestamp },
    { id: id(), moduleId: 'water', event: 'NOTEBOOK_PART_UNLOCKED', partId: 'water.boiling', timestamp: timestamp + 1 },
    { id: id(), moduleId: 'water', event: 'MODULE_COMPLETED', timestamp: timestamp + 2 },
    { id: id(), moduleId: 'power', event: 'MODULE_COMPLETED', score: 75, timestamp: timestamp + 3 },
  ],
};

test('QR export round trips Unicode names, notebook parts, misconceptions and completions', () => {
  const [frame, ...rest] = encodeProgress(example);
  assert.equal(rest.length, 0);
  const result = new ProgressScanner().add(frame);
  assert.deepEqual(result.progress, example);
  const summary = summarize(result.progress.events);
  assert.deepEqual([...summary.parts], ['water.boiling']);
  assert.deepEqual([...summary.misconceptions], ['clear_means_safe']);
  assert.equal(summary.scores.get('power'), 75);
});

test('the production QR component yields a pixel image the offline decoder can read', () => {
  const [frame] = encodeProgress(example);
  const svg = renderToStaticMarkup(createElement(QRCodeSVG, { value: frame, marginSize: 4, level: 'M' }));
  const size = Number(svg.match(/viewBox="0 0 (\d+) (\d+)"/)[1]);
  const path = [...svg.matchAll(/<path[^>]* d="([^"]+)"/g)].at(-1)[1];
  const scale = 6, width = size * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  // qrcode.react emits horizontal runs in the black QR path.
  for (const match of path.matchAll(/M\s*(\d+)[ ,]+(\d+)\s*h\s*(\d+)v1H\d+z/g)) {
    const [x, y, count] = match.slice(1).map(Number);
    for (let row = y * scale; row < (y + 1) * scale; row++) {
      for (let col = x * scale; col < (x + count) * scale; col++) {
        const offset = 4 * (row * width + col);
        pixels.fill(0, offset, offset + 3);
      }
    }
  }
  assert.equal(jsQR(pixels, width, width)?.data, frame);
});

test('large exports accept out-of-order pages, ignore duplicate pages, and isolate each scan', () => {
  const progress = { student, events: Array.from({ length: 130 }, (_, index) => ({
    id: id(), moduleId: 'water', event: 'MODULE_COMPLETED', timestamp: timestamp + index,
  })) };
  const frames = encodeProgress(progress);
  assert.ok(frames.length > 1);
  const scan = new ProgressScanner();
  assert.equal(scan.add(frames.at(-1)).scanned, 1);
  assert.equal(scan.add(frames.at(-1)).scanned, 1);
  assert.throws(() => scan.add(encodeProgress(example)[0]), /current student/);
  let result;
  for (const frame of frames.slice(0, -1).reverse()) result = scan.add(frame);
  assert.deepEqual(result.progress, progress);
  assert.deepEqual(mergeEvents(progress.events, result.progress.events), progress.events);
});

test('rejects other QR contents, damaged archives and inconsistent telemetry', () => {
  assert.throws(() => new ProgressScanner().add('https://example.com/'), /not a REBUILD/);
  const [frame] = encodeProgress(example);
  const corrupt = frame.slice(0, -5) + '_____';
  assert.throws(() => new ProgressScanner().add(corrupt), /damaged/);
  assert.equal(parseTelemetry({ ...example.events[0], cri: 2 }), null);
  assert.equal(parseTelemetry({ ...example.events[1], partId: 'ration.variable' }), null);
});

test('the game bridge checks each init message and sends events associated with the active profile', async () => {
  const bridge = readFileSync(new URL('../shared/rebuild-telemetry.js', import.meta.url), 'utf8');
  const notebook = readFileSync(new URL('../shared/rebuild-notebook.js', import.meta.url), 'utf8');
  const listeners = new Map();
  const messages = [];
  const location = new URL('http://localhost/rebuild/modules/water-purification.html?embed=1&journey=water');
  const parent = { postMessage(message, target) { messages.push({ message, target }); } };
  const window = {
    parent, addEventListener(type, callback) { listeners.set(type, callback); },
    localStorage: { getItem() { throw new Error('Embedded notebook must be scoped to the student'); } },
  };
  const document = { readyState: 'loading', addEventListener() {} };
  const context = { window, document, location, URL, URLSearchParams, crypto, console };
  runInNewContext(bridge, context);
  runInNewContext(notebook, context);
  listeners.get('DOMContentLoaded')();
  assert.equal(messages[0].message.type, 'REBUILD_READY');
  const response = { type: 'REBUILD_INIT', student, notebookParts: ['water.sedimentation'] };
  listeners.get('message')({ source: {}, origin: location.origin, data: response });
  listeners.get('message')({ source: parent, origin: 'https://example.com', data: response });
  assert.equal(window.RebuildNotebook.count(), 0);
  window.RebuildNotebook.unlock('water.decantation');
  assert.equal(messages.length, 1);
  listeners.get('message')({ source: parent, origin: location.origin, data: response });
  assert.equal(window.RebuildNotebook.count(), 2);
  assert.equal(window.RebuildNotebook.total(), notebookParts.length);
  const responses = [0, 2];
  assert.equal(await window.RebuildTelemetry.waterPrediction(async () => responses.shift()), 0);
  window.RebuildTelemetry.complete();

  assert.deepEqual(messages.slice(1).map(entry => entry.message.event), [
    'NOTEBOOK_PART_UNLOCKED', 'PREDICTION_RECORDED', 'CRI_RECORDED',
    'PREDICTION_CONFIRMED', 'MISCONCEPTION_RECORDED', 'MODULE_COMPLETED',
  ]);
  assert.ok(messages.slice(1).every(entry => entry.message.student === student && entry.target === location.origin));
  assert.ok(messages.slice(1).every(entry => parseTelemetry(entry.message) !== null));
});

test('the local roster merges repeat scans and keeps independently imported classes isolated', async () => {
  const data = new Map();
  const window = Object.assign(new EventTarget(), { localStorage: {
    get length() { return data.size; },
    key(index) { return [...data.keys()][index]; },
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { data.set(key, value); },
  } });
  globalThis.window = window;
  const { registerClass, registerStudent, recordProgress, importProgress } = await import('../src/telemetry/store.ts');
  const classA = registerClass('Class 6A', 'Mrs. Sharma').id;
  const classB = registerClass('Class 6B', 'Mrs. Sharma').id;
  registerStudent(student, classA);
  recordProgress({ student, classroomId: classA, local: true, events: example.events.slice(0, 1) });
  assert.deepEqual(importProgress(classA, example), { unchanged: false, count: 3 });
  assert.deepEqual(importProgress(classA, example), { unchanged: true, count: 0 });
  assert.deepEqual(importProgress(classB, example), { unchanged: false, count: 4 });
  const another = { ...example, student: { name: 'Diya', rollNo: '22' }, events: [] };
  assert.deepEqual(importProgress(classB, another), { unchanged: false, count: 0 });
  assert.deepEqual(importProgress(classA, another), { unchanged: false, count: 0 });
  delete globalThis.window;
});
