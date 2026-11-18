import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // GitHub Pages serves this project from /rebuild/ while local Vite runs at /.
    base: process.env.GITHUB_ACTIONS === 'true' ? '/rebuild/' : '/',
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
      {
        // Dev only: Vite's SPA fallback would serve the React index.html for
        // directory URLs like /game/ or /game/preview/. Rewrite them to the
        // static index.html so the vendored game serves exactly as it does on
        // GitHub Pages, which resolves directory indexes natively.
        name: 'serve-game-directory-index',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url) {
              const qIdx = req.url.indexOf('?');
              const reqPath = qIdx >= 0 ? req.url.slice(0, qIdx) : req.url;
              const query = qIdx >= 0 ? req.url.slice(qIdx) : '';
              if (reqPath.startsWith('/game/') && reqPath.endsWith('/')) {
                req.url = reqPath + 'index.html' + query;
              }
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
