import { build } from 'esbuild';
import { mkdirSync, copyFileSync, statSync } from 'fs';

const minify = process.argv.includes('--minify');

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2019',
  outfile: 'dist/v2.js',
  minify,
  legalComments: 'none',
  banner: { js: '/* SupportAI widget v2 — built artifact, do not edit. Source: widget/src */' },
});

// Single source of truth: the deployable copies are generated, never hand-edited.
mkdirSync('../frontend/public/widget', { recursive: true });
copyFileSync('dist/v2.js', '../frontend/public/widget/v2.js');
mkdirSync('../web/public/widget', { recursive: true });
copyFileSync('dist/v2.js', '../web/public/widget/v2.js');

const kb = (statSync('dist/v2.js').size / 1024).toFixed(1);
console.log(`built dist/v2.js (${kb} KB, minify=${minify}) → copied to frontend/public/widget/v2.js`);
