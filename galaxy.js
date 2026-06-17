/*! GalaxyJS v3.0 "Nova" — galaxy.js
 *  A zero-dependency cosmic animation + UI component library.
 *  Unified API:  Galaxy.create(type, target, options)
 *  UMD: works as <script>, CommonJS, and (interop) ES import.
 *  MIT License.
 * ------------------------------------------------------------------ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define([], factory);
  } else {
    root.Galaxy = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "3.0.0";
  var hasDOM = typeof document !== "undefined";
  var prefersReduced =
    hasDOM &&
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
   * Utilities
   * ========================================================== */
  function resolve(target) {
    if (!target) return null;
    if (typeof target === "string") return document.querySelector(target);
    return target;
  }
  function rand(min, max) { return min + Math.random() * (max - min); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function TAU() { return Math.PI * 2; }

  function hexToRgb(hex) {
    if (typeof hex !== "string") return { r: 124, g: 92, b: 255 };
    hex = hex.replace("#", "").trim();
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hex, 16);
    if (isNaN(n)) return { r: 124, g: 92, b: 255 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgba(c, a) { return "rgba(" + c.r + "," + c.g + "," + c.b + "," + a + ")"; }
  function emit(node, name, detail) {
    try {
      if (typeof CustomEvent === "function") node.dispatchEvent(new CustomEvent(name, { detail: detail }));
    } catch (e) { /* environments without CustomEvent */ }
  }
  function mixRgb(a, b, t) {
    return { r: Math.round(lerp(a.r, b.r, t)), g: Math.round(lerp(a.g, b.g, t)), b: Math.round(lerp(a.b, b.b, t)) };
  }
  function paletteOf(opts, fallback) {
    var src = opts.colors && opts.colors.length ? opts.colors : fallback;
    return src.map(hexToRgb);
  }

  /* ============================================================
   * Shared animation loop (one rAF for the whole page)
   * ========================================================== */
  var Loop = (function () {
    var tickers = [];
    var raf = null;
    function frame(now) {
      for (var i = 0; i < tickers.length; i++) {
        var t = tickers[i];
        if (t.running) { try { t.fn(now); } catch (e) { /* keep loop alive */ } }
      }
      raf = requestAnimationFrame(frame);
    }
    return {
      add: function (t) {
        tickers.push(t);
        if (raf === null && hasDOM) raf = requestAnimationFrame(frame);
      },
      remove: function (t) {
        var i = tickers.indexOf(t);
        if (i >= 0) tickers.splice(i, 1);
        if (!tickers.length && raf !== null) { cancelAnimationFrame(raf); raf = null; }
      },
    };
  })();

  /* ============================================================
   * Animation registry + surface mounting
   * ========================================================== */
  var animations = {};

  function registerAnimation(name, def) {
    animations[name] = { setup: def.setup, defaults: def.defaults || {} };
  }

  function mountAnimation(name, target, options) {
    var el = resolve(target);
    if (!el) throw new Error('GalaxyJS: target not found for "' + name + '"');
    var def = animations[name];
    if (!def) throw new Error('GalaxyJS: unknown animation "' + name + '"');

    el.classList.add("gx-surface-host");
    var canvas = document.createElement("canvas");
    canvas.className = "gx-canvas";
    el.appendChild(canvas);
    var ctx = canvas.getContext("2d");

    var opts = Object.assign({}, def.defaults, options || {});
    var host = {
      el: el, canvas: canvas, ctx: ctx, opts: opts,
      width: 1, height: 1, dpr: 1,
      mouse: { x: -9999, y: -9999, active: false },
      t: 0,
    };

    var instance = def.setup(host);

    function resize() {
      var r = el.getBoundingClientRect();
      host.width = Math.max(1, Math.round(r.width));
      host.height = Math.max(1, Math.round(r.height));
      host.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(host.width * host.dpr);
      canvas.height = Math.round(host.height * host.dpr);
      canvas.style.width = host.width + "px";
      canvas.style.height = host.height + "px";
      ctx.setTransform(host.dpr, 0, 0, host.dpr, 0, 0);
      if (instance.resize) instance.resize(host.width, host.height);
    }

    // Pointer tracking
    function onMove(e) {
      var r = el.getBoundingClientRect();
      var p = e.touches ? e.touches[0] : e;
      host.mouse.x = p.clientX - r.left;
      host.mouse.y = p.clientY - r.top;
      host.mouse.active = true;
    }
    function onLeave() { host.mouse.active = false; host.mouse.x = -9999; host.mouse.y = -9999; }
    if (opts.interactive) {
      canvas.setAttribute("data-interactive", "true");
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
    }

    resize();

    var last = (typeof performance !== "undefined" ? performance.now() : Date.now());
    var ticker = {
      running: false,
      fn: function (now) {
        var dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        host.t += dt;
        instance.draw(host.t, dt);
      },
    };

    // Resize + visibility observers
    var ro = null, io = null, paused = false;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(el);
    } else if (hasDOM) {
      window.addEventListener("resize", resize);
    }

    function start() {
      if (prefersReduced) { instance.draw(0, 0); return controller; }
      if (ticker.running) return controller;
      ticker.running = true;
      last = (typeof performance !== "undefined" ? performance.now() : Date.now());
      Loop.add(ticker);
      return controller;
    }
    function stop() { ticker.running = false; Loop.remove(ticker); return controller; }

    // Pause when off-screen (battery / perf friendly)
    if (typeof IntersectionObserver !== "undefined" && !prefersReduced) {
      io = new IntersectionObserver(function (entries) {
        var visible = entries[0].isIntersecting;
        if (visible && !paused) start();
        else { paused = false; if (!visible) stop(); }
      }, { threshold: 0.01 });
      io.observe(el);
    }

    var controller = {
      el: el, canvas: canvas, type: name,
      start: start,
      stop: stop,
      pause: function () { stop(); paused = true; return controller; },
      resume: function () { paused = false; start(); return controller; },
      update: function (next) {
        Object.assign(host.opts, next || {});
        if (instance.update) instance.update(host.opts);
        else if (instance.resize) instance.resize(host.width, host.height);
        if (prefersReduced) instance.draw(host.t, 0);
        return controller;
      },
      options: function () { return host.opts; },
      destroy: function () {
        stop();
        if (ro) ro.disconnect();
        if (io) io.disconnect();
        if (opts.interactive) {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        }
        if (instance.destroy) instance.destroy();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        el.classList.remove("gx-surface-host");
      },
    };

    if (opts.autoplay !== false) start();
    return controller;
  }

  /* ============================================================
   * Built-in animations
   * ========================================================== */
  function fade(host, alpha) {
    var c = host.ctx;
    if (host.opts.trail === false || alpha <= 0) {
      c.clearRect(0, 0, host.width, host.height);
    } else {
      c.fillStyle = rgba(hexToRgb(host.opts.background || "#05060f"), alpha);
      c.fillRect(0, 0, host.width, host.height);
    }
  }

  // 1. Starfield — drifting parallax stars with twinkle
  registerAnimation("starfield", {
    defaults: { count: 160, speed: 1, colors: ["#ffffff", "#bcd4ff", "#fff1c4"], background: "#05060f", trail: false },
    setup: function (h) {
      var stars = [];
      function build() {
        stars = [];
        var area = h.width * h.height;
        var n = Math.max(40, Math.round((h.opts.count * area) / (1280 * 720)));
        var pal = paletteOf(h.opts, ["#ffffff"]);
        for (var i = 0; i < n; i++) {
          stars.push({
            x: Math.random() * h.width, y: Math.random() * h.height,
            z: Math.random(), r: rand(0.4, 1.8),
            tw: rand(0, TAU()), col: pal[(Math.random() * pal.length) | 0],
          });
        }
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 1); var c = h.ctx;
          for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            s.y += (0.15 + s.z * 0.9) * h.opts.speed * 30 * dt;
            if (s.y > h.height + 2) { s.y = -2; s.x = Math.random() * h.width; }
            var a = 0.5 + 0.5 * Math.sin(t * (1 + s.z) + s.tw);
            c.beginPath();
            c.fillStyle = rgba(s.col, 0.25 + a * 0.6);
            c.arc(s.x, s.y, s.r * (0.6 + s.z), 0, TAU());
            c.fill();
          }
        },
      };
    },
  });

  // 2. Warp speed — hyperspace streaks from the center
  registerAnimation("warp", {
    defaults: { count: 220, speed: 1, colors: ["#ffffff", "#9bd0ff", "#c9b8ff"], background: "#03040d", trail: true },
    setup: function (h) {
      var stars = [], cx = 0, cy = 0;
      function mk() { return { a: rand(0, TAU()), d: rand(0, 1), len: 0, col: pal[(Math.random() * pal.length) | 0] }; }
      var pal;
      function build() {
        pal = paletteOf(h.opts, ["#ffffff"]); cx = h.width / 2; cy = h.height / 2;
        stars = []; for (var i = 0; i < h.opts.count; i++) stars.push(mk());
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.28); var c = h.ctx;
          var maxR = Math.hypot(cx, cy);
          for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            var prev = s.d;
            s.d += dt * (0.25 + s.d) * h.opts.speed * 1.6;
            if (s.d > 1) { s.d = rand(0, 0.15); s.a = rand(0, TAU()); prev = s.d; }
            var r1 = prev * maxR, r2 = s.d * maxR;
            var x1 = cx + Math.cos(s.a) * r1, y1 = cy + Math.sin(s.a) * r1;
            var x2 = cx + Math.cos(s.a) * r2, y2 = cy + Math.sin(s.a) * r2;
            c.strokeStyle = rgba(s.col, clamp(s.d, 0.1, 1));
            c.lineWidth = lerp(0.4, 2.4, s.d);
            c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
          }
        },
      };
    },
  });

  // 3. Black hole — accretion disk + lensing glow
  registerAnimation("blackHole", {
    defaults: { radius: 0.18, speed: 1, colors: ["#ff7b00", "#ffd166", "#7c5cff"], background: "#04040c", particles: 220 },
    setup: function (h) {
      var disk = [], cx, cy, R, pal;
      function build() {
        pal = paletteOf(h.opts, ["#ff7b00", "#ffd166"]);
        cx = h.width / 2; cy = h.height / 2;
        R = Math.min(h.width, h.height) * h.opts.radius;
        disk = [];
        for (var i = 0; i < h.opts.particles; i++) {
          disk.push({ a: rand(0, TAU()), r: rand(R * 1.1, R * 3.4), s: rand(0.4, 1.2), col: pal[(Math.random() * pal.length) | 0] });
        }
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.22); var c = h.ctx;
          // outer glow
          var g = c.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 3.6);
          g.addColorStop(0, rgba(pal[0], 0.18));
          g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 3.6, 0, TAU()); c.fill();
          // disk particles (perspective squash)
          for (var i = 0; i < disk.length; i++) {
            var p = disk[i];
            p.a += dt * h.opts.speed * (1.6 / (p.r / R)) * 0.5;
            var x = cx + Math.cos(p.a) * p.r;
            var y = cy + Math.sin(p.a) * p.r * 0.38;
            var depth = 0.5 + 0.5 * Math.sin(p.a);
            c.fillStyle = rgba(p.col, 0.25 + depth * 0.55);
            c.beginPath(); c.arc(x, y, p.s * (0.6 + depth), 0, TAU()); c.fill();
          }
          // event horizon
          c.fillStyle = "#000"; c.beginPath(); c.arc(cx, cy, R, 0, TAU()); c.fill();
          c.strokeStyle = rgba(pal[pal.length - 1] || pal[0], 0.5);
          c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R * 1.04, 0, TAU()); c.stroke();
        },
      };
    },
  });

  // 4. Nebula — drifting layered colored clouds
  registerAnimation("nebula", {
    defaults: { count: 7, speed: 1, colors: ["#7c5cff", "#22d3ee", "#f472b6", "#3b82f6"], background: "#05060f", blur: 60 },
    setup: function (h) {
      var blobs = [], pal;
      function build() {
        pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee"]);
        blobs = [];
        for (var i = 0; i < h.opts.count; i++) {
          blobs.push({
            x: Math.random(), y: Math.random(),
            r: rand(0.25, 0.6), a: rand(0, TAU()),
            vx: rand(-0.02, 0.02), vy: rand(-0.02, 0.02),
            col: pal[i % pal.length],
          });
        }
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          var c = h.ctx; c.clearRect(0, 0, h.width, h.height);
          c.fillStyle = rgba(hexToRgb(h.opts.background), 1); c.fillRect(0, 0, h.width, h.height);
          c.globalCompositeOperation = "lighter";
          var minDim = Math.min(h.width, h.height);
          for (var i = 0; i < blobs.length; i++) {
            var b = blobs[i];
            b.x += b.vx * h.opts.speed * dt; b.y += b.vy * h.opts.speed * dt;
            if (b.x < -0.2 || b.x > 1.2) b.vx *= -1;
            if (b.y < -0.2 || b.y > 1.2) b.vy *= -1;
            var px = b.x * h.width, py = b.y * h.height;
            var rad = b.r * minDim * (0.9 + 0.1 * Math.sin(t * 0.6 + i));
            var g = c.createRadialGradient(px, py, 0, px, py, rad);
            g.addColorStop(0, rgba(b.col, 0.5));
            g.addColorStop(0.5, rgba(b.col, 0.16));
            g.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = g; c.beginPath(); c.arc(px, py, rad, 0, TAU()); c.fill();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 5. Spiral galaxy — rotating logarithmic arms
  registerAnimation("spiral", {
    defaults: { stars: 600, arms: 3, speed: 1, colors: ["#ffffff", "#9bd0ff", "#c9b8ff", "#ffd6a5"], background: "#04040c" },
    setup: function (h) {
      var pts = [], cx, cy, pal;
      function build() {
        pal = paletteOf(h.opts, ["#ffffff", "#9bd0ff"]);
        cx = h.width / 2; cy = h.height / 2;
        pts = [];
        var maxR = Math.min(h.width, h.height) * 0.46;
        for (var i = 0; i < h.opts.stars; i++) {
          var arm = i % h.opts.arms;
          var d = Math.pow(Math.random(), 0.6);
          var r = d * maxR;
          var spin = d * 4.2;
          var a = (arm / h.opts.arms) * TAU() + spin + rand(-0.18, 0.18);
          pts.push({ r: r, a: a, s: rand(0.4, 1.6), col: pal[(Math.random() * pal.length) | 0], tw: rand(0, TAU()) });
        }
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.25); var c = h.ctx;
          var g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.min(h.width, h.height) * 0.2);
          g.addColorStop(0, "rgba(255,240,210,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.beginPath(); c.arc(cx, cy, Math.min(h.width, h.height) * 0.2, 0, TAU()); c.fill();
          var rot = t * 0.12 * h.opts.speed;
          for (var i = 0; i < pts.length; i++) {
            var p = pts[i];
            var a = p.a + rot * (1 - p.r / (Math.min(h.width, h.height) * 0.5) * 0.3);
            var x = cx + Math.cos(a) * p.r, y = cy + Math.sin(a) * p.r * 0.62;
            var tw = 0.6 + 0.4 * Math.sin(t * 2 + p.tw);
            c.fillStyle = rgba(p.col, 0.3 + tw * 0.6);
            c.beginPath(); c.arc(x, y, p.s, 0, TAU()); c.fill();
          }
        },
      };
    },
  });

  // 6. Meteor shower — diagonal shooting stars
  registerAnimation("meteors", {
    defaults: { count: 18, speed: 1, angle: 28, colors: ["#ffffff", "#a5c8ff"], background: "#05060f", stars: true },
    setup: function (h) {
      var meteors = [], bg = [], pal;
      function mk() {
        return { x: rand(-0.2, 1) * h.width, y: rand(-1, 0.4) * h.height, len: rand(80, 220), sp: rand(0.6, 1.4), col: pal[(Math.random() * pal.length) | 0] };
      }
      function build() {
        pal = paletteOf(h.opts, ["#ffffff"]);
        meteors = []; for (var i = 0; i < h.opts.count; i++) meteors.push(mk());
        bg = []; if (h.opts.stars) for (var j = 0; j < 120; j++) bg.push({ x: Math.random() * h.width, y: Math.random() * h.height, r: rand(0.3, 1.2) });
      }
      build();
      var rad = function () { return (h.opts.angle * Math.PI) / 180; };
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.3); var c = h.ctx;
          for (var b = 0; b < bg.length; b++) { c.fillStyle = "rgba(255,255,255,0.5)"; c.beginPath(); c.arc(bg[b].x, bg[b].y, bg[b].r, 0, TAU()); c.fill(); }
          var ang = rad(), dx = Math.cos(ang), dy = Math.sin(ang);
          for (var i = 0; i < meteors.length; i++) {
            var m = meteors[i];
            var v = m.sp * h.opts.speed * 480 * dt;
            m.x += dx * v; m.y += dy * v;
            if (m.x > h.width + 50 || m.y > h.height + 50) { meteors[i] = mk(); continue; }
            var tx = m.x - dx * m.len, ty = m.y - dy * m.len;
            var grad = c.createLinearGradient(m.x, m.y, tx, ty);
            grad.addColorStop(0, rgba(m.col, 0.9)); grad.addColorStop(1, "rgba(0,0,0,0)");
            c.strokeStyle = grad; c.lineWidth = 2; c.lineCap = "round";
            c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(tx, ty); c.stroke();
          }
        },
      };
    },
  });

  // 7. Constellation — connected network, parallax to mouse
  registerAnimation("constellation", {
    defaults: { count: 90, speed: 1, link: 130, colors: ["#7c5cff", "#22d3ee"], background: "#05060f", interactive: true },
    setup: function (h) {
      var nodes = [], pal;
      function build() {
        pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee"]);
        var area = h.width * h.height;
        var n = Math.max(24, Math.round((h.opts.count * area) / (1280 * 720)));
        nodes = [];
        for (var i = 0; i < n; i++) nodes.push({ x: Math.random() * h.width, y: Math.random() * h.height, vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4) });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          var c = h.ctx; c.clearRect(0, 0, h.width, h.height);
          c.fillStyle = rgba(hexToRgb(h.opts.background), 1); c.fillRect(0, 0, h.width, h.height);
          var L = h.opts.link;
          for (var i = 0; i < nodes.length; i++) {
            var p = nodes[i];
            p.x += p.vx * h.opts.speed; p.y += p.vy * h.opts.speed;
            if (p.x < 0 || p.x > h.width) p.vx *= -1;
            if (p.y < 0 || p.y > h.height) p.vy *= -1;
            if (h.mouse.active) {
              var mdx = p.x - h.mouse.x, mdy = p.y - h.mouse.y, md = Math.hypot(mdx, mdy);
              if (md < 140 && md > 0.1) { p.x += (mdx / md) * 0.8; p.y += (mdy / md) * 0.8; }
            }
          }
          for (var a = 0; a < nodes.length; a++) {
            for (var b = a + 1; b < nodes.length; b++) {
              var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y, d = Math.hypot(dx, dy);
              if (d < L) {
                var alpha = (1 - d / L) * 0.5;
                c.strokeStyle = rgba(pal[0], alpha); c.lineWidth = 1;
                c.beginPath(); c.moveTo(nodes[a].x, nodes[a].y); c.lineTo(nodes[b].x, nodes[b].y); c.stroke();
              }
            }
          }
          for (var k = 0; k < nodes.length; k++) {
            c.fillStyle = rgba(pal[1] || pal[0], 0.9);
            c.beginPath(); c.arc(nodes[k].x, nodes[k].y, 1.8, 0, TAU()); c.fill();
          }
        },
      };
    },
  });

  // 8. Particle field — interactive cursor repel/attract
  registerAnimation("particles", {
    defaults: { count: 120, speed: 1, colors: ["#ffffff", "#7c5cff", "#22d3ee"], background: "#05060f", interactive: true, mode: "repel" },
    setup: function (h) {
      var ps = [], pal;
      function build() {
        pal = paletteOf(h.opts, ["#ffffff"]);
        var area = h.width * h.height;
        var n = Math.max(30, Math.round((h.opts.count * area) / (1280 * 720)));
        ps = [];
        for (var i = 0; i < n; i++) ps.push({ x: Math.random() * h.width, y: Math.random() * h.height, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), r: rand(1, 2.6), col: pal[(Math.random() * pal.length) | 0] });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.2); var c = h.ctx;
          var dir = h.opts.mode === "attract" ? -1 : 1;
          for (var i = 0; i < ps.length; i++) {
            var p = ps[i];
            if (h.mouse.active) {
              var dx = p.x - h.mouse.x, dy = p.y - h.mouse.y, d = Math.hypot(dx, dy);
              if (d < 120 && d > 0.1) { var f = ((120 - d) / 120) * dir * 1.4; p.vx += (dx / d) * f; p.vy += (dy / d) * f; }
            }
            p.vx *= 0.96; p.vy *= 0.96;
            p.x += (p.vx + rand(-0.05, 0.05)) * h.opts.speed; p.y += (p.vy + rand(-0.05, 0.05)) * h.opts.speed;
            if (p.x < 0) p.x = h.width; if (p.x > h.width) p.x = 0;
            if (p.y < 0) p.y = h.height; if (p.y > h.height) p.y = 0;
            c.fillStyle = rgba(p.col, 0.85);
            c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU()); c.fill();
          }
        },
      };
    },
  });

  // 9. Aurora — flowing ribbons of light
  registerAnimation("aurora", {
    defaults: { bands: 4, speed: 1, colors: ["#22d3ee", "#7c5cff", "#34d399", "#f472b6"], background: "#04060f" },
    setup: function (h) {
      var pal;
      function build() { pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff"]); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          var c = h.ctx; c.clearRect(0, 0, h.width, h.height);
          c.fillStyle = rgba(hexToRgb(h.opts.background), 1); c.fillRect(0, 0, h.width, h.height);
          c.globalCompositeOperation = "lighter";
          for (var b = 0; b < h.opts.bands; b++) {
            var col = pal[b % pal.length];
            var baseY = (b + 1) / (h.opts.bands + 1) * h.height;
            c.beginPath();
            for (var x = 0; x <= h.width; x += 8) {
              var ph = t * h.opts.speed * 0.6 + b * 1.7;
              var y = baseY + Math.sin(x * 0.006 + ph) * 60 + Math.sin(x * 0.013 + ph * 1.4) * 28;
              if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
            }
            var grad = c.createLinearGradient(0, baseY - 90, 0, baseY + 90);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(0.5, rgba(col, 0.35));
            grad.addColorStop(1, "rgba(0,0,0,0)");
            c.lineTo(h.width, h.height); c.lineTo(0, h.height); c.closePath();
            c.fillStyle = grad; c.fill();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 10. Wormhole — receding tunnel of rings
  registerAnimation("wormhole", {
    defaults: { rings: 26, speed: 1, colors: ["#7c5cff", "#22d3ee", "#f472b6"], background: "#03030b" },
    setup: function (h) {
      var cx, cy, pal;
      function build() { cx = h.width / 2; cy = h.height / 2; pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee"]); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.3); var c = h.ctx;
          var maxR = Math.hypot(cx, cy);
          for (var i = 0; i < h.opts.rings; i++) {
            var prog = ((i / h.opts.rings) + (t * h.opts.speed * 0.12)) % 1;
            var r = prog * maxR;
            var wob = Math.sin(t * 1.5 + i) * 10 * (1 - prog);
            var col = mixRgb(pal[0], pal[1] || pal[0], prog);
            c.strokeStyle = rgba(col, (1 - prog) * 0.8);
            c.lineWidth = lerp(0.5, 3, 1 - prog);
            c.beginPath();
            c.ellipse(cx + wob, cy, r, r * 0.8, t * 0.2, 0, TAU());
            c.stroke();
          }
        },
      };
    },
  });

  // 11. Orbits — planets circling a star
  registerAnimation("orbits", {
    defaults: { bodies: 6, speed: 1, colors: ["#ffd166", "#7c5cff", "#22d3ee", "#f472b6", "#34d399"], background: "#05060f" },
    setup: function (h) {
      var bodies = [], cx, cy, pal;
      function build() {
        cx = h.width / 2; cy = h.height / 2; pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee"]);
        var maxR = Math.min(h.width, h.height) * 0.46;
        bodies = [];
        for (var i = 0; i < h.opts.bodies; i++) {
          bodies.push({ r: lerp(maxR * 0.22, maxR, (i + 1) / h.opts.bodies), a: rand(0, TAU()), sp: rand(0.3, 1) / (i + 1), size: rand(3, 8), col: pal[i % pal.length] });
        }
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          var c = h.ctx; c.clearRect(0, 0, h.width, h.height);
          c.fillStyle = rgba(hexToRgb(h.opts.background), 1); c.fillRect(0, 0, h.width, h.height);
          var g = c.createRadialGradient(cx, cy, 0, cx, cy, 60);
          g.addColorStop(0, "rgba(255,224,150,0.9)"); g.addColorStop(1, "rgba(255,180,80,0)");
          c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 60, 0, TAU()); c.fill();
          for (var i = 0; i < bodies.length; i++) {
            var b = bodies[i];
            c.strokeStyle = "rgba(255,255,255,0.08)"; c.lineWidth = 1;
            c.beginPath(); c.ellipse(cx, cy, b.r, b.r * 0.5, 0, 0, TAU()); c.stroke();
            b.a += b.sp * h.opts.speed * dt;
            var x = cx + Math.cos(b.a) * b.r, y = cy + Math.sin(b.a) * b.r * 0.5;
            c.fillStyle = rgba(b.col, 1);
            c.beginPath(); c.arc(x, y, b.size, 0, TAU()); c.fill();
          }
        },
      };
    },
  });

  // 12. Pulsar — rhythmic expanding rings
  registerAnimation("pulsar", {
    defaults: { speed: 1, colors: ["#22d3ee", "#7c5cff"], background: "#04040c", waves: 4 },
    setup: function (h) {
      var cx, cy, pal;
      function build() { cx = h.width / 2; cy = h.height / 2; pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff"]); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.18); var c = h.ctx;
          var maxR = Math.min(h.width, h.height) * 0.5;
          for (var i = 0; i < h.opts.waves; i++) {
            var prog = ((t * h.opts.speed * 0.5) + i / h.opts.waves) % 1;
            var r = prog * maxR;
            c.strokeStyle = rgba(mixRgb(pal[0], pal[1] || pal[0], prog), (1 - prog) * 0.9);
            c.lineWidth = lerp(3, 0.5, prog);
            c.beginPath(); c.arc(cx, cy, r, 0, TAU()); c.stroke();
          }
          var pulse = 6 + Math.abs(Math.sin(t * h.opts.speed * 3)) * 10;
          var g = c.createRadialGradient(cx, cy, 0, cx, cy, pulse * 2);
          g.addColorStop(0, rgba(pal[0], 1)); g.addColorStop(1, rgba(pal[0], 0));
          c.fillStyle = g; c.beginPath(); c.arc(cx, cy, pulse * 2, 0, TAU()); c.fill();
        },
      };
    },
  });

  // 13. Gradient flow — animated mesh-gradient backdrop
  registerAnimation("gradient", {
    defaults: { speed: 1, colors: ["#7c5cff", "#22d3ee", "#f472b6", "#05060f"] },
    setup: function (h) {
      var pal;
      function build() { pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee", "#f472b6"]); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          var c = h.ctx; c.clearRect(0, 0, h.width, h.height);
          c.fillStyle = "#05060f"; c.fillRect(0, 0, h.width, h.height);
          c.globalCompositeOperation = "lighter";
          var n = pal.length;
          for (var i = 0; i < n; i++) {
            var ph = t * h.opts.speed * 0.4 + (i / n) * TAU();
            var x = h.width * (0.5 + 0.4 * Math.cos(ph * (1 + i * 0.2)));
            var y = h.height * (0.5 + 0.4 * Math.sin(ph * (1.2 + i * 0.15)));
            var rad = Math.max(h.width, h.height) * 0.6;
            var g = c.createRadialGradient(x, y, 0, x, y, rad);
            g.addColorStop(0, rgba(pal[i], 0.45)); g.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = g; c.fillRect(0, 0, h.width, h.height);
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // Helper: paint an opaque background once per frame
  function clearBG(h) {
    var c = h.ctx;
    c.clearRect(0, 0, h.width, h.height);
    c.fillStyle = rgba(hexToRgb(h.opts.background || "#05060f"), 1);
    c.fillRect(0, 0, h.width, h.height);
  }

  // 14. Fireflies — wandering glow that breathes
  registerAnimation("fireflies", {
    defaults: { count: 60, speed: 1, colors: ["#fff7ae", "#aef5c4", "#a8d8ff"], background: "#04060a", interactive: true },
    setup: function (h) {
      var ps, pal;
      function build() {
        pal = paletteOf(h.opts, ["#fff7ae"]);
        var n = Math.max(18, Math.round((h.opts.count * h.width * h.height) / (1280 * 720)));
        ps = [];
        for (var i = 0; i < n; i++) ps.push({ x: Math.random() * h.width, y: Math.random() * h.height, a: rand(0, TAU()), ph: rand(0, TAU()), sp: rand(0.3, 0.8), r: rand(1.4, 3), col: pal[(Math.random() * pal.length) | 0] });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.16); var c = h.ctx; c.globalCompositeOperation = "lighter";
          for (var i = 0; i < ps.length; i++) {
            var p = ps[i];
            p.a += rand(-0.4, 0.4);
            p.x += Math.cos(p.a) * p.sp * h.opts.speed * 30 * dt;
            p.y += Math.sin(p.a) * p.sp * h.opts.speed * 30 * dt;
            if (h.mouse.active) { var dx = p.x - h.mouse.x, dy = p.y - h.mouse.y, d = Math.hypot(dx, dy); if (d < 110 && d > 0.1) { p.x += (dx / d) * 1.2; p.y += (dy / d) * 1.2; } }
            if (p.x < 0) p.x = h.width; if (p.x > h.width) p.x = 0;
            if (p.y < 0) p.y = h.height; if (p.y > h.height) p.y = 0;
            var glow = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 2.2 + p.ph));
            var rad = p.r * 5;
            var g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
            g.addColorStop(0, rgba(p.col, 0.9 * glow)); g.addColorStop(1, rgba(p.col, 0));
            c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, rad, 0, TAU()); c.fill();
            c.fillStyle = rgba(p.col, glow); c.beginPath(); c.arc(p.x, p.y, p.r * 0.5, 0, TAU()); c.fill();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 15. Matrix — falling digital rain
  registerAnimation("matrix", {
    defaults: { speed: 1, colors: ["#34d399"], background: "#020509", font: 16, glyphs: "01" },
    setup: function (h) {
      var cols, size, drops, glyphs, col;
      function build() {
        col = hexToRgb((h.opts.colors && h.opts.colors[0]) || "#34d399");
        size = h.opts.font; glyphs = h.opts.glyphs || "01アカサタナハマヤラ0123456789";
        cols = Math.ceil(h.width / size);
        drops = [];
        for (var i = 0; i < cols; i++) drops.push({ y: rand(-h.height, 0), sp: rand(0.6, 1.5) });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          var c = h.ctx;
          c.fillStyle = rgba(hexToRgb(h.opts.background), 0.12);
          c.fillRect(0, 0, h.width, h.height);
          c.font = size + "px monospace"; c.textBaseline = "top";
          for (var i = 0; i < cols; i++) {
            var d = drops[i];
            var ch = glyphs[(Math.random() * glyphs.length) | 0];
            var x = i * size;
            c.fillStyle = rgba(col, 1); c.fillText(ch, x, d.y);
            c.fillStyle = rgba({ r: 220, g: 255, b: 230 }, 0.9); c.fillText(ch, x, d.y - size);
            d.y += d.sp * h.opts.speed * size * 0.9;
            if (d.y > h.height && Math.random() > 0.975) d.y = rand(-200, 0);
          }
        },
      };
    },
  });

  // 16. Plasma — smooth flowing color field (coarse-cell)
  registerAnimation("plasma", {
    defaults: { speed: 1, scale: 1, colors: ["#7c5cff", "#22d3ee", "#f472b6"] },
    setup: function (h) {
      var pal, cell;
      function build() { pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee", "#f472b6"]); cell = Math.max(10, 22 / (h.opts.scale || 1)); }
      build();
      function colorAt(v) {
        var n = pal.length, f = (v % 1 + 1) % 1, idx = Math.floor(f * n), nx = (idx + 1) % n;
        return mixRgb(pal[idx], pal[nx], f * n - idx);
      }
      return {
        resize: build,
        draw: function (t, dt) {
          var c = h.ctx, tt = t * h.opts.speed;
          for (var y = 0; y < h.height; y += cell) {
            for (var x = 0; x < h.width; x += cell) {
              var v = Math.sin(x * 0.012 + tt) + Math.sin(y * 0.014 + tt * 1.1) +
                Math.sin((x + y) * 0.009 + tt * 0.7) + Math.sin(Math.hypot(x - h.width / 2, y - h.height / 2) * 0.012 - tt);
              var col = colorAt((v + 4) / 8);
              c.fillStyle = rgba(col, 1);
              c.fillRect(x, y, cell + 1, cell + 1);
            }
          }
        },
      };
    },
  });

  // 17. Fireworks — launching shells that burst
  registerAnimation("fireworks", {
    defaults: { rate: 1, speed: 1, colors: ["#fbbf24", "#fb7185", "#7c5cff", "#22d3ee", "#34d399"], background: "#04040c", gravity: 0.12 },
    setup: function (h) {
      var rockets, sparks, pal, timer;
      function build() { pal = paletteOf(h.opts, ["#fbbf24", "#fb7185"]); rockets = []; sparks = []; timer = 0; }
      function launch() {
        rockets.push({ x: rand(h.width * 0.2, h.width * 0.8), y: h.height, vy: -rand(6, 9), col: pal[(Math.random() * pal.length) | 0], target: rand(h.height * 0.15, h.height * 0.5) });
      }
      function burst(x, y, col) {
        var n = 40 + (Math.random() * 30 | 0);
        for (var i = 0; i < n; i++) { var a = (i / n) * TAU(), sp = rand(1.5, 4.5); sparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, col: col }); }
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.22); var c = h.ctx; c.globalCompositeOperation = "lighter";
          timer -= dt; if (timer <= 0) { launch(); timer = rand(0.5, 1.1) / h.opts.rate; }
          for (var i = rockets.length - 1; i >= 0; i--) {
            var r = rockets[i]; r.y += r.vy * h.opts.speed; r.vy += 0.06;
            c.fillStyle = rgba(r.col, 1); c.beginPath(); c.arc(r.x, r.y, 2, 0, TAU()); c.fill();
            if (r.y <= r.target || r.vy >= 0) { burst(r.x, r.y, r.col); rockets.splice(i, 1); }
          }
          for (var j = sparks.length - 1; j >= 0; j--) {
            var s = sparks[j]; s.vx *= 0.985; s.vy = s.vy * 0.985 + h.opts.gravity;
            s.x += s.vx * h.opts.speed; s.y += s.vy * h.opts.speed; s.life -= dt * 0.55;
            if (s.life <= 0) { sparks.splice(j, 1); continue; }
            c.fillStyle = rgba(s.col, s.life); c.beginPath(); c.arc(s.x, s.y, 1.8 * s.life + 0.4, 0, TAU()); c.fill();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 18. Snow — drifting snowfall with wind
  registerAnimation("snow", {
    defaults: { count: 200, speed: 1, wind: 0.4, colors: ["#ffffff", "#dbeafe"], background: "#0a0f1f" },
    setup: function (h) {
      var flakes, pal;
      function build() {
        pal = paletteOf(h.opts, ["#ffffff"]);
        var n = Math.max(40, Math.round((h.opts.count * h.width * h.height) / (1280 * 720)));
        flakes = [];
        for (var i = 0; i < n; i++) flakes.push({ x: Math.random() * h.width, y: Math.random() * h.height, r: rand(1, 3.5), sp: rand(0.4, 1), sway: rand(0, TAU()), col: pal[(Math.random() * pal.length) | 0] });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx;
          for (var i = 0; i < flakes.length; i++) {
            var f = flakes[i];
            f.y += f.sp * f.r * h.opts.speed * 18 * dt;
            f.x += (Math.sin(t + f.sway) * h.opts.wind + h.opts.wind) * f.sp;
            if (f.y > h.height + 4) { f.y = -4; f.x = Math.random() * h.width; }
            if (f.x > h.width + 4) f.x = -4; if (f.x < -4) f.x = h.width + 4;
            c.fillStyle = rgba(f.col, 0.85); c.beginPath(); c.arc(f.x, f.y, f.r, 0, TAU()); c.fill();
          }
        },
      };
    },
  });

  // 19. Waves — layered ocean of sine waves
  registerAnimation("waves", {
    defaults: { layers: 4, speed: 1, amplitude: 26, colors: ["#0ea5e9", "#22d3ee", "#7c5cff", "#1e3a8a"], background: "#040814" },
    setup: function (h) {
      var pal;
      function build() { pal = paletteOf(h.opts, ["#0ea5e9", "#22d3ee"]); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx;
          for (var L = 0; L < h.opts.layers; L++) {
            var col = pal[L % pal.length];
            var prog = (L + 1) / (h.opts.layers + 1);
            var baseY = h.height * (0.35 + prog * 0.6);
            var amp = h.opts.amplitude * (1 + L * 0.35);
            var ph = t * h.opts.speed * (0.6 + L * 0.18);
            c.beginPath(); c.moveTo(0, h.height);
            for (var x = 0; x <= h.width; x += 10) {
              var y = baseY + Math.sin(x * 0.011 + ph) * amp + Math.sin(x * 0.021 + ph * 1.4) * amp * 0.4;
              c.lineTo(x, y);
            }
            c.lineTo(h.width, h.height); c.closePath();
            var grad = c.createLinearGradient(0, baseY - amp, 0, h.height);
            grad.addColorStop(0, rgba(col, 0.55)); grad.addColorStop(1, rgba(col, 0.12));
            c.fillStyle = grad; c.fill();
          }
        },
      };
    },
  });

  // 20. DNA — rotating double helix
  registerAnimation("dna", {
    defaults: { speed: 1, points: 36, colors: ["#22d3ee", "#f472b6", "#7c5cff"], background: "#05060f" },
    setup: function (h) {
      var cx, amp, pal;
      function build() { cx = h.width / 2; amp = Math.min(h.width, h.height) * 0.22; pal = paletteOf(h.opts, ["#22d3ee", "#f472b6"]); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx;
          var N = h.opts.points, rot = t * h.opts.speed * 1.4;
          for (var i = 0; i < N; i++) {
            var f = i / (N - 1);
            var y = f * h.height;
            var ang = f * 6.2 + rot;
            var xA = cx + Math.cos(ang) * amp, xB = cx - Math.cos(ang) * amp;
            var zA = Math.sin(ang), zB = -Math.sin(ang);
            var rA = 2 + (zA + 1) * 2, rB = 2 + (zB + 1) * 2;
            var cA = pal[0], cB = pal[1] || pal[0];
            if (i % 2 === 0) { c.strokeStyle = rgba(pal[2] || pal[0], 0.25); c.lineWidth = 1.5; c.beginPath(); c.moveTo(xA, y); c.lineTo(xB, y); c.stroke(); }
            c.fillStyle = rgba(cA, 0.4 + (zA + 1) * 0.3); c.beginPath(); c.arc(xA, y, rA, 0, TAU()); c.fill();
            c.fillStyle = rgba(cB, 0.4 + (zB + 1) * 0.3); c.beginPath(); c.arc(xB, y, rB, 0, TAU()); c.fill();
          }
        },
      };
    },
  });

  // 21. Lightning — branching bolts that flash
  registerAnimation("lightning", {
    defaults: { speed: 1, colors: ["#a5b4fc", "#e0e7ff", "#7c5cff"], background: "#04040c" },
    setup: function (h) {
      var bolt = null, life = 0, timer = 0, pal;
      function build() { pal = paletteOf(h.opts, ["#a5b4fc", "#e0e7ff"]); bolt = null; life = 0; timer = rand(0.3, 1.2); }
      build();
      function makeBolt() {
        var segs = [], x = rand(h.width * 0.2, h.width * 0.8), y = 0;
        function branch(sx, sy, sub) {
          var px = sx, py = sy;
          while (py < h.height) {
            var nx = px + rand(-26, 26), ny = py + rand(18, 44);
            segs.push({ x1: px, y1: py, x2: nx, y2: ny, w: sub ? 1 : 2.4 });
            if (!sub && Math.random() < 0.18) branch(px, py, true);
            px = nx; py = ny;
            if (sub && py > sy + rand(60, 160)) break;
          }
        }
        branch(x, y, false);
        return segs;
      }
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx;
          timer -= dt;
          if (timer <= 0 && !bolt) { bolt = makeBolt(); life = 1; timer = rand(0.4, 1.6) / h.opts.speed; }
          if (bolt) {
            life -= dt * 2.4;
            if (life <= 0) { bolt = null; }
            else {
              var flash = Math.min(0.12, life * 0.12);
              c.fillStyle = rgba(pal[0], flash); c.fillRect(0, 0, h.width, h.height);
              c.globalCompositeOperation = "lighter"; c.lineCap = "round";
              for (var i = 0; i < bolt.length; i++) {
                var s = bolt[i];
                c.strokeStyle = rgba(pal[1] || pal[0], life); c.lineWidth = s.w * 2.5;
                c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke();
                c.strokeStyle = rgba({ r: 255, g: 255, b: 255 }, life); c.lineWidth = s.w;
                c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke();
              }
              c.globalCompositeOperation = "source-over";
            }
          }
        },
      };
    },
  });

  // 22. Ripples — expanding concentric rings (auto + pointer)
  registerAnimation("ripples", {
    defaults: { speed: 1, colors: ["#22d3ee", "#7c5cff"], background: "#04060f", interactive: true },
    setup: function (h) {
      var rings, timer, pal;
      function build() { pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff"]); rings = []; timer = 0; }
      function spawn(x, y) { rings.push({ x: x, y: y, r: 0, max: rand(80, Math.min(h.width, h.height) * 0.5), col: pal[(Math.random() * pal.length) | 0] }); }
      build();
      var lastMouse = false;
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx;
          timer -= dt; if (timer <= 0) { spawn(rand(0, h.width), rand(0, h.height)); timer = rand(0.5, 1.4); }
          if (h.mouse.active && !lastMouse) spawn(h.mouse.x, h.mouse.y);
          lastMouse = h.mouse.active;
          for (var i = rings.length - 1; i >= 0; i--) {
            var r = rings[i]; r.r += h.opts.speed * 70 * dt;
            var a = 1 - r.r / r.max;
            if (a <= 0) { rings.splice(i, 1); continue; }
            c.strokeStyle = rgba(r.col, a * 0.8); c.lineWidth = 2 * a + 0.4;
            c.beginPath(); c.arc(r.x, r.y, r.r, 0, TAU()); c.stroke();
          }
        },
      };
    },
  });

  // 23. Comets — glowing comets with trailing tails
  registerAnimation("comets", {
    defaults: { count: 4, speed: 1, colors: ["#ffffff", "#a5c8ff", "#c9b8ff", "#ffd6a5"], background: "#04050d", stars: true },
    setup: function (h) {
      var comets, bg, pal;
      function mk() {
        var fromLeft = Math.random() < 0.5;
        var sp = rand(1.2, 2.4);
        return {
          x: fromLeft ? -40 : h.width + 40, y: rand(0, h.height * 0.7),
          vx: (fromLeft ? 1 : -1) * sp, vy: rand(0.2, 0.8) * sp,
          hist: [], size: rand(2.5, 5), col: pal[(Math.random() * pal.length) | 0],
        };
      }
      function build() {
        pal = paletteOf(h.opts, ["#ffffff", "#a5c8ff"]);
        comets = []; for (var i = 0; i < h.opts.count; i++) comets.push(mk());
        bg = []; if (h.opts.stars) for (var j = 0; j < 140; j++) bg.push({ x: Math.random() * h.width, y: Math.random() * h.height, r: rand(0.3, 1.2) });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.28); var c = h.ctx;
          for (var b = 0; b < bg.length; b++) { c.fillStyle = "rgba(255,255,255,0.45)"; c.beginPath(); c.arc(bg[b].x, bg[b].y, bg[b].r, 0, TAU()); c.fill(); }
          c.globalCompositeOperation = "lighter";
          for (var i = 0; i < comets.length; i++) {
            var m = comets[i];
            m.x += m.vx * h.opts.speed * 3.2; m.y += m.vy * h.opts.speed * 3.2;
            m.hist.push({ x: m.x, y: m.y }); if (m.hist.length > 26) m.hist.shift();
            if (m.x < -80 || m.x > h.width + 80 || m.y > h.height + 80) { comets[i] = mk(); continue; }
            for (var k = 0; k < m.hist.length; k++) {
              var p = m.hist[k], a = k / m.hist.length;
              c.fillStyle = rgba(m.col, a * 0.5); c.beginPath(); c.arc(p.x, p.y, m.size * a, 0, TAU()); c.fill();
            }
            var g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size * 4);
            g.addColorStop(0, rgba(m.col, 1)); g.addColorStop(1, rgba(m.col, 0));
            c.fillStyle = g; c.beginPath(); c.arc(m.x, m.y, m.size * 4, 0, TAU()); c.fill();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 24. Confetti — celebratory falling paper
  registerAnimation("confetti", {
    defaults: { rate: 1, speed: 1, gravity: 0.08, colors: ["#fbbf24", "#fb7185", "#7c5cff", "#22d3ee", "#34d399"], background: "#05060f" },
    setup: function (h) {
      var pieces, pal, acc;
      function build() { pal = paletteOf(h.opts, ["#fbbf24", "#fb7185"]); pieces = []; acc = 0; }
      function mk() { return { x: rand(0, h.width), y: -12, vx: rand(-0.6, 0.6), vy: rand(1, 3), rot: rand(0, TAU()), vr: rand(-0.25, 0.25), w: rand(5, 10), hh: rand(8, 14), col: pal[(Math.random() * pal.length) | 0], sway: rand(0, TAU()) }; }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx;
          acc += dt; var per = 0.028 / h.opts.rate;
          while (acc > per && pieces.length < 460) { pieces.push(mk()); acc -= per; }
          for (var i = pieces.length - 1; i >= 0; i--) {
            var p = pieces[i];
            p.vy += h.opts.gravity * dt * 6; p.y += p.vy * h.opts.speed;
            p.x += (p.vx + Math.sin(t * 2 + p.sway) * 0.7) * h.opts.speed; p.rot += p.vr;
            if (p.y > h.height + 20) { pieces.splice(i, 1); continue; }
            c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
            c.fillStyle = rgba(p.col, 1);
            c.fillRect(-p.w / 2, -p.hh / 2, p.w, p.hh * (0.55 + 0.45 * Math.abs(Math.cos(p.rot))));
            c.restore();
          }
        },
      };
    },
  });

  // 25. Bubbles — gentle rising bubbles
  registerAnimation("bubbles", {
    defaults: { count: 42, speed: 1, colors: ["#a8e6ff", "#7c5cff", "#34d399"], background: "#04121e" },
    setup: function (h) {
      var bs, pal;
      function mk(seed) { return { x: rand(0, h.width), y: seed ? rand(0, h.height) : h.height + 20, r: rand(5, 22), sp: rand(0.3, 1), wob: rand(0, TAU()), col: pal[(Math.random() * pal.length) | 0] }; }
      function build() { pal = paletteOf(h.opts, ["#a8e6ff"]); var n = Math.max(14, Math.round((h.opts.count * h.width * h.height) / (1280 * 720))); bs = []; for (var i = 0; i < n; i++) bs.push(mk(true)); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx;
          for (var i = 0; i < bs.length; i++) {
            var b = bs[i];
            b.y -= b.sp * h.opts.speed * 24 * dt * (1 + b.r * 0.02);
            b.x += Math.sin(t * 1.2 + b.wob) * 0.5;
            if (b.y < -b.r - 4) { bs[i] = mk(false); continue; }
            c.strokeStyle = rgba(b.col, 0.55); c.lineWidth = 1.4;
            c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU()); c.stroke();
            c.fillStyle = rgba(b.col, 0.08); c.fill();
            c.fillStyle = rgba({ r: 255, g: 255, b: 255 }, 0.5);
            c.beginPath(); c.arc(b.x - b.r * 0.32, b.y - b.r * 0.32, b.r * 0.18, 0, TAU()); c.fill();
          }
        },
      };
    },
  });

  // 26. Fog — drifting layered mist
  registerAnimation("fog", {
    defaults: { layers: 7, speed: 1, colors: ["#9fb3c8", "#5b6b82", "#c8d4e0"], background: "#0a0e16" },
    setup: function (h) {
      var blobs, pal;
      function build() {
        pal = paletteOf(h.opts, ["#9fb3c8", "#5b6b82"]);
        blobs = [];
        for (var i = 0; i < h.opts.layers; i++) blobs.push({ x: Math.random(), y: rand(0.2, 0.9), r: rand(0.4, 0.85), sp: rand(0.01, 0.04) * (Math.random() < 0.5 ? 1 : -1), col: pal[i % pal.length] });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx;
          var minDim = Math.max(h.width, h.height);
          for (var i = 0; i < blobs.length; i++) {
            var b = blobs[i];
            b.x += b.sp * h.opts.speed * dt;
            if (b.x > 1.3) b.x = -0.3; if (b.x < -0.3) b.x = 1.3;
            var px = b.x * h.width, py = (b.y + Math.sin(t * 0.3 + i) * 0.03) * h.height;
            var rad = b.r * minDim * 0.6;
            var g = c.createRadialGradient(px, py, 0, px, py, rad);
            g.addColorStop(0, rgba(b.col, 0.16)); g.addColorStop(1, rgba(b.col, 0));
            c.fillStyle = g; c.beginPath(); c.arc(px, py, rad, 0, TAU()); c.fill();
          }
        },
      };
    },
  });

  // 27. Grid — synthwave perspective floor
  registerAnimation("grid", {
    defaults: { speed: 1, lines: 16, colors: ["#f472b6", "#7c5cff"], background: "#0a0114" },
    setup: function (h) {
      var pal, cx, horizon;
      function build() { pal = paletteOf(h.opts, ["#f472b6", "#7c5cff"]); cx = h.width / 2; horizon = h.height * 0.42; }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx;
          // sun glow
          var g = c.createRadialGradient(cx, horizon, 0, cx, horizon, h.height * 0.4);
          g.addColorStop(0, rgba(pal[0], 0.35)); g.addColorStop(1, rgba(pal[0], 0));
          c.fillStyle = g; c.fillRect(0, 0, h.width, horizon + 20);
          c.shadowColor = rgba(pal[1] || pal[0], 0.8); c.shadowBlur = 8;
          c.strokeStyle = rgba(pal[1] || pal[0], 0.8); c.lineWidth = 1.4;
          var N = h.opts.lines, scroll = (t * h.opts.speed * 0.35) % 1;
          // horizontal receding lines
          for (var i = 0; i < N; i++) {
            var z = (i + scroll) / N;
            var y = horizon + (h.height - horizon) * (z * z);
            c.globalAlpha = z;
            c.beginPath(); c.moveTo(0, y); c.lineTo(h.width, y); c.stroke();
          }
          // converging verticals
          c.globalAlpha = 0.8;
          for (var v = -N; v <= N; v++) {
            var bx = cx + (v / N) * h.width;
            c.beginPath(); c.moveTo(cx, horizon); c.lineTo(bx, h.height); c.stroke();
          }
          c.globalAlpha = 1; c.shadowBlur = 0;
        },
      };
    },
  });

  // 28. Rain — angled rainfall
  registerAnimation("rain", {
    defaults: { count: 300, speed: 1, angle: 14, colors: ["#9bd0ff", "#cfe4ff"], background: "#070b14" },
    setup: function (h) {
      var drops, pal;
      function mk() { return { x: rand(-0.1, 1.1) * h.width, y: rand(-1, 1) * h.height, len: rand(10, 24), sp: rand(0.8, 1.6), col: pal[(Math.random() * pal.length) | 0] }; }
      function build() { pal = paletteOf(h.opts, ["#9bd0ff"]); var n = Math.max(80, Math.round((h.opts.count * h.width * h.height) / (1280 * 720))); drops = []; for (var i = 0; i < n; i++) drops.push(mk()); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.35); var c = h.ctx;
          var ang = (h.opts.angle * Math.PI) / 180, dx = Math.sin(ang), dy = Math.cos(ang);
          c.strokeStyle = rgba(pal[0], 0.5); c.lineWidth = 1.2;
          for (var i = 0; i < drops.length; i++) {
            var d = drops[i];
            var v = d.sp * h.opts.speed * 760 * dt;
            d.x += dx * v; d.y += dy * v;
            if (d.y > h.height + 10) { d.y = -10; d.x = rand(-0.1, 1.1) * h.width; }
            c.strokeStyle = rgba(d.col, 0.5);
            c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x - dx * d.len, d.y - dy * d.len); c.stroke();
          }
        },
      };
    },
  });

  // 29. Vortex — particles spiralling into the core
  registerAnimation("vortex", {
    defaults: { count: 240, speed: 1, colors: ["#7c5cff", "#22d3ee", "#f472b6"], background: "#04040c" },
    setup: function (h) {
      var ps, cx, cy, maxR, pal;
      function mk(seed) { return { a: rand(0, TAU()), r: seed ? Math.random() : 1, sp: rand(0.4, 1), col: pal[(Math.random() * pal.length) | 0] }; }
      function build() { pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee"]); cx = h.width / 2; cy = h.height / 2; maxR = Math.hypot(cx, cy); var n = Math.max(60, Math.round((h.opts.count * h.width * h.height) / (1280 * 720))); ps = []; for (var i = 0; i < n; i++) ps.push(mk(true)); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.2); var c = h.ctx;
          for (var i = 0; i < ps.length; i++) {
            var p = ps[i];
            p.r -= p.sp * h.opts.speed * dt * 0.22;
            p.a += (0.6 + (1 - p.r) * 2) * h.opts.speed * dt;
            if (p.r <= 0.02) { ps[i] = mk(false); continue; }
            var x = cx + Math.cos(p.a) * p.r * maxR, y = cy + Math.sin(p.a) * p.r * maxR;
            var sz = (1 - p.r) * 2.4 + 0.4;
            c.fillStyle = rgba(p.col, 0.4 + (1 - p.r) * 0.6);
            c.beginPath(); c.arc(x, y, sz, 0, TAU()); c.fill();
          }
        },
      };
    },
  });

  // 30. Sparkle — twinkling glints
  registerAnimation("sparkle", {
    defaults: { count: 54, speed: 1, colors: ["#ffffff", "#fff1c4", "#a8d8ff"], background: "#04050d" },
    setup: function (h) {
      var ps, pal;
      function mk() { return { x: rand(0, h.width), y: rand(0, h.height), life: rand(0, 1), dur: rand(0.8, 2.2), size: rand(4, 12), col: pal[(Math.random() * pal.length) | 0] }; }
      function build() { pal = paletteOf(h.opts, ["#ffffff"]); var n = Math.max(18, Math.round((h.opts.count * h.width * h.height) / (1280 * 720))); ps = []; for (var i = 0; i < n; i++) ps.push(mk()); }
      build();
      function glint(c, x, y, s, col, a) {
        c.strokeStyle = rgba(col, a); c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke();
        c.beginPath(); c.moveTo(x - s * 0.4, y - s * 0.4); c.lineTo(x + s * 0.4, y + s * 0.4); c.moveTo(x - s * 0.4, y + s * 0.4); c.lineTo(x + s * 0.4, y - s * 0.4); c.stroke();
      }
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; c.globalCompositeOperation = "lighter";
          for (var i = 0; i < ps.length; i++) {
            var p = ps[i];
            p.life += dt / p.dur * h.opts.speed;
            if (p.life >= 1) { ps[i] = mk(); ps[i].life = 0; continue; }
            var a = Math.sin(p.life * Math.PI);
            glint(c, p.x, p.y, p.size * a, p.col, a);
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 31. Tunnel — neon polygon tunnel
  registerAnimation("tunnel", {
    defaults: { rings: 20, sides: 6, speed: 1, colors: ["#22d3ee", "#f472b6", "#7c5cff"], background: "#03030b" },
    setup: function (h) {
      var cx, cy, pal;
      function build() { cx = h.width / 2; cy = h.height / 2; pal = paletteOf(h.opts, ["#22d3ee", "#f472b6"]); }
      build();
      function poly(c, r, rot, sides) {
        c.beginPath();
        for (var s = 0; s <= sides; s++) { var a = rot + (s / sides) * TAU(); var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.78; if (s === 0) c.moveTo(x, y); else c.lineTo(x, y); }
      }
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.28); var c = h.ctx;
          var maxR = Math.hypot(cx, cy);
          for (var i = 0; i < h.opts.rings; i++) {
            var prog = ((i / h.opts.rings) + (t * h.opts.speed * 0.12)) % 1;
            var r = prog * maxR;
            var col = mixRgb(pal[0], pal[1] || pal[0], prog);
            c.strokeStyle = rgba(col, (1 - prog) * 0.85); c.lineWidth = lerp(0.5, 3, 1 - prog);
            poly(c, r, t * 0.4 + prog * 2, h.opts.sides); c.stroke();
          }
        },
      };
    },
  });

  // 32. Swarm — flocking boids
  registerAnimation("swarm", {
    defaults: { count: 64, speed: 1, colors: ["#22d3ee", "#7c5cff"], background: "#05060f", interactive: true },
    setup: function (h) {
      var a, pal;
      function build() { pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff"]); var n = Math.min(90, Math.max(24, Math.round((h.opts.count * h.width * h.height) / (1280 * 720)))); a = []; for (var i = 0; i < n; i++) a.push({ x: Math.random() * h.width, y: Math.random() * h.height, vx: rand(-1, 1), vy: rand(-1, 1), col: pal[(Math.random() * pal.length) | 0] }); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.22); var c = h.ctx;
          var R = 60, R2 = R * R;
          for (var i = 0; i < a.length; i++) {
            var b = a[i], ax = 0, ay = 0, cxs = 0, cys = 0, sx = 0, sy = 0, cnt = 0;
            for (var j = 0; j < a.length; j++) {
              if (i === j) continue;
              var dx = a[j].x - b.x, dy = a[j].y - b.y, d2 = dx * dx + dy * dy;
              if (d2 < R2 && d2 > 0) { ax += a[j].vx; ay += a[j].vy; cxs += a[j].x; cys += a[j].y; if (d2 < 380) { sx -= dx; sy -= dy; } cnt++; }
            }
            if (cnt) {
              b.vx += (ax / cnt - b.vx) * 0.04 + (cxs / cnt - b.x) * 0.0008 + sx * 0.02;
              b.vy += (ay / cnt - b.vy) * 0.04 + (cys / cnt - b.y) * 0.0008 + sy * 0.02;
            }
            if (h.mouse.active) { var mx = h.mouse.x - b.x, my = h.mouse.y - b.y; b.vx += mx * 0.0012; b.vy += my * 0.0012; }
            var sp = Math.hypot(b.vx, b.vy), max = 2.4; if (sp > max) { b.vx = b.vx / sp * max; b.vy = b.vy / sp * max; }
            b.x += b.vx * h.opts.speed * 1.6; b.y += b.vy * h.opts.speed * 1.6;
            if (b.x < 0) b.x = h.width; if (b.x > h.width) b.x = 0; if (b.y < 0) b.y = h.height; if (b.y > h.height) b.y = 0;
            var ang = Math.atan2(b.vy, b.vx);
            c.fillStyle = rgba(b.col, 0.9); c.save(); c.translate(b.x, b.y); c.rotate(ang);
            c.beginPath(); c.moveTo(5, 0); c.lineTo(-4, 3); c.lineTo(-4, -3); c.closePath(); c.fill(); c.restore();
          }
        },
      };
    },
  });

  // 33. Ribbons — flowing silk
  registerAnimation("ribbons", {
    defaults: { count: 5, speed: 1, colors: ["#7c5cff", "#22d3ee", "#f472b6"], background: "#05060f" },
    setup: function (h) {
      var rb, pal;
      function build() {
        pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee"]);
        rb = [];
        for (var i = 0; i < h.opts.count; i++) rb.push({ y: (i + 1) / (h.opts.count + 1), amp: rand(0.06, 0.16), ph: rand(0, TAU()), sp: rand(0.4, 0.9), col: pal[i % pal.length], w: rand(8, 22) });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; c.globalCompositeOperation = "lighter"; c.lineCap = "round";
          for (var i = 0; i < rb.length; i++) {
            var r = rb[i], ph = t * h.opts.speed * r.sp + r.ph;
            for (var pass = 0; pass < 3; pass++) {
              c.beginPath();
              for (var x = 0; x <= h.width; x += 12) {
                var y = (r.y + Math.sin(x * 0.006 + ph) * r.amp + Math.sin(x * 0.013 + ph * 1.5) * r.amp * 0.5) * h.height;
                if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
              }
              c.strokeStyle = rgba(r.col, pass === 2 ? 0.5 : 0.16);
              c.lineWidth = r.w * (pass === 2 ? 0.4 : 1 + pass);
              c.stroke();
            }
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 34. Flowfield — particles following a noise flow field
  registerAnimation("flowfield", {
    defaults: { count: 600, speed: 1, scale: 1, colors: ["#7c5cff", "#22d3ee", "#f472b6"], background: "#05060f" },
    setup: function (h) {
      var ps, pal;
      function mk() { return { x: Math.random() * h.width, y: Math.random() * h.height, life: rand(0, 1), col: pal[(Math.random() * pal.length) | 0] }; }
      function build() { pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee"]); var n = Math.max(120, Math.round((h.opts.count * h.width * h.height) / (1280 * 720))); ps = []; for (var i = 0; i < n; i++) ps.push(mk()); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.06); var c = h.ctx; var s = 0.004 * (h.opts.scale || 1);
          for (var i = 0; i < ps.length; i++) {
            var p = ps[i];
            var ang = (Math.sin(p.x * s + t * 0.2) + Math.cos(p.y * s + t * 0.15) + Math.sin((p.x + p.y) * s * 0.6 - t * 0.1)) * Math.PI;
            var nx = p.x + Math.cos(ang) * h.opts.speed * 1.4, ny = p.y + Math.sin(ang) * h.opts.speed * 1.4;
            c.strokeStyle = rgba(p.col, 0.5); c.lineWidth = 1;
            c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(nx, ny); c.stroke();
            p.x = nx; p.y = ny; p.life -= dt * 0.12;
            if (p.life <= 0 || p.x < 0 || p.x > h.width || p.y < 0 || p.y > h.height) ps[i] = mk();
          }
        },
      };
    },
  });

  // 35. Globe — rotating dotted sphere
  registerAnimation("globe", {
    defaults: { count: 320, speed: 1, colors: ["#22d3ee", "#7c5cff"], background: "#05060f" },
    setup: function (h) {
      var pts, cx, cy, R, pal;
      function build() {
        pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff"]);
        cx = h.width / 2; cy = h.height / 2; R = Math.min(h.width, h.height) * 0.4;
        var n = h.opts.count; pts = [];
        var gold = Math.PI * (3 - Math.sqrt(5));
        for (var i = 0; i < n; i++) {
          var y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = gold * i;
          pts.push({ x: Math.cos(th) * r, y: y, z: Math.sin(th) * r, col: pal[(Math.random() * pal.length) | 0] });
        }
      }
      build();
      var tilt = 0.42, ct = Math.cos(tilt), st = Math.sin(tilt);
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; var a = t * h.opts.speed * 0.5, ca = Math.cos(a), sa = Math.sin(a);
          var halo = c.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.2);
          halo.addColorStop(0, rgba(pal[0], 0.08)); halo.addColorStop(1, rgba(pal[0], 0));
          c.fillStyle = halo; c.beginPath(); c.arc(cx, cy, R * 1.2, 0, TAU()); c.fill();
          for (var i = 0; i < pts.length; i++) {
            var p = pts[i];
            var x1 = p.x * ca + p.z * sa, z1 = -p.x * sa + p.z * ca;
            var y2 = p.y * ct - z1 * st, z2 = p.y * st + z1 * ct;
            var depth = (z2 + 1) / 2;
            var sx = cx + x1 * R, sy = cy + y2 * R;
            c.fillStyle = rgba(p.col, 0.15 + depth * 0.85);
            c.beginPath(); c.arc(sx, sy, 0.6 + depth * 1.8, 0, TAU()); c.fill();
          }
        },
      };
    },
  });

  // 36. Heartbeat — ECG monitor sweep
  registerAnimation("heartbeat", {
    defaults: { speed: 1, bpm: 1, colors: ["#34d399"], background: "#02100a" },
    setup: function (h) {
      var head, prevY, beatLen, col, gridCol;
      function build() { head = 0; beatLen = Math.max(160, h.width / 3); col = hexToRgb((h.opts.colors && h.opts.colors[0]) || "#34d399"); gridCol = mixRgb(hexToRgb(h.opts.background), col, 0.18); prevY = h.height / 2; }
      build();
      function ecg(p) {
        var v = 0;
        v += Math.exp(-Math.pow((p - 0.15) / 0.02, 2)) * 0.12;
        v -= Math.exp(-Math.pow((p - 0.27) / 0.008, 2)) * 0.16;
        v += Math.exp(-Math.pow((p - 0.30) / 0.007, 2)) * 1.0;
        v -= Math.exp(-Math.pow((p - 0.34) / 0.008, 2)) * 0.38;
        v += Math.exp(-Math.pow((p - 0.52) / 0.03, 2)) * 0.22;
        return v;
      }
      return {
        resize: build,
        draw: function (t, dt) {
          var c = h.ctx, baseY = h.height / 2, amp = h.height * 0.32;
          var step = h.opts.speed * h.opts.bpm * 260 * dt;
          var prevHead = head;
          head += step; if (head > h.width) { head -= h.width; prevHead = 0; c.fillStyle = rgba(hexToRgb(h.opts.background), 1); c.fillRect(0, 0, h.width, h.height); }
          // erase ahead
          c.fillStyle = rgba(hexToRgb(h.opts.background), 1); c.fillRect(head, 0, 26, h.height);
          // baseline grid tick
          c.strokeStyle = rgba(gridCol, 1); c.lineWidth = 1; c.beginPath(); c.moveTo(prevHead, baseY); c.lineTo(head, baseY); c.stroke();
          var p = (head % beatLen) / beatLen;
          var y = baseY - ecg(p) * amp;
          c.strokeStyle = rgba(col, 1); c.lineWidth = 2; c.shadowColor = rgba(col, 0.9); c.shadowBlur = 8;
          c.beginPath(); c.moveTo(prevHead, prevY); c.lineTo(head, y); c.stroke(); c.shadowBlur = 0;
          prevY = y;
        },
      };
    },
  });

  // 37. Equalizer — audio frequency bars
  registerAnimation("equalizer", {
    defaults: { bars: 32, speed: 1, colors: ["#7c5cff", "#22d3ee", "#34d399"], background: "#05060f" },
    setup: function (h) {
      var seeds, pal;
      function build() { pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee"]); seeds = []; for (var i = 0; i < h.opts.bars; i++) seeds.push({ f1: rand(1, 3), f2: rand(3, 7), ph: rand(0, TAU()) }); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx;
          var n = h.opts.bars, gap = 3, bw = (h.width - gap * (n + 1)) / n, base = h.height * 0.92;
          for (var i = 0; i < n; i++) {
            var s = seeds[i], tt = t * h.opts.speed;
            var val = 0.15 + 0.42 * (0.5 + 0.5 * Math.sin(tt * s.f1 + s.ph)) + 0.42 * (0.5 + 0.5 * Math.sin(tt * s.f2 + s.ph * 1.7));
            val = clamp(val, 0.04, 1);
            var hgt = val * h.height * 0.8, x = gap + i * (bw + gap);
            var col = mixRgb(pal[0], pal[pal.length - 1], i / n);
            var g = c.createLinearGradient(0, base, 0, base - hgt);
            g.addColorStop(0, rgba(col, 0.5)); g.addColorStop(1, rgba(col, 1));
            c.fillStyle = g; c.fillRect(x, base - hgt, bw, hgt);
            c.fillStyle = rgba(col, 0.14); c.fillRect(x, base + 2, bw, hgt * 0.4);
          }
        },
      };
    },
  });

  // 38. Clock — luminous analog clock (real time)
  registerAnimation("clock", {
    defaults: { speed: 1, colors: ["#22d3ee", "#7c5cff", "#f472b6"], background: "#05060f" },
    setup: function (h) {
      var cx, cy, R, pal;
      function build() { cx = h.width / 2; cy = h.height / 2; R = Math.min(h.width, h.height) * 0.42; pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff", "#f472b6"]); }
      build();
      function hand(c, ang, len, w, col) {
        c.strokeStyle = rgba(col, 1); c.lineWidth = w; c.lineCap = "round"; c.shadowColor = rgba(col, 0.8); c.shadowBlur = 8;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len); c.stroke(); c.shadowBlur = 0;
      }
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx;
          c.strokeStyle = rgba(pal[0], 0.3); c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R, 0, TAU()); c.stroke();
          for (var i = 0; i < 60; i++) {
            var a = (i / 60) * TAU() - Math.PI / 2, big = i % 5 === 0;
            var r1 = R * (big ? 0.88 : 0.94), r2 = R * 0.99;
            c.strokeStyle = rgba(big ? pal[1] || pal[0] : pal[0], big ? 0.9 : 0.4); c.lineWidth = big ? 2.5 : 1;
            c.beginPath(); c.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); c.stroke();
          }
          var d = new Date(), ms = d.getMilliseconds() / 1000;
          var sec = (d.getSeconds() + ms) / 60, min = (d.getMinutes() + sec) / 60, hr = ((d.getHours() % 12) + min) / 12;
          hand(c, hr * TAU() - Math.PI / 2, R * 0.5, 5, pal[1] || pal[0]);
          hand(c, min * TAU() - Math.PI / 2, R * 0.72, 3.5, pal[0]);
          hand(c, sec * TAU() - Math.PI / 2, R * 0.84, 1.6, pal[2] || pal[0]);
          c.fillStyle = rgba(pal[2] || pal[0], 1); c.beginPath(); c.arc(cx, cy, 5, 0, TAU()); c.fill();
        },
      };
    },
  });

  // 39. Rays — rotating volumetric light rays
  registerAnimation("rays", {
    defaults: { count: 14, speed: 1, colors: ["#ffd166", "#f472b6", "#7c5cff"], background: "#070317" },
    setup: function (h) {
      var cx, cy, pal;
      function build() { cx = h.width / 2; cy = h.height * 0.3; pal = paletteOf(h.opts, ["#ffd166", "#f472b6"]); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; c.globalCompositeOperation = "lighter";
          var maxR = Math.hypot(h.width, h.height), n = h.opts.count, rot = t * h.opts.speed * 0.2;
          for (var i = 0; i < n; i++) {
            var a = (i / n) * TAU() + rot, span = (TAU() / n) * 0.45;
            var col = mixRgb(pal[0], pal[1] || pal[0], (Math.sin(t + i) + 1) / 2);
            c.beginPath(); c.moveTo(cx, cy);
            c.lineTo(cx + Math.cos(a - span) * maxR, cy + Math.sin(a - span) * maxR);
            c.lineTo(cx + Math.cos(a + span) * maxR, cy + Math.sin(a + span) * maxR);
            c.closePath();
            var g = c.createRadialGradient(cx, cy, 0, cx, cy, maxR);
            g.addColorStop(0, rgba(col, 0.16)); g.addColorStop(1, rgba(col, 0));
            c.fillStyle = g; c.fill();
          }
          var core = c.createRadialGradient(cx, cy, 0, cx, cy, 70);
          core.addColorStop(0, rgba(pal[0], 0.7)); core.addColorStop(1, rgba(pal[0], 0));
          c.fillStyle = core; c.beginPath(); c.arc(cx, cy, 70, 0, TAU()); c.fill();
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 40. Radar — sweeping radar with blips
  registerAnimation("radar", {
    defaults: { speed: 1, blips: 7, colors: ["#34d399", "#22d3ee"], background: "#02110c" },
    setup: function (h) {
      var cx, cy, R, blips, pal;
      function build() {
        cx = h.width / 2; cy = h.height / 2; R = Math.min(h.width, h.height) * 0.46; pal = paletteOf(h.opts, ["#34d399"]);
        blips = []; for (var i = 0; i < h.opts.blips; i++) blips.push({ a: rand(0, TAU()), r: rand(0.2, 0.95) * R, seen: 0 });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; var col = pal[0], col2 = pal[1] || pal[0];
          c.strokeStyle = rgba(col, 0.25); c.lineWidth = 1;
          for (var k = 1; k <= 4; k++) { c.beginPath(); c.arc(cx, cy, R * k / 4, 0, TAU()); c.stroke(); }
          c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke();
          var sweep = (t * h.opts.speed * 0.7) % TAU();
          var g = c.createLinearGradient(cx, cy, cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
          g.addColorStop(0, rgba(col, 0.45)); g.addColorStop(1, rgba(col, 0));
          c.fillStyle = g; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, sweep - 0.5, sweep); c.closePath(); c.fill();
          for (var i = 0; i < blips.length; i++) {
            var b = blips[i], diff = Math.abs(((sweep - b.a + Math.PI * 3) % TAU()) - Math.PI);
            if (diff > Math.PI - 0.12) b.seen = 1;
            b.seen = Math.max(0, b.seen - dt * 0.4);
            if (b.seen > 0.01) { c.fillStyle = rgba(col2, b.seen); c.beginPath(); c.arc(cx + Math.cos(b.a) * b.r, cy + Math.sin(b.a) * b.r, 3 + b.seen * 2, 0, TAU()); c.fill(); }
          }
        },
      };
    },
  });

  // 41. Embers — rising fire sparks
  registerAnimation("embers", {
    defaults: { count: 120, speed: 1, colors: ["#fbbf24", "#fb7185", "#f59e0b"], background: "#0a0402" },
    setup: function (h) {
      var ps, pal;
      function mk(seed) { return { x: rand(h.width * 0.2, h.width * 0.8), y: seed ? rand(0, h.height) : h.height + 6, vy: rand(0.4, 1.2), drift: rand(0, TAU()), r: rand(1, 3), life: rand(0.5, 1), col: pal[(Math.random() * pal.length) | 0] }; }
      function build() { pal = paletteOf(h.opts, ["#fbbf24", "#fb7185"]); var n = Math.max(40, Math.round((h.opts.count * h.width * h.height) / (1280 * 720))); ps = []; for (var i = 0; i < n; i++) ps.push(mk(true)); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.16); var c = h.ctx; c.globalCompositeOperation = "lighter";
          for (var i = 0; i < ps.length; i++) {
            var p = ps[i];
            p.y -= p.vy * h.opts.speed * 36 * dt; p.x += Math.sin(t * 2 + p.drift) * 0.6;
            p.life -= dt * 0.18;
            if (p.y < -6 || p.life <= 0) { ps[i] = mk(false); continue; }
            var flick = 0.5 + 0.5 * Math.sin(t * 12 + p.drift);
            var g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
            g.addColorStop(0, rgba(p.col, p.life * (0.6 + flick * 0.4))); g.addColorStop(1, rgba(p.col, 0));
            c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r * 4, 0, TAU()); c.fill();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 42. Typewriter — typing text effect
  registerAnimation("typewriter", {
    defaults: { speed: 1, text: ["Hello, universe", "Build with GalaxyJS", "One line of code"], colors: ["#eef1ff", "#7c5cff"], background: "#05060f", font: 0 },
    setup: function (h) {
      var phrases, idx, count, mode, timer, blink, col, cur, fontSize;
      function build() {
        phrases = Array.isArray(h.opts.text) ? h.opts.text : [String(h.opts.text)];
        idx = 0; count = 0; mode = "type"; timer = 0; blink = 0;
        col = hexToRgb((h.opts.colors && h.opts.colors[0]) || "#eef1ff");
        cur = hexToRgb((h.opts.colors && h.opts.colors[1]) || "#7c5cff");
        fontSize = h.opts.font || Math.max(18, Math.min(h.width / 11, 52));
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx;
          blink += dt;
          timer -= dt;
          var phrase = phrases[idx];
          if (timer <= 0) {
            if (mode === "type") { count++; timer = 0.07 / h.opts.speed; if (count >= phrase.length) { mode = "hold"; timer = 1.4; } }
            else if (mode === "hold") { mode = "erase"; timer = 0.5; }
            else { count--; timer = 0.03 / h.opts.speed; if (count <= 0) { mode = "type"; idx = (idx + 1) % phrases.length; timer = 0.3; } }
          }
          var shown = phrase.slice(0, Math.max(0, count));
          c.font = "700 " + fontSize + "px " + (typeof h.opts.fontFamily === "string" ? h.opts.fontFamily : "Inter, system-ui, sans-serif");
          c.textBaseline = "middle";
          var w = c.measureText(shown).width;
          var x = h.width / 2 - w / 2, y = h.height / 2;
          c.fillStyle = rgba(col, 1); c.textAlign = "left"; c.fillText(shown, x, y);
          if ((blink % 1) < 0.5) { c.fillStyle = rgba(cur, 1); c.fillRect(x + w + 3, y - fontSize * 0.45, fontSize * 0.12, fontSize * 0.9); }
        },
      };
    },
  });

  // 43. Spirograph — evolving hypotrochoid curves
  registerAnimation("spirograph", {
    defaults: { speed: 1, colors: ["#7c5cff", "#22d3ee", "#f472b6"], background: "#05060f" },
    setup: function (h) {
      var cx, cy, scale, theta, prev, pal, R, r, d, hue, morph;
      function reset() { R = rand(0.6, 1); r = rand(0.12, 0.42); d = rand(0.3, 0.9); theta = 0; prev = null; morph = rand(8, 16); }
      function build() { cx = h.width / 2; cy = h.height / 2; scale = Math.min(h.width, h.height) * 0.32; pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee", "#f472b6"]); hue = 0; reset(); }
      build();
      function pt(th) {
        var k = (R - r) / r;
        return { x: cx + ((R - r) * Math.cos(th) + d * r * Math.cos(k * th)) * scale, y: cy + ((R - r) * Math.sin(th) - d * r * Math.sin(k * th)) * scale };
      }
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.035); var c = h.ctx;
          var steps = 7;
          for (var i = 0; i < steps; i++) {
            theta += 0.06 * h.opts.speed; hue += 0.0016;
            var p = pt(theta);
            if (prev) {
              var col = mixRgb(pal[Math.floor(hue) % pal.length], pal[(Math.floor(hue) + 1) % pal.length], hue % 1);
              c.strokeStyle = rgba(col, 0.8); c.lineWidth = 1.4;
              c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(p.x, p.y); c.stroke();
            }
            prev = p;
            if (theta > morph * TAU()) reset();
          }
        },
      };
    },
  });

  /* ============================================================
   * UI Components
   * ========================================================== */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // --- Toast ---
  var toastRegions = {};
  function toast(message, options) {
    options = options || {};
    var pos = options.position || "top-right";
    var region = toastRegions[pos];
    if (!region) {
      region = el("div", "gx-toast-region");
      region.setAttribute("data-pos", pos);
      document.body.appendChild(region);
      toastRegions[pos] = region;
    }
    var t = el("div", "gx-toast" + (options.type ? " gx-toast--" + options.type : ""));
    t.innerHTML = (options.icon ? '<span class="gx-toast__icon">' + options.icon + "</span>" : "") +
      '<span class="gx-toast__msg">' + message + "</span>";
    region.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("is-open"); });
    var dur = options.duration == null ? 3200 : options.duration;
    var timer;
    function close() {
      t.classList.remove("is-open");
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
    }
    if (dur > 0) timer = setTimeout(close, dur);
    t.addEventListener("click", function () { clearTimeout(timer); close(); });
    return { close: close };
  }

  // --- Modal ---
  function modal(options) {
    options = options || {};
    var backdrop = el("div", "gx-modal-backdrop");
    var box = el("div", "gx-modal");
    var closable = options.closable !== false;
    var inner = "";
    if (closable) inner += '<button class="gx-btn gx-btn--subtle gx-btn--icon gx-modal__close" aria-label="Close">✕</button>';
    if (options.title) inner += '<h3 class="gx-modal__title">' + options.title + "</h3>";
    inner += '<div class="gx-modal__body">' + (options.html || options.body || "") + "</div>";
    box.innerHTML = inner;
    if (options.actions && options.actions.length) {
      var footer = el("div", "gx-modal__footer");
      options.actions.forEach(function (a) {
        var b = el("button", "gx-btn " + (a.variant ? "gx-btn--" + a.variant : "gx-btn--ghost"), a.label);
        b.addEventListener("click", function () {
          if (a.onClick) a.onClick();
          if (a.close !== false) close();
        });
        footer.appendChild(b);
      });
      box.appendChild(footer);
    }
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add("is-open"); });

    function close() {
      backdrop.classList.remove("is-open");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, 320);
      if (options.onClose) options.onClose();
    }
    function onKey(e) { if (e.key === "Escape" && closable) close(); }
    if (closable) {
      document.addEventListener("keydown", onKey);
      backdrop.addEventListener("click", function (e) { if (e.target === backdrop) close(); });
      var x = box.querySelector(".gx-modal__close");
      if (x) x.addEventListener("click", close);
    }
    return { close: close, el: box };
  }

  function confirm(message, options) {
    options = options || {};
    return new Promise(function (res) {
      modal({
        title: options.title || "Confirm",
        body: message,
        closable: true,
        onClose: function () { res(false); },
        actions: [
          { label: options.cancelLabel || "Cancel", variant: "ghost", onClick: function () { res(false); } },
          { label: options.okLabel || "OK", variant: "primary", onClick: function () { res(true); } },
        ],
      });
    });
  }

  // --- Tooltip ---
  var activeTip = null;
  function bindTooltip(node) {
    function show() {
      hideTip();
      var tip = el("div", "gx-tooltip", node.getAttribute("data-gx-tooltip"));
      document.body.appendChild(tip);
      var r = node.getBoundingClientRect();
      var tr = tip.getBoundingClientRect();
      var pos = node.getAttribute("data-gx-tooltip-pos") || "top";
      var x = r.left + r.width / 2 - tr.width / 2, y = r.top - tr.height - 8;
      if (pos === "bottom") y = r.bottom + 8;
      if (pos === "left") { x = r.left - tr.width - 8; y = r.top + r.height / 2 - tr.height / 2; }
      if (pos === "right") { x = r.right + 8; y = r.top + r.height / 2 - tr.height / 2; }
      tip.style.left = clamp(x, 4, window.innerWidth - tr.width - 4) + "px";
      tip.style.top = Math.max(4, y) + "px";
      requestAnimationFrame(function () { tip.classList.add("is-open"); });
      activeTip = tip;
    }
    node.addEventListener("mouseenter", show);
    node.addEventListener("focus", show);
    node.addEventListener("mouseleave", hideTip);
    node.addEventListener("blur", hideTip);
  }
  function hideTip() {
    if (activeTip) { var t = activeTip; activeTip = null; t.classList.remove("is-open"); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 180); }
  }

  // --- Tabs ---
  function bindTabs(root) {
    var list = root.querySelector(".gx-tabs__list");
    if (!list) return;
    var tabs = [].slice.call(root.querySelectorAll(".gx-tab"));
    var panels = [].slice.call(root.querySelectorAll(".gx-tab-panel"));
    var indicator = list.querySelector(".gx-tabs__indicator") || el("div", "gx-tabs__indicator");
    if (!indicator.parentNode) list.appendChild(indicator);
    function select(i) {
      tabs.forEach(function (tb, j) {
        tb.setAttribute("aria-selected", j === i ? "true" : "false");
        if (panels[j]) panels[j].hidden = j !== i;
      });
      var tb = tabs[i];
      indicator.style.width = tb.offsetWidth + "px";
      indicator.style.transform = "translateX(" + tb.offsetLeft + "px)";
    }
    tabs.forEach(function (tb, i) { tb.addEventListener("click", function () { select(i); }); });
    var init = tabs.findIndex(function (tb) { return tb.getAttribute("aria-selected") === "true"; });
    select(init < 0 ? 0 : init);
  }

  // --- Accordion ---
  function bindAccordion(root) {
    var single = root.getAttribute("data-gx-accordion") !== "multi";
    var items = [].slice.call(root.querySelectorAll(".gx-accordion__item"));
    items.forEach(function (item) {
      var header = item.querySelector(".gx-accordion__header");
      var panel = item.querySelector(".gx-accordion__panel");
      if (!header || !panel) return;
      header.addEventListener("click", function () {
        var open = item.classList.contains("is-open");
        if (single) items.forEach(function (it) { it.classList.remove("is-open"); var p = it.querySelector(".gx-accordion__panel"); if (p) p.style.maxHeight = null; });
        if (!open) { item.classList.add("is-open"); panel.style.maxHeight = panel.scrollHeight + "px"; }
        else { item.classList.remove("is-open"); panel.style.maxHeight = null; }
      });
    });
  }

  // --- Dropdown ---
  function bindDropdown(root) {
    var trigger = root.querySelector("[data-gx-dropdown-trigger]") || root.querySelector(".gx-btn");
    if (!trigger) return;
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      root.classList.toggle("is-open");
    });
    document.addEventListener("click", function () { root.classList.remove("is-open"); });
  }

  // --- Ripple ---
  function bindRipple(node) {
    node.addEventListener("click", function (e) {
      var r = node.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      var ink = el("span", "gx-ripple");
      ink.style.width = ink.style.height = size + "px";
      ink.style.left = (e.clientX - r.left - size / 2) + "px";
      ink.style.top = (e.clientY - r.top - size / 2) + "px";
      node.appendChild(ink);
      setTimeout(function () { if (ink.parentNode) ink.parentNode.removeChild(ink); }, 650);
    });
  }

  // --- Spotlight cards ---
  function bindSpotlight(node) {
    node.addEventListener("pointermove", function (e) {
      var r = node.getBoundingClientRect();
      node.style.setProperty("--gx-mx", (e.clientX - r.left) + "px");
      node.style.setProperty("--gx-my", (e.clientY - r.top) + "px");
    });
  }

  // --- Scroll reveal ---
  function bindReveal(nodes) {
    if (typeof IntersectionObserver === "undefined") {
      nodes.forEach(function (n) { n.classList.add("is-visible"); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var delay = en.target.getAttribute("data-gx-reveal-delay");
          if (delay) en.target.style.transitionDelay = delay + "ms";
          en.target.classList.add("is-visible");
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    nodes.forEach(function (n) { obs.observe(n); });
  }

  // --- Segmented control ---
  function bindSegmented(root) {
    var opts = [].slice.call(root.querySelectorAll(".gx-segmented__option"));
    function select(i) {
      opts.forEach(function (o, j) {
        o.setAttribute("aria-checked", j === i ? "true" : "false");
        var panelSel = o.getAttribute("data-gx-target");
        if (panelSel) { var panel = document.querySelector(panelSel); if (panel) panel.hidden = j !== i; }
      });
      emit(root, "gx:change", { index: i, value: opts[i].textContent });
    }
    opts.forEach(function (o, i) { o.addEventListener("click", function () { select(i); }); });
    var init = opts.findIndex(function (o) { return o.getAttribute("aria-checked") === "true"; });
    if (opts.length) select(init < 0 ? 0 : init);
  }

  // --- Popover (click toggle) ---
  function bindPopover(node) {
    var sel = node.getAttribute("data-gx-popover-target");
    var pop = sel ? document.querySelector(sel) : node.nextElementSibling;
    if (!pop || !pop.classList.contains("gx-popover")) return;
    var host = node.parentNode;
    if (window.getComputedStyle(host).position === "static") host.style.position = "relative";
    node.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = pop.classList.toggle("is-open");
      if (open) {
        var others = document.querySelectorAll(".gx-popover.is-open");
        [].forEach.call(others, function (p) { if (p !== pop) p.classList.remove("is-open"); });
      }
    });
    document.addEventListener("click", function (e) { if (!pop.contains(e.target) && e.target !== node) pop.classList.remove("is-open"); });
  }

  // --- Rating (interactive stars) ---
  function bindRating(root) {
    var max = parseInt(root.getAttribute("data-gx-rating") || "5", 10);
    var value = parseInt(root.getAttribute("data-gx-value") || "0", 10);
    var stars = [];
    root.innerHTML = "";
    for (var i = 1; i <= max; i++) {
      var s = el("span", "gx-rating__star", "★");
      s.dataset.v = i; root.appendChild(s); stars.push(s);
    }
    function paint(v) { stars.forEach(function (s, i) { s.classList.toggle("is-active", i < v); }); }
    paint(value);
    root.addEventListener("mousemove", function (e) { if (e.target.dataset.v) paint(+e.target.dataset.v); });
    root.addEventListener("mouseleave", function () { paint(value); });
    root.addEventListener("click", function (e) {
      if (e.target.dataset.v) { value = +e.target.dataset.v; paint(value); root.setAttribute("data-gx-value", value); emit(root, "gx:change", { value: value }); }
    });
  }

  // --- Copy to clipboard ---
  function bindCopy(node) {
    node.addEventListener("click", function () {
      var text = node.getAttribute("data-gx-copy");
      if (!text) { var sel = node.getAttribute("data-gx-copy-target"); var t = sel && document.querySelector(sel); text = t ? (t.value != null ? t.value : t.textContent) : ""; }
      if (navigator.clipboard) navigator.clipboard.writeText(text);
      toast(node.getAttribute("data-gx-copy-msg") || "Copied to clipboard", { type: "success", duration: 1600 });
    });
  }

  // --- Chip remove (event delegation, bound once) ---
  var chipDelegated = false;
  function bindChipRemoval() {
    if (chipDelegated || !hasDOM) return; chipDelegated = true;
    document.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest(".gx-chip__close");
      if (btn) { var chip = btn.closest(".gx-chip"); if (chip) chip.parentNode && chip.parentNode.removeChild(chip); }
    });
  }

  // --- Drawer ---
  function drawer(options) {
    options = options || {};
    var side = options.side || "right";
    var backdrop = el("div", "gx-drawer-backdrop");
    var panel = el("div", "gx-drawer gx-drawer--" + side);
    var inner = "";
    if (options.title) inner += '<h3 class="gx-modal__title" style="margin:0">' + options.title + "</h3>";
    inner += '<div class="gx-drawer__body" style="flex:1;overflow:auto;color:var(--gx-text-soft)">' + (options.html || options.body || "") + "</div>";
    panel.innerHTML = inner;
    if (options.actions && options.actions.length) {
      var footer = el("div", "gx-row");
      options.actions.forEach(function (a) {
        var b = el("button", "gx-btn " + (a.variant ? "gx-btn--" + a.variant : "gx-btn--ghost"), a.label);
        b.addEventListener("click", function () { if (a.onClick) a.onClick(); if (a.close !== false) close(); });
        footer.appendChild(b);
      });
      panel.appendChild(footer);
    }
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add("is-open"); });
    function close() {
      backdrop.classList.remove("is-open");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, 320);
      if (options.onClose) options.onClose();
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) close(); });
    return { close: close, el: panel };
  }

  /* ============================================================
   * Theming
   * ========================================================== */
  function theme(value) {
    if (!hasDOM) return;
    if (typeof value === "string") {
      document.documentElement.setAttribute("data-galaxy-theme", value);
    } else if (value && typeof value === "object") {
      var root = document.documentElement;
      Object.keys(value).forEach(function (k) {
        var name = k.indexOf("--") === 0 ? k : "--gx-" + k.replace(/[A-Z]/g, function (m) { return "-" + m.toLowerCase(); });
        root.style.setProperty(name, value[k]);
      });
    }
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-galaxy-theme") || "dark";
    theme(cur === "dark" ? "light" : "dark");
    return document.documentElement.getAttribute("data-galaxy-theme");
  }

  /* ============================================================
   * Auto-init (declarative usage via data-attributes)
   * ========================================================== */
  function parseValue(v) {
    if (v === "true") return true;
    if (v === "false") return false;
    if (v !== "" && !isNaN(Number(v))) return Number(v);
    if (v.indexOf(",") >= 0) return v.split(",").map(function (s) { return s.trim(); });
    return v;
  }
  function dataOptions(node, prefix) {
    var opts = {};
    [].forEach.call(node.attributes, function (attr) {
      if (attr.name.indexOf(prefix) === 0 && attr.name !== prefix) {
        var key = attr.name.slice(prefix.length + 1).replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
        opts[key] = parseValue(attr.value);
      }
    });
    return opts;
  }

  var mounted = [];
  function autoInit(scope) {
    if (!hasDOM) return;
    scope = scope || document;
    // Animations: <div data-galaxy="nebula" data-galaxy-speed="1.5">
    [].forEach.call(scope.querySelectorAll("[data-galaxy]"), function (node) {
      if (node.__gxMounted) return;
      var type = node.getAttribute("data-galaxy");
      if (!animations[type]) return;
      node.__gxMounted = true;
      mounted.push(mountAnimation(type, node, dataOptions(node, "data-galaxy")));
    });
    // Components
    [].forEach.call(scope.querySelectorAll("[data-gx-tooltip]"), bindTooltip);
    [].forEach.call(scope.querySelectorAll("[data-gx-tabs]"), bindTabs);
    [].forEach.call(scope.querySelectorAll("[data-gx-accordion]"), bindAccordion);
    [].forEach.call(scope.querySelectorAll("[data-gx-dropdown]"), bindDropdown);
    [].forEach.call(scope.querySelectorAll("[data-gx-ripple], .gx-btn"), bindRipple);
    [].forEach.call(scope.querySelectorAll(".gx-card--spotlight"), bindSpotlight);
    [].forEach.call(scope.querySelectorAll("[data-gx-segmented]"), bindSegmented);
    [].forEach.call(scope.querySelectorAll("[data-gx-popover]"), bindPopover);
    [].forEach.call(scope.querySelectorAll("[data-gx-rating]"), bindRating);
    [].forEach.call(scope.querySelectorAll("[data-gx-copy], [data-gx-copy-target]"), bindCopy);
    bindChipRemoval();
    var reveals = [].slice.call(scope.querySelectorAll(".gx-reveal, [data-gx-reveal]"));
    if (reveals.length) bindReveal(reveals);
    // Modal triggers: <button data-gx-modal-target="#tpl">
    [].forEach.call(scope.querySelectorAll("[data-gx-modal-target]"), function (node) {
      if (node.__gxBound) return; node.__gxBound = true;
      node.addEventListener("click", function () {
        var tpl = document.querySelector(node.getAttribute("data-gx-modal-target"));
        modal({ title: node.getAttribute("data-gx-modal-title") || "", html: tpl ? tpl.innerHTML : "" });
      });
    });
    // Drawer triggers: <button data-gx-drawer-target="#tpl" data-gx-drawer-side="right">
    [].forEach.call(scope.querySelectorAll("[data-gx-drawer-target]"), function (node) {
      if (node.__gxBound) return; node.__gxBound = true;
      node.addEventListener("click", function () {
        var tpl = document.querySelector(node.getAttribute("data-gx-drawer-target"));
        drawer({ title: node.getAttribute("data-gx-drawer-title") || "", side: node.getAttribute("data-gx-drawer-side") || "right", html: tpl ? tpl.innerHTML : "" });
      });
    });
  }

  if (hasDOM) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { autoInit(document); });
    } else {
      autoInit(document);
    }
  }

  /* ============================================================
   * Public API
   * ========================================================== */
  var Galaxy = {
    version: VERSION,
    create: function (type, target, options) { return mountAnimation(type, target, options); },
    register: function (name, def) { registerAnimation(name, def); return Galaxy; },
    list: function () { return Object.keys(animations); },
    defaults: function (name) { return animations[name] ? Object.assign({}, animations[name].defaults) : null; },
    autoInit: autoInit,
    // components
    toast: toast,
    modal: modal,
    confirm: confirm,
    drawer: drawer,
    tooltip: bindTooltip,
    tabs: bindTabs,
    accordion: bindAccordion,
    dropdown: bindDropdown,
    segmented: bindSegmented,
    popover: bindPopover,
    rating: bindRating,
    copy: bindCopy,
    ripple: bindRipple,
    reveal: function (nodes) { bindReveal([].slice.call(typeof nodes === "string" ? document.querySelectorAll(nodes) : nodes)); },
    // theming
    theme: theme,
    toggleTheme: toggleTheme,
    // lifecycle
    destroyAll: function () { mounted.forEach(function (m) { try { m.destroy(); } catch (e) {} }); mounted = []; },
    prefersReducedMotion: prefersReduced,
  };

  return Galaxy;
});
