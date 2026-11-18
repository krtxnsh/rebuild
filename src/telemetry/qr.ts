import { strFromU8, strToU8, Unzlib, zlibSync } from 'fflate';
import { isRecord, mergeEvents, moduleIds, misconceptionIds, notebookParts, parseStudent, parseTelemetry, type Progress, type Telemetry } from './protocol.ts';

const TAG = 'REBUILD1';
const CHUNK_SIZE = 850;
const MAX_FRAMES = 48;
const MAX_JSON_BYTES = 512_000;
const FRAME = /^REBUILD1\.([a-f0-9]{24})\.([1-9][0-9]?)\.([1-9][0-9]?)\.([A-Za-z0-9_-]{1,850})$/;
const eventTypes = [
  'PREDICTION_RECORDED', 'CRI_RECORDED', 'PREDICTION_CONFIRMED',
  'MISCONCEPTION_RECORDED', 'NOTEBOOK_PART_UNLOCKED', 'MODULE_COMPLETED',
] as const;

const hex = (byte: number) => byte.toString(16).padStart(2, '0');
const base64url = (bytes: Uint8Array) => btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unbase64 = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
const packId = (id: string) => base64url(Uint8Array.from(id.match(/../g) ?? [], pair => Number.parseInt(pair, 16)));
const unpackId = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{16}$/.test(value)
  ? Array.from(unbase64(value), hex).join('') : undefined;

function pack(entry: Telemetry, start: number): unknown[] {
  const tuple = [packId(entry.id), moduleIds.indexOf(entry.moduleId), entry.timestamp - start, eventTypes.indexOf(entry.event)];
  switch (entry.event) {
    case 'PREDICTION_RECORDED': return [...tuple, entry.questionId, packId(entry.attemptId), entry.choice];
    case 'CRI_RECORDED': return [...tuple, entry.questionId, packId(entry.attemptId), entry.cri];
    case 'PREDICTION_CONFIRMED': return [...tuple, entry.questionId, packId(entry.attemptId), entry.choice, entry.cri, entry.correct];
    case 'MISCONCEPTION_RECORDED': return [...tuple, misconceptionIds.indexOf(entry.misconceptionId)];
    case 'NOTEBOOK_PART_UNLOCKED': return [...tuple, notebookParts.indexOf(entry.partId)];
    case 'MODULE_COMPLETED': return entry.score === undefined ? tuple : [...tuple, entry.score];
  }
}

function unpack(row: unknown, start: number) {
  if (!Array.isArray(row) || !Number.isSafeInteger(row[2])) return null;
  const [id, module, offset, type, a, b, c, d, e] = row;
  const event = eventTypes[type];
  const base = { id: unpackId(id), moduleId: moduleIds[module], timestamp: start + offset, event };
  switch (event) {
    case 'PREDICTION_RECORDED': return parseTelemetry({ ...base, questionId: a, attemptId: unpackId(b), choice: c });
    case 'CRI_RECORDED': return parseTelemetry({ ...base, questionId: a, attemptId: unpackId(b), cri: c });
    case 'PREDICTION_CONFIRMED': return parseTelemetry({ ...base, questionId: a, attemptId: unpackId(b), choice: c, cri: d, correct: e });
    case 'MISCONCEPTION_RECORDED': return parseTelemetry({ ...base, misconceptionId: misconceptionIds[a], cri: 3 });
    case 'NOTEBOOK_PART_UNLOCKED': return parseTelemetry({ ...base, partId: notebookParts[a] });
    case 'MODULE_COMPLETED': return parseTelemetry({ ...base, score: a });
    default: return null;
  }
}

function adler32(bytes: Uint8Array) {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

export function encodeProgress(progress: Progress) {
  const start = progress.events[0]?.timestamp ?? 0;
  const data = strToU8(JSON.stringify({ student: progress.student, start, events: progress.events.map(event => pack(event, start)) }));
  if (data.length > MAX_JSON_BYTES) throw new Error('This progress log is too large to export.');
  const encoded = base64url(zlibSync(data, { level: 8 }));
  const total = Math.ceil(encoded.length / CHUNK_SIZE);
  if (total > MAX_FRAMES) throw new Error('This progress log is too large to export.');
  const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), hex).join('');
  return Array.from({ length: total }, (_, index) =>
    [TAG, id, index + 1, total, encoded.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)].join('.'));
}

function decodeProgress(encoded: string): Progress {
  try {
    const bytes = unbase64(encoded);
    const output = new Uint8Array(MAX_JSON_BYTES);
    let cursor = 0;
    const inflate = new Unzlib(chunk => {
      if (cursor + chunk.length > output.length) throw new Error('The progress log is too large.');
      output.set(chunk, cursor);
      cursor += chunk.length;
    });
    for (let index = 0; index < bytes.length; index += 512) {
      inflate.push(bytes.subarray(index, index + 512), index + 512 >= bytes.length);
    }
    const payload = output.subarray(0, cursor);
    if (adler32(payload) !== new DataView(bytes.buffer).getUint32(bytes.length - 4)) throw new Error();
    const progress: unknown = JSON.parse(strFromU8(payload));
    if (!isRecord(progress) || typeof progress.start !== 'number' || !Number.isSafeInteger(progress.start) || !Array.isArray(progress.events)) throw new Error();
    const student = parseStudent(progress.student);
    const start = progress.start;
    const events = progress.events.map(row => unpack(row, start));
    if (!student || !events.every(event => event !== null)) throw new Error();
    return { student, events: mergeEvents([], events) };
  } catch {
    throw new Error('This progress code is damaged or uses an unsupported format. Ask the student to export it again.');
  }
}

export class ProgressScanner {
  private parts = new Map<number, string>();
  private id = '';
  private total = 0;

  add(text: string) {
    const frame = FRAME.exec(text.trim());
    if (!frame) throw new Error('This is not a REBUILD progress QR code.');
    const [, id, position, length, chunk] = frame;
    const index = Number(position);
    const total = Number(length);
    if (total > MAX_FRAMES || index > total || (index < total && chunk.length !== CHUNK_SIZE)) {
      throw new Error('This progress QR code has an invalid page number.');
    }
    if (this.id && (this.id !== id || this.total !== total)) {
      throw new Error('Finish scanning the current student or reset the scan to start over.');
    }
    this.id = id;
    this.total = total;
    this.parts.set(index, chunk);
    const progress = this.parts.size === total
      ? decodeProgress(Array.from({ length: total }, (_, part) => this.parts.get(part + 1)).join(''))
      : null;
    return { scanned: this.parts.size, total, progress };
  }
}
