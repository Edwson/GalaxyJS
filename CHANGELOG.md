# Changelog

All notable changes are documented here. Format: [Keep a Changelog](https://keepachangelog.com/);
versioning: [SemVer](https://semver.org/).

## [3.4.0] "Optics" — 2026-08-07
### Added
- **An optional three.js tier — the library still has zero *required* dependencies.**
  `registerAnimation` accepts `renderer: "three"`, and a new
  `registerThree(name, { defaults, scene })` helper hands a scene the same lifecycle every other
  animation gets. three.js is loaded **on demand, by dynamic `import()`, the first time such a
  scene mounts** — once per page, shared by all of them. A page that never mounts one requests
  nothing. If the load fails the surface paints a still poster, exactly as the WebGL2 tier
  degrades when WebGL2 is missing. Bring your own copy with `Galaxy.useThree(THREE)`, or point one
  scene elsewhere with `{ threeUrl }`.
- **Six scenes (80 → 86)**, each doing something the 2D and fragment-shader tiers cannot:
  - **`eventHorizon`** — photons integrated through the Schwarzschild metric
    (`d²u/dφ² = -u + 3/2·rs·u²`), so the photon ring, the Einstein ring of the background
    starfield and the lensed far side of the disk emerge from the geodesics rather than being
    drawn on. Relativistic Doppler shift and beaming (I ∝ δ⁴) give the disk its real asymmetry.
  - **`molecularCloud`** — a 128³ `Data3DTexture` raymarched in the volume's local space, lit from
    within by an embedded protostar via a secondary shadow ray (Beer–Lambert) and a
    Henyey–Greenstein phase function. Rotation gives true parallax and self-occlusion.
  - **`spiralForge`** — 340,000 stars, one draw call, orbits integrated entirely in the vertex
    shader against a flat rotation curve; the density-wave arms shear because ω varies with
    radius. Blackbody colour from a mass–temperature relation.
  - **`ringedWorld`** — Rayleigh single scattering for a blue limb and a reddened terminator, plus
    **mutual shadowing**: ring shadow on the planet (carrying its own gaps) and planet shadow on
    the rings, both solved analytically from one shared density function.
  - **`gravitySim`** — GPGPU. State lives in float render targets and never returns to the CPU; a
    kick–drift symplectic leapfrog keeps orbits stable, and two attractors on an eccentric Kepler
    orbit raise tidal bridges and tails at each pericentre. The pointer is a third mass.
  - **`starGlare`** — a hand-rolled HDR chain with no addons: bright pass, progressive
    downsample/upsample bloom, anamorphic streak, lateral chromatic aberration, filmic tonemap.
- `Galaxy.rendererOf(name)` reports `"2d" | "webgl2" | "three"`; the manifest now records each
  animation's tier plus an `optionalDependency` block naming the six scenes that use three.js.

### Fixed
- **A shader whose program failed to build crashed instead of falling back.** `glPosterFallback`
  reached for the 2D context unconditionally, but a canvas that already has a live WebGL2 context
  can never hand one back — so the "graceful" path threw `Cannot set properties of null`. The
  poster now paints the host element with the equivalent CSS gradient when there is no 2D context.
  This affected the WebGL2 tier as shipped in 3.3.0, not just the new one.

## [3.3.0] "Deep Field" — 2026-07-28
### Added
- **A WebGL2 tier — still zero dependencies.** `registerAnimation` accepts
  `renderer: "webgl2"`, and a new `registerShader(name, { defaults, uniforms, fragment })` helper
  compiles a full-screen fragment shader and hands it the same lifecycle every 2D animation gets:
  DPR-clamped `ResizeObserver` sizing, pointer input as `uMouse`, `IntersectionObserver`
  suspension while off-screen, and one still frame under `prefers-reduced-motion`. Geometry is a
  single full-screen triangle derived from `gl_VertexID`, so no vertex buffer is allocated.
  Uniform declarations are generated from the arity of the values you pass, so changing an option
  never recompiles the program. Hosts expose `host.gl` and `host.reduced`.
- **`glPosterFallback`** — when a browser cannot supply a WebGL2 context, a shader surface paints a
  static 2D poster from its own palette instead of leaving an empty canvas.
- **20 animations (60 → 80).**
  - Relativistic & gravitational: `lensing`, `accretionDisk`, `nBody`, `tidalStream`, `inspiral`
  - Volumetric & raymarched: `volumetricNebula`, `starSurface`, `atmosphere`, `dustLanes`,
    `protoplanetary`
  - Instruments: `spectrograph`, `transitCurve`, `waterfall`, `hrDiagram`, `pulsarTiming`
  - Pointer-driven & generative: `gravityWell`, `nebulaPaint`, `solarWind`, `starForge`,
    `relativisticJets`

### Changed
- `galaxy.d.ts` now declares all 80 names in `AnimationType`.
- **Expected counts in every test now derive from the generated manifest.** `test.mjs` and
  `test-mcp.mjs` previously asserted the literal `60`, which fails on every addition and trains you
  to bump the number rather than read the failure. A `>= 80` floor still catches accidental
  deletion.
- `test.mjs` gained a WebGL2 lifecycle contract: `registerShader` present, a WebGL2 context
  requested, a 2D fallback available, and an assertion that the library **never** force-loses a
  WebGL context — a canvas returns the same context object on every `getContext`, so losing it
  would poison any later mount on that canvas.

## [3.2.0] "Cinematic" — 2026-06-22
### Added
- **`Galaxy.scrollScene(stickyStage, config)`** — a new top-level API that binds page-scroll
  progress to a crossfading sequence of scenes. Pass `scenes: [type | { type, options }]`, an
  optional `track` (the tall element whose scroll drives progress), an `onProgress(p, index, scene)`
  callback for HUD/telemetry, and `reducedScene` (which single frame to show under
  `prefers-reduced-motion`). Returns `{ progress(), layers, destroy() }`.
- **Battery-friendly by design:** only the ≤2 scenes that are crossfading are mounted/visible at a
  time, so the engine's own IntersectionObserver runs exactly those and pauses the rest — no rAF
  fighting across a long sequence. Reduced-motion renders **one** static representative frame.
- The library's own showcase hero (`index.html`) is now a scroll-cinematic built on `scrollScene`
  — the page literally demonstrates the feature: `galaxyMerge → quasar → supernova → magnetosphere`
  with live telemetry and a scroll scrubber.
- `galaxy.d.ts` (`ScrollSceneItem` / `ScrollSceneConfig` / `ScrollSceneInstance`), the manifest API
  block, and `test.mjs` are updated in lockstep; tests assert the `scrollScene` API is present.

### Unchanged
- Still 60 animations and 13 components; no breaking changes to `create` / `register` / theming.

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
