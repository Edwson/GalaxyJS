# Changelog

All notable changes are documented here. Format: [Keep a Changelog](https://keepachangelog.com/);
versioning: [SemVer](https://semver.org/).

## [3.1.0] — 2026-06-17
### Added
- **17 new cosmic animations (43 → 60):** `supernova`, `quasar`, `starcluster`, `cosmicWeb`,
  `eclipse`, `corona`, `galaxyMerge`, `lattice`, `moire`, `starburst`, `pillars`, `ionstorm`,
  `stardust`, `orrery`, `oscilloscope`, `bokeh`, `magnetosphere` — each driven by the same shared
  rAF loop, palette/tokens, reduced-motion static frame, and off-screen auto-pause as the rest.
- The manifest, `galaxy.d.ts` `AnimationType` union, `llms.txt`, README and tests are regenerated/updated
  in lockstep; `test.mjs` and `test-mcp.mjs` now assert 60 animations.

### Changed
- Minified bundle re-measured honestly: `galaxy.min.js` ≈ 20.5 kB gzipped (was ≈ 15.8 kB),
  `galaxy.min.css` unchanged at ≈ 5.4 kB. No new CSS — every animation is pure canvas.

## [3.0.1] — 2026-06-17
### Added
- **Minified bundles** `galaxy.min.js` (≈15.5 kB gzipped) + `galaxy.min.css` (≈5.4 kB gzipped) via
  `npm run build:min` (terser + csso); `unpkg`/`jsdelivr` and the MCP CDN snippets now point at them.
- **Tests:** `test.mjs` (dependency-free — runtime ↔ manifest ↔ types ↔ package agreement) and
  `test-mcp.mjs` (boots the real MCP server over stdio and exercises all four tools via the SDK client).
- **CI** (GitHub Actions, Node 18/20/22): syntax check, ESLint, manifest-drift check, build, both tests.
- ESLint flat config (`eslint.config.mjs`), `CHANGELOG`, `CONTRIBUTING`, `SECURITY`, issue/PR templates, dependabot.

### Fixed
- `package.json` description said "13 canvas animations" — corrected to 43.
- Removed install-breaking/misleading `package.json` fields (`os`, `cpu`, nonexistent `directories`,
  a stale embedded `eslintConfig`, placeholder `contributors`).
- Removed a 23 MB `node_modules.zip` from the tree and added `*.zip` to `.gitignore`.

## [3.0.0] — "Nova"
- One unified API (`Galaxy.create`), 43 canvas animations, a tokenized UI kit, theming, accessibility
  and reduced-motion support, a machine-readable manifest, `llms.txt`, and an MCP server.
