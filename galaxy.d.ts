// Type definitions for GalaxyJS v3.0 "Nova"
// A zero-dependency cosmic animation + UI component library.
// Project: https://github.com/Edwson/GalaxyJS

export as namespace Galaxy;

/** Built-in animation identifiers. */
export type AnimationType =
  | "starfield"
  | "warp"
  | "blackHole"
  | "nebula"
  | "spiral"
  | "meteors"
  | "constellation"
  | "particles"
  | "aurora"
  | "wormhole"
  | "orbits"
  | "pulsar"
  | "gradient"
  | "fireflies"
  | "matrix"
  | "plasma"
  | "fireworks"
  | "snow"
  | "waves"
  | "dna"
  | "lightning"
  | "ripples"
  | "comets"
  | "confetti"
  | "bubbles"
  | "fog"
  | "grid"
  | "rain"
  | "vortex"
  | "sparkle"
  | "tunnel"
  | "swarm"
  | "ribbons"
  | "flowfield"
  | "globe"
  | "heartbeat"
  | "equalizer"
  | "clock"
  | "rays"
  | "radar"
  | "embers"
  | "typewriter"
  | "spirograph";

/** A CSS selector string or an existing element. */
export type Target = string | HTMLElement;

/** Options accepted by every animation. Extra keys vary per type. */
export interface AnimationOptions {
  /** Animation speed multiplier. Default: 1. */
  speed?: number;
  /** Array of hex colors used for the palette. */
  colors?: string[];
  /** Background hex used for trail-based animations. */
  background?: string;
  /** Whether motion leaves a trail (where supported). */
  trail?: boolean;
  /** Track the pointer and react to it (constellation/particles). */
  interactive?: boolean;
  /** Start automatically on create. Default: true. */
  autoplay?: boolean;
  /** Any animation-specific numeric parameter (count, stars, rings, etc.). */
  [key: string]: unknown;
}

/** Controller returned by Galaxy.create(). */
export interface AnimationInstance {
  readonly el: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly type: AnimationType | string;
  start(): AnimationInstance;
  stop(): AnimationInstance;
  pause(): AnimationInstance;
  resume(): AnimationInstance;
  /** Merge new options and rebuild. */
  update(options: AnimationOptions): AnimationInstance;
  /** Current resolved options. */
  options(): AnimationOptions;
  /** Tear down: stop loop, remove canvas, disconnect observers. */
  destroy(): void;
}

/** Internal host passed to a custom animation's setup(). */
export interface AnimationHost {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  opts: AnimationOptions;
  width: number;
  height: number;
  dpr: number;
  mouse: { x: number; y: number; active: boolean };
  t: number;
}

/** The object a custom animation's setup() must return. */
export interface AnimationDriver {
  draw(t: number, dt: number): void;
  resize?(width: number, height: number): void;
  update?(opts: AnimationOptions): void;
  destroy?(): void;
}

export interface AnimationDefinition {
  setup(host: AnimationHost): AnimationDriver;
  defaults?: AnimationOptions;
}

export type ToastType = "success" | "warning" | "danger" | "info";
export type ToastPosition =
  | "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center";

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  position?: ToastPosition;
  icon?: string;
}
export interface ToastHandle { close(): void; }

export interface ModalAction {
  label: string;
  variant?: "primary" | "accent" | "ghost" | "subtle" | "danger";
  onClick?: () => void;
  /** Close the modal after onClick. Default: true. */
  close?: boolean;
}
export interface ModalOptions {
  title?: string;
  body?: string;
  html?: string;
  closable?: boolean;
  actions?: ModalAction[];
  onClose?: () => void;
}
export interface ModalHandle { close(): void; el: HTMLElement; }

export type DrawerSide = "right" | "left" | "top" | "bottom";
export interface DrawerOptions {
  title?: string;
  body?: string;
  html?: string;
  side?: DrawerSide;
  actions?: ModalAction[];
  onClose?: () => void;
}
export interface DrawerHandle { close(): void; el: HTMLElement; }

export interface ConfirmOptions {
  title?: string;
  okLabel?: string;
  cancelLabel?: string;
}

/** Theme tokens, e.g. { accent: "#7c5cff", bg: "#000" }. */
export type ThemeTokens = Record<string, string>;

export interface GalaxyStatic {
  readonly version: string;
  readonly prefersReducedMotion: boolean;

  /** Create an animation surface inside the target element. */
  create(type: AnimationType | string, target: Target, options?: AnimationOptions): AnimationInstance;
  /** Register a custom animation. */
  register(name: string, def: AnimationDefinition): GalaxyStatic;
  /** List all registered animation names. */
  list(): string[];
  /** Get a copy of an animation's default options. */
  defaults(name: string): AnimationOptions | null;
  /** Scan a DOM scope and wire all declarative components/animations. */
  autoInit(scope?: Document | HTMLElement): void;

  // UI components
  toast(message: string, options?: ToastOptions): ToastHandle;
  modal(options?: ModalOptions): ModalHandle;
  confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
  drawer(options?: DrawerOptions): DrawerHandle;
  tooltip(node: HTMLElement): void;
  tabs(root: HTMLElement): void;
  accordion(root: HTMLElement): void;
  dropdown(root: HTMLElement): void;
  segmented(root: HTMLElement): void;
  popover(node: HTMLElement): void;
  rating(root: HTMLElement): void;
  copy(node: HTMLElement): void;
  ripple(node: HTMLElement): void;
  reveal(nodes: string | NodeListOf<Element> | Element[]): void;

  // Theming
  theme(value: "dark" | "light" | ThemeTokens): void;
  toggleTheme(): string;

  // Lifecycle
  destroyAll(): void;
}

declare const Galaxy: GalaxyStatic;
export default Galaxy;
