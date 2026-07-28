#!/usr/bin/env node
/**
 * test.mjs — dependency-free contract test (no MCP SDK needed, runs in CI).
 *
 * Verifies the runtime, the generated manifest, the type definitions and
 * package.json all agree — the manifest is the single source of truth and must
 * never drift from Galaxy.list().
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const read = (f) => readFileSync(join(here, f), 'utf8');

let fails = 0;
const ok = (c, m) => { if (c) console.log('  ✓ ' + m); else { console.error('  ✗ ' + m); fails++; } };

const Galaxy = require('./galaxy.js');
const manifest = JSON.parse(read('galaxy.manifest.json'));
const pkg = JSON.parse(read('package.json'));
const dts = read('galaxy.d.ts');

console.log('runtime');
ok(typeof Galaxy.version === 'string', 'Galaxy.version is a string (' + Galaxy.version + ')');
ok(typeof Galaxy.create === 'function' && typeof Galaxy.list === 'function' && typeof Galaxy.defaults === 'function', 'public API present (create / list / defaults)');
ok(typeof Galaxy.scrollScene === 'function', 'scrollScene API present (cinematic scroll sequences)');
const runtimeNames = Galaxy.list();
const COUNT = manifest.animations.length;
ok(runtimeNames.length === COUNT, 'runtime and manifest agree on the animation count (' + COUNT + ')');
// A floor, not a literal: catches accidental deletion without breaking on every
// addition. Raise it when a release intentionally removes animations.
ok(runtimeNames.length >= 80, 'no animations were lost (>= 80, got ' + runtimeNames.length + ')');

console.log('WebGL2 tier');
const src = read('galaxy.js');
ok(/function registerShader\(/.test(src), 'registerShader (WebGL2 sugar) is present');
ok(/webgl2/.test(src), 'a WebGL2 context is requested for shader animations');
ok(/glPosterFallback/.test(src), 'shader surfaces fall back to a 2D poster when WebGL2 is missing');
// A canvas returns the same context object every time, so losing it would poison
// any later mount on that canvas. This bit us on ReactOmega; keep it locked here.
ok(!/loseContext/.test(src), 'the library never force-loses a WebGL context');

console.log('version agreement');
ok(Galaxy.version === manifest.version, 'manifest version matches runtime');
ok(pkg.version === manifest.version, 'package.json version matches manifest (' + pkg.version + ')');

console.log('manifest <-> runtime sync');
const manifestNames = manifest.animations.map((a) => a.name);
ok(manifestNames.length === runtimeNames.length, 'manifest animation count matches runtime');
ok(runtimeNames.every((n) => manifestNames.includes(n)), 'every runtime animation is in the manifest');
ok(manifest.animations.every((a) => a.name && a.desc && a.options), 'every manifest animation has name + desc + options');
ok(manifest.components.length === 13 && manifest.components.every((c) => c.name && c.desc && c.usage), '13 components, each with name + desc + usage');

console.log('counts agree across files');
ok(new RegExp(COUNT + ' canvas').test(pkg.description), 'package.json description states the real count (' + COUNT + ')');
const dtsCount = (dts.match(/AnimationType\s*=([\s\S]*?);/)[1].match(/"[a-zA-Z]+"/g) || []).length;
ok(dtsCount === COUNT, 'galaxy.d.ts declares every animation in AnimationType (' + COUNT + ', got ' + dtsCount + ')');
ok(new RegExp(COUNT + ' canvas').test(read('llms.txt')), 'llms.txt states the real count (' + COUNT + ')');

console.log('cdn points at the minified bundles');
ok(/galaxy\.min\.js/.test(manifest.cdn.js) && /galaxy\.min\.css/.test(manifest.cdn.css), 'manifest cdn references galaxy.min.* ');
ok(pkg.unpkg === 'galaxy.min.js' && pkg.jsdelivr === 'galaxy.min.js', 'package unpkg/jsdelivr point at galaxy.min.js');

console.log('build artifacts (if present)');
if (existsSync(join(here, 'galaxy.min.js'))) {
  ok(statSync(join(here, 'galaxy.min.js')).size < statSync(join(here, 'galaxy.js')).size, 'galaxy.min.js is smaller than galaxy.js');
} else { ok(true, 'galaxy.min.js not built yet (run npm run build:min) — skipped'); }

console.log(fails === 0 ? '\nPASS — runtime, manifest, types and package agree.' : `\nFAIL — ${fails} check(s) failed.`);
process.exit(fails === 0 ? 0 : 1);
