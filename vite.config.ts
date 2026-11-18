import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const runtimeFiles = [
  'shared/rebuild-shell.js',
  'shared/rebuild-notebook.js',
  'shared/rebuild-telemetry.js',
  'exports/web/village_complete.glb',
];
const decoders = ['draco_decoder.js', 'draco_wasm_wrapper.js', 'draco_decoder.wasm'];
const decoderDirectory = 'node_modules/three/examples/jsm/libs/draco/gltf';

function villageAssets(): Plugin {
  return {
    name: 'palampur-offline-assets',
    configureServer(server) {
      server.middlewares.use('/vendor/draco', (request, response, next) => {
        const filename = request.url?.split('?')[0].slice(1);
        if (!filename || !decoders.includes(filename)) return next();
        response.setHeader('Content-Type', filename.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
        response.end(readFileSync(join(decoderDirectory, filename)));
      });
    },
    writeBundle(options) {
      const directory = options.dir ?? 'dist';
      for (const file of runtimeFiles) {
        const target = join(directory, file);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(file, target);
      }
      for (const file of decoders) {
        const target = join(directory, 'vendor/draco', file);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(join(decoderDirectory, file), target);
      }

      // Precache the built application, including lazy routes, codecs and lesson documents.
      const files = readdirSync(directory, { recursive: true, withFileTypes: true })
        .filter(file => file.isFile()).map(file => join(file.parentPath, file.name)
          .slice(directory.length + 1).replaceAll('\\', '/')).sort();
      const cacheFiles = files.filter(file => file !== 'sw.js');
      const worker = readFileSync('scripts/offline-worker.js', 'utf8');
      const hash = createHash('sha256').update(worker);
      for (const file of cacheFiles) hash.update(file).update(readFileSync(join(directory, file)));
      const version = hash.digest('hex').slice(0, 16);
      writeFileSync(join(directory, 'sw.js'), `const BUILD = ${JSON.stringify(version)};\nconst ASSETS = ${JSON.stringify(cacheFiles)};\n${worker}`);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), villageAssets()],
  build: {
    rollupOptions: {
      input: [
        'index.html',
        'preview/index.html',
        'modules/index.html',
        'modules/water-purification.html',
        'modules/power-palampur.html',
        'modules/rationing-palampur.html',
      ].map(file => resolve(file)),
    },
  },
});
