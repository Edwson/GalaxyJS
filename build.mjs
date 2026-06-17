#!/usr/bin/env node
/**
 * build.mjs — produce the minified, CDN-ready bundles.
 *
 *   galaxy.js  ->  galaxy.min.js   (terser)
 *   galaxy.css ->  galaxy.min.css  (csso)
 *
 * Run: node build.mjs   (or: npm run build:min)
 * Prints raw + gzipped sizes so the README can quote an honest number.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { minify as terser } from 'terser';
import { minify as csso } from 'csso';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(here, f), 'utf8');
const kb = (n) => (n / 1024).toFixed(1) + ' kB';
const gz = (s) => gzipSync(Buffer.from(s)).length;

// JS — mangle locals, keep the global API (Galaxy is assigned to window, accessed by string keys).
const js = await terser(read('galaxy.js'), {
  compress: { passes: 2, drop_debugger: true },
  mangle: true,
  format: { comments: false }
});
if (js.error) throw js.error;
writeFileSync(join(here, 'galaxy.min.js'), js.code + '\n');

// CSS — structural minify (safe; preserves calc()/custom properties).
const css = csso(read('galaxy.css')).css;
writeFileSync(join(here, 'galaxy.min.css'), css + '\n');

const jOut = js.code, cOut = css;
console.log('galaxy.min.js  ', kb(jOut.length), '· gzip', kb(gz(jOut)));
console.log('galaxy.min.css ', kb(cOut.length), '· gzip', kb(gz(cOut)));
console.log('total gzip     ', kb(gz(jOut) + gz(cOut)));
