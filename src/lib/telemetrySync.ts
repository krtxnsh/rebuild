import { Lang, StudentTelemetrySnapshot, TelemetryEvent } from '../types/palampur';

/**
 * Offline student-progress sync. A student session is serialized, compressed
 * (gzip when the browser exposes CompressionStream, else plain base64) and shown
 * as a QR code; a teacher scans it to import the record — no network, no cables.
 */

const STUDENT_KEY = 'rebuild.student';
const TELEMETRY_KEY = 'rebuild.telemetry.v1';
const NOTEBOOK_KEY = 'rebuild.notebook.v1';
const LANG_KEY = 'rebuild.lang';

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Build a snapshot from the shared (same-origin) localStorage the game writes. */
export function buildSnapshotFromStorage(): StudentTelemetrySnapshot {
  const student = readJson<{ name?: string; rollNo?: string }>(STUDENT_KEY) || {};
  const tel = readJson<{ events?: TelemetryEvent[] }>(TELEMETRY_KEY);
  const nb = readJson<{ unlocked?: Record<string, number> }>(NOTEBOOK_KEY);
  let lang: Lang = 'en';
  try {
    lang = localStorage.getItem(LANG_KEY) === 'kn' ? 'kn' : 'en';
  } catch {
    /* ignore */
  }
  return {
    v: 1,
    student: { name: student.name || 'Student', rollNo: student.rollNo || '' },
    lang,
    events: tel && Array.isArray(tel.events) ? tel.events : [],
    notebookParts: nb && nb.unlocked ? Object.keys(nb.unlocked) : [],
    exportedAt: Date.now(),
  };
}

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}

type StreamCtor = new (format: string) => GenericTransformStream;
function hasCompression(): boolean {
  return typeof (globalThis as { CompressionStream?: StreamCtor }).CompressionStream !== 'undefined';
}

async function gzip(text: string): Promise<Uint8Array> {
  const Ctor = (globalThis as unknown as { CompressionStream: StreamCtor }).CompressionStream;
  const stream = new Blob([text]).stream().pipeThrough(new Ctor('gzip'));
  const buf = await new Response(stream as unknown as ReadableStream).arrayBuffer();
  return new Uint8Array(buf);
}
async function gunzip(bytes: Uint8Array): Promise<string> {
  const Ctor = (globalThis as unknown as { DecompressionStream: StreamCtor }).DecompressionStream;
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new Ctor('gzip'));
  return new Response(stream as unknown as ReadableStream).text();
}

/** Encode a snapshot into a compact, prefixed string suitable for a QR code. */
export async function encodeSnapshot(snap: StudentTelemetrySnapshot): Promise<string> {
  const json = JSON.stringify(snap);
  try {
    if (hasCompression()) return 'RBG1:' + bytesToB64(await gzip(json));
  } catch {
    /* fall through to plain base64 */
  }
  return 'RBJ1:' + btoa(unescape(encodeURIComponent(json)));
}

/** Decode a scanned QR string back into a snapshot. Throws on malformed input. */
export async function decodeSnapshot(raw: string): Promise<StudentTelemetrySnapshot> {
  const str = (raw || '').trim();
  let json: string;
  if (str.startsWith('RBG1:')) {
    json = await gunzip(b64ToBytes(str.slice(5)));
  } else if (str.startsWith('RBJ1:')) {
    json = decodeURIComponent(escape(atob(str.slice(5))));
  } else {
    json = str; // tolerate a raw JSON payload
  }
  const snap = JSON.parse(json) as StudentTelemetrySnapshot;
  if (!snap || snap.v !== 1 || !snap.student) throw new Error('Not a REBUILD student code.');
  return snap;
}
