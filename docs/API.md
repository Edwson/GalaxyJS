# GalaxyJS v3 — API Reference

A zero-dependency cosmic **animation** + **UI component** library. One unified
entry point: `Galaxy.create()`. Works as a plain `<script>`, via CommonJS, and
through bundlers.

- [Installation](#installation)
- [Quick start](#quick-start)
- [Animations](#animations)
  - [`Galaxy.create()`](#galaxycreatetype-target-options)
  - [The instance controller](#the-instance-controller)
  - [Built-in animations & options](#built-in-animations--options)
  - [Declarative (data attributes)](#declarative-data-attributes)
  - [Custom animations](#custom-animations)
- [UI components](#ui-components)
- [Theming](#theming)
- [Accessibility & performance](#accessibility--performance)

---

## Installation

**Browser (no build step):**

```html
<link rel="stylesheet" href="galaxy.css" />
<script src="galaxy.js"></script>
```

**CDN:**

```html
<link rel="stylesheet" href="https://unpkg.com/galaxyjs@3/galaxy.css" />
<script src="https://unpkg.com/galaxyjs@3/galaxy.js"></script>
```

**npm:**

```bash
npm install galaxyjs
```

```js
import Galaxy from "galaxyjs";
import "galaxyjs/galaxy.css";
```

---

## Quick start

```js
const bg = Galaxy.create("nebula", "#hero", {
  speed: 1.2,
  colors: ["#7c5cff", "#22d3ee", "#f472b6"],
});

// later
bg.update({ speed: 0.5 });
bg.pause();
bg.destroy();
```

---

## Animations

### `Galaxy.create(type, target, options)`

| Argument  | Type                       | Description                                       |
| --------- | -------------------------- | ------------------------------------------------- |
| `type`    | `string`                   | One of the [built-in animations](#built-in-animations--options) or a registered custom one. |
| `target`  | `string \| HTMLElement`    | A CSS selector or an element. A `<canvas>` is injected inside it. |
| `options` | `object`                   | Animation options (see each animation below).     |

Returns an [instance controller](#the-instance-controller). The target element
is sized automatically; the canvas tracks it via `ResizeObserver`.

### The instance controller

| Method               | Returns     | Description                                            |
| -------------------- | ----------- | ------------------------------------------------------ |
| `.start()`           | instance    | Start the render loop.                                  |
| `.stop()`            | instance    | Stop rendering and leave the loop.                      |
| `.pause()`           | instance    | Stop, and stay paused even when scrolled into view.     |
| `.resume()`          | instance    | Resume after a `pause()`.                               |
| `.update(options)`   | instance    | Merge new options and rebuild.                          |
| `.options()`         | object      | The current resolved options.                           |
| `.destroy()`         | `void`      | Stop, remove the canvas, disconnect observers.          |
| `.el` / `.canvas`    | element     | The host element and injected canvas.                   |

### Built-in animations & options

Every animation accepts `speed` (multiplier, default `1`), `colors` (hex array),
and `background` (hex, for trail-based effects). Animation-specific keys:

| Type             | Description                          | Key options                                  |
| ---------------- | ------------------------------------ | -------------------------------------------- |
| `starfield`      | Drifting parallax stars with twinkle | `count` (160)                                |
| `warp`           | Hyperspace streaks from center       | `count` (220)                                |
| `blackHole`      | Accretion disk + lensing glow        | `radius` (0.18), `particles` (220)           |
| `nebula`         | Drifting layered gas clouds          | `count` (7)                                  |
| `spiral`         | Rotating logarithmic galaxy arms     | `stars` (600), `arms` (3)                    |
| `meteors`        | Diagonal shooting stars              | `count` (18), `angle` (28), `stars` (true)   |
| `constellation`  | Connected network, reacts to pointer | `count` (90), `link` (130), `interactive`    |
| `particles`      | Cursor repel / attract field         | `count` (120), `mode` ("repel" \| "attract") |
| `aurora`         | Flowing ribbons of light             | `bands` (4)                                  |
| `wormhole`       | Receding tunnel of rings             | `rings` (26)                                 |
| `orbits`         | Planets circling a star              | `bodies` (6)                                 |
| `pulsar`         | Rhythmic expanding rings             | `waves` (4)                                  |
| `gradient`       | Animated mesh-gradient backdrop      | `colors`                                     |
| `fireflies`      | Wandering glow that breathes         | `count` (60), `interactive`                  |
| `matrix`         | Falling digital rain                 | `font` (16), `glyphs`                         |
| `plasma`         | Smooth flowing color field           | `scale` (1)                                  |
| `fireworks`      | Launching shells that burst          | `rate` (1), `gravity` (0.12)                 |
| `snow`           | Drifting snowfall with wind          | `count` (200), `wind` (0.4)                  |
| `waves`          | Layered ocean of sine waves          | `layers` (4), `amplitude` (26)               |
| `dna`            | Rotating double helix                | `points` (36)                                |
| `lightning`      | Branching bolts that flash           | `speed`                                      |
| `ripples`        | Expanding rings (auto + pointer)     | `interactive`                                |
| `comets`         | Glowing comets with trailing tails   | `count` (4), `stars` (true)                  |
| `confetti`       | Celebratory falling paper            | `rate` (1), `gravity` (0.08)                 |
| `bubbles`        | Gentle rising bubbles                | `count` (42)                                 |
| `fog`            | Drifting layered mist                | `layers` (7)                                 |
| `grid`           | Synthwave perspective floor          | `lines` (16)                                 |
| `rain`           | Angled rainfall                      | `count` (300), `angle` (14)                  |
| `vortex`         | Particles spiralling into the core   | `count` (240)                                |
| `sparkle`        | Twinkling glints                     | `count` (54)                                 |
| `tunnel`         | Neon polygon tunnel                  | `rings` (20), `sides` (6)                    |
| `swarm`          | Flocking boids (reacts to pointer)   | `count` (64), `interactive`                  |
| `ribbons`        | Flowing silk ribbons                 | `count` (5)                                  |
| `flowfield`      | Particles following a flow field     | `count` (600), `scale` (1)                   |
| `globe`          | Rotating dotted sphere               | `count` (320)                                |
| `heartbeat`      | ECG monitor sweep                    | `bpm` (1)                                    |
| `equalizer`      | Audio frequency bars                 | `bars` (32)                                  |
| `clock`          | Luminous analog clock (real time)    | `colors`                                     |
| `rays`           | Rotating volumetric light rays       | `count` (14)                                 |
| `radar`          | Sweeping radar with blips            | `blips` (7)                                  |
| `embers`         | Rising fire sparks                   | `count` (120)                                |
| `typewriter`     | Typing text effect                   | `text` (string[]), `font` (auto)             |
| `spirograph`     | Evolving hypotrochoid curves         | `colors`                                     |

```js
Galaxy.list();            // -> ["starfield", "warp", ...]
Galaxy.defaults("nebula"); // -> { count: 7, speed: 1, colors: [...], ... }
```

### Declarative (data attributes)

No JavaScript required — `Galaxy.autoInit()` runs automatically on
`DOMContentLoaded`. Any `kebab-case` `data-galaxy-*` attribute becomes a
camelCase option (numbers, booleans, and comma lists are parsed automatically).

```html
<div data-galaxy="warp" data-galaxy-speed="1.5" data-galaxy-count="300"></div>
```

For content injected later, call `Galaxy.autoInit(container)` yourself.

### Custom animations

```js
Galaxy.register("rain", {
  defaults: { count: 200, speed: 1, colors: ["#9bd0ff"] },
  setup(host) {
    let drops = [];
    const build = () => {
      drops = Array.from({ length: host.opts.count }, () => ({
        x: Math.random() * host.width,
        y: Math.random() * host.height,
      }));
    };
    build();
    return {
      resize: build,
      draw(t, dt) {
        const c = host.ctx;
        c.clearRect(0, 0, host.width, host.height);
        c.strokeStyle = "#9bd0ff";
        for (const d of drops) {
          d.y += 300 * host.opts.speed * dt;
          if (d.y > host.height) d.y = 0;
          c.beginPath();
          c.moveTo(d.x, d.y);
          c.lineTo(d.x, d.y + 12);
          c.stroke();
        }
      },
    };
  },
});

Galaxy.create("rain", "#sky");
```

The `host` object exposes `ctx`, `width`, `height`, `dpr`, `opts`, `mouse`
(`{x, y, active}`) and `t`. Return `{ draw, resize?, update?, destroy? }`.

---

## UI components

Components are styled by `galaxy.css` (classes are prefixed `gx-`) and wired by
`Galaxy.autoInit()`. The interactive ones also have an imperative API.

### Toast

```js
Galaxy.toast("Star saved ✨", { type: "success", duration: 3000, position: "top-right" });
```

`type`: `success | warning | danger | info`. `position`: `top-right`,
`top-left`, `bottom-right`, `bottom-left`, `top-center`. Returns `{ close() }`.

### Modal & confirm

```js
const m = Galaxy.modal({
  title: "Welcome 🚀",
  body: "Created with one call.",
  actions: [
    { label: "Cancel", variant: "ghost" },
    { label: "Launch", variant: "primary", onClick: () => {} },
  ],
});
m.close();

const ok = await Galaxy.confirm("Eject the pod?", { okLabel: "Eject" });
```

### Tooltip / Tabs / Accordion / Dropdown

Declarative — add the markup and `autoInit` wires it:

```html
<button data-gx-tooltip="Hello" data-gx-tooltip-pos="top">Hover me</button>

<div data-gx-tabs>
  <div class="gx-tabs__list">
    <button class="gx-tab" aria-selected="true">One</button>
    <button class="gx-tab">Two</button>
  </div>
  <div class="gx-tab-panel">First panel</div>
  <div class="gx-tab-panel" hidden>Second panel</div>
</div>

<div class="gx-accordion" data-gx-accordion>
  <div class="gx-accordion__item">
    <button class="gx-accordion__header">Question <span class="gx-accordion__icon">⌄</span></button>
    <div class="gx-accordion__panel"><div class="gx-accordion__panel-inner">Answer.</div></div>
  </div>
</div>
```

Use `data-gx-accordion="multi"` to allow several panels open at once.

### Drawer (slide-in panel)

```js
const d = Galaxy.drawer({
  title: "Settings",
  side: "right", // right | left | top | bottom
  html: "<p>Panel content</p>",
  actions: [{ label: "Done", variant: "primary" }],
});
```

Declarative trigger: `<button data-gx-drawer-target="#tpl" data-gx-drawer-side="left">`.

### Segmented control

```html
<div data-gx-segmented>
  <button class="gx-segmented__option" aria-checked="true" data-gx-target="#a">Day</button>
  <button class="gx-segmented__option" data-gx-target="#b">Week</button>
</div>
```

Fires a `gx:change` event with `{ index, value }`. `data-gx-target` optionally
toggles a panel.

### Popover (click-triggered rich content)

```html
<span style="position:relative">
  <button data-gx-popover data-gx-popover-target="#pop">Details ▾</button>
  <div class="gx-popover" id="pop">Rich content here</div>
</span>
```

### Rating

```html
<span class="gx-rating" data-gx-rating="5" data-gx-value="3"></span>
```

Interactive; fires `gx:change` with `{ value }`.

### Copy to clipboard

```html
<button data-gx-copy="npm install galaxyjs">Copy</button>
<!-- or copy another element's value/text -->
<button data-gx-copy-target="#field" data-gx-copy-msg="Copied!">Copy field</button>
```

### Buttons, cards, and the rest (CSS only)

- **Buttons** — `gx-btn` (+ `--primary --accent --ghost --subtle --danger --sm --lg --block --icon`); add `is-loading` for a spinner, wrap in `gx-btn-group` to join.
- **Cards** — `gx-card` (+ `--interactive --glow --spotlight`).
- **Data display** — `gx-badge`, `gx-chip` (+ `gx-chip__close`, auto-removed), `gx-avatar` (+ `--status --busy --offline`), `gx-avatar-group`, `gx-table` (+ `--striped`), `gx-kbd`.
- **Feedback** — `gx-alert` (+ `--success --warning --danger --info`), `gx-banner`, `gx-progress`, `gx-ring` (radial, set `--gx-value`), `gx-spinner`, `gx-skeleton`.
- **Forms** — `gx-input` / `gx-textarea` / `gx-select` (+ `--invalid`), `gx-input-group` (+ `__addon`), `gx-field__help` / `gx-field__error`, `gx-switch`, `gx-check`, `gx-radio-c`, `gx-range`.
- **Navigation** — `gx-pagination` (+ `gx-page.is-active`), `gx-breadcrumb`, `gx-steps` (+ `gx-step.is-active/.is-done`), `gx-divider`.

All `.gx-btn`s get a click ripple from `autoInit`.

### Scroll reveal

```html
<div class="gx-reveal" data-gx-reveal-delay="120">Fades in on scroll</div>
```

---

## Theming

All visuals are driven by CSS custom properties (`--gx-*`). Two built-in themes:

```js
Galaxy.theme("light");      // or "dark"
Galaxy.toggleTheme();        // returns the new theme name
```

Override any token at runtime:

```js
Galaxy.theme({ accent: "#ff5d8f", accent2: "#ffd166", radius: "20px" });
```

Or in CSS:

```css
:root { --gx-accent: #ff5d8f; }
[data-galaxy-theme="light"] { --gx-bg: #fafafa; }
```

---

## Accessibility & performance

- **Reduced motion:** when `prefers-reduced-motion: reduce` is set, animations
  render a single static frame and never loop. `Galaxy.prefersReducedMotion`
  exposes the current value.
- **One render loop:** every animation shares a single `requestAnimationFrame`
  loop, so ten surfaces cost one rAF callback, not ten.
- **Auto-pause:** surfaces pause via `IntersectionObserver` when scrolled
  off-screen, and resume when visible again.
- **HiDPI:** canvases scale to `devicePixelRatio` (capped at 2) for crisp edges.
- **Cleanup:** `.destroy()` (or `Galaxy.destroyAll()`) removes canvases and
  disconnects every observer and listener.
