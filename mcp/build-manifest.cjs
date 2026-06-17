#!/usr/bin/env node
/* Generates galaxy.manifest.json from the live library (single source of truth).
 * Run: npm run manifest  (or: node mcp/build-manifest.cjs)
 * The runtime's Galaxy.list() / Galaxy.defaults() are the authority for names
 * and option defaults; this script only adds one-line descriptions. */
const fs = require("fs");
const path = require("path");
const Galaxy = require("../galaxy.js");

const ANIM_DESC = {
  starfield: "Drifting parallax stars with twinkle",
  warp: "Hyperspace streaks from the center",
  blackHole: "Accretion disk with gravitational-lensing glow",
  nebula: "Drifting layered gas clouds",
  spiral: "Rotating logarithmic galaxy arms",
  meteors: "Diagonal shooting stars",
  constellation: "Connected node network, reacts to the pointer",
  particles: "Cursor repel / attract particle field",
  aurora: "Flowing ribbons of light",
  wormhole: "Receding tunnel of rings",
  orbits: "Planets circling a star",
  pulsar: "Rhythmic expanding rings",
  gradient: "Animated mesh-gradient backdrop",
  fireflies: "Wandering glow that breathes (interactive)",
  matrix: "Falling digital rain",
  plasma: "Smooth flowing color field",
  fireworks: "Launching shells that burst",
  snow: "Drifting snowfall with wind",
  waves: "Layered ocean of sine waves",
  dna: "Rotating double helix",
  lightning: "Branching bolts that flash",
  ripples: "Expanding concentric rings (interactive)",
  comets: "Glowing comets with trailing tails",
  confetti: "Celebratory falling paper",
  bubbles: "Gentle rising bubbles",
  fog: "Drifting layered mist",
  grid: "Synthwave perspective floor",
  rain: "Angled rainfall",
  vortex: "Particles spiralling into the core",
  sparkle: "Twinkling glints",
  tunnel: "Neon polygon tunnel",
  swarm: "Flocking boids, reacts to the pointer",
  ribbons: "Flowing silk ribbons",
  flowfield: "Particles following a flow field",
  globe: "Rotating dotted sphere",
  heartbeat: "ECG monitor sweep",
  equalizer: "Audio frequency bars",
  clock: "Luminous analog clock (real time)",
  rays: "Rotating volumetric light rays",
  radar: "Sweeping radar with blips",
  embers: "Rising fire sparks",
  typewriter: "Typing text effect (set `text`)",
  spirograph: "Evolving hypotrochoid curves",
};

const COMPONENTS = [
  { name: "toast", kind: "js", usage: "Galaxy.toast(message, { type, duration, position })", desc: "Transient notification. type: success|warning|danger|info." },
  { name: "modal", kind: "js", usage: "Galaxy.modal({ title, body, actions })", desc: "Dialog with optional action buttons. Returns { close }." },
  { name: "confirm", kind: "js", usage: "await Galaxy.confirm(message, { okLabel, cancelLabel })", desc: "Confirm dialog. Resolves to a boolean." },
  { name: "drawer", kind: "js", usage: "Galaxy.drawer({ title, html, side, actions })", desc: "Slide-in panel. side: right|left|top|bottom." },
  { name: "tooltip", kind: "attr", usage: '<button data-gx-tooltip="text" data-gx-tooltip-pos="top">', desc: "Hover/focus tooltip." },
  { name: "tabs", kind: "attr", usage: '<div data-gx-tabs>… .gx-tab / .gx-tab-panel …</div>', desc: "Animated tab group." },
  { name: "accordion", kind: "attr", usage: '<div class="gx-accordion" data-gx-accordion>…</div>', desc: "Collapsible panels. Add =\"multi\" to allow many open." },
  { name: "dropdown", kind: "attr", usage: '<div class="gx-dropdown" data-gx-dropdown>…</div>', desc: "Menu with outside-click close." },
  { name: "segmented", kind: "attr", usage: '<div data-gx-segmented>… .gx-segmented__option …</div>', desc: "Segmented control. Fires gx:change." },
  { name: "popover", kind: "attr", usage: '<button data-gx-popover data-gx-popover-target="#pop">', desc: "Click-triggered rich popover (.gx-popover)." },
  { name: "rating", kind: "attr", usage: '<span class="gx-rating" data-gx-rating="5" data-gx-value="3"></span>', desc: "Interactive star rating. Fires gx:change." },
  { name: "copy", kind: "attr", usage: '<button data-gx-copy="text to copy">Copy</button>', desc: "Copy text (or data-gx-copy-target) to the clipboard." },
  { name: "reveal", kind: "attr", usage: '<div class="gx-reveal" data-gx-reveal-delay="120">', desc: "Fade/slide in on scroll." },
];

const CSS_CLASSES = [
  "gx-btn (--primary --accent --ghost --subtle --danger --sm --lg --block --icon; is-loading; gx-btn-group)",
  "gx-card (--interactive --glow --spotlight)",
  "gx-alert (--success --warning --danger --info)", "gx-banner",
  "gx-badge", "gx-chip (gx-chip__close)", "gx-avatar (--status --busy --offline)", "gx-avatar-group",
  "gx-table (--striped)", "gx-steps", "gx-pagination", "gx-breadcrumb", "gx-kbd", "gx-divider",
  "gx-progress", "gx-ring (set --gx-value)", "gx-spinner", "gx-skeleton",
  "gx-input", "gx-textarea", "gx-select", "gx-input-group", "gx-switch", "gx-check", "gx-radio-c", "gx-range",
];

const animations = Galaxy.list().map(function (name) {
  return { name: name, desc: ANIM_DESC[name] || "", options: Galaxy.defaults(name) };
});

const manifest = {
  name: "galaxyjs",
  version: Galaxy.version,
  title: "GalaxyJS",
  description: "Zero-dependency cosmic animation & UI component library with one unified API.",
  homepage: "https://github.com/Edwson/GalaxyJS",
  author: { name: "Ed Chen", url: "https://www.edwson.com" },
  license: "MIT",
  cdn: {
    js: "https://unpkg.com/galaxyjs@3/galaxy.min.js",
    css: "https://unpkg.com/galaxyjs@3/galaxy.min.css",
  },
  install: {
    script: '<link rel="stylesheet" href="https://unpkg.com/galaxyjs@3/galaxy.min.css">\n<script src="https://unpkg.com/galaxyjs@3/galaxy.min.js"></script>',
    npm: 'npm install galaxyjs   //  import Galaxy from "galaxyjs"; import "galaxyjs/galaxy.css";',
  },
  api: {
    create: "Galaxy.create(type, target, options) -> instance{ start, stop, pause, resume, update, destroy }",
    register: "Galaxy.register(name, { defaults, setup })",
    theme: 'Galaxy.theme("dark"|"light"|{ accent, bg, ... })',
    toggleTheme: "Galaxy.toggleTheme()",
    autoInit: "Galaxy.autoInit(scope?) — runs automatically; also wires data-* components",
    declarative: '<div data-galaxy="nebula" data-galaxy-speed="1.5"></div>',
  },
  oneLiner: "Galaxy.create('nebula', '#hero')",
  notes: [
    "Every option also accepts: speed (number), colors (hex[]), background (hex), autoplay (bool).",
    "interactive:true makes constellation/particles/fireflies/swarm/ripples follow the pointer.",
    "Respects prefers-reduced-motion (renders one static frame). One shared rAF loop; auto-pauses off-screen.",
  ],
  cssClasses: CSS_CLASSES,
  animations: animations,
  components: COMPONENTS,
};

const out = path.join(__dirname, "..", "galaxy.manifest.json");
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
console.log("Wrote " + out + " (" + animations.length + " animations, " + COMPONENTS.length + " components)");
