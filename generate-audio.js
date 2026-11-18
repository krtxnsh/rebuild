#!/usr/bin/env node
/*
 * REBUILD · Voice-over generator (ElevenLabs)
 *
 * Reads public/game/shared/dialogues.json and generates one MP3 per dialogue id
 * per language into public/game/audio/{lang}/{module}/{id}.mp3 — exactly where
 * shared/rebuild-voice.js looks for them. The game runs fine WITHOUT these files
 * (it falls back to on-screen subtitles), so this is an optional, run-once step.
 *
 * Usage:
 *   export ELEVENLABS_API_KEY=sk_your_key_here
 *   node generate-audio.js                       # all languages, all modules
 *   node generate-audio.js --lang en --module water
 *   node generate-audio.js --voice-id pNInz6obpgDQGcFmaJgB
 *
 * Requires Node 18+ (global fetch).
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIALOGUES = resolve(__dirname, 'public/game/shared/dialogues.json');
const AUDIO_ROOT = resolve(__dirname, 'public/game/audio');

const DEFAULT_VOICE = 'pNInz6obpgDQGcFmaJgB'; // "Adam" — clear narrator
const MODEL = 'eleven_multilingual_v2';

function parseArgs(argv) {
  const out = { lang: null, module: null, voiceId: DEFAULT_VOICE };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lang') out.lang = argv[++i];
    else if (a === '--module') out.module = argv[++i];
    else if (a === '--voice-id') out.voiceId = argv[++i];
  }
  return out;
}

// Flatten a module section into { id -> { en, kn } }, taking the FIRST text seen
// for each id — matching how shared/rebuild-voice.js resolves audio ids.
function collectClips(section) {
  const clips = {};
  const visit = (node, id) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.en === 'string') {
      if (!clips[id]) clips[id] = { en: node.en, kn: typeof node.kn === 'string' ? node.kn : node.en };
      return;
    }
    if (Array.isArray(node)) return node.forEach((n) => visit(n, id));
    Object.keys(node).forEach((k) => visit(node[k], id));
  };
  for (const groupKey of Object.keys(section)) {
    const group = section[groupKey];
    if (group && typeof group === 'object') {
      for (const id of Object.keys(group)) visit(group[id], id);
    }
  }
  return clips;
}

async function tts(text, voiceId, apiKey) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const { lang, module: onlyModule, voiceId } = parseArgs(process.argv);
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('Missing ELEVENLABS_API_KEY. See the usage header in this file.');
    process.exit(1);
  }

  const dialogues = JSON.parse(await readFile(DIALOGUES, 'utf8'));
  const modules = dialogues.meta?.modules || ['water', 'power', 'ration'];
  const languages = lang ? [lang] : dialogues.meta?.languages || ['en', 'kn'];

  let made = 0;
  let failed = 0;
  for (const mod of modules) {
    if (onlyModule && mod !== onlyModule) continue;
    const section = dialogues[mod];
    if (!section) continue;
    const clips = collectClips(section);
    for (const l of languages) {
      const outDir = join(AUDIO_ROOT, l, mod);
      await mkdir(outDir, { recursive: true });
      for (const [id, texts] of Object.entries(clips)) {
        const text = texts[l] || texts.en;
        try {
          const audio = await tts(text, voiceId, apiKey);
          await writeFile(join(outDir, `${id}.mp3`), audio);
          made++;
          console.log(`✓ ${l}/${mod}/${id}.mp3`);
        } catch (err) {
          failed++;
          console.warn(`✗ ${l}/${mod}/${id}: ${err.message}`);
        }
      }
    }
  }
  console.log(`\nDone. ${made} clips written, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
