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
const runtimeNames = Galaxy.list();
ok(runtimeNames.length === 60, 'runtime lists 60 animations (got ' + runtimeNames.length + ')');

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
ok(/60 canvas animations/.test(pkg.description), 'package.json description says 60 canvas animations');
const dtsCount = (dts.match(/AnimationType\s*=([\s\S]*?);/)[1].match(/"[a-zA-Z]+"/g) || []).length;
ok(dtsCount === 60, 'galaxy.d.ts declares 60 AnimationType members (got ' + dtsCount + ')');
ok(/60 (canvas )?animations/.test(read('llms.txt')), 'llms.txt says 60 animations');

console.log('cdn points at the minified bundles');
ok(/galaxy\.min\.js/.test(manifest.cdn.js) && /galaxy\.min\.css/.test(manifest.cdn.css), 'manifest cdn references galaxy.min.* ');
ok(pkg.unpkg === 'galaxy.min.js' && pkg.jsdelivr === 'galaxy.min.js', 'package unpkg/jsdelivr point at galaxy.min.js');

console.log('build artifacts (if present)');
if (existsSync(join(here, 'galaxy.min.js'))) {
  ok(statSync(join(here, 'galaxy.min.js')).size < statSync(join(here, 'galaxy.js')).size, 'galaxy.min.js is smaller than galaxy.js');
} else { ok(true, 'galaxy.min.js not built yet (run npm run build:min) — skipped'); }

console.log(fails === 0 ? '\nPASS — runtime, manifest, types and package agree.' : `\nFAIL — ${fails} check(s) failed.`);
process.exit(fails === 0 ? 0 : 1);
