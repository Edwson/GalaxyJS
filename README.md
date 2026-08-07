# 🌌 GalaxyJS

**The universe, one line of code.**

A cosmic **animation** + **UI component** library with **zero required
dependencies**. Beautiful canvas backdrops, a themeable UI kit, and a single
unified API — no build step, no framework, ~20&nbsp;kB gzipped.

Six of the 86 animations are three.js scenes. three.js is **optional and lazily
loaded**: nothing is requested unless you mount one of those six, and if it
cannot load they paint a still poster instead of an empty box.

[![CI](https://github.com/Edwson/GalaxyJS/actions/workflows/ci.yml/badge.svg)](https://github.com/Edwson/GalaxyJS/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Required dependencies](https://img.shields.io/badge/required%20dependencies-0-7c5cff)
![Optional](https://img.shields.io/badge/optional-three.js-22d3ee)
![Version](https://img.shields.io/badge/version-3.4-22d3ee)

> Live demo: https://edwson.github.io/GalaxyJS/ (mirror: https://edwson.com/GalaxyJS/) · Open [`index.html`](index.html) locally for the interactive playground.

---

## ✨ What's new in v3.4 "Optics"

**Six new animations (80 → 86) and an optional three.js tier.**

These six needed something the canvas and fragment-shader tiers genuinely cannot give: a scene
graph, a real 3D volume, GPU-resident simulation state, or a multi-pass post-processing chain.
So they declare `renderer: "three"`, and the library loads three.js **on demand, by dynamic
import, the first time one of them mounts** — once per page, shared across all six. A page that
never uses one downloads nothing extra.

- **`eventHorizon`** — a Schwarzschild black hole *solved*, not painted. Every pixel's photon is
  integrated through curved spacetime (`d²u/dφ² = -u + 3/2·rs·u²`), so the photon ring, the
  Einstein ring of the background stars, and the far side of the disk bent up over the top all
  fall out of the geodesics. The disk carries relativistic Doppler shift and beaming (I ∝ δ⁴) —
  the bright/dim asymmetry is physics, not a gradient.
- **`molecularCloud`** — a genuine 128³ `Data3DTexture` raymarched in the volume's own local
  space, lit from within by an embedded protostar with Beer–Lambert extinction along a secondary
  shadow ray and a Henyey–Greenstein phase function. Rotating it gives real parallax and
  self-occlusion, which is exactly what a 2D noise field cannot do.
- **`spiralForge`** — 340,000 stars in one draw call. Each orbit is integrated *in the vertex
  shader* against a flat rotation curve, so there is no per-frame CPU work at all; because ω
  varies with radius the density-wave arms shear over time. Colour comes from a blackbody locus
  driven by a mass–temperature relation, so rare hot O/B stars burn blue in the arms.
- **`ringedWorld`** — a gas giant with Rayleigh single scattering (blue limb, warm reddened
  terminator) and **mutual shadowing**: the rings cast a real shadow onto the planet, carrying
  their own Cassini-division gaps as bright lines across the disk, and the planet casts a real
  shadow back onto the rings.
- **`gravitySim`** — true GPGPU. Particle state lives in float render targets and never returns
  to the CPU; a kick–drift (symplectic leapfrog) integrator keeps the disks stable instead of
  unwinding. Two attractors on an eccentric Kepler orbit raise real tidal bridges and tails at
  every pericentre. The pointer becomes a third mass.
- **`starGlare`** — a hand-rolled HDR chain (no addons): bright pass → progressive
  downsample/upsample bloom → anamorphic streak → lateral chromatic aberration → filmic tonemap.
  A star's glare blooms and flares as an occluder slides across it.

```html
<div id="hole" style="height:70vh"></div>
<script>Galaxy.create('eventHorizon', '#hole', { tilt: 0.42 });</script>
```

Bring your own copy to skip the network entirely:

```js
import * as THREE from "three";
Galaxy.useThree(THREE);            // now nothing is fetched
Galaxy.create("spiralForge", "#hero", { stars: 400000 });
```

`Galaxy.rendererOf(name)` reports `"2d"`, `"webgl2"` or `"three"` if you want to
check before mounting.

---

## v3.3 "Deep Field"

**Twenty new animations (60 → 80) and a WebGL2 tier — with no new dependencies.**

Canvas 2D is still the default renderer and the fallback. Eight of the new animations declare
`renderer: "webgl2"` and a hand-written GLSL fragment shader; a shared `registerShader` helper
gives them the same lifecycle every 2D animation already gets — DPR-clamped resize, pointer
input, off-screen suspension, and a single still frame under `prefers-reduced-motion`. Geometry is
one full-screen triangle generated from `gl_VertexID`, so there is nothing to allocate and nothing
to leak. **If WebGL2 is unavailable the surface renders a 2D poster instead of an empty canvas.**

- **Relativistic & gravitational** — `lensing` (Schwarzschild deflection and the Einstein ring),
  `accretionDisk` (Doppler beaming + gravitational redshift), `nBody`, `tidalStream`, `inspiral`
- **Volumetric & raymarched (WebGL2)** — `volumetricNebula` (Beer–Lambert absorption with a
  Henyey–Greenstein phase function), `starSurface` (granulation + limb darkening + prominences),
  `atmosphere` (Rayleigh + Mie scattering), `dustLanes` (self-shadowed dust), `protoplanetary`
- **Instruments** — `spectrograph`, `transitCurve`, `waterfall`, `hrDiagram`, `pulsarTiming`
- **Pointer-driven & generative** — `gravityWell`, `nebulaPaint` (an advecting, diffusing fluid you
  paint into), `solarWind` (bow shock + polar cusps), `starForge`, `relativisticJets`

```html
<div id="deep" style="height:70vh"></div>
<script>Galaxy.create('volumetricNebula', '#deep', { density: 1.2 });</script>
```

## ✨ What's new in v3.2 "Cinematic"

- **`Galaxy.scrollScene()`** — bind page scroll to a crossfading sequence of scenes. One call turns
  a sticky stage into a scroll-scrubbed cinematic, with an `onProgress(p, index, scene)` hook for
  your own HUD. Only the visible pair runs (battery-friendly), and reduced-motion shows one static
  frame. The showcase hero is built with it — [see below](#-cinematic-scroll-scenes-v32).

## ✨ What's new in v3 "Nova"

- **One unified API** — `Galaxy.create(type, target, options)` for every animation.
- **86 animations** — starfield, warp, black hole, nebula, spiral galaxy, meteors, constellation, particle field, aurora, wormhole, orbits, pulsar, mesh gradient, fireflies, matrix rain, plasma, fireworks, snow, waves, DNA helix, lightning, ripples, comets, confetti, bubbles, fog, synthwave grid, rain, vortex, sparkle, neon tunnel, swarm, ribbons, flow field, dotted globe, heartbeat, equalizer, clock, light rays, radar, embers, typewriter, spirograph, **and 17 new in v3.1** — supernova, quasar, star cluster, cosmic web, eclipse, solar corona, galaxy merge, crystal lattice, moiré, starburst, nebula pillars, ion storm, stardust, orrery, oscilloscope, bokeh, magnetosphere, **and 20 new in v3.3** — lensing, accretion disk, n-body, tidal stream, inspiral, volumetric nebula, star surface, atmosphere, dust lanes, protoplanetary disk, spectrograph, transit curve, radio waterfall, H-R diagram, pulsar timing, gravity well, nebula paint, solar wind, star forge, relativistic jets, **and 6 new in v3.4 on the optional three.js tier** — event horizon, molecular cloud, spiral forge, ringed world, gravity sim, star glare.
- **A real UI kit** — buttons, cards, modals, toasts, tooltips, tabs, accordions, dropdowns, inputs, switches, progress, spinners — all driven by design tokens.
- **Theming** — light/dark out of the box, fully tokenized via CSS variables and `Galaxy.theme()`.
- **Accessible & efficient** — respects `prefers-reduced-motion`, one shared rAF loop for the whole page, auto-pause off-screen, HiDPI-aware.
- **Declarative or imperative** — wire everything with `data-` attributes, or script it.

---

## 🚀 Quick start

```html
<link rel="stylesheet" href="galaxy.css" />
<script src="galaxy.js"></script>

<div id="hero" style="height: 60vh"></div>

<script>
  Galaxy.create("nebula", "#hero", {
    speed: 1.2,
    colors: ["#7c5cff", "#22d3ee", "#f472b6"],
  });
</script>
```

Or go fully declarative — no JS needed:

```html
<div data-galaxy="warp" data-galaxy-speed="1.5" style="height: 400px"></div>
```

### CDN

```html
<link rel="stylesheet" href="https://unpkg.com/galaxyjs@3/galaxy.min.css" />
<script src="https://unpkg.com/galaxyjs@3/galaxy.min.js"></script>
```

### npm

```bash
npm install galaxyjs
```

```js
import Galaxy from "galaxyjs";
import "galaxyjs/galaxy.css";
```

---

## 🪐 Animations

```js
const bg = Galaxy.create("blackHole", "#stage", { radius: 0.2, speed: 1.4 });
bg.update({ speed: 0.6 }); // live-tweak
bg.pause();                // pause / resume / destroy
```

| `starfield` · `warp` · `blackHole` · `nebula` · `spiral` · `meteors` · `constellation` · `particles` · `aurora` · `wormhole` · `orbits` · `pulsar` · `gradient` · `fireflies` · `matrix` · `plasma` · `fireworks` · `snow` · `waves` · `dna` · `lightning` · `ripples` · `comets` · `confetti` · `bubbles` · `fog` · `grid` · `rain` · `vortex` · `sparkle` · `tunnel` · `swarm` · `ribbons` · `flowfield` · `globe` · `heartbeat` · `equalizer` · `clock` · `rays` · `radar` · `embers` · `typewriter` · `spirograph` · `supernova` · `quasar` · `starcluster` · `cosmicWeb` · `eclipse` · `corona` · `galaxyMerge` · `lattice` · `moire` · `starburst` · `pillars` · `ionstorm` · `stardust` · `orrery` · `oscilloscope` · `bokeh` · `magnetosphere` |
| --- |

Every instance returns a controller with `start / stop / pause / resume /
update / options / destroy`. See **[docs/API.md](docs/API.md)** for every option.

Add your own:

```js
Galaxy.register("rain", { defaults: { count: 200 }, setup(host) { /* ... */ } });
```

---

## 🎬 Cinematic scroll scenes (v3.2)

Bind page scroll to a crossfading sequence of scenes — the whole hero in one call:

```html
<section id="cine" style="height: 360vh;">     <!-- the scroll "track" (gives you room) -->
  <div style="position: sticky; top: 0; height: 100vh;">
    <div id="stage" style="position:absolute; inset:0;"></div>
    <!-- your own HUD/headline overlay here -->
  </div>
</section>
```

```js
Galaxy.scrollScene("#stage", {
  scenes: ["galaxyMerge", "quasar", "supernova", "magnetosphere"],
  track: "#cine",
  reducedScene: 0, // which single frame to show when motion is off
  onProgress(p, index, scene) {
    // p is 0..1 across the whole sequence; index is the active scene.
    // Drive your own headline, telemetry, scrubber, etc.
  }
});
```

- Pass scenes as `"name"` or `{ type: "name", options: { speed: 1.2 } }`.
- Only the ≤2 crossfading scenes are mounted at a time, so the engine pauses everything else —
  no rAF fighting across a long sequence.
- Under `prefers-reduced-motion`, it renders **one** static frame (`reducedScene`) and still fires
  `onProgress` once so your copy is correct.
- Returns `{ progress(), layers, destroy() }`. Call `destroy()` to unbind on teardown.

---

## 🧩 UI components

```js
Galaxy.toast("Saved to your galaxy ✨", { type: "success" });

Galaxy.modal({
  title: "Welcome 🚀",
  body: "Built with one call.",
  actions: [
    { label: "Cancel", variant: "ghost" },
    { label: "Launch", variant: "primary", onClick: () => {} },
  ],
});

const ok = await Galaxy.confirm("Eject the pod?");
```

Tooltips, tabs, accordions and dropdowns are declarative — add the markup and
`Galaxy.autoInit()` (called automatically) wires them up:

```html
<button class="gx-btn gx-btn--primary" data-gx-tooltip="Hello!">Hover me</button>
```

---

## 🎨 Theming

```js
Galaxy.toggleTheme();                     // dark <-> light
Galaxy.theme({ accent: "#ff5d8f" });      // override any token
```

```css
:root { --gx-accent: #ff5d8f; --gx-radius: 18px; }
```

---

## ♿ Accessibility & performance

- Honors `prefers-reduced-motion` (renders one static frame, no loop).
- A single `requestAnimationFrame` drives every surface on the page.
- Surfaces auto-pause when scrolled off-screen (`IntersectionObserver`).
- Canvases render at `devicePixelRatio` for crisp edges; `.destroy()` cleans up everything.

---

## 🤖 Use it with AI / MCP

GalaxyJS ships a Model Context Protocol server and a compact machine-readable
manifest, so an AI agent can discover and use **every** animation and component
in one line — at minimal token cost.

- [`galaxy.manifest.json`](galaxy.manifest.json) — the full API as compact JSON (single source of truth).
- [`llms.txt`](llms.txt) — a token-efficient guide AI tools read directly.
- [`mcp/`](mcp/) — an MCP server exposing `galaxy_quickstart`, `galaxy_list`, `galaxy_get`, `galaxy_snippet`.

Add it to any MCP client (e.g. Claude Desktop):

```json
{
  "mcpServers": {
    "galaxyjs": { "command": "npx", "args": ["-y", "galaxyjs-mcp"] }
  }
}
```

Then ask: *"Use GalaxyJS to add a nebula background to #hero"* → the agent calls
`galaxy_snippet` and returns ready-to-paste code. See [mcp/README.md](mcp/README.md).

---

## 📁 Project layout

```
galaxy.js              # the runtime (UMD: <script> / CommonJS / bundler)
galaxy.css             # design tokens + components + animation surfaces
galaxy.d.ts            # TypeScript definitions
galaxy.manifest.json   # machine-readable API (single source of truth)
llms.txt               # token-efficient guide for AI tools
index.html             # interactive playground (open in any browser)
mcp/                   # Model Context Protocol server
docs/API.md            # full API reference
```

---

## License

MIT © [Ed Chen](https://www.edwson.com). See [LICENSE](LICENSE).
