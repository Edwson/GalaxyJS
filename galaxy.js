/*! GalaxyJS v3.3 "Deep Field" — galaxy.js
 *  A zero-dependency cosmic animation + UI component library.
 *  Unified API:  Galaxy.create(type, target, options) · Galaxy.scrollScene(stage, config)
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

  var VERSION = "3.4.0";
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
   * WebGL2 tier — hand-written GLSL, still zero dependencies.
   *
   * Canvas 2D remains the default renderer and the fallback. A shader
   * animation declares `renderer: "webgl2"` and a fragment shader; the core
   * gives it the same lifecycle every 2D animation gets (DPR-clamped resize,
   * pointer, off-screen pause, reduced-motion still frame). Geometry is a
   * single full-screen triangle generated from gl_VertexID, so there is no
   * vertex buffer to allocate and nothing to leak.
   * ========================================================== */
  var GL_VERT =
    "#version 300 es\n" +
    "void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}";
  var GL_TYPES = ["float", "vec2", "vec3", "vec4"];

  function glArity(v) { return typeof v === "number" ? 1 : v.length; }

  function glCompile(gl, type, src) {
    var sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      // A lost context reports every compile as failed with a null log; that is
      // not a shader error, so do not report it as one.
      if (!gl.isContextLost() && typeof console !== "undefined") {
        console.error("GalaxyJS: shader compile failed\n" + gl.getShaderInfoLog(sh));
      }
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  /* Builds a program for `fragment`, declaring uniforms from the arity of the
   * values in `uniforms` so a shader never has to restate its own signature. */
  function glProgram(gl, fragment, uniforms) {
    var decls = "";
    for (var k in uniforms) {
      if (Object.prototype.hasOwnProperty.call(uniforms, k)) {
        decls += "uniform " + GL_TYPES[glArity(uniforms[k]) - 1] + " " + k + ";\n";
      }
    }
    var src =
      "#version 300 es\nprecision highp float;\n" +
      "uniform vec2 uResolution;\nuniform float uTime;\nuniform vec3 uMouse;\n" +
      decls + "out vec4 fragColor;\n" + fragment;
    var vs = glCompile(gl, gl.VERTEX_SHADER, GL_VERT);
    var fs = glCompile(gl, gl.FRAGMENT_SHADER, src);
    if (!vs || !fs) return null;
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      if (!gl.isContextLost() && typeof console !== "undefined") {
        console.error("GalaxyJS: shader link failed\n" + gl.getProgramInfoLog(pr));
      }
      gl.deleteProgram(pr);
      return null;
    }
    return pr;
  }

  function glSetUniform(gl, loc, v) {
    if (loc === null) return;
    if (typeof v === "number") gl.uniform1f(loc, v);
    else if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
    else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
    else gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
  }

  /* A still poster — a GPU surface must never degrade to an empty box.
   * Shaders and three.js scenes may supply a richer `fallback`.
   *
   * This runs in two situations, and only one of them has a 2D context:
   *   - the browser gave us no WebGL2 at all, so the canvas is 2D  → paint it;
   *   - the context is alive but the content failed (a shader that would not
   *     compile, three.js that would not load) → the canvas is already a WebGL
   *     canvas and can never hand back a 2D context, so paint the *host*
   *     element with the equivalent CSS gradient instead.
   * Reaching for h.ctx unconditionally is how this used to throw. */
  function glPosterFallback(h) {
    var pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee"]);
    var bg = h.opts.background || "#05060f";
    var painted = false;
    return {
      draw: function () {
        if (h.ctx) {
          var c = h.ctx, w = h.width, hh = h.height;
          c.fillStyle = bg;
          c.fillRect(0, 0, w, hh);
          var g = c.createRadialGradient(w * 0.5, hh * 0.5, 0, w * 0.5, hh * 0.5, Math.max(w, hh) * 0.7);
          g.addColorStop(0, rgba(pal[0], 0.55));
          g.addColorStop(1, rgba(pal[pal.length - 1], 0));
          c.fillStyle = g;
          c.fillRect(0, 0, w, hh);
          return;
        }
        if (painted) return; // a CSS poster is static; set it once
        painted = true;
        h.el.style.background =
          "radial-gradient(60% 60% at 50% 50%, " + rgba(pal[0], 0.55) + " 0%, " +
          rgba(pal[pal.length - 1], 0) + " 100%), " + bg;
        if (h.gl && !h.gl.isContextLost()) {
          var b = hexToRgb(bg);
          h.gl.clearColor(b[0] / 255, b[1] / 255, b[2] / 255, 0);
          h.gl.clear(h.gl.COLOR_BUFFER_BIT);
        }
      },
      destroy: function () {
        if (painted) h.el.style.background = "";
      },
    };
  }

  /* Sugar over registerAnimation for a full-screen fragment shader.
   * `uniforms(opts, host)` returns plain numbers / arrays, re-read every frame,
   * so changing an option never recompiles the program. */
  function registerShader(name, def) {
    registerAnimation(name, {
      renderer: "webgl2",
      defaults: def.defaults || {},
      fallback: def.fallback || null,
      setup: function (h) {
        var gl = h.gl;
        var vals = def.uniforms ? def.uniforms(h.opts, h) : {};
        var prog = glProgram(gl, def.fragment, vals);
        if (!prog) return glPosterFallback(h);
        var locs = {};
        function loc(n) {
          if (!(n in locs)) locs[n] = gl.getUniformLocation(prog, n);
          return locs[n];
        }
        gl.useProgram(prog);
        return {
          draw: function (t) {
            if (gl.isContextLost()) return;
            gl.useProgram(prog);
            gl.uniform2f(loc("uResolution"), h.canvas.width, h.canvas.height);
            gl.uniform1f(loc("uTime"), def.staticTime !== undefined && h.reduced ? def.staticTime : t);
            gl.uniform3f(
              loc("uMouse"),
              h.mouse.x * h.dpr,
              (h.height - h.mouse.y) * h.dpr,
              h.mouse.active ? 1 : 0
            );
            var u = def.uniforms ? def.uniforms(h.opts, h) : {};
            for (var k in u) {
              if (Object.prototype.hasOwnProperty.call(u, k)) glSetUniform(gl, loc(k), u[k]);
            }
            gl.drawArrays(gl.TRIANGLES, 0, 3);
          },
          destroy: function () {
            // Never call WEBGL_lose_context here: a canvas returns the same
            // context object on every getContext, so losing it would poison any
            // later mount on that canvas.
            if (prog && !gl.isContextLost()) gl.deleteProgram(prog);
          },
        };
      },
    });
  }

  /* ============================================================
   * three.js tier — optional, lazy, and never required.
   *
   * The library's contract is zero *required* dependencies, and that does not
   * change here. A scene that wants a real scene graph — meshes, PBR materials,
   * render targets, a post-processing chain — declares `renderer: "three"`.
   * three.js is then fetched once, on demand, the first time such a scene
   * mounts. A page that never uses one downloads nothing extra; a page that
   * cannot reach the CDN at all still paints the 2D poster rather than an empty
   * box, exactly like the WebGL2 tier degrades.
   *
   * To skip the network entirely, hand the library your own copy:
   *   import * as THREE from "three";
   *   Galaxy.useThree(THREE);
   * ...or point one scene somewhere else with `{ threeUrl: "/vendor/three.js" }`.
   * ========================================================== */
  var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js";
  var threeMod = null; // the resolved namespace, once we have it
  var threeWait = null; // the in-flight load, shared by every scene on the page

  function loadThree(url) {
    if (threeMod) return Promise.resolve(threeMod);
    if (threeWait) return threeWait;
    // A classic-script dynamic import: no bundler required, and nothing is
    // requested until a three-tier scene is actually mounted.
    threeWait = Promise.resolve()
      .then(function () { return import(/* webpackIgnore: true */ url || THREE_URL); })
      .then(function (m) { threeMod = m; return m; })
      .catch(function (e) { threeWait = null; throw e; });
    return threeWait;
  }

  /* Sugar over registerAnimation for a three.js scene.
   *
   * `scene(THREE, host)` runs only once three.js is available and returns the
   * same little object every animation returns: { draw, resize?, update?,
   * destroy? }. Until then — and forever, if the load fails — the poster draws,
   * so `setup` can still answer synchronously like every other renderer. */
  function registerThree(name, def) {
    registerAnimation(name, {
      renderer: "three",
      defaults: def.defaults || {},
      fallback: def.fallback || null,
      setup: function (h) {
        var poster = (def.fallback || glPosterFallback)(h);
        var live = null;
        var dead = false;
        // The first resize lands before three.js arrives, so remember it.
        var size = { w: h.width, h: h.height };

        loadThree(h.opts.threeUrl)
          .then(function (T) {
            if (dead) return;
            live = def.scene(T, h);
            // Hand the surface over: drop anything the poster painted first.
            if (poster.destroy) poster.destroy();
            if (live.resize) live.resize(size.w, size.h);
            // Under prefers-reduced-motion the core already drew its one frame
            // (the poster). Now that the real scene exists, draw its still frame.
            if (h.reduced) live.draw(def.staticTime !== undefined ? def.staticTime : 0, 0);
          })
          .catch(function (e) {
            live = null;
            if (typeof console !== "undefined") {
              console.warn('GalaxyJS: "' + name + '" needs three.js; showing the still fallback.', e && e.message ? e.message : e);
            }
          });

        return {
          draw: function (t, dt) {
            if (h.gl && h.gl.isContextLost()) return;
            (live || poster).draw(t, dt);
          },
          resize: function (w, hh) {
            size.w = w; size.h = hh;
            var target = live || poster;
            if (target.resize) target.resize(w, hh);
          },
          update: function (opts) {
            if (live && live.update) live.update(opts);
          },
          destroy: function () {
            dead = true;
            // Never force a context loss — see the note in the WebGL2 tier.
            if (live && live.destroy) live.destroy();
            else if (poster.destroy) poster.destroy();
            live = null;
          },
        };
      },
    });
  }

  /* Every three scene needs the same renderer wiring, and getting the pixel
   * ratio wrong here is what makes a scene look soft. The core already sized
   * the canvas to width*dpr, so setSize must not touch style or recompute it. */
  function threeRenderer(T, h) {
    var r = new T.WebGLRenderer({
      canvas: h.canvas,
      context: h.gl,
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
    });
    r.setPixelRatio(h.dpr);
    r.setSize(h.width, h.height, false);
    if ("outputColorSpace" in r) r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1;
    return r;
  }

  /* Frees GPU memory for a scene graph without touching the context. */
  function threeDispose(root, extra) {
    if (root && root.traverse) {
      root.traverse(function (o) {
        if (o.geometry && o.geometry.dispose) o.geometry.dispose();
        var m = o.material;
        if (!m) return;
        (Array.isArray(m) ? m : [m]).forEach(function (mm) {
          for (var k in mm) {
            if (mm[k] && mm[k].isTexture && mm[k].dispose) mm[k].dispose();
          }
          if (mm.dispose) mm.dispose();
        });
      });
    }
    (extra || []).forEach(function (o) { if (o && o.dispose) o.dispose(); });
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
    animations[name] = {
      setup: def.setup,
      defaults: def.defaults || {},
      renderer: def.renderer || "2d",
      fallback: def.fallback || null,
    };
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
    var opts = Object.assign({}, def.defaults, options || {});

    // A shader or three.js animation asks for WebGL2; if the browser cannot
    // give one, the surface silently becomes a 2D poster rather than an empty
    // canvas. (three.js renders into this same context — see threeRenderer.)
    var gl = null, ctx = null, setup = def.setup;
    if (def.renderer === "webgl2" || def.renderer === "three") {
      try {
        gl = canvas.getContext("webgl2", {
          alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power",
        });
      } catch (e) { gl = null; }
      if (!gl) setup = def.fallback || glPosterFallback;
    }
    if (!gl) ctx = canvas.getContext("2d");

    var host = {
      el: el, canvas: canvas, ctx: ctx, gl: gl, opts: opts,
      width: 1, height: 1, dpr: 1,
      mouse: { x: -9999, y: -9999, active: false },
      reduced: prefersReduced,
      t: 0,
    };

    var instance = setup(host);

    function resize() {
      var r = el.getBoundingClientRect();
      host.width = Math.max(1, Math.round(r.width));
      host.height = Math.max(1, Math.round(r.height));
      host.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(host.width * host.dpr);
      canvas.height = Math.round(host.height * host.dpr);
      canvas.style.width = host.width + "px";
      canvas.style.height = host.height + "px";
      if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
      else ctx.setTransform(host.dpr, 0, 0, host.dpr, 0, 0);
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

  // 44. Supernova — a star charges, collapses, then erupts in a shockwave + ejecta
  registerAnimation("supernova", {
    defaults: { speed: 1, colors: ["#fff1c4", "#ff9d5c", "#7c5cff", "#22d3ee"], background: "#04040c", particles: 150 },
    setup: function (h) {
      var cx, cy, pal, parts, phase, timer, shock, core;
      function build() {
        cx = h.width / 2; cy = h.height / 2;
        pal = paletteOf(h.opts, ["#fff1c4", "#ff9d5c", "#7c5cff"]);
        parts = []; phase = "charge"; timer = 0; shock = 0; core = 0.25;
      }
      function burst() {
        parts = []; var n = h.opts.particles, reach = Math.min(h.width, h.height);
        for (var i = 0; i < n; i++) parts.push({ a: rand(0, TAU()), v: rand(0.4, 1) * reach, r: rand(0.6, 4), life: rand(0.7, 1), col: pal[(Math.random() * pal.length) | 0] });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.16); var c = h.ctx; c.globalCompositeOperation = "lighter";
          var d = dt * h.opts.speed;
          if (phase === "charge") {
            core = Math.min(1.7, core + d * 0.7); timer += d;
            var pr = Math.min(h.width, h.height) * 0.045 * core;
            var flick = 0.7 + 0.3 * Math.sin(t * 22) * (core / 1.7);
            var g = c.createRadialGradient(cx, cy, 0, cx, cy, pr * 6);
            g.addColorStop(0, rgba(pal[0], 0.9 * flick));
            g.addColorStop(0.4, rgba(pal[0], 0.22));
            g.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = g; c.beginPath(); c.arc(cx, cy, pr * 6, 0, TAU()); c.fill();
            if (timer > 2.3) { phase = "burst"; shock = 0; burst(); }
          } else {
            shock += d * 0.85; var maxR = Math.hypot(cx, cy) * 1.05;
            var alpha = clamp(1 - shock, 0, 1);
            c.strokeStyle = rgba(pal[1] || pal[0], alpha * 0.7);
            c.lineWidth = lerp(9, 1, shock);
            c.beginPath(); c.arc(cx, cy, shock * maxR * 0.92, 0, TAU()); c.stroke();
            for (var i = 0; i < parts.length; i++) {
              var p = parts[i], pr2 = shock * p.v;
              var x = cx + Math.cos(p.a) * pr2, y = cy + Math.sin(p.a) * pr2;
              c.fillStyle = rgba(p.col, alpha * p.life);
              c.beginPath(); c.arc(x, y, p.r * (1 - shock * 0.45) + 0.5, 0, TAU()); c.fill();
            }
            if (shock > 1.05) { phase = "charge"; timer = 0; core = 0.25; }
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 45. Quasar — a black-hole core with an edge-on accretion disk + twin relativistic jets
  registerAnimation("quasar", {
    defaults: { speed: 1, colors: ["#22d3ee", "#7c5cff", "#eef3ff"], background: "#04040c", particles: 170 },
    setup: function (h) {
      var cx, cy, R, pal, jet, disk;
      function build() {
        cx = h.width / 2; cy = h.height / 2; R = Math.min(h.width, h.height) * 0.06;
        pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff", "#eef3ff"]);
        jet = []; for (var i = 0; i < h.opts.particles; i++) jet.push({ p: Math.random(), dir: Math.random() < 0.5 ? -1 : 1, off: rand(-1, 1), v: rand(0.5, 1.2), col: pal[(Math.random() * pal.length) | 0] });
        disk = []; for (var k = 0; k < 100; k++) disk.push({ a: rand(0, TAU()), r: rand(R * 1.2, R * 3), col: pal[(Math.random() * pal.length) | 0] });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.2); var c = h.ctx; c.globalCompositeOperation = "lighter";
          var d = dt * h.opts.speed, jlen = Math.min(cy, h.height * 0.5);
          for (var k = 0; k < disk.length; k++) {
            var s = disk[k]; s.a += d * (1.8 / (s.r / R)) * 0.4;
            var x = cx + Math.cos(s.a) * s.r, y = cy + Math.sin(s.a) * s.r * 0.3, dp = 0.4 + 0.6 * Math.sin(s.a);
            c.fillStyle = rgba(s.col, 0.3 + dp * 0.5); c.beginPath(); c.arc(x, y, 1.3 + dp, 0, TAU()); c.fill();
          }
          for (var i = 0; i < jet.length; i++) {
            var p = jet[i]; p.p += d * p.v * 0.4; if (p.p > 1) p.p -= 1;
            var y2 = cy + p.dir * p.p * jlen, spread = p.p * R * 2.2, x2 = cx + p.off * spread, a = (1 - p.p) * 0.8;
            c.fillStyle = rgba(p.col, a); c.beginPath(); c.arc(x2, y2, lerp(2.2, 0.4, p.p), 0, TAU()); c.fill();
          }
          var g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 3);
          g.addColorStop(0, rgba(pal[2] || pal[0], 0.95)); g.addColorStop(0.5, rgba(pal[0], 0.3)); g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 3, 0, TAU()); c.fill();
          c.globalCompositeOperation = "source-over";
          c.fillStyle = "#000"; c.beginPath(); c.arc(cx, cy, R * 0.8, 0, TAU()); c.fill();
        },
      };
    },
  });

  // 46. Star cluster — a dense globular cluster rotating in 3D with depth
  registerAnimation("starcluster", {
    defaults: { speed: 1, count: 280, colors: ["#ffffff", "#bcd4ff", "#fff1c4", "#ffd6a5"], background: "#04040c" },
    setup: function (h) {
      var pts, cx, cy, rad, pal, ry;
      function build() {
        cx = h.width / 2; cy = h.height / 2; rad = Math.min(h.width, h.height) * 0.34;
        pal = paletteOf(h.opts, ["#ffffff", "#bcd4ff"]); ry = 0; pts = [];
        var n = h.opts.count;
        for (var i = 0; i < n; i++) {
          var u = Math.random(), v = Math.random(), theta = u * TAU(), phi = Math.acos(2 * v - 1), rr = Math.cbrt(Math.random());
          pts.push({ x: rr * Math.sin(phi) * Math.cos(theta), y: rr * Math.cos(phi), z: rr * Math.sin(phi) * Math.sin(theta), s: rand(0.5, 1.8), col: pal[(Math.random() * pal.length) | 0] });
        }
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; ry += dt * h.opts.speed * 0.25; c.globalCompositeOperation = "lighter";
          var cos = Math.cos(ry), sin = Math.sin(ry);
          for (var i = 0; i < pts.length; i++) {
            var p = pts[i], x = p.x * cos - p.z * sin, z = p.x * sin + p.z * cos, depth = (z + 1) / 2;
            c.fillStyle = rgba(p.col, 0.18 + depth * 0.72);
            c.beginPath(); c.arc(cx + x * rad, cy + p.y * rad, p.s * (0.5 + depth), 0, TAU()); c.fill();
          }
          var g = c.createRadialGradient(cx, cy, 0, cx, cy, rad * 1.1);
          g.addColorStop(0, rgba(pal[0], 0.12)); g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.fillRect(0, 0, h.width, h.height);
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 47. Cosmic web — large-scale filaments linking glowing nodes (non-interactive)
  registerAnimation("cosmicWeb", {
    defaults: { speed: 1, nodes: 34, colors: ["#7c5cff", "#22d3ee", "#eef3ff"], background: "#05060f", linkDist: 0.26 },
    setup: function (h) {
      var nodes, pal, maxD;
      function build() {
        pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee"]);
        maxD = h.opts.linkDist * Math.hypot(h.width, h.height); nodes = [];
        for (var i = 0; i < h.opts.nodes; i++) nodes.push({ x: Math.random() * h.width, y: Math.random() * h.height, vx: rand(-1, 1), vy: rand(-1, 1), m: rand(0.6, 1.8), col: pal[(Math.random() * pal.length) | 0] });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx, d = dt * h.opts.speed * 8;
          for (var i = 0; i < nodes.length; i++) { var p = nodes[i]; p.x += p.vx * d; p.y += p.vy * d; if (p.x < 0 || p.x > h.width) p.vx *= -1; if (p.y < 0 || p.y > h.height) p.vy *= -1; }
          c.globalCompositeOperation = "lighter";
          for (var a = 0; a < nodes.length; a++) for (var b = a + 1; b < nodes.length; b++) {
            var n1 = nodes[a], n2 = nodes[b], dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
            if (dist < maxD) { var al = 1 - dist / maxD; c.strokeStyle = rgba(mixRgb(n1.col, n2.col, 0.5), al * al * 0.5); c.lineWidth = al * 1.4; c.beginPath(); c.moveTo(n1.x, n1.y); c.lineTo(n2.x, n2.y); c.stroke(); }
          }
          for (var k = 0; k < nodes.length; k++) {
            var q = nodes[k], pr = q.m * 3, g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, pr * 4);
            g.addColorStop(0, rgba(q.col, 0.8)); g.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, pr * 4, 0, TAU()); c.fill();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 48. Eclipse — a dark disk ringed by a living corona, with a rotating diamond-ring flash
  registerAnimation("eclipse", {
    defaults: { speed: 1, colors: ["#fff1c4", "#ffd166", "#ff9d5c"], background: "#03030a", radius: 0.2 },
    setup: function (h) {
      var cx, cy, R, pal, prom;
      function build() {
        cx = h.width / 2; cy = h.height / 2; R = Math.min(h.width, h.height) * h.opts.radius; pal = paletteOf(h.opts, ["#fff1c4", "#ffd166"]);
        prom = []; for (var i = 0; i < 64; i++) prom.push({ a: rand(0, TAU()), len: rand(0.1, 0.55), w: rand(0.01, 0.04), ph: rand(0, TAU()) });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; c.globalCompositeOperation = "lighter";
          var g = c.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 3.2);
          g.addColorStop(0, rgba(pal[0], 0.5)); g.addColorStop(0.3, rgba(pal[1] || pal[0], 0.16)); g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 3.2, 0, TAU()); c.fill();
          for (var i = 0; i < prom.length; i++) {
            var p = prom[i], fl = 0.6 + 0.4 * Math.sin(t * 1.4 * h.opts.speed + p.ph);
            var x1 = cx + Math.cos(p.a) * R, y1 = cy + Math.sin(p.a) * R, r2 = R * (1 + p.len * fl), x2 = cx + Math.cos(p.a) * r2, y2 = cy + Math.sin(p.a) * r2;
            c.strokeStyle = rgba(pal[0], 0.18 * fl); c.lineWidth = R * p.w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
          }
          c.globalCompositeOperation = "source-over";
          c.fillStyle = rgba(hexToRgb(h.opts.background), 1); c.beginPath(); c.arc(cx, cy, R, 0, TAU()); c.fill();
          c.globalCompositeOperation = "lighter";
          c.strokeStyle = rgba(pal[0], 0.85); c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R * 1.02, 0, TAU()); c.stroke();
          var da = t * 0.5 * h.opts.speed, dx = cx + Math.cos(da) * R * 1.02, dy = cy + Math.sin(da) * R * 1.02;
          var dg = c.createRadialGradient(dx, dy, 0, dx, dy, R * 0.5); dg.addColorStop(0, rgba(pal[0], 1)); dg.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = dg; c.beginPath(); c.arc(dx, dy, R * 0.5, 0, TAU()); c.fill();
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 49. Corona — a roiling star with granulated surface and arcing prominences
  registerAnimation("corona", {
    defaults: { speed: 1, colors: ["#ffd166", "#ff7b00", "#fff1c4"], background: "#0a0400", radius: 0.26, particles: 90 },
    setup: function (h) {
      var cx, cy, R, pal, cells, flares;
      function build() {
        cx = h.width / 2; cy = h.height / 2; R = Math.min(h.width, h.height) * h.opts.radius; pal = paletteOf(h.opts, ["#ffd166", "#ff7b00"]);
        cells = []; for (var i = 0; i < h.opts.particles; i++) cells.push({ a: rand(0, TAU()), r: rand(0, R * 0.92), ph: rand(0, TAU()), s: rand(0.04, 0.12) * R, col: pal[(Math.random() * pal.length) | 0] });
        flares = []; for (var k = 0; k < 5; k++) flares.push({ a: rand(0, TAU()), ph: rand(0, TAU()), span: rand(0.3, 0.8), hgt: rand(0.4, 1) });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; c.globalCompositeOperation = "lighter";
          var g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 2.4);
          g.addColorStop(0, rgba(pal[0], 0.55)); g.addColorStop(0.35, rgba(pal[1] || pal[0], 0.22)); g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 2.4, 0, TAU()); c.fill();
          for (var i = 0; i < cells.length; i++) {
            var s = cells[i], fl = 0.5 + 0.5 * Math.sin(t * 2 * h.opts.speed + s.ph);
            c.fillStyle = rgba(s.col, 0.25 * fl); c.beginPath(); c.arc(cx + Math.cos(s.a) * s.r, cy + Math.sin(s.a) * s.r, s.s * (0.6 + fl * 0.6), 0, TAU()); c.fill();
          }
          for (var k = 0; k < flares.length; k++) {
            var f = flares[k]; f.a += dt * h.opts.speed * 0.1;
            var amp = f.hgt * (0.6 + 0.4 * Math.sin(t * 0.8 + f.ph)), a0 = f.a - f.span / 2, a1 = f.a + f.span / 2;
            var x0 = cx + Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R, x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
            var mx = cx + Math.cos(f.a) * R * (1 + amp), my = cy + Math.sin(f.a) * R * (1 + amp);
            c.strokeStyle = rgba(pal[0], 0.4 * amp); c.lineWidth = 2.5; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.stroke();
          }
          var cg = c.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
          cg.addColorStop(0, rgba(pal[0], 0.95)); cg.addColorStop(1, rgba(pal[1] || pal[0], 0));
          c.fillStyle = cg; c.beginPath(); c.arc(cx, cy, R, 0, TAU()); c.fill();
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 50. Galaxy merge — two galactic cores orbiting, trailing tidal star streams
  registerAnimation("galaxyMerge", {
    defaults: { speed: 1, stars: 480, colors: ["#9bd0ff", "#ffd6a5", "#f472b6", "#ffffff"], background: "#04040c" },
    setup: function (h) {
      var cx, cy, sep, pal, stars, ang;
      function build() {
        cx = h.width / 2; cy = h.height / 2; sep = Math.min(h.width, h.height) * 0.22; pal = paletteOf(h.opts, ["#9bd0ff", "#ffd6a5"]); ang = 0; stars = [];
        for (var i = 0; i < h.opts.stars; i++) { var rr = Math.pow(Math.random(), 0.6); stars.push({ core: Math.random() < 0.5 ? 0 : 1, r: rr, a: rand(0, TAU()), spin: rand(0.3, 1.1), arm: rr * 6, col: pal[(Math.random() * pal.length) | 0], s: rand(0.4, 1.4) }); }
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.18); var c = h.ctx; ang += dt * h.opts.speed * 0.3; c.globalCompositeOperation = "lighter";
          var pulse = 0.7 + 0.3 * Math.sin(ang * 0.5), maxR = Math.min(h.width, h.height) * 0.3;
          var s1x = cx + Math.cos(ang) * sep * pulse, s1y = cy + Math.sin(ang) * sep * 0.5 * pulse;
          var s2x = cx - Math.cos(ang) * sep * pulse, s2y = cy - Math.sin(ang) * sep * 0.5 * pulse;
          for (var i = 0; i < stars.length; i++) {
            var p = stars[i], ccx = p.core ? s2x : s1x, ccy = p.core ? s2y : s1y, aa = p.a + p.spin * ang + p.arm, rr = p.r * maxR;
            c.fillStyle = rgba(p.col, 0.3 + (1 - p.r) * 0.5); c.beginPath(); c.arc(ccx + Math.cos(aa) * rr, ccy + Math.sin(aa) * rr * 0.7, p.s, 0, TAU()); c.fill();
          }
          [[s1x, s1y], [s2x, s2y]].forEach(function (s) { var g = c.createRadialGradient(s[0], s[1], 0, s[0], s[1], maxR * 0.5); g.addColorStop(0, rgba(pal[0], 0.4)); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.beginPath(); c.arc(s[0], s[1], maxR * 0.5, 0, TAU()); c.fill(); });
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 51. Lattice — a rotating crystalline icosahedron with glowing vertices + edges
  registerAnimation("lattice", {
    defaults: { speed: 1, colors: ["#22d3ee", "#7c5cff", "#eef3ff"], background: "#05060f" },
    setup: function (h) {
      var cx, cy, scale, pal, rx, ry, V, E, P1 = (1 + Math.sqrt(5)) / 2;
      function build() {
        cx = h.width / 2; cy = h.height / 2; scale = Math.min(h.width, h.height) * 0.3; pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff"]); rx = 0; ry = 0;
        var raw = [[-1, P1, 0], [1, P1, 0], [-1, -P1, 0], [1, -P1, 0], [0, -1, P1], [0, 1, P1], [0, -1, -P1], [0, 1, -P1], [P1, 0, -1], [P1, 0, 1], [-P1, 0, -1], [-P1, 0, 1]];
        var norm = Math.hypot(1, P1); V = raw.map(function (v) { return [v[0] / norm, v[1] / norm, v[2] / norm]; });
        E = [[0, 11], [0, 5], [0, 1], [0, 7], [0, 10], [1, 5], [5, 11], [11, 10], [10, 7], [7, 1], [3, 9], [3, 4], [3, 2], [3, 6], [3, 8], [4, 9], [9, 8], [8, 6], [6, 2], [2, 4], [5, 9], [11, 4], [10, 2], [7, 6], [1, 8], [5, 4], [11, 2], [10, 6], [7, 8], [1, 9]];
      }
      build();
      function rot(p) {
        var c1 = Math.cos(ry), s1 = Math.sin(ry), x1 = p[0] * c1 - p[2] * s1, z1 = p[0] * s1 + p[2] * c1;
        var c2 = Math.cos(rx), s2 = Math.sin(rx), y1 = p[1] * c2 - z1 * s2, z2 = p[1] * s2 + z1 * c2, pp = 2 / (2.6 - z2);
        return { x: cx + x1 * scale * pp, y: cy + y1 * scale * pp, z: z2 };
      }
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; rx += dt * h.opts.speed * 0.18; ry += dt * h.opts.speed * 0.28; c.globalCompositeOperation = "lighter";
          var Q = V.map(rot);
          for (var i = 0; i < E.length; i++) {
            var a = Q[E[i][0]], b = Q[E[i][1]], dep = (a.z + b.z) / 2, al = 0.25 + (dep + 1) / 2 * 0.6;
            c.strokeStyle = rgba(mixRgb(pal[0], pal[1] || pal[0], (dep + 1) / 2), al); c.lineWidth = 0.8 + al; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
          }
          for (var k = 0; k < Q.length; k++) {
            var q = Q[k], al2 = 0.4 + (q.z + 1) / 2 * 0.6, g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, 8);
            g.addColorStop(0, rgba(pal[2] || pal[0], al2)); g.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, 8, 0, TAU()); c.fill();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 52. Moiré — two drifting sets of concentric rings interfering into shimmer
  registerAnimation("moire", {
    defaults: { speed: 1, colors: ["#22d3ee", "#7c5cff"], background: "#05060f", rings: 40 },
    setup: function (h) {
      var pal;
      function build() { pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff"]); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; c.globalCompositeOperation = "lighter";
          var amp = Math.min(h.width, h.height) * 0.13, off = Math.cos(t * 0.4 * h.opts.speed) * amp;
          var gap = Math.min(h.width, h.height) / h.opts.rings, maxR = Math.hypot(h.width, h.height);
          var c1x = h.width / 2 - off, c1y = h.height / 2 + off * 0.4, c2x = h.width / 2 + off, c2y = h.height / 2 - off * 0.4;
          c.lineWidth = 1; c.strokeStyle = rgba(pal[0], 0.22);
          for (var r = gap; r < maxR; r += gap) { c.beginPath(); c.arc(c1x, c1y, r, 0, TAU()); c.stroke(); }
          c.strokeStyle = rgba(pal[1] || pal[0], 0.22);
          for (var q = gap; q < maxR; q += gap) { c.beginPath(); c.arc(c2x, c2y, q, 0, TAU()); c.stroke(); }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 53. Starburst — a breathing lens flare with chromatic spikes + ghost discs
  registerAnimation("starburst", {
    defaults: { speed: 1, colors: ["#fff1c4", "#22d3ee", "#f472b6"], background: "#04040c", spikes: 12 },
    setup: function (h) {
      var cx, cy, pal, rays;
      function build() { cx = h.width / 2; cy = h.height / 2; pal = paletteOf(h.opts, ["#fff1c4", "#22d3ee"]); rays = []; var n = h.opts.spikes; for (var i = 0; i < n; i++) rays.push({ a: (i / n) * TAU(), len: rand(0.5, 1), ph: rand(0, TAU()) }); }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; c.globalCompositeOperation = "lighter";
          var breathe = 0.7 + 0.3 * Math.sin(t * 0.8 * h.opts.speed), base = Math.min(h.width, h.height) * 0.5;
          var g = c.createRadialGradient(cx, cy, 0, cx, cy, base * 0.9 * breathe);
          g.addColorStop(0, rgba(pal[0], 0.6)); g.addColorStop(0.2, rgba(pal[0], 0.18)); g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.beginPath(); c.arc(cx, cy, base * 0.9, 0, TAU()); c.fill();
          for (var i = 0; i < rays.length; i++) {
            var r = rays[i], fl = 0.5 + 0.5 * Math.sin(t * 1.2 + r.ph), len = base * r.len * breathe * (0.6 + fl * 0.6);
            var x = cx + Math.cos(r.a) * len, y = cy + Math.sin(r.a) * len, grd = c.createLinearGradient(cx, cy, x, y), col = pal[i % pal.length];
            grd.addColorStop(0, rgba(col, 0.5 * fl)); grd.addColorStop(1, "rgba(0,0,0,0)");
            c.strokeStyle = grd; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
          }
          var ax = Math.cos(t * 0.2), ay = Math.sin(t * 0.2);
          for (var k = -3; k <= 3; k++) {
            if (!k) continue; var gx = cx + ax * base * 0.4 * k, gy = cy + ay * base * 0.4 * k, col2 = pal[(k + 3) % pal.length], rad = base * 0.08 * (4 - Math.abs(k));
            var gg = c.createRadialGradient(gx, gy, 0, gx, gy, rad); gg.addColorStop(0, rgba(col2, 0.18)); gg.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = gg; c.beginPath(); c.arc(gx, gy, rad, 0, TAU()); c.fill();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 54. Pillars — towering nebular gas columns with embedded star glints
  registerAnimation("pillars", {
    defaults: { speed: 1, colors: ["#7c5cff", "#22d3ee", "#f472b6", "#fff1c4"], background: "#05040f", columns: 3 },
    setup: function (h) {
      var cols, pal, glints;
      function build() {
        pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee"]); cols = []; var n = h.opts.columns;
        for (var i = 0; i < n; i++) {
          var cxx = (i + 0.5) / n * h.width + rand(-h.width * 0.06, h.width * 0.06), blobs = [], top = rand(0.15, 0.4) * h.height, w = rand(0.06, 0.12) * h.width;
          for (var y = top; y < h.height; y += w * 0.5) blobs.push({ x: cxx + Math.sin(y * 0.02 + i) * w * 0.6, y: y, r: w * rand(0.7, 1.2) });
          cols.push({ blobs: blobs, col: pal[i % pal.length] });
        }
        glints = []; for (var k = 0; k < 42; k++) glints.push({ x: Math.random() * h.width, y: Math.random() * h.height, ph: rand(0, TAU()), col: pal[(Math.random() * pal.length) | 0] });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; c.globalCompositeOperation = "lighter";
          for (var k = 0; k < glints.length; k++) { var s = glints[k], fl = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 * h.opts.speed + s.ph)); c.fillStyle = rgba(s.col, 0.5 * fl); c.beginPath(); c.arc(s.x, s.y, 0.8 + fl, 0, TAU()); c.fill(); }
          for (var i = 0; i < cols.length; i++) {
            var col = cols[i];
            for (var b = 0; b < col.blobs.length; b++) {
              var bl = col.blobs[b], x = bl.x + Math.sin(t * 0.4 * h.opts.speed + bl.y * 0.01) * bl.r * 0.12;
              var g = c.createRadialGradient(x, bl.y, 0, x, bl.y, bl.r);
              g.addColorStop(0, rgba(col.col, 0.28)); g.addColorStop(0.7, rgba(col.col, 0.08)); g.addColorStop(1, "rgba(0,0,0,0)");
              c.fillStyle = g; c.beginPath(); c.arc(x, bl.y, bl.r, 0, TAU()); c.fill();
            }
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 55. Ion storm — electric plasma arcs leaping from a core to the rim
  registerAnimation("ionstorm", {
    defaults: { speed: 1, colors: ["#7c5cff", "#22d3ee", "#a8d8ff"], background: "#04040c", bolts: 7 },
    setup: function (h) {
      var cx, cy, R, pal, bolts;
      function build() { cx = h.width / 2; cy = h.height / 2; R = Math.min(h.width, h.height) * 0.42; pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee"]); bolts = []; for (var i = 0; i < h.opts.bolts; i++) bolts.push({ a: rand(0, TAU()), seed: Math.random(), tnext: rand(0, 1.2), col: pal[(Math.random() * pal.length) | 0] }); }
      build();
      function drawBolt(c, a, jit, col, alpha) {
        var segs = 14; c.strokeStyle = rgba(col, alpha); c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx, cy);
        for (var s = 1; s <= segs; s++) {
          var f = s / segs, rr = R * f, hash = (Math.sin(s * 12.9 + jit) * 43758.5) % 1, perp = (hash - 0.5) * R * 0.25 * (1 - f) * (0.5 + f);
          c.lineTo(cx + Math.cos(a) * rr - Math.sin(a) * perp, cy + Math.sin(a) * rr + Math.cos(a) * perp);
        }
        c.stroke();
      }
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.3); var c = h.ctx; c.globalCompositeOperation = "lighter";
          var g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.18); g.addColorStop(0, rgba(pal[0], 0.9)); g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 0.18, 0, TAU()); c.fill();
          for (var i = 0; i < bolts.length; i++) {
            var b = bolts[i]; b.tnext -= dt * h.opts.speed; if (b.tnext <= 0) { b.a = rand(0, TAU()); b.seed = Math.random(); b.tnext = rand(0.15, 0.6); }
            drawBolt(c, b.a + Math.sin(t * 3 + i) * 0.05, b.seed * 100, b.col, clamp(b.tnext * 2, 0.1, 0.9));
          }
          c.strokeStyle = rgba(pal[1] || pal[0], 0.2); c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R, 0, TAU()); c.stroke();
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 56. Stardust — ultra-fine luminous dust drifting on a parallax current
  registerAnimation("stardust", {
    defaults: { speed: 1, count: 320, colors: ["#eef3ff", "#bcd4ff", "#c9b8ff", "#fff1c4"], background: "#05060f", angle: 0.45 },
    setup: function (h) {
      var dust, pal, dirx, diry;
      function build() {
        pal = paletteOf(h.opts, ["#eef3ff", "#bcd4ff"]); dirx = Math.cos(h.opts.angle); diry = Math.sin(h.opts.angle);
        dust = []; var area = h.width * h.height, n = Math.max(80, Math.round(h.opts.count * area / (1280 * 720)));
        for (var i = 0; i < n; i++) dust.push({ x: Math.random() * h.width, y: Math.random() * h.height, z: Math.random(), r: rand(0.3, 1.3), ph: rand(0, TAU()), col: pal[(Math.random() * pal.length) | 0] });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; c.globalCompositeOperation = "lighter"; var sp = dt * h.opts.speed * 22;
          for (var i = 0; i < dust.length; i++) {
            var d = dust[i], v = (0.2 + d.z * 1.2) * sp; d.x += dirx * v; d.y += diry * v;
            if (d.x > h.width + 2) d.x = -2; if (d.x < -2) d.x = h.width + 2; if (d.y > h.height + 2) d.y = -2; if (d.y < -2) d.y = h.height + 2;
            var tw = 0.4 + 0.6 * Math.sin(t * 1.5 + d.ph);
            c.fillStyle = rgba(d.col, (0.1 + d.z * 0.5) * tw); c.beginPath(); c.arc(d.x, d.y, d.r * (0.5 + d.z), 0, TAU()); c.fill();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 57. Orrery — tilted concentric rings turning like an armillary instrument
  registerAnimation("orrery", {
    defaults: { speed: 1, rings: 5, colors: ["#c9a959", "#22d3ee", "#7c5cff", "#eef3ff"], background: "#05060f" },
    setup: function (h) {
      var cx, cy, R, pal, rings;
      function build() {
        cx = h.width / 2; cy = h.height / 2; R = Math.min(h.width, h.height) * 0.42; pal = paletteOf(h.opts, ["#c9a959", "#22d3ee"]); rings = []; var n = h.opts.rings;
        for (var i = 0; i < n; i++) rings.push({ r: R * (0.3 + 0.7 * (i + 1) / n), squash: rand(0.2, 0.5), tilt: rand(0, Math.PI), spin: rand(0.2, 0.7) * (Math.random() < 0.5 ? 1 : -1), pa: rand(0, TAU()), col: pal[i % pal.length] });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; c.globalCompositeOperation = "lighter";
          var g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.2); g.addColorStop(0, rgba(pal[0], 0.9)); g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 0.2, 0, TAU()); c.fill();
          for (var i = 0; i < rings.length; i++) {
            var r = rings[i]; c.save(); c.translate(cx, cy); c.rotate(r.tilt);
            c.strokeStyle = rgba(r.col, 0.4); c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 0, r.r, r.r * r.squash, 0, 0, TAU()); c.stroke();
            var pa = r.pa + t * r.spin * h.opts.speed, bx = Math.cos(pa) * r.r, by = Math.sin(pa) * r.r * r.squash;
            var bg = c.createRadialGradient(bx, by, 0, bx, by, 7); bg.addColorStop(0, rgba(r.col, 1)); bg.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = bg; c.beginPath(); c.arc(bx, by, 7, 0, TAU()); c.fill(); c.restore();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 58. Oscilloscope — morphing Lissajous curves on a phosphor screen
  registerAnimation("oscilloscope", {
    defaults: { speed: 1, colors: ["#22d3ee", "#7cffb0"], background: "#03060a" },
    setup: function (h) {
      var cx, cy, ax, ay, pal, phase;
      function build() { cx = h.width / 2; cy = h.height / 2; ax = h.width * 0.36; ay = h.height * 0.36; pal = paletteOf(h.opts, ["#22d3ee", "#7cffb0"]); phase = 0; }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          fade(h, 0.08); var c = h.ctx; c.globalCompositeOperation = "lighter"; phase += dt * 0.2 * h.opts.speed;
          var faN = 2 + Math.sin(t * 0.05) * 1.5, fbN = 3 + Math.cos(t * 0.037) * 1.5, col = mixRgb(pal[0], pal[1] || pal[0], 0.5 + 0.5 * Math.sin(t * 0.3));
          c.strokeStyle = rgba(col, 0.9); c.lineWidth = 1.6; c.beginPath();
          var N = 240;
          for (var i = 0; i <= N; i++) { var th = (i / N) * TAU(), x = cx + Math.sin(faN * th + phase) * ax, y = cy + Math.sin(fbN * th) * ay; if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
          c.stroke();
          var hth = (t * 1.5 * h.opts.speed) % TAU(), hx = cx + Math.sin(faN * hth + phase) * ax, hy = cy + Math.sin(fbN * hth) * ay;
          var g = c.createRadialGradient(hx, hy, 0, hx, hy, 10); g.addColorStop(0, rgba(pal[1] || pal[0], 1)); g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.beginPath(); c.arc(hx, hy, 10, 0, TAU()); c.fill();
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 59. Bokeh — defocused additive light discs drifting through depth of field
  registerAnimation("bokeh", {
    defaults: { speed: 1, count: 26, colors: ["#7c5cff", "#22d3ee", "#f472b6", "#ffd6a5"], background: "#05060f" },
    setup: function (h) {
      var orbs, pal;
      function build() {
        pal = paletteOf(h.opts, ["#7c5cff", "#22d3ee"]); orbs = []; var area = h.width * h.height, n = Math.max(10, Math.round(h.opts.count * area / (1280 * 720)));
        for (var i = 0; i < n; i++) orbs.push({ x: Math.random() * h.width, y: Math.random() * h.height, z: Math.random(), r: rand(0.04, 0.16) * Math.min(h.width, h.height), vy: rand(0.1, 0.5), ph: rand(0, TAU()), col: pal[(Math.random() * pal.length) | 0] });
      }
      build();
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; c.globalCompositeOperation = "lighter";
          for (var i = 0; i < orbs.length; i++) {
            var o = orbs[i]; o.y -= o.vy * (0.4 + o.z) * dt * h.opts.speed * 30; o.x += Math.sin(t * 0.3 + o.ph) * 0.3;
            if (o.y < -o.r) { o.y = h.height + o.r; o.x = Math.random() * h.width; }
            var rr = o.r * (0.5 + o.z), soft = 0.4 + o.z * 0.4, fl = 0.6 + 0.4 * Math.sin(t * 0.8 + o.ph);
            var g = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, rr);
            g.addColorStop(0, rgba(o.col, (0.08 + o.z * 0.18) * fl)); g.addColorStop(soft, rgba(o.col, (0.04 + o.z * 0.1) * fl)); g.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = g; c.beginPath(); c.arc(o.x, o.y, rr, 0, TAU()); c.fill();
            if (o.z > 0.7) { c.strokeStyle = rgba(o.col, 0.12 * fl); c.lineWidth = 1; c.beginPath(); c.arc(o.x, o.y, rr * 0.9, 0, TAU()); c.stroke(); }
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 60. Magnetosphere — dipole field lines with particles streaming pole to pole
  registerAnimation("magnetosphere", {
    defaults: { speed: 1, colors: ["#22d3ee", "#7c5cff", "#a8d8ff"], background: "#04040c", lines: 7 },
    setup: function (h) {
      var cx, cy, R, pal, parts;
      function build() {
        cx = h.width / 2; cy = h.height / 2; R = Math.min(h.width, h.height) * 0.12; pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff"]);
        parts = []; for (var i = 0; i < 72; i++) parts.push({ shell: 1 + (Math.random() * h.opts.lines | 0), p: Math.random(), side: Math.random() < 0.5 ? 1 : -1, v: rand(0.3, 0.8), col: pal[(Math.random() * pal.length) | 0] });
      }
      build();
      function fieldPt(L, u, side) { var ang = u * Math.PI, rr = R * L * Math.sin(ang) * Math.sin(ang); return { x: cx + side * rr * Math.sin(ang), y: cy - rr * Math.cos(ang) }; }
      return {
        resize: build,
        draw: function (t, dt) {
          clearBG(h); var c = h.ctx; c.globalCompositeOperation = "lighter";
          var g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4); g.addColorStop(0, rgba(pal[0], 0.5)); g.addColorStop(0.6, rgba(pal[1] || pal[0], 0.18)); g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 1.4, 0, TAU()); c.fill();
          c.fillStyle = "#0a0e18"; c.beginPath(); c.arc(cx, cy, R, 0, TAU()); c.fill();
          var L0 = h.opts.lines;
          for (var side = -1; side <= 1; side += 2) for (var l = 1; l <= L0; l++) {
            var L = 1.4 + l * 0.7; c.strokeStyle = rgba(pal[1] || pal[0], 0.12 + 0.04 * l); c.lineWidth = 1; c.beginPath();
            for (var s = 0; s <= 40; s++) { var pt = fieldPt(L, s / 40, side); if (s === 0) c.moveTo(pt.x, pt.y); else c.lineTo(pt.x, pt.y); }
            c.stroke();
          }
          for (var i = 0; i < parts.length; i++) {
            var q = parts[i]; q.p += dt * h.opts.speed * q.v * 0.25; if (q.p > 1) q.p -= 1;
            var pt2 = fieldPt(1.4 + q.shell * 0.7, q.p, q.side);
            c.fillStyle = rgba(q.col, 0.7 * (0.4 + 0.6 * Math.sin(q.p * Math.PI))); c.beginPath(); c.arc(pt2.x, pt2.y, 1.6, 0, TAU()); c.fill();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });


  /* ============================================================
   * Relativity & gravitation (61–65)
   *
   * Everything in this block is computed rather than stylised: the Einstein
   * ring lands where the lens equation puts it, the bright side of the disk is
   * bright because the Doppler factor says so, and the cluster stays bound
   * because the integrator is symplectic.
   * ========================================================== */

  function relVec3(hex) { var c = hexToRgb(hex); return [c.r / 255, c.g / 255, c.b / 255]; }
  function relPalVec(opts, fallback, i) {
    var p = paletteOf(opts, fallback);
    var c = p[Math.min(i, p.length - 1)];
    return [c.r / 255, c.g / 255, c.b / 255];
  }
  /* Walk a whole palette as one continuous ramp, 0 → 1. */
  function relRamp(pal, w) {
    var f = clamp(w, 0, 1) * (pal.length - 1);
    var i0 = Math.min(pal.length - 2, Math.floor(f));
    return mixRgb(pal[i0], pal[i0 + 1], f - i0);
  }

  // 61. Gravitational lensing — a Schwarzschild lens bending a real star field
  //
  //   deflection     α = 2·rs/b               (weak field, b = impact parameter)
  //   lens equation  r_src = r − rE²/r        signed, so it flips inside rE —
  //                                           which is exactly where a point
  //                                           lens puts its second image
  //   magnification  μ = 1/|1 − (rE/r)⁴|      diverges on the Einstein ring
  //   shadow         b < 3√3/2·rs ≈ 2.598·rs  is captured
  registerShader("lensing", {
    defaults: {
      mass: 1, spin: 0.35, stars: 1, speed: 1, interactive: true,
      colors: ["#ffd9a0", "#9fd0ff"], background: "#05060f",
    },
    staticTime: 11,
    uniforms: function (o) {
      return {
        uMass: clamp(o.mass, 0.25, 3),
        uSpin: clamp(o.spin, -1, 1),
        uStars: clamp(o.stars, 0.1, 2),
        uSpeed: o.speed,
        uWarm: relPalVec(o, ["#ffd9a0", "#9fd0ff"], 0),
        uCool: relPalVec(o, ["#ffd9a0", "#9fd0ff"], 1),
        uBg: relVec3(o.background || "#05060f"),
      };
    },
    fragment: [
      "float rlH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
      "vec2 rlH2(vec2 p){",
      "  return fract(sin(vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)))) * 43758.5453);",
      "}",
      /* One star per grid cell, kept well inside it so nothing clips at a seam. */
      "float rlLayer(vec2 p, float sc, float sd, float dens, out float mag){",
      "  vec2 g = p * sc + sd * 7.13;",
      "  vec2 id = floor(g);",
      "  vec2 f = fract(g) - 0.5;",
      "  vec2 hh = rlH2(id + sd);",
      "  mag = hh.x;",
      "  if (rlH(id * 1.31 + sd * 3.7) > 0.34 * dens) return 0.0;",
      "  float d = length(f - (hh - 0.5) * 0.62);",
      "  float rr = mix(0.016, 0.052, mag * mag);",
      "  float core = smoothstep(rr, rr * 0.15, d);",
      "  float halo = 0.20 * exp(-d * d / (rr * rr * 5.0));",
      "  return (core * 1.15 + halo) * mix(0.30, 1.0, mag);",
      "}",
      /* A faint diffuse sky. Multiplied by μ, this is what paints the ring. */
      "float rlSky(vec2 p){ return 0.011 + 0.007 * sin(p.x * 6.0 + 1.3) * sin(p.y * 5.0 - 0.7); }",
      "",
      "void main(){",
      "  vec2 res = uResolution;",
      "  float mn = min(res.x, res.y);",
      "  vec2 p = (gl_FragCoord.xy - 0.5 * res) / mn;",
      "  float tt = uTime * uSpeed;",
      "  vec2 bh = vec2(0.13 * sin(tt * 0.13), 0.08 * sin(tt * 0.11 + 1.7));",
      "  if (uMouse.z > 0.5) bh = (uMouse.xy - 0.5 * res) / mn;",
      "",
      "  vec2 d = p - bh;",
      "  float r = max(length(d), 1e-5);",
      "  float rs = 0.050 * uMass;",
      "  float bc = 2.598 * rs;",
      "  float k  = 20.0 * rs * rs;",
      "",
      /* d·(1 − rE²/r²) is dir·(r − rE²/r): the vector flips sign inside the
         ring on its own, so the inner image comes for free. */
      "  vec2 src = d * (1.0 - k / (r * r)) + vec2(tt * 0.004, tt * 0.0016);",
      "  float q = k / (r * r);",
      "  float mu = min(1.0 / max(abs(1.0 - q * q), 0.02), 42.0);",
      "",
      "  float m0, m1, m2;",
      "  float s = rlLayer(src,  8.0, 0.0, uStars, m0);",
      "  s += 0.80 * rlLayer(src, 15.0, 3.0, uStars, m1);",
      "  s += 0.55 * rlLayer(src, 27.0, 9.0, uStars, m2);",
      "  float sky = rlSky(src);",
      "",
      /* Hot blue-white through to cool amber, then whitened by brightness. */
      "  vec3 starCol = mix(uCool, uWarm, m1 * m1);",
      "  starCol = mix(starCol, vec3(1.0), 0.45 + 0.4 * m0);",
      "  vec3 col = starCol * s * mu * 1.15;",
      "  col += mix(uWarm, uCool, 0.25) * sky * mu * 1.45;",
      "",
      /* Kerr shadows sit off-centre and their prograde limb runs brighter. */
      "  float rsh = length(d - vec2(uSpin * 0.30 * rs, 0.0));",
      "  col *= smoothstep(bc * 0.99, bc * 1.05, rsh);",
      "",
      /* Strong field: images pile up exponentially at b_crit — the photon ring. */
      "  float ph = exp(-max(r - bc, 0.0) / (0.085 * bc));",
      "  ph *= smoothstep(bc * 0.985, bc * 1.03, rsh);",
      "  ph *= 1.0 + 0.8 * uSpin * (d.x / r);",
      "  col += mix(uWarm, vec3(1.0), 0.35) * ph * 1.3;",
      "",
      "  col = 1.0 - exp(-col * 1.5);",
      "  fragColor = vec4(min(vec3(1.0), uBg + col), 1.0);",
      "}",
    ].join("\n"),
  });

  // 62. Accretion disk — relativistic Doppler beaming around a compact object
  //
  //   shear      β(r) = β_isco·√(r_isco/r)                (Keplerian)
  //   beaming    D = 1/(γ(1 − β·cosθ)),  cosθ = sinι·cosφ
  //   gravity    g_grav = √(1 − rs/r)
  //   observed   I ∝ (D·g_grav)⁴ and T_obs = T_em·D·g_grav  (Liouville)
  //   emission   Shakura–Sunyaev  F ∝ r⁻³(1 − √(r_in/r))
  //
  // So the limb turning towards us is both brighter and bluer, the receding one
  // is dim and red, and the inner edge is hot but redshifted back down again.
  registerShader("accretionDisk", {
    defaults: {
      inclination: 1.15, beta: 0.5, temperature: 1, speed: 1,
      colors: ["#e01500", "#ffa62b", "#bfe0ff"], background: "#04050c",
    },
    staticTime: 6,
    uniforms: function (o) {
      var f = ["#e01500", "#ffa62b", "#bfe0ff"];
      return {
        uInc: clamp(o.inclination, 0.15, 1.48),
        uBeta: clamp(o.beta, 0.05, 0.85),
        uTemp: clamp(o.temperature, 0.3, 2.5),
        uSpeed: o.speed,
        uC0: relPalVec(o, f, 0),
        uC1: relPalVec(o, f, 1),
        uC2: relPalVec(o, f, 2),
        uBg: relVec3(o.background || "#04050c"),
      };
    },
    fragment: [
      "vec3 adRamp(float x){",
      "  x = clamp(x, 0.0, 1.0);",
      "  return x < 0.5 ? mix(uC0, uC1, x * 2.0) : mix(uC1, uC2, (x - 0.5) * 2.0);",
      "}",
      /* Bands fade once they wind tighter than a pixel, so differential
         rotation can shear forever without aliasing into noise. */
      "float adBand(float ph){ float w = fwidth(ph); return sin(ph) * exp(-0.3 * w * w); }",
      "",
      "const float RS = 0.045;",
      "const float RIN = 3.0 * RS;",     // innermost stable circular orbit
      "const float ROUT = 0.42;",
      "",
      /* One look at the disk from a point in the equatorial plane. Everything
         relativistic happens here: shear, beaming, redshift, emissivity. */
      "vec3 adDisk(vec2 dc, float si, float atten){",
      "  float r = length(dc);",
      "  float vis = smoothstep(RIN, RIN * 1.05, r) * smoothstep(ROUT, ROUT * 0.86, r);",
      "  if (vis < 0.002) return vec3(0.0);",
      "  float beta = min(uBeta * sqrt(RIN / r), 0.95);",       // Keplerian
      "  float gam = 1.0 / sqrt(1.0 - beta * beta);",
      "  float cosl = (dc.x / r) * si;",                        // v̂ · line of sight
      "  float dop = 1.0 / (gam * (1.0 - beta * cosl));",       // relativistic Doppler
      "  float grav = sqrt(max(1.0 - RS / r, 0.02));",          // climbing out of the well
      "  float g = dop * grav;",
      "  float g2 = g * g;",
      "  float flux = pow(RIN / r, 3.0) * (1.0 - sqrt(RIN / r));",   // Shakura–Sunyaev
      "  float om = uSpeed * 1.15 * pow(RIN / r, 1.5);",             // differential rotation
      "  float a = atan(dc.y, dc.x) - om * uTime;",
      "  float tex = 0.66 + 0.19 * adBand(a * 3.0 + r * 13.0)",
      "            + 0.13 * adBand(a * 7.0 - r * 21.0 + 1.7)",
      "            + 0.08 * adBand(a * 12.0 + r * 9.0);",
      /* Observed colour temperature is the emitted one shifted by g, stretched
         across the ramp so the beaming actually reads as a colour change. */
      "  float temp = (pow(max(flux, 1e-4), 0.25) * g * uTemp - 0.24) * 2.5;",
      "  return adRamp(temp) * (flux * tex * g2 * g2 * 15.0) * vis * atten;",
      "}",
      "",
      "void main(){",
      "  vec2 res = uResolution;",
      "  float mn = min(res.x, res.y);",
      "  vec2 p = (gl_FragCoord.xy - 0.5 * res) / mn;",
      "  float ci = max(cos(uInc), 0.05), si = sin(uInc);",
      "  float bc = 2.598 * RS;",
      "  float scr = max(length(p), 1e-5);",
      "",
      /* Primary image, with the weak-field bend applied before the ray meets
         the plane — the disk visibly sags towards the hole. */
      "  vec2 b = p * (1.0 - 2.0 * RS * RS / (scr * scr));",
      "  vec2 dc = vec2(b.x, -b.y / ci);",                      // unproject: z = −y/cos ι
      "  vec3 col = adDisk(dc, si, 1.0);",
      "  if (dc.y * si < 0.0) col *= smoothstep(bc * 0.97, bc * 1.05, scr);",  // far half hides
      "",
      /* Secondary image. Light that winds half a turn around the hole brings
         back the whole disk squeezed into a thin annulus outside b_crit, so
         the far side reappears as an arc hugging the shadow. */
      "  float u = (scr - bc) / (0.5 * bc);",
      "  if (u > 0.0 && u < 1.0) {",
      "    vec2 dir = normalize(vec2(p.x, -p.y / ci));",
      "    float w = (1.0 - u) * smoothstep(0.0, 0.12, u);",
      "    col += adDisk(dir * (RIN + (ROUT - RIN) * pow(u, 2.6)), si, w * 1.1);",
      "  }",
      "",
      "  col *= smoothstep(bc * 0.985, bc * 1.015, scr);",      // the shadow
      "  float ring = exp(-max(scr - bc, 0.0) / (0.045 * bc));",
      "  col += mix(uC1, vec3(1.0), 0.35) * ring * smoothstep(bc * 0.99, bc * 1.02, scr) * 1.15;",
      "  col += uC1 * 0.05 * exp(-scr * 2.4);",
      "",
      "  col = 1.0 - exp(-col * 1.4);",
      "  col = pow(col, vec3(0.75));",
      "  fragColor = vec4(min(vec3(1.0), uBg + col), 1.0);",
      "}",
    ].join("\n"),
  });

  // 63. N-body — a real gravitating cluster on a velocity-Verlet integrator
  //
  //   a_i = Σ G·m_j·(r_j − r_i) / (|r_ij|² + ε²)^{3/2}    Plummer softening
  //   v += ½a·dt ; x += v·dt ; a = f(x) ; v += ½a·dt      symplectic, so the
  //   energy oscillates about a constant instead of bleeding away the way
  //   forward Euler does — the cluster still looks like this after ten minutes.
  registerAnimation("nBody", {
    defaults: {
      count: 13, gravity: 1, softening: 1, trail: 1, speed: 1,
      colors: ["#ff7a2f", "#ffc978", "#fff6e8", "#bcd4ff"], background: "#05060f",
    },
    setup: function (h) {
      var N, m, x, y, vx, vy, ax, ay, tx, ty, ti, col, rad;
      var pal, cx, cy, SC, G, eps2, mMax, carry;
      var DTS = 0.0012, RATE = 0.21, TRN = 170, EVERY = 5, stepNo = 0;
      var BANDS = [0.05, 0.10, 0.19, 0.40];

      function accel() {
        var i, j;
        for (i = 0; i < N; i++) { ax[i] = 0; ay[i] = 0; }
        for (i = 0; i < N; i++) {
          for (j = i + 1; j < N; j++) {
            var dx = x[j] - x[i], dy = y[j] - y[i];
            var r2 = dx * dx + dy * dy + eps2;
            var inv = G / (r2 * Math.sqrt(r2));
            var fi = inv * m[j], fj = inv * m[i];
            ax[i] += fi * dx; ay[i] += fi * dy;
            ax[j] -= fj * dx; ay[j] -= fj * dy;
          }
        }
      }

      function orbit(i, rr) {
        var an = rand(0, TAU()), vc = Math.sqrt(G * m[0] / rr) * rand(0.87, 1.05);
        x[i] = Math.cos(an) * rr; y[i] = Math.sin(an) * rr;
        vx[i] = -Math.sin(an) * vc + rand(-0.04, 0.04) * vc;
        vy[i] = Math.cos(an) * vc + rand(-0.04, 0.04) * vc;
        for (var k = 0; k < TRN; k++) { tx[i][k] = x[i]; ty[i][k] = y[i]; }
      }

      function step() {
        var i, hdt = 0.5 * DTS;
        for (i = 0; i < N; i++) { vx[i] += ax[i] * hdt; vy[i] += ay[i] * hdt; }
        for (i = 0; i < N; i++) { x[i] += vx[i] * DTS; y[i] += vy[i] * DTS; }
        accel();
        for (i = 0; i < N; i++) { vx[i] += ax[i] * hdt; vy[i] += ay[i] * hdt; }
        stepNo++;
        if (stepNo % EVERY === 0) {
          ti = (ti + 1) % TRN;
          for (i = 0; i < N; i++) { tx[i][ti] = x[i]; ty[i][ti] = y[i]; }
        }
        // Recycle anything that is both far out and genuinely unbound.
        for (i = 1; i < N; i++) {
          var r2 = x[i] * x[i] + y[i] * y[i];
          if (r2 > 4) {
            var e = 0.5 * (vx[i] * vx[i] + vy[i] * vy[i]) - G * m[0] / Math.sqrt(r2);
            if (e > 0 || r2 > 26) orbit(i, rand(0.18, 0.62));
          }
        }
      }

      function build() {
        pal = paletteOf(h.opts, ["#ff7a2f", "#ffc978", "#fff6e8", "#bcd4ff"]);
        cx = h.width / 2; cy = h.height / 2;
        SC = Math.min(h.width, h.height) * 0.54;
        G = 0.9 * (h.opts.gravity || 1);
        var sf = 0.021 * clamp(h.opts.softening, 0.15, 6);
        eps2 = sf * sf;
        N = Math.max(4, Math.min(40, Math.round(h.opts.count)));
        m = []; x = []; y = []; vx = []; vy = []; ax = []; ay = [];
        tx = []; ty = []; col = []; rad = []; ti = 0; stepNo = 0; carry = 0;
        var i;
        for (i = 0; i < N; i++) { tx.push([]); ty.push([]); ax.push(0); ay.push(0); }
        m[0] = 1; x[0] = 0; y[0] = 0; vx[0] = 0; vy[0] = 0;
        for (i = 0; i < TRN; i++) { tx[0][i] = 0; ty[0][i] = 0; }
        for (i = 1; i < N; i++) {
          m[i] = i <= 2 ? rand(0.022, 0.05) : rand(0.0015, 0.013);
          orbit(i, 0.15 + 0.42 * Math.pow(Math.random(), 0.62));
        }
        // Kill the net momentum so the whole cluster does not slide out of frame.
        var px = 0, py = 0, mt = 0;
        for (i = 0; i < N; i++) { px += m[i] * vx[i]; py += m[i] * vy[i]; mt += m[i]; }
        for (i = 0; i < N; i++) { vx[i] -= px / mt; vy[i] -= py / mt; }

        // Heavier bodies burn hotter, so mass walks the palette red → blue-white.
        mMax = 0;
        for (i = 1; i < N; i++) if (m[i] > mMax) mMax = m[i];
        for (i = 0; i < N; i++) {
          col[i] = relRamp(pal, i === 0 ? 0.72 : Math.pow(m[i] / mMax, 0.5));
          rad[i] = i === 0 ? 8 : 1.3 + 4.6 * Math.pow(m[i] / mMax, 0.34);
        }
        accel();
        for (i = 0; i < 2400; i++) step();   // spin up, so frame one has history
      }
      build();

      return {
        resize: build,
        draw: function (t, dt) {
          var c = h.ctx;
          c.globalCompositeOperation = "source-over";
          fade(h, 1);
          carry += dt * (h.opts.speed || 1) * RATE;
          var guard = 0;
          while (carry >= DTS && guard < 14) { step(); carry -= DTS; guard++; }
          if (carry > 0.4) carry = 0;

          c.globalCompositeOperation = "lighter";
          c.lineCap = "round";
          var i, k, sx, sy, seg;
          var tl = clamp(h.opts.trail, 0, 1);
          for (i = 1; i < N; i++) {
            c.strokeStyle = rgba(col[i], 1);
            for (seg = 0; seg < 4; seg++) {
              c.globalAlpha = BANDS[seg] * tl;
              c.lineWidth = 0.5 + seg * 0.42;
              c.beginPath();
              var from = Math.floor((seg * TRN) / 4);
              var to = Math.min(TRN - 1, Math.floor(((seg + 1) * TRN) / 4));
              for (k = from; k <= to; k++) {
                var idx = (ti + 1 + k) % TRN;
                sx = cx + tx[i][idx] * SC; sy = cy + ty[i][idx] * SC;
                if (k === from) c.moveTo(sx, sy); else c.lineTo(sx, sy);
              }
              c.stroke();
            }
          }
          c.globalAlpha = 1;

          for (i = 0; i < N; i++) {
            sx = cx + x[i] * SC; sy = cy + y[i] * SC;
            var R = rad[i], reach = i === 0 ? R * 9 : R * 5;
            var g = c.createRadialGradient(sx, sy, 0, sx, sy, reach);
            g.addColorStop(0, rgba(col[i], 0.95));
            g.addColorStop(i === 0 ? 0.13 : 0.22, rgba(col[i], 0.32));
            g.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = g; c.beginPath(); c.arc(sx, sy, reach, 0, TAU()); c.fill();
            c.fillStyle = rgba(mixRgb(col[i], { r: 255, g: 255, b: 255 }, 0.6), 1);
            c.beginPath(); c.arc(sx, sy, R * 0.5, 0, TAU()); c.fill();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  // 64. Tidal stream — a satellite sheared into leading and trailing tails
  //
  // Particles interior to the satellite orbit faster and run ahead; exterior
  // ones fall behind, so a bound cloud shears into an S. Anything beyond the
  // Jacobi radius r_t = R·(m/3M)^{1/3} is no longer held, and every periapsis
  // passage peels off another pair of tails. Colour is specific orbital energy
  // relative to the satellite — cool leads, warm trails.
  registerAnimation("tidalStream", {
    defaults: {
      count: 620, gravity: 1, periapsis: 0.24, speed: 1,
      colors: ["#6ea8ff", "#ff9a3c", "#ffffff", "#c9b6ff"], background: "#05060f",
    },
    setup: function (h) {
      var px, py, pvx, pvy, pax, pay, N;
      var sx, sy, svx, svy, sax, say, ms, rt, esat;
      var pal, cx, cy, SC, GM, ep2, es2, carry, life;
      var DTS = 0.0011, RATE = 0.25;
      var oX = [0], oY = [0];

      function pull(qx, qy) {
        // primary at the origin plus the satellite, both Plummer-softened
        var r2 = qx * qx + qy * qy + ep2;
        var f = -GM / (r2 * Math.sqrt(r2));
        var dx = qx - sx, dy = qy - sy;
        var s2 = dx * dx + dy * dy + es2;
        var fs = -GM * ms / (s2 * Math.sqrt(s2));
        oX[0] = f * qx + fs * dx; oY[0] = f * qy + fs * dy;
      }

      function step() {
        var i, hdt = 0.5 * DTS;
        svx += sax * hdt; svy += say * hdt;
        sx += svx * DTS; sy += svy * DTS;
        var r2 = sx * sx + sy * sy + ep2, f = -GM / (r2 * Math.sqrt(r2));
        sax = f * sx; say = f * sy;
        svx += sax * hdt; svy += say * hdt;

        for (i = 0; i < N; i++) {
          pvx[i] += pax[i] * hdt; pvy[i] += pay[i] * hdt;
          px[i] += pvx[i] * DTS; py[i] += pvy[i] * DTS;
        }
        for (i = 0; i < N; i++) {
          pull(px[i], py[i]);
          pax[i] = oX[0]; pay[i] = oY[0];
          pvx[i] += pax[i] * hdt; pvy[i] += pay[i] * hdt;
        }
      }

      function build() {
        pal = paletteOf(h.opts, ["#6ea8ff", "#ff9a3c", "#ffffff", "#c9b6ff"]);
        SC = Math.min(h.width, h.height) * 0.55;
        GM = 1 * (h.opts.gravity || 1);
        ep2 = 0.016 * 0.016; es2 = 0.009 * 0.009;
        ms = 0.0025;
        N = Math.max(60, Math.min(1400, Math.round(h.opts.count)));
        px = []; py = []; pvx = []; pvy = []; pax = []; pay = [];
        carry = 0; life = 0;

        var ra = 0.80, rp = clamp(h.opts.periapsis, 0.1, 0.7);
        var sma = 0.5 * (ra + rp);
        // The orbit runs from −rp to +ra, so bias the frame to hold all of it.
        cx = h.width / 2 - 0.5 * (ra - rp) * SC; cy = h.height / 2;
        sx = ra; sy = 0;
        svx = 0; svy = Math.sqrt(GM * (2 / ra - 1 / sma));
        var r2 = sx * sx + sy * sy + ep2, f = -GM / (r2 * Math.sqrt(r2));
        sax = f * sx; say = f * sy;

        // A cold cloud straddling its periapsis Jacobi radius, so it sheds its
        // outer layers one pass at a time instead of exploding all at once.
        for (var i = 0; i < N; i++) {
          var q = rand(0, TAU()), rr = 0.028 * Math.sqrt(Math.random());
          var vc = Math.sqrt(GM * ms / Math.sqrt(rr * rr + es2)) * 0.7;
          px.push(sx + Math.cos(q) * rr); py.push(sy + Math.sin(q) * rr);
          pvx.push(svx - Math.sin(q) * vc + rand(-0.06, 0.06) * vc);
          pvy.push(svy + Math.cos(q) * vc + rand(-0.06, 0.06) * vc);
          pull(px[i], py[i]);
          pax.push(oX[0]); pay.push(oY[0]);
        }
        // Two and a half orbits in: frame one already carries a wrapped stream.
        for (var s = 0; s < 5400; s++) step();
      }
      build();

      return {
        resize: build,
        draw: function (t, dt) {
          var c = h.ctx;
          c.globalCompositeOperation = "source-over";
          fade(h, 0.32);
          carry += dt * (h.opts.speed || 1) * RATE;
          var guard = 0;
          while (carry >= DTS && guard < 44) { step(); carry -= DTS; guard++; }
          if (carry > 0.3) carry = 0;
          life += dt;
          if (life > 40) build();

          var R = Math.sqrt(sx * sx + sy * sy);
          rt = R * Math.pow(ms / 3, 1 / 3);
          esat = 0.5 * (svx * svx + svy * svy) - GM / Math.max(R, 1e-3);

          c.globalCompositeOperation = "lighter";
          var g = c.createRadialGradient(cx, cy, 0, cx, cy, SC * 0.2);
          g.addColorStop(0, rgba(pal[2] || pal[0], 1));
          g.addColorStop(0.09, rgba(pal[1] || pal[0], 0.42));
          g.addColorStop(0.34, rgba(pal[1] || pal[0], 0.07));
          g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.beginPath(); c.arc(cx, cy, SC * 0.2, 0, TAU()); c.fill();

          var i, ssx = cx + sx * SC, ssy = cy + sy * SC, rt2 = rt * rt;
          for (i = 0; i < N; i++) {
            var qx = px[i], qy = py[i];
            var rr = Math.sqrt(qx * qx + qy * qy);
            var e = 0.5 * (pvx[i] * pvx[i] + pvy[i] * pvy[i]) - GM / Math.max(rr, 1e-3);
            var de = (e - esat) * 9;
            var w = 0.5 + 0.5 * (de / (1 + Math.abs(de)));   // low energy leads
            var dxs = qx - sx, dys = qy - sy;
            var bound = dxs * dxs + dys * dys < rt2;
            var cc = bound ? (pal[2] || pal[0]) : mixRgb(pal[0], pal[1] || pal[0], w);
            c.fillStyle = rgba(cc, bound ? 0.7 : 0.5);
            c.beginPath();
            c.arc(cx + qx * SC, cy + qy * SC, bound ? 1.5 : 1.25, 0, TAU());
            c.fill();
          }

          // Jacobi radius — everything outside it has already been taken
          c.globalCompositeOperation = "source-over";
          c.strokeStyle = rgba(pal[3] || pal[0], 0.32);
          c.lineWidth = 1; c.setLineDash([3, 4]);
          c.beginPath(); c.arc(ssx, ssy, Math.max(2, rt * SC), 0, TAU()); c.stroke();
          c.setLineDash([]);
        },
      };
    },
  });

  // 65. Inspiral — a binary radiating its own orbit away
  //
  //   Peters (1964)  da/dt = −K/a³  ⇒  a(t) = (a₀⁴ − 4Kt)^{1/4}, so the
  //                  separation creeps down for a long time and then falls off
  //                  a cliff; Ω = √(GM/a³) turns that into the chirp.
  //   radiation      h ∝ cos(2φ − 2φ_orb(t − r/c)) — an m = 2 quadrupole, which
  //                  is why the crests arrive as four arms (two positive, two
  //                  negative) wound into a spiral by the retarded phase. The
  //                  winding is tightest near the source, where the emission is
  //                  most recent and the orbit was fastest.
  registerAnimation("inspiral", {
    defaults: {
      speed: 1, decay: 1, colors: ["#7fb2ff", "#ff77b8", "#ffffff"], background: "#05060f",
    },
    setup: function (h) {
      var pal, cx, cy, SC, carry, a, phase, hPh, hAm, hi, flash, ring;
      var DTS = 1 / 240, HN = 3200, A0 = 0.62, AM = 0.095, CW = 0.17, GMB = 0.4, K;
      var m1 = 0.55, m2 = 0.45;
      var out = [0, 0];

      function step() {
        var a4 = a * a * a * a - 4 * K * DTS;
        a = a4 > 0 ? Math.pow(a4, 0.25) : AM * 0.5;
        var om;
        if (a > AM) {
          om = Math.sqrt(GMB / (a * a * a));
          flash = 0; ring = 0;
        } else {
          // Merged: ring down near the fundamental quasi-normal frequency.
          om = Math.sqrt(GMB / (AM * AM * AM)) * 0.92;
          ring += DTS;
          flash = clamp(1 - ring / 0.9, 0, 1);
          if (ring > 0.9) { a = A0; ring = 0; flash = 0; }
        }
        phase += om * DTS;
        hi = (hi + 1) % HN;
        hPh[hi] = phase;
        hAm[hi] = a > AM ? A0 / a : (A0 / AM) * Math.exp(-ring * 6.5);
      }

      // Retarded lookup. The stored phase is cumulative, never wrapped, so it
      // interpolates cleanly.
      function sample(back) {
        var f = back / DTS;
        var i0 = Math.floor(f), fr = f - i0;
        if (i0 < 0) { i0 = 0; fr = 0; }
        if (i0 >= HN - 2) return false;
        var j0 = (hi - i0 + HN + HN) % HN, j1 = (j0 - 1 + HN) % HN;
        out[0] = hPh[j0] + (hPh[j1] - hPh[j0]) * fr;
        out[1] = hAm[j0] + (hAm[j1] - hAm[j0]) * fr;
        return true;
      }

      function build() {
        pal = paletteOf(h.opts, ["#7fb2ff", "#ff77b8", "#ffffff"]);
        cx = h.width / 2; cy = h.height / 2;
        SC = Math.min(h.width, h.height) * 0.5;
        K = 0.00123 * clamp(h.opts.decay, 0.1, 6);
        a = A0; phase = 0; carry = 0; flash = 0; ring = 0; hi = 0;
        hPh = []; hAm = [];
        for (var i = 0; i < HN; i++) { hPh.push(0); hAm.push(0); }
        for (i = 0; i < 3000; i++) step();  // fill the sky before frame one
      }
      build();

      return {
        resize: build,
        draw: function (t, dt) {
          var c = h.ctx;
          c.globalCompositeOperation = "source-over";
          fade(h, 1);
          carry += dt * (h.opts.speed || 1);
          var guard = 0;
          while (carry >= DTS && guard < 600) { step(); carry -= DTS; guard++; }
          if (carry > 0.2) carry = 0;

          c.globalCompositeOperation = "lighter";
          var maxR = Math.hypot(h.width, h.height) * 0.5 / SC;
          var NS = 170, BUCK = 16, arm, i, s, bkt;
          var lanes = [];
          for (i = 0; i < BUCK * 2; i++) lanes.push([]);

          // Four crest lines of the quadrupole: φ = φ_orb(t_ret) + n·π/2
          for (arm = 0; arm < 4; arm++) {
            var sign = arm % 2;                    // 0 = +h lobe, 1 = −h lobe
            var base = (arm * Math.PI) / 2;
            var pxp = 0, pyp = 0, prevOk = false, prevAng = 0;
            for (i = 0; i <= NS; i++) {
              var u = i / NS;
              var rr = 0.03 + (maxR - 0.03) * u * u;   // denser sampling inwards
              if (!sample(rr / CW)) { prevOk = false; continue; }
              var ang = out[0] + base, amp = out[1];
              var qx = cx + Math.cos(ang) * rr * SC;
              var qy = cy + Math.sin(ang) * rr * SC;
              if (prevOk) {
                var wind = Math.abs(ang - prevAng);
                var res = Math.exp(-wind * wind * 4.0);  // fade what we cannot resolve
                var al = clamp((amp / (0.35 + rr * 2.0)) * 0.55 * res, 0, 1);
                var bi = Math.min(BUCK - 1, Math.floor(al * BUCK * 1.3));
                bi = Math.max(0, bi);
                if (bi > 0) lanes[sign * BUCK + bi].push(pxp, pyp, qx, qy);
              }
              pxp = qx; pyp = qy; prevAng = ang; prevOk = true;
            }
          }
          // Two passes: a wide soft one for bloom, a tight one for the crest.
          c.lineCap = "round";
          for (var pass = 0; pass < 2; pass++) {
            for (s = 0; s < 2; s++) {
              for (bkt = 1; bkt < BUCK; bkt++) {
                var arr = lanes[s * BUCK + bkt];
                if (!arr.length) continue;
                var aa = (bkt + 0.6) / (BUCK * 1.02);
                c.strokeStyle = rgba(pal[s] || pal[0], pass ? aa : aa * 0.16);
                c.lineWidth = pass ? 0.8 + bkt * 0.13 : 3.5 + bkt * 0.4;
                c.beginPath();
                for (i = 0; i < arr.length; i += 4) {
                  c.moveTo(arr[i], arr[i + 1]); c.lineTo(arr[i + 2], arr[i + 3]);
                }
                c.stroke();
              }
            }
          }

          // The binary itself, about its common centre of mass
          var r1 = a * m2, r2 = a * m1;
          var white = pal[2] || pal[0];
          var hot = clamp(A0 / a / 7, 0.2, 1.2);
          var cs = Math.cos(phase), sn = Math.sin(phase);
          function orb(bx, by, rr2, cc) {
            var gg = c.createRadialGradient(bx, by, 0, bx, by, rr2 * 6);
            gg.addColorStop(0, rgba(white, 0.95));
            gg.addColorStop(0.18, rgba(cc, 0.5));
            gg.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = gg; c.beginPath(); c.arc(bx, by, rr2 * 6, 0, TAU()); c.fill();
          }
          orb(cx + cs * r1 * SC, cy + sn * r1 * SC, 3.2 + hot * 2.6, pal[0]);
          orb(cx - cs * r2 * SC, cy - sn * r2 * SC, 2.9 + hot * 2.6, pal[1] || pal[0]);

          if (flash > 0) {
            var fr2 = 1 - flash;
            c.strokeStyle = rgba(white, flash * 0.85);
            c.lineWidth = lerp(11, 0.5, fr2);
            c.beginPath();
            c.arc(cx, cy, fr2 * Math.hypot(cx, cy) * 1.15, 0, TAU());
            c.stroke();
            var rad = SC * 0.55 * flash;
            var g3 = c.createRadialGradient(cx, cy, 0, cx, cy, rad);
            g3.addColorStop(0, rgba(white, flash));
            g3.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = g3; c.beginPath(); c.arc(cx, cy, rad, 0, TAU()); c.fill();
          }
          c.globalCompositeOperation = "source-over";
        },
      };
    },
  });

  /* ============================================================
   * WebGL2 tier — volumetric & raymarched depth (66–70)
   *
   * Everything below marches a ray through a participating medium and
   * integrates radiance with Beer–Lambert transmittance. The depth cues are
   * physical rather than painted: occlusion, self-shadowing, phase-function
   * anisotropy and parallax through the volume as the camera drifts.
   * ========================================================== */

  function vec3of(hex) { var c = hexToRgb(hex); return [c.r / 255, c.g / 255, c.b / 255]; }

  /* Local aliases so a sibling snippet redefining a shared helper cannot
   * change what these five shaders were written against. */
  function bvC3(hex) { var c = hexToRgb(hex); return [c.r / 255, c.g / 255, c.b / 255]; }
  function bvPal(o, i, fb) {
    var cs = o && o.colors && o.colors.length ? o.colors : null;
    return bvC3((cs && cs[i]) || fb);
  }
  function bvNum(v, fb, lo, hi) {
    var n = typeof v === "number" && isFinite(v) ? v : fb;
    return clamp(n, lo, hi);
  }
  /* Planckian locus, Tanner Helland's fit — `temperature` in kelvin drives the
   * photosphere ramp so a star reads as a temperature, not as a hue pick. */
  function bvBlackbody(kelvin, gain) {
    var t = clamp(kelvin, 1200, 20000) / 100, r, g, b;
    if (t <= 66) {
      r = 255;
      g = 99.4708025861 * Math.log(t) - 161.1195681661;
      b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
    } else {
      r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
      g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
      b = 255;
    }
    var k = gain === undefined ? 1 : gain;
    return [clamp(r, 0, 255) / 255 * k, clamp(g, 0, 255) / 255 * k, clamp(b, 0, 255) / 255 * k];
  }

  /* Shared GLSL: hashes, value noise, FBM, rotation, Henyey–Greenstein,
   * ray/sphere, ACES-ish tonemap, dither and a cheap starfield. */
  var BV_LIB = [
    "float bvH1(vec3 p){",
    "  p = fract(p * 0.1031);",
    "  p += dot(p, p.zyx + 31.32);",
    "  return fract((p.x + p.y) * p.z);",
    "}",
    "vec3 bvH3(vec3 p){",
    "  p = fract(p * vec3(0.1031, 0.1030, 0.0973));",
    "  p += dot(p, p.yxz + 33.33);",
    "  return fract((p.xxy + p.yxx) * p.zyx);",
    "}",
    "float bvN(vec3 x){",
    "  vec3 i = floor(x); vec3 f = fract(x);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(mix(bvH1(i), bvH1(i + vec3(1.0, 0.0, 0.0)), f.x),",
    "                 mix(bvH1(i + vec3(0.0, 1.0, 0.0)), bvH1(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),",
    "             mix(mix(bvH1(i + vec3(0.0, 0.0, 1.0)), bvH1(i + vec3(1.0, 0.0, 1.0)), f.x),",
    "                 mix(bvH1(i + vec3(0.0, 1.0, 1.0)), bvH1(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);",
    "}",
    /* GLSL matrices are column-major, so the columns here give the standard
     * counter-clockwise rotation — worth stating, because getting it backwards
     * silently mirrors every camera in the file. */
    "mat2 bvRot(float a){ float s = sin(a); float c = cos(a); return mat2(c, s, -s, c); }",
    "float bvFbm4(vec3 p){",
    "  float a = 0.5; float s = 0.0;",
    "  for (int i = 0; i < 4; i++) {",
    "    s += a * bvN(p);",
    "    p.xy = bvRot(1.09) * p.xy;",
    "    p = p * 2.04 + vec3(1.7, 9.2, 4.3);",
    "    a *= 0.53;",
    "  }",
    "  return s * 1.03;",
    "}",
    "float bvFbm3(vec3 p){",
    "  float s = 0.5 * bvN(p);",
    "  p.xy = bvRot(1.09) * p.xy; p = p * 2.04 + vec3(1.7, 9.2, 4.3);",
    "  s += 0.27 * bvN(p);",
    "  p.xy = bvRot(1.09) * p.xy; p = p * 2.04 + vec3(1.7, 9.2, 4.3);",
    "  s += 0.15 * bvN(p);",
    "  return s * 1.09;",
    "}",
    "float bvFbm2(vec3 p){",
    "  float s = 0.5 * bvN(p);",
    "  p.xy = bvRot(1.09) * p.xy;",
    "  s += 0.28 * bvN(p * 2.04 + vec3(1.7, 9.2, 4.3));",
    "  return s * 1.28;",
    "}",
    /* Normalised Henyey–Greenstein: 1.0 at g = 0, so `anisotropy` reads as a
     * pure forward/back bias instead of also changing overall brightness. */
    "float bvHG(float c, float g){",
    "  float g2 = g * g;",
    "  return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5);",
    "}",
    "vec2 bvSph(vec3 ro, vec3 rd, float ra){",
    "  float b = dot(ro, rd);",
    "  float k = dot(ro, ro) - ra * ra;",
    "  float h = b * b - k;",
    "  if (h < 0.0) return vec2(1.0, -1.0);",
    "  h = sqrt(h);",
    "  return vec2(-b - h, -b + h);",
    "}",
    "vec3 bvTone(vec3 x){",
    "  x = max(x, vec3(0.0));",
    "  x = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);",
    "  return pow(clamp(x, 0.0, 1.0), vec3(0.90));",
    "}",
    "float bvDith(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }",
    "vec2 bvUV(){ return (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y) * 2.0; }",
    "vec2 bvMUV(){ return (uMouse.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y) * 2.0; }",
    "float bvStars(vec3 rd, float amt){",
    "  vec3 p = rd * 170.0;",
    "  vec3 i = floor(p); vec3 f = fract(p) - 0.5;",
    "  vec3 o = bvH3(i) - 0.5;",
    "  float d = length(f - o * 0.72);",
    "  float m = bvH1(i + 7.31);",
    "  float br = smoothstep(0.93 - 0.10 * amt, 1.0, m);",
    "  return br * exp(-d * d * 240.0) * (0.35 + 0.65 * m);",
    "}",
  ].join("\n");

  // 66. Volumetric nebula — raymarched emissive/absorptive gas, Beer–Lambert
  //     transmittance, Henyey–Greenstein forward scattering off an embedded star
  registerShader("volumetricNebula", {
    defaults: {
      speed: 1, density: 1, absorption: 1, anisotropy: 0.6, interactive: true,
      colors: ["#ff4f96", "#31c9f5", "#ffe6c2"], background: "#03030c",
    },
    staticTime: 14,
    uniforms: function (o) {
      return {
        uSpeed: bvNum(o.speed, 1, 0, 6),
        uDensity: bvNum(o.density, 1, 0.05, 4),
        uAbsorb: bvNum(o.absorption, 1, 0.05, 5) * 2.9,
        uAniso: bvNum(o.anisotropy, 0.6, -0.9, 0.9),
        uColA: bvPal(o, 0, "#ff4f96"),
        uColB: bvPal(o, 1, "#31c9f5"),
        uLight: bvPal(o, 2, "#ffe6c2"),
        uBg: bvC3(o.background || "#03030c"),
      };
    },
    fragment: [
      BV_LIB,
      /* Cloud envelope: a tilted, squashed ellipsoid so the gas has an outline
       * instead of filling the frame like fog. */
      "float bvShape(vec3 p){",
      "  vec3 q = p;",
      "  q.xz = bvRot(0.62) * q.xz;",
      "  q.xy = bvRot(-0.22) * q.xy;",
      "  float r = length(q * vec3(0.52, 1.12, 0.78));",
      "  return smoothstep(1.55, 0.10, r);",
      "}",
      /* A free sinusoidal domain warp — pulls the FBM into filaments and sheets
       * without paying for a second noise field. */
      "vec3 bvWarp(vec3 p, float t){",
      "  return p + 0.30 * vec3(sin(p.y * 2.05 + t * 0.21),",
      "                         sin(p.z * 1.71 - t * 0.17),",
      "                         sin(p.x * 2.37 + t * 0.13));",
      "}",
      /* pow() on the thresholded field sharpens the density histogram, so the
       * cloud gets dense cores and genuinely empty voids instead of even haze —
       * contrast without paying for a second noise lookup. */
      "float bvCurve(float f, float sh){",
      "  return pow(max(f - 0.505, 0.0) * 4.6, 1.6) * sh;",
      "}",
      "float bvDens(vec3 p, float t){",
      "  return bvCurve(bvFbm4(bvWarp(p, t) * 1.18 + vec3(0.0, -t * 0.035, t * 0.02)), bvShape(p));",
      "}",
      "float bvDensLo(vec3 p, float t){",
      "  return bvCurve(bvFbm2(bvWarp(p, t) * 1.18 + vec3(0.0, -t * 0.035, t * 0.02)), bvShape(p));",
      "}",
      "void main(){",
      "  vec2 uv = bvUV();",
      "  float t = uTime * uSpeed;",
      "  float dth = bvDith(gl_FragCoord.xy);",
      /* Camera orbits the cloud: the parallax between near and far gas is the
       * whole point of marching rather than compositing sprites. */
      "  float ca = t * 0.042;",
      "  vec3 ro = vec3(0.0, 0.12 * sin(t * 0.06), -3.05);",
      "  vec3 rd = normalize(vec3(uv * 0.58, 1.28));",
      "  ro.xz = bvRot(ca) * ro.xz;",
      "  rd.xz = bvRot(ca) * rd.xz;",
      "  float tl = 0.09 * sin(t * 0.05);",
      "  ro.yz = bvRot(tl) * ro.yz;",
      "  rd.yz = bvRot(tl) * rd.yz;",
      "  vec3 L = vec3(0.55 * sin(t * 0.11), 0.24 * sin(t * 0.083), 0.40 * cos(t * 0.11));",
      "  if (uMouse.z > 0.5) {",
      "    vec2 m = bvMUV();",
      "    L = mix(L, vec3(m.x * 1.05, m.y * 0.90, 0.10), 0.85);",
      "  }",
      "  vec3 col = vec3(0.0);",
      "  float T = 1.0;",
      "  vec2 hit = bvSph(ro, rd, 2.05);",
      "  if (hit.y > hit.x && hit.y > 0.0) {",
      "    float t0 = max(hit.x, 0.0);",
      "    float ds = (hit.y - t0) / 40.0;",
      "    float tt = t0 + ds * dth;",
      "    for (int i = 0; i < 40; i++) {",
      "      if (T < 0.010) break;",
      "      vec3 p = ro + rd * tt;",
      "      float d = bvDens(p, t) * uDensity;",
      "      vec3 pl = L - p;",
      "      float dl = max(length(pl), 1e-4);",
      "      if (d > 0.004) {",
      "        vec3 ld = pl / dl;",
      /* Shadow ray: three short taps toward the embedded star. This is what
       * gives lit rims on thin gas and unlit cores behind dense gas. */
      "        vec3 sp = p; float sh = 0.0;",
      "        for (int j = 0; j < 3; j++) { sp += ld * 0.26; sh += bvDensLo(sp, t) * uDensity; }",
      "        float shT = exp(-sh * 0.26 * uAbsorb * 1.5);",
      "        float ph = bvHG(dot(rd, ld), uAniso);",
      "        float fall = 1.9 / (0.16 + dl * dl);",
      /* Thin gas takes the cool line colour, compressed gas the hot one; the
       * hottest cores add their own emission on top. */
      "        vec3 alb = mix(uColB, uColA, smoothstep(0.05, 0.75, d));",
      "        vec3 S = alb * uLight * shT * ph * fall * 2.30",
      "               + uColB * 0.055",
      "               + uColA * 0.30 * smoothstep(0.45, 1.6, d);",
      /* Beer–Lambert: emission is weighted by transmittance accumulated so far,
       * then transmittance decays by exp(-sigma * ds). */
      "        col += T * S * d * ds;",
      "        T *= exp(-d * ds * uAbsorb);",
      "      }",
      "      col += T * uLight * (0.0065 / (0.0022 + dl * dl * dl)) * ds * 1.4;",
      "      tt += ds;",
      "    }",
      "  }",
      "  vec3 bg = uBg;",
      "  bg += vec3(bvStars(rd, 0.6)) * vec3(0.92, 0.95, 1.0) * 1.7;",
      "  bg += vec3(bvStars(rd * 2.4 + 11.0, 0.3)) * vec3(0.7, 0.8, 1.0) * 0.8;",
      "  bg += mix(uColB, uColA, 0.4) * 0.030 * (1.0 - 0.45 * length(uv));",
      "  col += T * bg;",
      "  col = bvTone(col * 1.30);",
      "  col += (dth - 0.5) / 200.0;",
      "  fragColor = vec4(col, 1.0);",
      "}",
    ].join("\n"),
  });

  // 67. Star surface — boiling convective granulation, limb darkening,
  //     magnetically suppressed spots and looping prominences off the limb
  registerShader("starSurface", {
    defaults: {
      speed: 1, temperature: 5200, granulation: 1, spots: 0.55, interactive: true,
      colors: ["#ff5a1e", "#ffd9a0"], background: "#05030a",
    },
    staticTime: 11,
    uniforms: function (o) {
      var k = bvNum(o.temperature, 5200, 1800, 16000);
      return {
        uSpeed: bvNum(o.speed, 1, 0, 6),
        uGran: bvNum(o.granulation, 1, 0, 1),
        uSpots: bvNum(o.spots, 0.55, 0, 1),
        uHot: bvBlackbody(k * 1.06, 1.0),
        uWarm: bvBlackbody(k * 0.62, 0.30),
        uFlare: bvPal(o, 0, "#ff5a1e"),
        uBg: bvC3(o.background || "#05030a"),
      };
    },
    fragment: [
      BV_LIB,
      /* Worley returning F1, F2 and a per-cell id. F2 - F1 is distance to the
       * cell *boundary*, which is what an intergranular lane actually is —
       * thresholding F1 alone gives blobs, not a convection pattern. The id
       * lets each granule have its own brightness so the disk does not read
       * as a uniform mesh. */
      "vec3 bvWorley(vec3 p, float t){",
      "  vec3 ip = floor(p); vec3 fp = fract(p);",
      "  float f1 = 9.0; float f2 = 9.0; float id = 0.0;",
      "  for (int z = -1; z <= 1; z++) {",
      "    for (int y = -1; y <= 1; y++) {",
      "      for (int x = -1; x <= 1; x++) {",
      "        vec3 g = vec3(float(x), float(y), float(z));",
      "        vec3 o = bvH3(ip + g);",
      "        float d = length(g + 0.5 + 0.40 * sin(t + 6.2831853 * o) - fp);",
      "        if (d < f1) { f2 = f1; f1 = d; id = o.y; } else if (d < f2) { f2 = d; }",
      "      }",
      "    }",
      "  }",
      "  return vec3(f1, f2, id);",
      "}",
      "void main(){",
      "  vec2 uv = bvUV();",
      "  float t = uTime * uSpeed;",
      "  float R = 0.80;",
      "  float r = length(uv);",
      "  float px = 2.2 / min(uResolution.x, uResolution.y);",
      "  vec3 col = uBg;",
      "  vec3 rd3 = normalize(vec3(uv, 1.5));",
      "  col += vec3(bvStars(rd3, 0.4)) * 1.1;",
      "  float ang = atan(uv.y, uv.x);",
      /* Corona: streamers falling off steeply with radius. Kept dim — a bright
       * halo swamps the photosphere detail that is the point of the piece. */
      "  float cr = max(r / R, 1.0);",
      "  float stream = 0.35 + 0.65 * bvFbm2(vec3(cos(ang) * 2.1, sin(ang) * 2.1, t * 0.04) * 1.9);",
      "  col += uFlare * pow(1.0 / cr, 5.5) * stream * 0.22;",
      "  col += vec3(1.0, 0.72, 0.42) * pow(1.0 / cr, 13.0) * 0.20;",
      "  float disk = smoothstep(R + px, R - px, r);",
      "  if (disk > 0.001) {",
      "    float mu = sqrt(max(1.0 - (r / R) * (r / R), 0.0));",
      "    vec3 sp = vec3(uv / R, mu);",
      "    sp.yz = bvRot(-0.34) * sp.yz;",
      "    sp.xz = bvRot(t * 0.030) * sp.xz;",
      "    vec3 w1 = bvWorley(sp * 17.0, t * 1.00);",
      "    vec3 w2 = bvWorley(sp * 41.0 + 17.0, t * 1.75);",
      "    float lane1 = smoothstep(0.0, 0.20, w1.y - w1.x);",
      "    float lane2 = smoothstep(0.0, 0.26, w2.y - w2.x);",
      "    float cellB = 0.62 + 0.38 * w1.z;",
      "    float pepper = 0.90 + 0.10 * bvN(sp * 90.0 + t * 0.6);",
      /* Supergranulation: a slow, much larger convective scale under the
       * granules, which is what stops a real photosphere looking tiled. */
      "    float sgran = 0.80 + 0.30 * bvFbm2(sp * 4.6 + vec3(0.0, 0.0, t * 0.05));",
      "    float cells = lane1 * cellB * (0.74 + 0.26 * lane2) * pepper * sgran;",
      "    float gran = mix(0.72, cells, clamp(uGran, 0.0, 1.0));",
      /* Spots: low-frequency field thresholded into penumbra + umbra. Convection
       * is magnetically suppressed inside, so granulation flattens there too. */
      "    float sv = bvFbm3(sp * 2.30 + 31.0);",
      "    float thr = 0.72 - 0.20 * uSpots;",
      "    float pen = smoothstep(thr - 0.09, thr + 0.09, sv);",
      "    float umb = smoothstep(thr + 0.05, thr + 0.15, sv);",
      "    float fil = 0.45 + 0.55 * bvN(sp * 58.0 + t * 0.30);",
      "    float spotDark = mix(1.0, mix(0.30 * fil + 0.05, 0.035, umb), pen);",
      "    gran = mix(gran, 0.26 + 0.14 * gran, pen);",
      /* Limb darkening, I/I0 = 1 - u(1 - cos t) with u = 0.78, plus extra
       * shaping so the very edge falls away the way a photosphere does. */
      "    float limb = (1.0 - 0.78 * (1.0 - mu)) * (0.42 + 0.58 * pow(mu, 0.40));",
      "    vec3 surf = mix(uWarm, uHot, clamp(gran, 0.0, 1.0));",
      "    surf += uHot * pow(clamp(gran, 0.0, 1.0), 6.0) * 0.42;",
      "    surf *= limb * spotDark;",
      /* Faculae: bright magnetic network, only visible near the limb where we
       * see down the side of the granule walls. */
      "    surf += uHot * (1.0 - lane1) * pow(1.0 - mu, 2.4) * 0.55 * (1.0 - pen);",
      "    if (uMouse.z > 0.5) {",
      "      vec2 m = bvMUV();",
      "      float pd = length(uv - m);",
      "      float plage = exp(-pd * pd * 30.0) * disk;",
      "      surf += uHot * plage * 0.9 + vec3(1.0, 0.93, 0.8) * plage * plage * 0.8;",
      "    }",
      "    col = mix(col, surf, disk);",
      "  }",
      "  float above = max(r - R, 0.0);",
      "  col += uFlare * exp(-above * 170.0) * smoothstep(R - px * 2.0, R + px, r) * 1.1;",
      /* Prominences: each loop is the circular arc through two limb footpoints
       * with a given apex height, clipped to its own angular sector. */
      "  float pr = 0.0;",
      "  for (int i = 0; i < 3; i++) {",
      "    float fi = float(i);",
      "    float base = 1.15 + fi * 2.24 + t * 0.030;",
      "    float span = 0.24 + 0.09 * sin(t * 0.21 + fi * 1.7);",
      "    float ht = 0.17 + 0.09 * sin(t * 0.27 + fi * 2.3);",
      "    vec2 upv = vec2(cos(base), sin(base));",
      "    vec2 c1 = vec2(cos(base - span), sin(base - span)) * R;",
      "    vec2 c2 = vec2(cos(base + span), sin(base + span)) * R;",
      "    vec2 mid = 0.5 * (c1 + c2);",
      "    float hw = 0.5 * length(c2 - c1);",
      "    float rr = (hw * hw + ht * ht) / (2.0 * ht);",
      "    vec2 cc = mid + normalize(mid) * (ht - rr);",
      "    float dd = abs(length(uv - cc) - rr);",
      "    float sect = smoothstep(cos(span * 3.1), cos(span * 1.5), dot(normalize(uv + 1e-5), upv));",
      "    float wob = 0.30 + 0.90 * bvFbm2(vec3(uv * 9.0, t * 0.4 + fi * 9.0));",
      "    float outside = smoothstep(R * 0.965, R * 1.01, r) * exp(-above * 5.5);",
      "    pr += exp(-dd * dd * 1600.0) * sect * wob * outside;",
      "  }",
      "  col += uFlare * pr * 1.7 + vec3(1.0, 0.70, 0.46) * pr * pr * 0.8;",
      "  col = bvTone(col * 1.02);",
      "  col += (bvDith(gl_FragCoord.xy) - 0.5) / 220.0;",
      "  fragColor = vec4(col, 1.0);",
      "}",
    ].join("\n"),
  });

  // 68. Atmosphere — planet limb with Rayleigh + Mie single scattering
  //     integrated through an exponential shell, terminator and night airglow
  registerShader("atmosphere", {
    defaults: {
      speed: 1, radius: 1, thickness: 0.10, rayleigh: 1, mie: 1, interactive: true,
      colors: ["#6ff0d0", "#3d7a52"], background: "#02030a",
    },
    staticTime: 8,
    uniforms: function (o) {
      return {
        uSpeed: bvNum(o.speed, 1, 0, 6),
        uRadius: bvNum(o.radius, 1, 0.25, 3),
        uThick: bvNum(o.thickness, 0.10, 0.02, 0.3),
        uRay: bvNum(o.rayleigh, 1, 0, 4) * 0.42,
        uMie: bvNum(o.mie, 1, 0, 4) * 0.42,
        uGlow: bvPal(o, 0, "#6ff0d0"),
        uLand: bvPal(o, 1, "#3d7a52"),
        uBg: bvC3(o.background || "#02030a"),
      };
    },
    fragment: [
      BV_LIB,
      "void main(){",
      "  vec2 uv = bvUV();",
      "  float t = uTime * uSpeed;",
      "  float dth = bvDith(gl_FragCoord.xy);",
      "  float R = 1.0;",
      "  float Ra = R + uThick;",
      /* Camera sits just off the planet; the aim is pitched so the limb crosses
       * the lower third and space fills the top. */
      "  float D = 1.0 + 0.92 / uRadius;",
      "  vec3 ro = vec3(0.0, 0.0, -D);",
      "  vec3 rd = normalize(vec3(uv, 1.55));",
      "  rd.yz = bvRot(-0.60) * rd.yz;",
      "  float sa = 1.32 + t * 0.15;",
      "  float se = 0.20 + 0.12 * sin(t * 0.085);",
      "  if (uMouse.z > 0.5) { vec2 m = bvMUV(); sa = 1.55 + m.x * 2.3; se = m.y * 0.95; }",
      "  vec3 sun = normalize(vec3(sin(sa) * cos(se), sin(se), cos(sa) * cos(se)));",
      "  vec2 ta = bvSph(ro, rd, Ra);",
      "  vec2 tp = bvSph(ro, rd, R);",
      "  bool onPlanet = (tp.y > tp.x) && (tp.x > 0.0);",
      "  vec3 base = uBg;",
      "  base += vec3(bvStars(rd, 0.55)) * 1.7;",
      "  base += vec3(bvStars(rd * 2.6 + 5.0, 0.30)) * vec3(0.78, 0.85, 1.0) * 0.85;",
      "  if (onPlanet) {",
      "    vec3 hp = ro + rd * tp.x;",
      "    vec3 n = normalize(hp);",
      "    float ndl = dot(n, sun);",
      "    float lam = max(ndl, 0.0);",
      "    float land = bvFbm3(n * 1.95 + 4.0);",
      "    float isLand = smoothstep(0.520, 0.575, land);",
      "    vec3 alb = mix(vec3(0.008, 0.030, 0.086), uLand, isLand);",
      "    alb = mix(alb, uLand * vec3(1.9, 1.45, 0.80), isLand * smoothstep(0.60, 0.70, land) * 0.8);",
      "    float ice = smoothstep(0.76, 0.93, abs(n.y));",
      "    alb = mix(alb, vec3(0.78, 0.83, 0.88), ice);",
      "    float cl = smoothstep(0.585, 0.760, bvFbm3(n * 2.70 + vec3(t * 0.045, 0.0, 0.0)));",
      "    alb = mix(alb, vec3(0.90, 0.92, 0.96), cl * 0.88);",
      "    float spec = pow(max(dot(reflect(-sun, n), -rd), 0.0), 60.0) * (1.0 - isLand) * (1.0 - cl);",
      "    base = alb * lam * 2.10 + vec3(1.0, 0.95, 0.86) * spec * 2.6;",
      /* City lights only where the surface is land and the sun is below the
       * local horizon — the cue that reads instantly as an inhabited planet. */
      "    float city = smoothstep(0.64, 0.82, bvFbm3(n * 7.3 + 20.0)) * isLand * (1.0 - ice);",
      "    base += vec3(1.0, 0.66, 0.30) * city * smoothstep(0.04, -0.26, ndl) * 0.95 * (1.0 - cl);",
      "  }",
      "  vec3 col = base;",
      "  if (ta.y > ta.x && ta.y > 0.0) {",
      "    float t0 = max(ta.x, 0.0);",
      "    float t1 = onPlanet ? tp.x : ta.y;",
      "    if (t1 > t0) {",
      "      float ds = (t1 - t0) / 24.0;",
      "      float tt = t0 + ds * dth;",
      "      float Hr = uThick * 0.33;",
      "      float Hm = uThick * 0.11;",
      /* Wavelength^-4 gives the 5.8 / 13.5 / 33.1 ratio — blue scatters out of
       * the transmitted beam and into the limb, so the rim goes blue while a
       * low sun seen through a long path goes red. */
      "      vec3 bR = vec3(5.80, 13.50, 33.10) * uRay;",
      "      float bM = 21.0 * uMie;",
      "      float odR = 0.0; float odM = 0.0; float glow = 0.0;",
      "      vec3 sumR = vec3(0.0); vec3 sumM = vec3(0.0);",
      "      for (int i = 0; i < 24; i++) {",
      "        vec3 p = ro + rd * tt;",
      "        float hh = length(p) - R;",
      "        float rr = exp(-hh / Hr) * ds;",
      "        float mm = exp(-hh / Hm) * ds;",
      "        odR += rr; odM += mm;",
      "        float nl = dot(normalize(p), sun);",
      "        float ag = exp(-pow((hh - uThick * 0.36) / (uThick * 0.11), 2.0));",
      "        glow += ag * smoothstep(0.18, -0.28, nl) * ds;",
      "        vec2 tps = bvSph(p, sun, R);",
      "        bool shadowed = (tps.y > tps.x) && (tps.x > 0.0);",
      "        if (!shadowed) {",
      "          vec2 tl = bvSph(p, sun, Ra);",
      "          float dls = max(tl.y, 0.0) / 6.0;",
      "          float lt = dls * 0.5;",
      "          float lR = 0.0; float lM = 0.0;",
      "          for (int j = 0; j < 6; j++) {",
      "            float hj = length(p + sun * lt) - R;",
      "            lR += exp(-hj / Hr) * dls;",
      "            lM += exp(-hj / Hm) * dls;",
      "            lt += dls;",
      "          }",
      "          vec3 att = exp(-(bR * (odR + lR) + bM * 1.1 * (odM + lM)));",
      "          sumR += rr * att;",
      "          sumM += mm * att;",
      "        }",
      "        tt += ds;",
      "      }",
      "      float cth = dot(rd, sun);",
      "      float phR = 0.75 * (1.0 + cth * cth);",
      "      float phM = bvHG(cth, 0.76) * 0.075;",
      "      vec3 scat = (sumR * bR * phR + sumM * bM * phM) * 5.2;",
      "      vec3 ext = exp(-(bR * odR + bM * odM));",
      "      col = base * ext + scat + uGlow * glow * 5.5;",
      "    }",
      "  }",
      "  col = bvTone(col * 1.08);",
      "  col += (dth - 0.5) / 200.0;",
      "  fragColor = vec4(col, 1.0);",
      "}",
    ].join("\n"),
  });

  // 69. Dust lanes — self-shadowing interstellar dust silhouetted against a
  //     glowing star field, with wavelength-dependent extinction (reddening)
  registerShader("dustLanes", {
    defaults: {
      speed: 1, density: 1, shadowSteps: 4, extinction: 1, interactive: true,
      colors: ["#ffd6a5", "#8ec5ff"], background: "#04050e",
    },
    staticTime: 12,
    uniforms: function (o) {
      return {
        uSpeed: bvNum(o.speed, 1, 0, 6),
        uDensity: bvNum(o.density, 1, 0.05, 4),
        uShadow: Math.round(bvNum(o.shadowSteps, 4, 0, 6)),
        uExt: bvNum(o.extinction, 1, 0.1, 4) * 2.45,
        uWarm: bvPal(o, 0, "#ffd6a5"),
        uCool: bvPal(o, 1, "#8ec5ff"),
        uBg: bvC3(o.background || "#04050e"),
      };
    },
    fragment: [
      BV_LIB,
      /* Two components: thresholded clumps for the body of the cloud and a
       * sharpened ridge for the thin filaments that thread through it. Taking
       * the ridge alone would fill the frame, because ridged noise peaks at the
       * *most common* value of the underlying field. */
      "float bvShapeD(vec3 p, float f){",
      "  float body = smoothstep(0.505, 0.700, f);",
      "  float fil = pow(1.0 - abs(f * 2.0 - 1.0), 6.0);",
      "  float y = p.y + 0.62 * sin(p.x * 0.42 + 0.7) + 0.22 * sin(p.z * 0.5);",
      "  float slab = exp(-y * y * 2.6);",
      "  return (body * 1.15 + fil * 0.55) * slab * 2.25;",
      "}",
      "float bvDust(vec3 p, float t){",
      "  vec3 q = p; q.x -= t * 0.17; q.y += t * 0.035;",
      "  return bvShapeD(p, bvFbm4(q * 0.85));",
      "}",
      "float bvDustLo(vec3 p, float t){",
      "  vec3 q = p; q.x -= t * 0.17; q.y += t * 0.035;",
      "  return bvShapeD(p, bvFbm2(q * 0.85));",
      "}",
      /* The luminous field the dust is seen against. Angular coordinates
       * (rd.xy / rd.z) keep the features compact under a narrow field of view
       * while still parallaxing correctly as the camera drifts. */
      "vec3 bvField(vec3 rd){",
      "  vec3 n = normalize(rd);",
      "  vec2 s = n.xy / max(n.z, 0.2);",
      "  vec3 c = uBg;",
      "  float b = (s.y + 0.05 + 0.10 * sin(s.x * 4.2)) * 4.6;",
      "  c += uWarm * exp(-b * b) * 0.55;",
      "  vec2 dc = s - vec2(0.13, -0.02);",
      "  c += uWarm * exp(-dot(dc, dc) * 26.0) * 1.55;",
      "  c += mix(uCool, vec3(1.0), 0.55) * exp(-dot(dc, dc) * 5.0) * 0.20;",
      "  c += vec3(bvStars(n, 0.66)) * 2.4;",
      "  c += vec3(bvStars(n * 2.7 + 9.0, 0.36)) * mix(uCool, vec3(1.0), 0.4) * 1.1;",
      "  return c;",
      "}",
      "void main(){",
      "  vec2 uv = bvUV();",
      "  float t = uTime * uSpeed;",
      "  float dth = bvDith(gl_FragCoord.xy);",
      "  vec3 ro = vec3(0.30 * sin(t * 0.045), 0.08 * sin(t * 0.031), -2.6);",
      "  vec3 rd = normalize(vec3(uv * 0.60, 1.35));",
      "  rd.xz = bvRot(0.16 * sin(t * 0.10)) * rd.xz;",
      "  vec3 L = vec3(-1.05, 0.75, 0.20);",
      "  if (uMouse.z > 0.5) { vec2 m = bvMUV(); L = vec3(m.x * 1.7, m.y * 1.3, 0.15); }",
      /* Dust scatters cool (small grains favour blue) and transmits warm, so the
       * background reddens through a lane exactly as it does across a real
       * molecular cloud. One extinction coefficient per channel is all it takes. */
      "  vec3 extTint = vec3(0.52, 0.82, 1.42);",
      "  vec3 T = vec3(1.0);",
      "  vec3 col = vec3(0.0);",
      "  float ds = 0.115;",
      "  float tt = 0.55 + ds * dth;",
      "  for (int i = 0; i < 42; i++) {",
      "    if (T.r < 0.008) break;",
      "    vec3 p = ro + rd * tt;",
      "    float d = bvDust(p, t) * uDensity;",
      "    if (d > 0.004) {",
      "      vec3 pl = L - p;",
      "      float dl = max(length(pl), 1e-4);",
      "      vec3 ld = pl / dl;",
      /* Self-shadowing: a handful of short steps toward the light. Without this
       * the dust is a flat stencil; with it, it has volume. */
      "      float sh = 0.0;",
      "      vec3 sp = p;",
      "      for (int j = 0; j < 6; j++) {",
      "        if (float(j) >= uShadow) break;",
      "        sp += ld * 0.22;",
      "        sh += bvDustLo(sp, t) * uDensity;",
      "      }",
      "      float shT = exp(-sh * 0.22 * uExt * 0.9);",
      "      float ph = bvHG(dot(rd, ld), 0.42);",
      "      float fall = 2.2 / (0.45 + dl * dl);",
      "      vec3 scat = uCool * shT * ph * fall * 0.52 + uWarm * 0.05;",
      "      col += T * scat * d * ds;",
      "      T *= exp(-d * ds * uExt * extTint);",
      "    }",
      "    tt += ds;",
      "  }",
      "  col += T * bvField(rd);",
      "  col = bvTone(col * 1.32);",
      "  col += (dth - 0.5) / 200.0;",
      "  fragColor = vec4(col, 1.0);",
      "}",
    ].join("\n"),
  });

  // 70. Protoplanetary disk — flared vertical scale height, planet-carved gaps,
  //     forward-scattering near-edge asymmetry, starlight shadowed by the midplane
  registerShader("protoplanetary", {
    defaults: {
      speed: 1, inclination: 62, gaps: 3, flare: 0.3, interactive: true,
      colors: ["#ffb066", "#8fb6ff", "#fff2dc"], background: "#03030b",
    },
    staticTime: 16,
    uniforms: function (o) {
      /* Astronomer's convention: 0 deg is face-on, 90 deg is edge-on. The
       * shader wants the camera's elevation above the midplane, so flip it. */
      var inc = bvNum(o.inclination, 62, 0, 88);
      return {
        uSpeed: bvNum(o.speed, 1, 0, 6),
        uElev: (90 - inc) * Math.PI / 180,
        uGaps: Math.round(bvNum(o.gaps, 3, 0, 4)),
        uFlare: bvNum(o.flare, 0.3, 0, 1),
        uColA: bvPal(o, 0, "#ffb066"),
        uColB: bvPal(o, 1, "#8fb6ff"),
        uStar: bvPal(o, 2, "#fff2dc"),
        uBg: bvC3(o.background || "#03030b"),
      };
    },
    fragment: [
      BV_LIB,
      "const float BV_RIN = 0.30;",
      "const float BV_ROUT = 2.45;",
      /* H(r) grows with radius — that flare is what lets starlight graze the
       * upper surface while the midplane stays in its own shadow. */
      "float bvH(float r){ return 0.055 * pow(max(r, 0.05), 1.0 + uFlare * 1.5); }",
      "float bvDisk(vec3 p, float t){",
      "  float r = length(p.xz);",
      "  if (r < BV_RIN || r > BV_ROUT) return 0.0;",
      "  float H = bvH(r);",
      "  float z = p.y / H;",
      "  float vert = exp(-0.5 * z * z);",
      "  float sig = pow(r, -0.80)",
      "            * smoothstep(BV_RIN, BV_RIN * 1.55, r)",
      "            * smoothstep(BV_ROUT, BV_ROUT * 0.62, r);",
      /* Gaps carved by forming planets: gaussian troughs at fixed radii, each
       * with a slightly brighter pile-up on its outer edge. */
      "  for (int i = 0; i < 4; i++) {",
      "    float on = step(float(i) + 0.5, uGaps);",
      "    float rg = 0.58 + float(i) * 0.46;",
      "    float w = 0.062 + 0.016 * float(i);",
      "    float g = (r - rg) / w;",
      "    sig *= 1.0 - on * 0.95 * exp(-g * g);",
      "    float go = (r - rg - w * 2.1) / (w * 1.5);",
      "    sig *= 1.0 + on * 0.45 * exp(-go * go);",
      "  }",
      /* Keplerian shear: inner annuli wind up faster than outer ones, so the
       * texture stretches into trailing arms instead of rotating rigidly. */
      "  float a = atan(p.z, p.x) - t * 0.50 * pow(max(r, 0.18), -1.5);",
      "  float tex = 0.50 + 0.50 * bvFbm2(vec3(cos(a) * r * 2.1, p.y * 2.2, sin(a) * r * 2.1) * 1.25);",
      "  return sig * vert * tex * 5.0;",
      "}",
      "void main(){",
      "  vec2 uv = bvUV();",
      "  float t = uTime * uSpeed;",
      "  float dth = bvDith(gl_FragCoord.xy);",
      "  vec3 ro = vec3(0.0, 0.0, -5.4);",
      "  vec3 rd = normalize(vec3(uv, 2.05));",
      "  float elev = uElev;",
      "  if (uMouse.z > 0.5) { vec2 m = bvMUV(); elev = clamp(elev + m.y * 0.45, 0.04, 1.52); }",
      "  ro.yz = bvRot(elev) * ro.yz; rd.yz = bvRot(elev) * rd.yz;",
      "  float spin = t * 0.020;",
      "  ro.xz = bvRot(spin) * ro.xz; rd.xz = bvRot(spin) * rd.xz;",
      "  vec3 col = uBg;",
      "  col += vec3(bvStars(rd, 0.5)) * 1.6;",
      "  col += vec3(bvStars(rd * 2.5 + 7.0, 0.28)) * vec3(0.8, 0.86, 1.0) * 0.75;",
      "  float T = 1.0;",
      "  vec3 acc = vec3(0.0);",
      "  vec2 hit = bvSph(ro, rd, BV_ROUT + 0.15);",
      "  if (hit.y > hit.x && hit.y > 0.0) {",
      "    float t0 = max(hit.x, 0.0);",
      "    float ds = (hit.y - t0) / 46.0;",
      "    float tt = t0 + ds * dth;",
      "    for (int i = 0; i < 46; i++) {",
      "      if (T < 0.010) break;",
      "      vec3 p = ro + rd * tt;",
      "      float dd = dot(p, p);",
      "      float d = bvDisk(p, t);",
      "      if (d > 0.004) {",
      "        float rr = max(sqrt(dd), 0.12);",
      "        vec3 toStar = -p / rr;",
      /* Soft rather than strict inverse-square: a true 1/r^2 leaves everything
       * past the first gap invisible, and the disk is the subject. */
      "        float irr = 1.0 / (0.20 + rr * rr * 0.55);",
      /* Starlight attenuated on its way out: three taps back toward the star.
       * Midplane material ends up shadowed by the material inside it. */
      "        float tau = 0.0;",
      "        float sds = rr / 3.0;",
      "        vec3 sp = p;",
      "        for (int j = 0; j < 3; j++) { sp += toStar * sds; tau += bvDisk(sp, t); }",
      "        float shade = exp(-tau * sds * 2.4);",
      /* Forward scattering: light leaving the star along normalize(p) carries on
       * toward the camera along -rd, so the near edge of the disk lights up and
       * the far edge falls back — the asymmetry that makes it read as tilted. */
      "        float ph = bvHG(dot(p / rr, -rd), 0.52);",
      "        vec3 tint = mix(uColA, uColB, smoothstep(BV_RIN * 1.5, BV_ROUT * 0.80, rr));",
      "        vec3 S = tint * (irr * shade * ph * 0.42 + 0.045);",
      "        acc += T * S * d * ds;",
      "        T *= exp(-d * ds * 2.35);",
      "      }",
      /* The star itself: a tight core plus a halo, both occluded by whatever
       * the ray has already crossed. */
      "      acc += T * uStar * exp(-dd * 150.0) * ds * 4.5;",
      "      acc += T * uStar * (0.0016 / (0.004 + dd * dd)) * ds * 0.55;",
      "      tt += ds;",
      "    }",
      "  }",
      "  col = col * T + acc;",
      "  col = bvTone(col * 1.16);",
      "  col += (dth - 0.5) / 200.0;",
      "  fragColor = vec4(col, 1.0);",
      "}",
    ].join("\n"),
  });

  /* ============================================================
   * Instruments — real astronomical readouts, made live.
   * Shared chrome helpers are prefixed `ins` so they cannot collide
   * with the core utilities or with any other snippet spliced in.
   * ========================================================== */

  var INS_MONO = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
  var INS_CW = 6.02; // advance width of one 10px monospace glyph

  function insTxt(c, s, x, y, col, a, align) {
    c.font = INS_MONO;
    c.textAlign = align || "left";
    c.textBaseline = "alphabetic";
    c.fillStyle = rgba(col, a);
    c.fillText(s, Math.round(x), Math.round(y));
    c.textAlign = "left";
  }
  function insRule(c, x1, y1, x2, y2, col, a, w) {
    c.strokeStyle = rgba(col, a);
    c.lineWidth = w || 1;
    c.beginPath();
    if (y1 === y2) { var yy = Math.round(y1) + 0.5; c.moveTo(x1, yy); c.lineTo(x2, yy); }
    else if (x1 === x2) { var xx = Math.round(x1) + 0.5; c.moveTo(xx, y1); c.lineTo(xx, y2); }
    else { c.moveTo(x1, y1); c.lineTo(x2, y2); }
    c.stroke();
  }
  function insBox(c, x, y, w, hh, col, a) {
    c.strokeStyle = rgba(col, a);
    c.lineWidth = 1;
    c.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(hh));
  }
  /* Instrument chrome derived from the host palette, so a themed surface
   * restains its grid and labels instead of ignoring `colors`. */
  function insChrome(h, pal) {
    var bg = hexToRgb(h.opts.background || "#04060f");
    var w = { r: 255, g: 255, b: 255 };
    return {
      bg: bg,
      grid: mixRgb(bg, pal[0], 0.22),
      axis: mixRgb(bg, pal[0], 0.5),
      label: mixRgb(pal[0], w, 0.5),
      hi: pal[pal.length - 1],
      data: pal[0],
    };
  }
  // Deterministic hash so a rebuilt panel keeps the same "sky".
  function insHash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  // Roughly-normal deviate: three uniforms has plenty of shape for noise floors.
  function insGauss() { return (Math.random() + Math.random() + Math.random() - 1.5) * 2; }

  /* Blackbody colour (Tanner Helland's fit to the Planckian locus). */
  function insBB(K) {
    var t = clamp(K, 1000, 40000) / 100, r, g, b;
    if (t <= 66) r = 255; else r = clamp(329.698727446 * Math.pow(t - 60, -0.1332047592), 0, 255);
    if (t <= 66) g = clamp(99.4708025861 * Math.log(t) - 161.1195681661, 0, 255);
    else g = clamp(288.1221695283 * Math.pow(t - 60, -0.0755148492), 0, 255);
    if (t >= 66) b = 255;
    else if (t <= 19) b = 0;
    else b = clamp(138.5177312231 * Math.log(t - 10) - 305.0447927307, 0, 255);
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  }
  /* Approximate sRGB for a single visible wavelength in nm. */
  function insWaveRgb(nm) {
    var r = 0, g = 0, b = 0, f = 1;
    if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
    else if (nm <= 781) { r = 1; }
    if (nm < 420) f = 0.25 + 0.75 * (nm - 380) / 40;
    else if (nm > 700) f = 0.25 + 0.75 * (781 - nm) / 81;
    return {
      r: Math.round(255 * Math.pow(clamp(r * f, 0, 1), 0.85)),
      g: Math.round(255 * Math.pow(clamp(g * f, 0, 1), 0.85)),
      b: Math.round(255 * Math.pow(clamp(b * f, 0, 1), 0.85)),
    };
  }
  /* Planck spectral radiance, arbitrary scale. c2 = hc/k in nm·K. */
  function insPlanck(nm, T) {
    var x = 1.4387769e7 / (nm * T);
    if (x > 60) return 0;
    return 1 / (Math.pow(nm * 1e-3, 5) * (Math.exp(x) - 1));
  }

  // 71. Spectrograph — stellar absorption spectrum over a Planck continuum
  registerAnimation("spectrograph", {
    defaults: {
      temperature: 5778, lines: true, speed: 1, interactive: true,
      colors: ["#22d3ee", "#7c5cff"], background: "#04060f",
    },
    setup: function (h) {
      var LO = 380, HI = 700;                 // nm shown
      var pal, ch, L, R, T0, B0, contPeak, cont, absorb, noiseA, noiseB, noiseT, scan, cols;
      var band = { y: 0, h: 0 }, plot = { y: 0, h: 0 };

      // Fraunhofer lines: wavelength, label, depth, gaussian width (nm)
      var LINES = [
        { w: 393.37, n: "Ca K", d: 0.72, s: 1.7, tag: 1 },
        { w: 396.85, n: "Ca H", d: 0.62, s: 1.5, tag: 0 },
        { w: 410.17, n: "Hδ", d: 0.38, s: 1.0, tag: 0 },
        { w: 434.05, n: "Hγ", d: 0.44, s: 1.1, tag: 0 },
        { w: 438.36, n: "Fe", d: 0.30, s: 0.7, tag: 0 },
        { w: 486.13, n: "Hβ", d: 0.55, s: 1.3, tag: 1 },
        { w: 516.73, n: "Mg b", d: 0.50, s: 1.5, tag: 1 },
        { w: 527.04, n: "Fe", d: 0.32, s: 0.8, tag: 0 },
        { w: 588.99, n: "Na D", d: 0.58, s: 1.0, tag: 1 },
        { w: 589.59, n: "Na D2", d: 0.52, s: 1.0, tag: 0 },
        { w: 630.25, n: "Fe", d: 0.24, s: 0.6, tag: 0 },
        { w: 656.28, n: "Hα", d: 0.66, s: 1.9, tag: 1 },
        { w: 686.72, n: "O2", d: 0.30, s: 0.9, tag: 0 },
      ];
      var FOREST = [];   // weak metal-line forest, seeded so it never reshuffles
      for (var q = 0; q < 90; q++) {
        FOREST.push({
          w: LO + insHash(q * 3.1) * (HI - LO),
          d: 0.05 + insHash(q * 7.7) * 0.17,
          s: 0.35 + insHash(q * 5.3) * 0.5,
        });
      }

      function nmAt(x) { return LO + ((x - L) / (R - L)) * (HI - LO); }
      function xAt(nm) { return L + ((nm - LO) / (HI - LO)) * (R - L); }

      function depthScale() {
        // Balmer lines peak near A0 (~9500 K); metals dominate in cool stars.
        var T = h.opts.temperature;
        var balmer = Math.exp(-Math.pow((Math.log(T / 9500)) / 0.42, 2));
        var metal = clamp((7500 - T) / 3600, 0, 1) * 0.8 + 0.35;
        return { balmer: 0.35 + balmer * 0.9, metal: metal };
      }

      function build() {
        pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff"]);
        ch = insChrome(h, pal);
        L = 34; R = h.width - 12;
        band.y = 25; band.h = Math.max(20, Math.round(h.height * 0.135));
        plot.y = band.y + band.h + 22;
        plot.h = Math.max(50, h.height - plot.y - 66);
        T0 = h.opts.temperature;
        cols = Math.max(8, Math.round(R - L));

        // Normalise the continuum on its own peak inside the shown window.
        contPeak = 0;
        var i, nm;
        for (i = 0; i <= 320; i++) {
          var v = insPlanck(LO + i, T0);
          if (v > contPeak) contPeak = v;
        }
        B0 = depthScale();
        cont = []; absorb = [];
        for (i = 0; i < cols; i++) {
          nm = nmAt(L + i + 0.5);
          cont.push(insPlanck(nm, T0) / contPeak);
          var a = 1, j, ln, amp;
          for (j = 0; j < LINES.length; j++) {
            ln = LINES[j];
            amp = ln.d * (ln.n.charAt(0) === "H" ? B0.balmer : B0.metal);
            a *= 1 - clamp(amp, 0, 0.95) * Math.exp(-Math.pow((nm - ln.w) / ln.s, 2));
          }
          for (j = 0; j < FOREST.length; j++) {
            ln = FOREST[j];
            a *= 1 - ln.d * B0.metal * 0.55 * Math.exp(-Math.pow((nm - ln.w) / ln.s, 2));
          }
          absorb.push(a);
        }
        noiseA = []; noiseB = [];
        for (i = 0; i < cols; i++) { noiseA.push(insGauss()); noiseB.push(insGauss()); }
        noiseT = 0;
        scan = 0.32;
      }
      build();

      function sptype(T) {
        if (T >= 30000) return "O";
        if (T >= 10000) return "B";
        if (T >= 7500) return "A";
        if (T >= 6000) return "F";
        if (T >= 5200) return "G";
        if (T >= 3700) return "K";
        return "M";
      }

      return {
        resize: build,
        update: build,
        draw: function (t, dt) {
          clearBG(h);
          var c = h.ctx, i, x, y;
          var sp = h.opts.speed;

          // photon noise: two seeded draws cross-faded, so successive frames
          // read as successive integrations rather than per-pixel hash.
          noiseT += dt * 3.4 * sp;
          if (noiseT >= 1) {
            noiseT -= 1;
            noiseA = noiseB; noiseB = [];
            for (i = 0; i < cols; i++) noiseB.push(insGauss());
          }
          var nAmp = 0.016;

          // ---- header -------------------------------------------------
          insTxt(c, "SPECTROGRAPH", L, 15, ch.label, 0.9);
          insTxt(c, "R~9000  " + Math.round(T0) + " K  " + sptype(T0) + "-type", R, 15, ch.label, 0.55, "right");

          // ---- dispersed colour band ---------------------------------
          var flux = [];
          for (i = 0; i < cols; i++) {
            var n = lerp(noiseA[i], noiseB[i], noiseT) * nAmp;
            flux.push(clamp(cont[i] * absorb[i] + n * cont[i], 0, 1.25));
          }
          for (i = 0; i < cols; i++) {
            var nm = nmAt(L + i + 0.5);
            var wc = insWaveRgb(nm);
            var lum = clamp(0.1 + 0.9 * flux[i] / Math.max(0.06, cont[i] === 0 ? 1 : 1), 0, 1);
            lum = clamp(flux[i] / Math.max(cont[i], 0.02), 0, 1);      // line contrast
            var bright = clamp(0.18 + 0.82 * Math.pow(cont[i], 0.42), 0, 1); // continuum shape
            var k = lum * bright;
            c.fillStyle = "rgb(" + Math.round(wc.r * k) + "," + Math.round(wc.g * k) + "," + Math.round(wc.b * k) + ")";
            c.fillRect(L + i, band.y, 1.02, band.h);
          }
          insBox(c, L, band.y, R - L, band.h, ch.axis, 0.5);

          // ---- named line tags ---------------------------------------
          if (h.opts.lines !== false) {
            for (i = 0; i < LINES.length; i++) {
              if (!LINES[i].tag) continue;
              x = xAt(LINES[i].w);
              if (x < L + 8 || x > R - 8) continue;
              insRule(c, x, band.y + band.h, x, band.y + band.h + 5, ch.label, 0.6);
              insTxt(c, LINES[i].n, x, band.y + band.h + 16, ch.label, 0.82, "center");
            }
          }

          // ---- flux plot ----------------------------------------------
          var py = plot.y, ph = plot.h, yTop = 1.12;
          var FT = [0, 0.5, 1];
          for (i = 0; i < FT.length; i++) {
            y = py + ph - (FT[i] / yTop) * ph;
            insRule(c, L, y, R, y, ch.grid, i === 0 ? 0.85 : 0.5);
            insTxt(c, FT[i].toFixed(1), L - 6, y + 3.5, ch.label, 0.5, "right");
          }
          // continuum reference
          c.setLineDash([3, 3]);
          c.strokeStyle = rgba(ch.hi, 0.6); c.lineWidth = 1;
          c.beginPath();
          for (i = 0; i < cols; i++) {
            x = L + i; y = py + ph - (cont[i] / yTop) * ph;
            if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
          }
          c.stroke(); c.setLineDash([]);
          // observed spectrum
          c.strokeStyle = rgba(ch.data, 0.95); c.lineWidth = 1.15;
          c.beginPath();
          for (i = 0; i < cols; i++) {
            x = L + i; y = py + ph - (clamp(flux[i], 0, yTop) / yTop) * ph;
            if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
          }
          c.stroke();
          insRule(c, L, py + ph, R, py + ph, ch.axis, 0.8);
          insRule(c, L, py, L, py + ph, ch.axis, 0.55);

          // ---- wavelength axis ----------------------------------------
          var ay = py + ph;
          for (var nmt = 400; nmt <= HI; nmt += 50) {
            x = xAt(nmt);
            insRule(c, x, ay, x, ay + 4, ch.axis, 0.8);
            var edge = x > R - 14;
            insTxt(c, String(nmt), edge ? R : x, ay + 15, ch.label, 0.6, edge ? "right" : "center");
          }
          insTxt(c, "WAVELENGTH (nm)", R, ay + 27, ch.label, 0.42, "right");

          // ---- scanning cursor + readout ------------------------------
          var frac;
          if (h.opts.interactive !== false && h.mouse.active) {
            frac = clamp((h.mouse.x - L) / (R - L), 0, 1);
            scan = frac;
          } else {
            scan += dt * 0.055 * sp;
            if (scan > 1.4) scan -= 1.4;
            frac = clamp(scan, 0, 1);
          }
          var cx = L + frac * (R - L), cnm = nmAt(cx);
          var ci = clamp(Math.round(frac * (cols - 1)), 0, cols - 1);
          c.setLineDash([2, 3]);
          insRule(c, cx, band.y, cx, py + ph, ch.hi, 0.75);
          c.setLineDash([]);
          var cy = py + ph - (clamp(flux[ci], 0, yTop) / yTop) * ph;
          c.fillStyle = rgba(ch.hi, 1);
          c.beginPath(); c.arc(cx, cy, 2.6, 0, TAU()); c.fill();

          // nearest identified line under the cursor
          var best = null, bd = 4.2;
          for (i = 0; i < LINES.length; i++) {
            var d2 = Math.abs(LINES[i].w - cnm);
            if (d2 < bd) { bd = d2; best = LINES[i]; }
          }
          var fy = h.height - 26;
          insRule(c, L, fy, R, fy, ch.grid, 0.8);
          var ratio = flux[ci] / Math.max(cont[ci], 1e-4);
          insTxt(c, "λ " + cnm.toFixed(1) + " nm", L, fy + 15, ch.hi, 0.95);
          insTxt(c, "I/Ic " + clamp(ratio, 0, 9).toFixed(3), L + 106, fy + 15, ch.label, 0.75);
          insTxt(c, best ? "ID  " + best.n + " " + best.w.toFixed(2) : "ID  continuum",
            L + 196, fy + 15, best ? ch.data : ch.label, best ? 0.95 : 0.5);
          insTxt(c, h.mouse.active ? "CURSOR" : "AUTO-SCAN", R, fy + 15, ch.label, 0.4, "right");
        },
      };
    },
  });

  // 72. Transit curve — exoplanet transit with a limb-darkened light curve
  registerAnimation("transitCurve", {
    defaults: {
      radiusRatio: 0.12, period: 3.4, limbDarkening: 0.6, impact: 0.28,
      teff: 5800, speed: 1, colors: ["#22d3ee", "#7c5cff"], background: "#04060f",
    },
    setup: function (h) {
      var pal, ch, k, u, b, P, aRs, xMax, curve, N = 420;
      var star = { cx: 0, cy: 0, r: 0 }, lc = { x: 0, y: 0, w: 0, h: 0 };
      var depth, T14, fLo, fHi, phase, pts, gran, starCol, lastIdx;

      function limb(r) { return r >= 1 ? 0 : 1 - u * (1 - Math.sqrt(1 - r * r)); }

      /* Flux with the planet centre d stellar radii from disk centre.
       * Numeric integration over the planet disk — handles ingress exactly
       * and produces the curved (not flat) limb-darkened floor. */
      function fluxAt(d) {
        if (d >= 1 + k) return 1;
        var NR = 13, NA = 26, sum = 0, i, j;
        var dr = k / NR;
        for (i = 0; i < NR; i++) {
          var rho = (i + 0.5) * dr;
          for (j = 0; j < NA; j++) {
            var phi = (j + 0.5) / NA * TAU();
            var rr = Math.sqrt(d * d + rho * rho + 2 * d * rho * Math.cos(phi));
            sum += limb(rr) * rho;
          }
        }
        sum *= dr * (TAU() / NA);
        return 1 - sum / (Math.PI * (1 - u / 3));
      }

      function build() {
        pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff"]);
        ch = insChrome(h, pal);
        k = clamp(h.opts.radiusRatio, 0.02, 0.35);
        u = clamp(h.opts.limbDarkening, 0, 0.95);
        b = clamp(h.opts.impact, 0, 0.95);
        P = Math.max(0.2, h.opts.period);
        // a/Rs from Kepler's third law for a solar-density host.
        var Ps = P * 86400;
        aRs = Math.pow(6.674e-11 * 1408 * Ps * Ps / (3 * Math.PI), 1 / 3);
        xMax = Math.sqrt(Math.max(0.02, (1 + k) * (1 + k) - b * b)) + 0.55;
        T14 = P * 24 / Math.PI * Math.asin(clamp(Math.sqrt((1 + k) * (1 + k) - b * b) / aRs, -1, 1));

        curve = [];
        var i, minF = 1;
        for (i = 0; i <= N; i++) {
          var xs = -xMax + (2 * xMax) * (i / N);
          var f = fluxAt(Math.sqrt(xs * xs + b * b));
          curve.push(f);
          if (f < minF) minF = f;
        }
        depth = 1 - minF;
        fHi = 1 + depth * 0.30;
        fLo = 1 - depth * 1.30;

        star.r = Math.min(50, h.height * 0.185);
        star.cx = 14 + xMax * star.r;
        star.cy = 26 + Math.max(star.r + 6, h.height * 0.20);
        lc.x = 44; lc.w = h.width - 56;
        lc.y = Math.round(h.height * 0.53); lc.h = Math.round(h.height * 0.31);

        starCol = insBB(h.opts.teff);
        gran = [];
        for (i = 0; i < 46; i++) {
          gran.push({
            lon: insHash(i * 1.7) * TAU(),
            lat: Math.asin(insHash(i * 4.3) * 1.8 - 0.9),
            s: 0.10 + insHash(i * 9.1) * 0.13,
            v: insHash(i * 2.9) - 0.45,
          });
        }
        phase = 0.34;
        pts = [];
        lastIdx = -1;
      }
      build();

      function fx(f) { return lc.y + lc.h - ((f - fLo) / (fHi - fLo)) * lc.h; }

      return {
        resize: build,
        update: build,
        draw: function (t, dt) {
          clearBG(h);
          var c = h.ctx, i, x, y;

          phase += dt * 0.085 * h.opts.speed;
          if (phase >= 1) { phase -= 1; pts = []; lastIdx = -1; }
          var idx = Math.floor(phase * N);
          var xs = -xMax + 2 * xMax * phase;
          var d = Math.sqrt(xs * xs + b * b);
          var fNow = curve[clamp(idx, 0, N)];

          // accumulate one photometric sample per curve bin, with scatter
          if (idx > lastIdx) {
            for (i = Math.max(0, lastIdx + 1); i <= idx; i++) {
              pts.push({ i: i, f: curve[i] + insGauss() * depth * 0.055 });
            }
            lastIdx = idx;
          }

          insTxt(c, "TRANSIT PHOTOMETRY", 14, 15, ch.label, 0.9);
          insTxt(c, "synthetic  ·  linear limb-darkening law", h.width - 12, 15, ch.label, 0.4, "right");

          // ---- star view ----------------------------------------------
          var sr = star.r;
          c.save();
          c.beginPath(); c.arc(star.cx, star.cy, sr, 0, TAU()); c.clip();
          var g = c.createRadialGradient(star.cx, star.cy, 0, star.cx, star.cy, sr);
          for (i = 0; i <= 8; i++) {
            var rr = i / 8, li = 0.88 * limb(Math.min(rr, 0.999));
            g.addColorStop(rr, "rgb(" + Math.round(starCol.r * li) + "," + Math.round(starCol.g * li) + "," + Math.round(starCol.b * li) + ")");
          }
          c.fillStyle = g;
          c.beginPath(); c.arc(star.cx, star.cy, sr, 0, TAU()); c.fill();
          // granulation rotating with the star — the disk is never a flat gradient
          var rot = t * 0.16 * h.opts.speed;
          for (i = 0; i < gran.length; i++) {
            var q = gran[i], lon = q.lon + rot, cl = Math.cos(q.lat);
            var vis = Math.cos(lon) * cl;
            if (vis <= 0.02) continue;
            var gx = star.cx + sr * cl * Math.sin(lon);
            var gy = star.cy - sr * Math.sin(q.lat);
            var rad = sr * q.s;
            var gg = c.createRadialGradient(gx, gy, 0, gx, gy, rad);
            var tint = q.v > 0 ? { r: 255, g: 245, b: 220 } : { r: 90, g: 45, b: 20 };
            gg.addColorStop(0, rgba(tint, 0.20 * vis * Math.abs(q.v) * 2.1));
            gg.addColorStop(1, rgba(tint, 0));
            c.fillStyle = gg;
            c.save(); c.translate(gx, gy); c.scale(Math.max(0.16, vis), 1); c.translate(-gx, -gy);
            c.beginPath(); c.arc(gx, gy, rad, 0, TAU()); c.fill(); c.restore();
          }
          c.restore();
          c.strokeStyle = rgba(mixRgb(starCol, ch.bg, 0.45), 0.9); c.lineWidth = 1;
          c.beginPath(); c.arc(star.cx, star.cy, sr - 0.5, 0, TAU()); c.stroke();
          // planet
          var px = star.cx + xs * sr, py = star.cy - b * sr;
          c.fillStyle = rgba({ r: 4, g: 6, b: 12 }, 1);
          c.beginPath(); c.arc(px, py, k * sr, 0, TAU()); c.fill();
          c.strokeStyle = rgba(ch.hi, 0.7); c.lineWidth = 1;
          c.beginPath(); c.arc(px, py, k * sr + 0.5, 0, TAU()); c.stroke();
          // chord
          c.setLineDash([2, 4]);
          insRule(c, star.cx - xMax * sr, py, star.cx + xMax * sr, py, ch.hi, 0.26);
          c.setLineDash([]);

          // ---- parameter block ----------------------------------------
          var bx1 = star.cx + sr + 30, bx2 = bx1 + 116;
          var ry = star.cy - 27, rh = 18;
          function row(cx0, i2, kk, vv, hot) {
            insTxt(c, kk, cx0, ry + i2 * rh, ch.label, 0.45);
            insTxt(c, vv, cx0 + 62, ry + i2 * rh, hot ? ch.hi : ch.label, hot ? 0.95 : 0.85);
          }
          row(bx1, 0, "Rp/Rs", k.toFixed(3));
          row(bx1, 1, "DEPTH", (depth * 100).toFixed(2) + " %", 1);
          row(bx1, 2, "b", b.toFixed(2));
          row(bx1, 3, "u", u.toFixed(2));
          row(bx2, 0, "P", P.toFixed(2) + " d");
          row(bx2, 1, "a/Rs", aRs.toFixed(2));
          row(bx2, 2, "T14", T14.toFixed(2) + " h");
          var hrNow = (xs / (TAU() * aRs)) * P * 24;
          row(bx2, 3, "t-t0", (hrNow >= 0 ? "+" : "") + hrNow.toFixed(2) + " h", 1);

          // ---- light curve --------------------------------------------
          insBox(c, lc.x, lc.y, lc.w, lc.h, ch.axis, 0.45);
          // flux gridlines: baseline and floor
          var ticks = [1, 1 - depth * 0.5, 1 - depth];
          for (i = 0; i < ticks.length; i++) {
            y = fx(ticks[i]);
            insRule(c, lc.x, y, lc.x + lc.w, y, ch.grid, i === 0 ? 0.9 : 0.45);
            insTxt(c, ticks[i].toFixed(4), lc.x - 5, y + 3.5, ch.label, 0.55, "right");
          }
          // time gridlines in hours
          var hMax = (xMax / (TAU() * aRs)) * P * 24;
          var step = hMax > 3 ? 2 : hMax > 1.4 ? 1 : 0.5;
          for (var hv = -Math.floor(hMax / step) * step; hv <= hMax + 1e-6; hv += step) {
            var fr = (hv / hMax + 1) / 2;
            x = lc.x + fr * lc.w;
            insRule(c, x, lc.y, x, lc.y + lc.h, ch.grid, Math.abs(hv) < 1e-6 ? 0.7 : 0.3);
            var lb = (hv > 0 ? "+" : "") + (step < 1 ? hv.toFixed(1) : String(Math.round(hv)));
            insTxt(c, lb, x, lc.y + lc.h + 14, ch.label, 0.55, "center");
          }
          insTxt(c, "h from mid-transit", lc.x + lc.w, lc.y + lc.h + 27, ch.label, 0.42, "right");

          // model
          c.strokeStyle = rgba(ch.hi, 0.35); c.lineWidth = 1;
          c.beginPath();
          for (i = 0; i <= N; i++) {
            x = lc.x + (i / N) * lc.w; y = fx(curve[i]);
            if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
          }
          c.stroke();
          // measured points so far
          c.fillStyle = rgba(ch.data, 0.85);
          for (i = 0; i < pts.length; i += 1) {
            x = lc.x + (pts[i].i / N) * lc.w; y = fx(pts[i].f);
            c.fillRect(x - 0.9, y - 0.9, 1.9, 1.9);
          }
          // synchronised marker
          var mx = lc.x + phase * lc.w, my = fx(fNow);
          insRule(c, mx, lc.y, mx, lc.y + lc.h, ch.hi, 0.5);
          c.fillStyle = rgba(ch.hi, 1);
          c.beginPath(); c.arc(mx, my, 3, 0, TAU()); c.fill();
          c.strokeStyle = rgba(ch.bg, 1); c.lineWidth = 1;
          c.beginPath(); c.arc(mx, my, 3, 0, TAU()); c.stroke();

          var inTr = d < 1 + k;
          insTxt(c, inTr ? "IN TRANSIT" : "OUT OF TRANSIT", lc.x, lc.y - 7,
            inTr ? ch.hi : ch.label, inTr ? 0.95 : 0.5);
          insTxt(c, "F = " + fNow.toFixed(5), lc.x + lc.w, lc.y - 7, ch.label, 0.75, "right");
        },
      };
    },
  });

  // 73. Waterfall — radio-telescope spectrogram, frequency × time × intensity
  registerAnimation("waterfall", {
    defaults: {
      bins: 96, noise: 1, signals: 3, speed: 1,
      colors: ["#22d3ee", "#7c5cff"], background: "#04060f",
    },
    setup: function (h) {
      var pal, ch, nb, rows, ring, head, off, octx, img, lutR, lutG, lutB;
      var pan = { x: 0, y: 0, w: 0, h: 0 }, bar = { x: 0, w: 12 };
      var carriers, drifts, bursts, rowDt, acc, elapsed, F0 = 1420.406, BW = 8;

      function shade(v) {
        // dark floor -> palette 0 -> palette 1 -> white
        v = clamp(v, 0, 1);
        var a;
        if (v < 0.34) a = mixRgb(mixRgb(ch.bg, pal[0], 0.06), mixRgb(ch.bg, pal[0], 0.55), v / 0.34);
        else if (v < 0.66) a = mixRgb(mixRgb(ch.bg, pal[0], 0.55), pal[0], (v - 0.34) / 0.32);
        else if (v < 0.86) a = mixRgb(pal[0], pal[pal.length - 1], (v - 0.66) / 0.20);
        else a = mixRgb(pal[pal.length - 1], { r: 255, g: 255, b: 255 }, (v - 0.86) / 0.14);
        return a;
      }

      function passband(i) {
        var f = i / (nb - 1), e = 0.11;
        var s = 1;
        if (f < e) s = 0.5 - 0.5 * Math.cos(Math.PI * f / e);
        else if (f > 1 - e) s = 0.5 - 0.5 * Math.cos(Math.PI * (1 - f) / e);
        return 0.16 + 0.84 * s;
      }

      function newRow(tt) {
        var r = [], i, j;
        var nz = Math.max(0.05, h.opts.noise);
        for (i = 0; i < nb; i++) {
          // exponential deviate: correct statistics for a 2-dof power spectrum
          var e = -Math.log(Math.max(1e-6, Math.random()));
          r.push(passband(i) * (0.10 + 0.062 * nz * e));
        }
        for (j = 0; j < carriers.length; j++) {
          var cr = carriers[j];
          var amp = cr.a * (0.82 + 0.18 * Math.sin(tt * cr.f + cr.p));
          for (i = 0; i < nb; i++) {
            r[i] += amp * Math.exp(-Math.pow((i - cr.b) / cr.w, 2));
          }
        }
        for (j = 0; j < drifts.length; j++) {
          var dr = drifts[j];
          var bpos = dr.b0 + dr.rate * tt;
          bpos = ((bpos % nb) + nb) % nb;
          var env = 0.55 + 0.45 * Math.sin(tt * dr.wob + dr.p);
          for (i = 0; i < nb; i++) {
            var dd = i - bpos;
            if (dd > nb / 2) dd -= nb; if (dd < -nb / 2) dd += nb;
            r[i] += dr.a * env * Math.exp(-Math.pow(dd / 1.15, 2));
          }
        }
        for (j = bursts.length - 1; j >= 0; j--) {
          var bu = bursts[j], age = tt - bu.t0;
          if (age < 0) continue;
          if (age > bu.dur) { bursts.splice(j, 1); continue; }
          if (bu.wide) {
            var fadeA = 1 - age / bu.dur;
            for (i = 0; i < nb; i++) r[i] += bu.a * fadeA * passband(i) * (0.55 + 0.45 * insHash(i * 1.3 + bu.t0));
          } else {
            // dispersed sweep: delay ∝ ν^-2, so the pulse falls from high to low
            var fr = age / bu.dur;
            var nuHi = 1, nuLo = 0.72;      // normalised band edges
            var iHi = 1 / (nuHi * nuHi), iLo = 1 / (nuLo * nuLo);
            var nu = 1 / Math.sqrt(iHi + fr * (iLo - iHi));
            var bpos2 = (nu - nuLo) / (nuHi - nuLo) * (nb - 1);
            for (i = 0; i < nb; i++) {
              r[i] += bu.a * Math.exp(-Math.pow((i - bpos2) / 2.6, 2));
            }
          }
        }
        return r;
      }

      function push(tt) {
        ring[head] = newRow(tt);
        head = (head + 1) % rows;
      }

      function blit() {
        var d = img.data, i, j, p = 0;
        for (j = 0; j < rows; j++) {
          var src = ring[(head + j) % rows];   // oldest first -> newest at bottom
          for (i = 0; i < nb; i++) {
            var col = shade(src[i]);
            d[p] = col.r; d[p + 1] = col.g; d[p + 2] = col.b; d[p + 3] = 255;
            p += 4;
          }
        }
        octx.putImageData(img, 0, 0);
      }

      function build() {
        pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff"]);
        ch = insChrome(h, pal);
        nb = Math.max(24, Math.min(256, Math.round(h.opts.bins)));
        pan.x = 40; pan.y = 26;
        pan.w = h.width - pan.x - 66;
        pan.h = Math.max(40, h.height - pan.y - 48);
        bar.x = h.width - 50;
        rows = Math.max(24, Math.round(pan.h / 2));
        rowDt = 0.055;

        var ns = Math.max(0, Math.round(h.opts.signals));
        carriers = []; drifts = []; bursts = [];
        var nCar = Math.min(ns, 2), nDrift = Math.max(0, ns - 2);
        var seedB = [0.29, 0.63, 0.815, 0.44];
        for (var i = 0; i < nCar; i++) {
          carriers.push({ b: seedB[i] * (nb - 1), w: 0.9 + i * 0.35, a: 0.55 - i * 0.11, f: 0.7 + i * 0.5, p: i * 2.1 });
        }
        for (i = 0; i < nDrift; i++) {
          drifts.push({
            b0: (0.15 + 0.5 * insHash(i * 11.3)) * nb,
            rate: (i % 2 ? -1 : 1) * (1.6 + insHash(i * 3.7) * 2.2),
            a: 0.42, wob: 0.9 + insHash(i * 6.1), p: i * 1.7,
          });
        }

        off = document.createElement("canvas");
        off.width = nb; off.height = rows;
        octx = off.getContext("2d");
        img = octx.createImageData(nb, rows);

        // Pre-fill the whole history so frame one is already a full record.
        ring = new Array(rows); head = 0;
        elapsed = 0; acc = 0;
        for (i = 0; i < rows; i++) {
          var tt = -(rows - i) * rowDt;
          if (insHash(i * 17.3) > 0.94) {
            bursts.push({ t0: tt, dur: insHash(i * 5.1) > 0.72 ? 0.16 : 0.62, a: 0.7, wide: insHash(i * 5.1) > 0.72 });
          }
          push(tt);
        }
        blit();
      }
      build();

      return {
        resize: build,
        update: build,
        draw: function (t, dt) {
          clearBG(h);
          var c = h.ctx, i, x, y;
          var sp = h.opts.speed;
          acc += dt * sp;
          var pushed = 0;
          while (acc >= rowDt && pushed < 8) {
            acc -= rowDt; elapsed += rowDt; pushed++;
            if (Math.random() < 0.012) {
              var wd = Math.random() > 0.72;
              bursts.push({ t0: elapsed + rowDt, dur: wd ? 0.10 + Math.random() * 0.12 : 0.45 + Math.random() * 0.45, a: 0.62 + Math.random() * 0.3, wide: wd });
            }
            push(elapsed);
          }
          if (pushed) blit();

          insTxt(c, "RADIO SPECTROGRAM", pan.x, 15, ch.label, 0.9);
          insTxt(c, nb + " ch  ·  " + BW.toFixed(0) + " MHz  ·  HI 1420", h.width - 12, 15, ch.label, 0.45, "right");

          c.save();
          c.imageSmoothingEnabled = false;
          c.drawImage(off, 0, 0, nb, rows, Math.round(pan.x), Math.round(pan.y), Math.round(pan.w), Math.round(pan.h));
          c.restore();
          insBox(c, pan.x, pan.y, pan.w, pan.h, ch.axis, 0.55);

          // ---- frequency axis -----------------------------------------
          var fLo = F0 - BW / 2, fHi = F0 + BW / 2;
          for (var fv = Math.ceil(fLo / 2) * 2; fv <= fHi; fv += 2) {
            x = pan.x + ((fv - fLo) / BW) * pan.w;
            insRule(c, x, pan.y + pan.h, x, pan.y + pan.h + 4, ch.axis, 0.85);
            insTxt(c, String(Math.round(fv)), x, pan.y + pan.h + 15, ch.label, 0.6, "center");
          }
          insTxt(c, "MHz", pan.x + pan.w, pan.y + pan.h + 27, ch.label, 0.45, "right");

          // ---- time axis ----------------------------------------------
          var span = rows * rowDt;
          var tstep = span > 8 ? 4 : span > 4 ? 2 : 1;
          for (var tv = 0; tv <= span + 1e-6; tv += tstep) {
            y = pan.y + pan.h - (tv / span) * pan.h;
            insRule(c, pan.x - 4, y, pan.x, y, ch.axis, 0.8);
            insTxt(c, tv === 0 ? "now" : "-" + tv.toFixed(0) + "s", pan.x - 7, y + 3.5, ch.label, 0.55, "right");
          }

          // ---- intensity scale ----------------------------------------
          var steps = 40;
          for (i = 0; i < steps; i++) {
            var v = 1 - i / (steps - 1);
            var col = shade(v);
            c.fillStyle = rgba(col, 1);
            c.fillRect(bar.x, pan.y + (i / steps) * pan.h, bar.w, pan.h / steps + 1);
          }
          insBox(c, bar.x, pan.y, bar.w, pan.h, ch.axis, 0.55);
          var dbs = [12, 6, 0];
          for (i = 0; i < dbs.length; i++) {
            y = pan.y + (i / (dbs.length - 1)) * (pan.h - 1);
            insTxt(c, (dbs[i] > 0 ? "+" : " ") + dbs[i], bar.x + bar.w + 4, y + (i === 0 ? 8 : i === dbs.length - 1 ? 0 : 3.5), ch.label, 0.55);
          }
          insTxt(c, "dB", bar.x, pan.y + pan.h + 15, ch.label, 0.5);
        },
      };
    },
  });

  // 74. HR diagram — temperature (reversed) against luminosity, with evolution
  registerAnimation("hrDiagram", {
    defaults: {
      count: 150, evolve: 1, speed: 1, interactive: true,
      colors: ["#22d3ee", "#7c5cff"], background: "#04060f",
    },
    setup: function (h) {
      var pal, ch, pl = { x: 0, y: 0, w: 0, h: 0 }, stars, hover;
      var TLO = 3.36, THI = 4.66;     // log10 Teff, plotted hot-on-the-left
      var LLO = -4.8, LHI = 6.3;      // log10 L / Lsun
      var LOGTSUN = Math.log(5772) / Math.LN10;
      var CLASSES = [
        { c: "O", lo: 30000, hi: 52000 }, { c: "B", lo: 10000, hi: 30000 },
        { c: "A", lo: 7500, hi: 10000 }, { c: "F", lo: 6000, hi: 7500 },
        { c: "G", lo: 5200, hi: 6000 }, { c: "K", lo: 3700, hi: 5200 },
        { c: "M", lo: 2300, hi: 3700 },
      ];

      function xOf(logT) { return pl.x + (1 - (logT - TLO) / (THI - TLO)) * pl.w; }
      function yOf(logL) { return pl.y + pl.h - ((logL - LLO) / (LHI - LLO)) * pl.h; }

      // Zero-age main sequence from broken mass–luminosity + mass–radius laws.
      function zams(m) {
        var lm = Math.log(m) / Math.LN10, lL;
        if (m >= 0.5) lL = 3.8 * lm;
        else lL = 3.8 * Math.log(0.5) / Math.LN10 + 2.3 * (lm - Math.log(0.5) / Math.LN10);
        var lR = m >= 1 ? 0.60 * lm : 0.90 * lm;
        var lT = LOGTSUN + 0.25 * lL - 0.5 * lR;
        return { lL: lL, lT: lT };
      }

      /* Track: main sequence -> subgiant -> red giant -> post-AGB -> white
       * dwarf cooling. Positions are physical; the phase budget is a display
       * choice so all three populations stay legible at once. The white-dwarf
       * leg is Stefan-Boltzmann at a fixed 0.013 Rsun, which is exactly why it
       * runs parallel to and far below the main sequence. */
      var P_MS = 0.60, P_SUB = 0.645, P_RGB = 0.775, P_PAGB = 0.80, P_DROP = 0.83;
      function track(s, p) {
        var z = s.z, lL, lT, ph, g;
        if (s.m <= 0.8) { p = (p % P_MS + P_MS) % P_MS; }
        if (p < P_MS) {
          g = p / P_MS;
          lL = z.lL + 0.20 * g; lT = z.lT - 0.022 * g; ph = 0;
        } else if (p < P_SUB) {
          g = (p - P_MS) / (P_SUB - P_MS);
          lL = z.lL + 0.20 + 0.16 * g;
          lT = lerp(z.lT - 0.022, s.tSub, g); ph = 1;
        } else if (p < P_RGB) {
          g = (p - P_SUB) / (P_RGB - P_SUB);
          lL = lerp(z.lL + 0.36, s.tipL, g);
          lT = lerp(s.tSub, s.tipT, g); ph = 2;
        } else if (p < P_PAGB) {
          g = (p - P_RGB) / (P_PAGB - P_RGB);
          lL = s.tipL - 0.25 * g;
          lT = lerp(s.tipT, 4.56, g); ph = 3;
        } else if (p < P_DROP) {
          g = (p - P_PAGB) / (P_DROP - P_PAGB);
          lL = lerp(s.tipL - 0.25, -3.77 + 4 * (4.52 - LOGTSUN), g * g);
          lT = lerp(4.56, 4.52, g); ph = 3;
        } else {
          g = (p - P_DROP) / (1 - P_DROP);
          lT = lerp(4.52, 3.80, g * g);
          lL = -3.77 + 4 * (lT - LOGTSUN); ph = 4;
        }
        return { lL: lL, lT: lT, ph: ph };
      }

      function mkStar(i) {
        var u = insHash(i * 2.71);
        var m = Math.pow(10, lerp(Math.log(0.10) / Math.LN10, Math.log(20) / Math.LN10, Math.pow(u, 1.18)));
        var z = zams(m);
        // scatter in composition and core mass turns a single track into a branch
        var tipL = Math.max(z.lL + 0.4, Math.min(3.55, z.lL + 2.45)) + (insHash(i * 13.7) - 0.5) * 0.5;
        var tipT = 3.70 - 0.025 * clamp(tipL, 0, 5.5) + (insHash(i * 19.1) - 0.5) * 0.055;
        var s = {
          m: m, z: z, tipL: tipL, tipT: tipT, tSub: tipT + 0.10,
          p: insHash(i * 5.13),
          rate: 0.024 * Math.pow(m, -0.30),
          twp: insHash(i * 8.9) * TAU(), tf: 0.5 + insHash(i * 3.3) * 1.1, tw: 1, col: null, rr: 1,
          sx: 0, sy: 0, lL: 0, lT: 0, ph: 0, R: 1,
        };
        if (s.m <= 0.8) s.p = insHash(i * 5.13) * P_MS;
        return s;
      }

      function build() {
        pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff"]);
        ch = insChrome(h, pal);
        pl.x = 42; pl.y = 38;
        pl.w = h.width - pl.x - 14;
        pl.h = Math.max(60, h.height - pl.y - 58);
        stars = [];
        var n = Math.max(20, Math.min(400, Math.round(h.opts.count)));
        for (var i = 0; i < n; i++) stars.push(mkStar(i));
        hover = null;
      }
      build();

      function classOf(T) {
        for (var i = 0; i < CLASSES.length; i++) if (T >= CLASSES[i].lo) return CLASSES[i].c;
        return "M";
      }
      function lumClass(ph, lL) {
        if (ph === 4) return "D";
        if (ph === 3) return "pAGB";
        if (ph === 2) return lL > 4 ? "I" : "III";
        if (ph === 1) return "IV";
        return "V";
      }

      return {
        resize: build,
        update: build,
        draw: function (t, dt) {
          clearBG(h);
          var c = h.ctx, i, x, y, s;
          var ev = dt * h.opts.speed * Math.max(0, h.opts.evolve);

          insTxt(c, "H-R DIAGRAM", pl.x, 15, ch.label, 0.9);
          insTxt(c, "N=" + stars.length + "  ·  synthetic population", h.width - 14, 15, ch.label, 0.45, "right");

          // ---- grid ----------------------------------------------------
          for (var lv = -4; lv <= 6; lv += 2) {
            y = yOf(lv);
            insRule(c, pl.x, y, pl.x + pl.w, y, ch.grid, 0.45);
            insTxt(c, (lv > 0 ? "+" : "") + lv, pl.x - 6, y + 3.5, ch.label, 0.55, "right");
          }
          var TT = [30000, 20000, 10000, 7000, 5000, 4000, 3000];
          for (i = 0; i < TT.length; i++) {
            x = xOf(Math.log(TT[i]) / Math.LN10);
            if (x < pl.x || x > pl.x + pl.w) continue;
            insRule(c, x, pl.y, x, pl.y + pl.h, ch.grid, 0.3);
            insRule(c, x, pl.y + pl.h, x, pl.y + pl.h + 4, ch.axis, 0.8);
            insTxt(c, TT[i] >= 10000 ? (TT[i] / 1000) + "k" : String(TT[i]), x, pl.y + pl.h + 15, ch.label, 0.55, "center");
          }
          // spectral classes across the top, as on a real diagram
          for (i = 0; i < CLASSES.length; i++) {
            var cm = Math.sqrt(CLASSES[i].lo * CLASSES[i].hi);
            x = xOf(Math.log(cm) / Math.LN10);
            if (x < pl.x + 5 || x > pl.x + pl.w - 5) continue;
            insTxt(c, CLASSES[i].c, x, pl.y - 7, ch.label, 0.7, "center");
            var edge = xOf(Math.log(CLASSES[i].lo) / Math.LN10);
            if (edge > pl.x && edge < pl.x + pl.w) insRule(c, edge, pl.y, edge, pl.y + 4, ch.axis, 0.5);
          }
          insBox(c, pl.x, pl.y, pl.w, pl.h, ch.axis, 0.5);
          c.save();
          c.translate(12, pl.y + pl.h / 2);
          c.rotate(-Math.PI / 2);
          insTxt(c, "log L / Lsun", 0, 0, ch.label, 0.5, "center");
          c.restore();
          insTxt(c, "hotter <-  Teff (K)  -> cooler", pl.x + pl.w, pl.y + pl.h + 28, ch.label, 0.42, "right");

          // ---- region annotations, anchored to where the tracks actually go
          insTxt(c, "GIANTS", xOf(3.56), yOf(3.15), ch.label, 0.38);
          insTxt(c, "MAIN SEQUENCE", xOf(3.96), yOf(-0.95), ch.label, 0.38);
          insTxt(c, "WHITE DWARFS", xOf(4.50), yOf(-3.15), ch.label, 0.38);

          // ---- advance and place ---------------------------------------
          var hx = h.mouse.x, hy = h.mouse.y, best = null, bd = 12 * 12;
          for (i = 0; i < stars.length; i++) {
            s = stars[i];
            s.p += ev * s.rate;
            if (s.m <= 0.8) { if (s.p >= P_MS) s.p -= P_MS; }
            else if (s.p >= 1) { s.p -= 1; }
            var pt = track(s, s.p);
            s.lL = pt.lL; s.lT = pt.lT; s.ph = pt.ph;
            s.sx = xOf(pt.lT); s.sy = yOf(pt.lL);
            s.R = Math.pow(10, 0.5 * pt.lL - 2 * (pt.lT - LOGTSUN));
            if (h.opts.interactive !== false && h.mouse.active) {
              var dx = s.sx - hx, dy = s.sy - hy, dd = dx * dx + dy * dy;
              if (dd < bd) { bd = dd; best = s; }
            }
          }
          hover = best;

          // ---- draw stars ----------------------------------------------
          // Glows add; cores do not, so a K giant stays orange instead of
          // saturating to white the way a purely additive pass would.
          var vis = [];
          for (i = 0; i < stars.length; i++) {
            s = stars[i];
            if (s.sx < pl.x - 4 || s.sx > pl.x + pl.w + 4 || s.sy < pl.y - 4 || s.sy > pl.y + pl.h + 4) continue;
            s.col = insBB(Math.pow(10, s.lT));
            s.rr = clamp(1.4 + 0.8 * (Math.log(s.R) / Math.LN10), 1, 3.3);
            s.tw = 0.8 + 0.2 * Math.sin(t * s.tf * h.opts.speed + s.twp);
            vis.push(s);
          }
          c.globalCompositeOperation = "lighter";
          for (i = 0; i < vis.length; i++) {
            s = vis[i];
            var glow = 3 + s.rr * 1.5;
            var g = c.createRadialGradient(s.sx, s.sy, 0, s.sx, s.sy, glow);
            g.addColorStop(0, rgba(s.col, 0.30 * s.tw));
            g.addColorStop(1, rgba(s.col, 0));
            c.fillStyle = g;
            c.beginPath(); c.arc(s.sx, s.sy, glow, 0, TAU()); c.fill();
          }
          c.globalCompositeOperation = "source-over";
          for (i = 0; i < vis.length; i++) {
            s = vis[i];
            c.fillStyle = rgba(s.col, 0.55 + 0.45 * s.tw);
            c.beginPath(); c.arc(s.sx, s.sy, s.rr, 0, TAU()); c.fill();
          }

          // ---- hover readout -------------------------------------------
          if (hover) {
            s = hover;
            var Th = Math.round(Math.pow(10, s.lT) / 10) * 10;
            var l1 = classOf(Th) + " " + lumClass(s.ph, s.lL) + "  " + Th + " K";
            var l2 = "log L  " + (s.lL >= 0 ? "+" : "") + s.lL.toFixed(2);
            var l3 = "M " + s.m.toFixed(2) + "   R " + (s.R < 10 ? s.R.toFixed(2) : s.R.toFixed(0));
            var bw = Math.max(l1.length, l2.length, l3.length) * INS_CW + 16;
            var bh = 46;
            var bx = clamp(s.sx + 12, pl.x + 2, pl.x + pl.w - bw - 2);
            var by = clamp(s.sy - bh - 10, pl.y + 2, pl.y + pl.h - bh - 2);
            c.strokeStyle = rgba(ch.hi, 0.9); c.lineWidth = 1;
            c.beginPath(); c.arc(s.sx, s.sy, 7, 0, TAU()); c.stroke();
            c.fillStyle = rgba(ch.bg, 0.94);
            c.fillRect(Math.round(bx), Math.round(by), Math.round(bw), bh);
            insBox(c, bx, by, bw, bh, ch.hi, 0.75);
            insTxt(c, l1, bx + 8, by + 15, ch.hi, 0.95);
            insTxt(c, l2, bx + 8, by + 28, ch.label, 0.8);
            insTxt(c, l3, bx + 8, by + 41, ch.label, 0.8);
          }
        },
      };
    },
  });

  // 75. Pulsar timing — folded profile plus arrival-time residuals
  registerAnimation("pulsarTiming", {
    defaults: {
      period: 5.757451924, jitter: 1.2, folds: 600, speed: 1,
      colors: ["#22d3ee", "#7c5cff"], background: "#04060f",
    },
    setup: function (h) {
      var pal, ch, NB = 128, acc, nFold, single, singleT;
      var pp = { x: 0, y: 0, w: 0, h: 0 }, rp = { x: 0, y: 0, w: 0, h: 0 };
      var res, resHead, resAcc, resDay, NR = 78, yr, ytick, peakRef;

      function profile(ph) {
        var v = 0;
        v += Math.exp(-Math.pow((ph - 0.32) / 0.021, 2)) * 1.0;
        v += Math.exp(-Math.pow((ph - 0.372) / 0.038, 2)) * 0.33;
        v += Math.exp(-Math.pow((ph - 0.79) / 0.027, 2)) * 0.21;
        return v;
      }
      function drift(day) {
        // an unmodelled companion plus an annual term — the classic residual shape
        return 2.4 * Math.sin(TAU() * day / 331) + 0.85 * Math.sin(TAU() * day / 47 + 1.1);
      }

      var showSingle = true;
      function oneFold() {
        var sig = 0.62, i;
        for (i = 0; i < NB; i++) {
          var v = profile((i + 0.5) / NB) + insGauss() * sig;
          acc[i] += v;
          if (showSingle) single[i] = v;
        }
        showSingle = false;
        nFold++;
      }

      function pushRes(day) {
        var e = 0.35 + Math.random() * 0.55 * Math.max(0.2, h.opts.jitter);
        res[resHead] = {
          d: day,
          v: drift(day) + insGauss() * Math.max(0.05, h.opts.jitter),
          e: e,
        };
        resHead = (resHead + 1) % NR;
      }

      function build() {
        pal = paletteOf(h.opts, ["#22d3ee", "#7c5cff"]);
        ch = insChrome(h, pal);
        pp.x = 44; pp.w = h.width - pp.x - 14;
        pp.y = 34; pp.h = Math.max(46, Math.round(h.height * 0.34));
        rp.x = pp.x; rp.w = pp.w;
        rp.y = pp.y + pp.h + 54;
        rp.h = Math.max(32, h.height - rp.y - 34);

        acc = []; single = [];
        for (var i = 0; i < NB; i++) { acc.push(0); single.push(0); }
        nFold = 0; singleT = 0; showSingle = true;
        // measured model peak, so the y-scale is fixed and S/N is honest
        peakRef = 0;
        for (i = 0; i < 400; i++) { var pv0 = profile(i / 400); if (pv0 > peakRef) peakRef = pv0; }
        // Pre-integrate so the very first frame already shows a folded profile.
        var pre = Math.max(12, Math.round(Math.max(40, h.opts.folds) * 0.28));
        for (i = 0; i < pre; i++) oneFold();

        yr = 3.6 + 3 * Math.max(0.05, h.opts.jitter);
        ytick = yr > 14 ? 10 : yr > 7 ? 5 : yr > 3.5 ? 2 : 1;
        res = new Array(NR); resHead = 0; resDay = 0; resAcc = 0;
        for (i = 0; i < NR; i++) { pushRes(resDay); resDay += 5.4; }
      }
      build();

      return {
        resize: build,
        update: build,
        draw: function (t, dt) {
          clearBG(h);
          var c = h.ctx, i, x, y;
          var sp = h.opts.speed, target = Math.max(40, Math.round(h.opts.folds));

          // integrate more rotations into the fold
          var nAdd = Math.min(24, Math.round(dt * 55 * sp));
          for (i = 0; i < nAdd; i++) {
            if (nFold >= target) {
              for (var z = 0; z < NB; z++) acc[z] = 0;
              nFold = 0;
            }
            oneFold();
          }
          // hold each displayed rotation for ~11 fps so it reads instead of strobing
          singleT += dt;
          if (singleT >= 0.09) { singleT = 0; showSingle = true; }

          // scroll the residual series
          resAcc += dt * sp;
          while (resAcc > 0.42) { resAcc -= 0.42; resDay += 5.4; pushRes(resDay); }

          var P = h.opts.period;
          insTxt(c, "PSR J0437-4715", pp.x, 14, ch.label, 0.9);
          insTxt(c, "P " + P.toFixed(9) + " ms  ·  DM 2.645", h.width - 14, 14, ch.label, 0.55, "right");

          // ================= folded profile =========================
          var base = pp.y + pp.h, span = pp.h;
          var scaleY = span / (peakRef * 1.62);
          function py(v) { return base - (v + 0.36 * peakRef) * scaleY; }

          insBox(c, pp.x, pp.y, pp.w, pp.h, ch.axis, 0.45);
          insRule(c, pp.x, py(0), pp.x + pp.w, py(0), ch.grid, 0.8);
          for (var pv = 0; pv <= 1.0001; pv += 0.25) {
            x = pp.x + pv * pp.w;
            insRule(c, x, pp.y, x, base, ch.grid, 0.28);
            insRule(c, x, base, x, base + 4, ch.axis, 0.8);
            insTxt(c, pv.toFixed(2), x, base + 15, ch.label, 0.55, "center");
          }
          insTxt(c, "PULSE PHASE", pp.x + pp.w, base + 29, ch.label, 0.42, "right");
          insTxt(c, "flux", pp.x - 6, pp.y + 10, ch.label, 0.5, "right");
          // legend, so the two traces are never ambiguous
          c.fillStyle = rgba(ch.hi, 0.32);
          c.fillRect(pp.x, base + 22, 10, 8);
          insTxt(c, "one rotation", pp.x + 14, base + 29, ch.label, 0.5);
          insRule(c, pp.x + 104, base + 26, pp.x + 114, base + 26, ch.data, 0.95, 1.4);
          insTxt(c, "folded mean", pp.x + 118, base + 29, ch.label, 0.5);

          // this rotation, un-folded: a filled histogram of mostly noise
          c.fillStyle = rgba(ch.hi, 0.13);
          c.beginPath(); c.moveTo(pp.x, py(0));
          for (i = 0; i < NB; i++) {
            x = pp.x + (i / NB) * pp.w;
            y = clamp(py(single[i]), pp.y + 1, base - 1);
            c.lineTo(x, y); c.lineTo(x + pp.w / NB, y);
          }
          c.lineTo(pp.x + pp.w, py(0)); c.closePath(); c.fill();
          c.strokeStyle = rgba(ch.hi, 0.26); c.lineWidth = 1;
          c.beginPath();
          for (i = 0; i < NB; i++) {
            x = pp.x + (i / NB) * pp.w;
            y = clamp(py(single[i]), pp.y + 1, base - 1);
            if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
            c.lineTo(x + pp.w / NB, y);
          }
          c.stroke();

          // the running mean — the point of folding is that this sharpens
          c.strokeStyle = rgba(ch.data, 0.98); c.lineWidth = 1.35;
          c.beginPath();
          for (i = 0; i < NB; i++) {
            x = pp.x + (i / NB) * pp.w;
            y = clamp(py(acc[i] / Math.max(1, nFold)), pp.y + 1, base - 1);
            if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
            c.lineTo(x + pp.w / NB, y);
          }
          c.stroke();

          // fold counter and the resulting off-pulse rms
          var rms = 0, cnt = 0;
          for (i = 0; i < NB; i++) {
            var ph2 = (i + 0.5) / NB;
            if (ph2 > 0.02 && ph2 < 0.24) { var m = acc[i] / Math.max(1, nFold); rms += m * m; cnt++; }
          }
          rms = Math.sqrt(rms / Math.max(1, cnt));
          insTxt(c, "FOLDED PROFILE  ·  " + nFold + " / " + target + " rotations", pp.x, pp.y - 7, ch.hi, 0.9);
          insTxt(c, "S/N " + (peakRef / Math.max(1e-3, rms)).toFixed(1), pp.x + pp.w, pp.y - 7, ch.label, 0.7, "right");

          // ================= timing residuals ========================
          insBox(c, rp.x, rp.y, rp.w, rp.h, ch.axis, 0.45);
          function ry(v) { return rp.y + rp.h / 2 - (v / yr) * (rp.h / 2 - 4); }
          c.setLineDash([3, 3]);
          insRule(c, rp.x, ry(0), rp.x + rp.w, ry(0), ch.grid, 0.9);
          c.setLineDash([]);
          for (var tv = -Math.floor(yr / ytick) * ytick; tv <= yr; tv += ytick) {
            if (tv === 0) continue;
            y = ry(tv);
            if (y < rp.y + 3 || y > rp.y + rp.h - 3) continue;
            insRule(c, rp.x, y, rp.x + rp.w, y, ch.grid, 0.28);
            insTxt(c, (tv > 0 ? "+" : "") + tv, rp.x - 6, y + 3.5, ch.label, 0.5, "right");
          }
          insTxt(c, "TIMING RESIDUALS (us)", rp.x, rp.y - 6, ch.label, 0.6);

          var rsum = 0, d0 = res[resHead].d, d1 = res[(resHead + NR - 1) % NR].d;
          for (i = 0; i < NR; i++) {
            var pt = res[(resHead + i) % NR];
            x = rp.x + 5 + (i / (NR - 1)) * (rp.w - 10);
            y = ry(clamp(pt.v, -yr, yr));
            rsum += pt.v * pt.v;
            insRule(c, x, ry(clamp(pt.v - pt.e, -yr, yr)), x, ry(clamp(pt.v + pt.e, -yr, yr)), ch.data, 0.35);
            c.fillStyle = rgba(i === NR - 1 ? ch.hi : ch.data, i === NR - 1 ? 1 : 0.85);
            c.beginPath(); c.arc(x, y, i === NR - 1 ? 2.6 : 1.6, 0, TAU()); c.fill();
          }
          insTxt(c, "MJD " + Math.round(58000 + d0), rp.x + 4, rp.y + rp.h + 14, ch.label, 0.5);
          insTxt(c, "RMS " + Math.sqrt(rsum / NR).toFixed(2) + " us", rp.x + rp.w, rp.y + rp.h + 14, ch.label, 0.6, "right");
        },
      };
    },
  });

  /* ============================================================
   * 76–80 · Pointer-driven & generative — the user shapes what happens.
   *
   * Every animation in this pack is designed idle-first: the pointer starts
   * outside the surface and may never arrive, so each one has to be a finished
   * composition on its own and treat the pointer as an amplifier. The whole
   * pack lives in an IIFE so its private helpers can never collide with a
   * neighbouring pack that happens to pick the same helper name.
   * ========================================================== */
  (function () {
    function vec3of(hex) { var c = hexToRgb(hex); return [c.r / 255, c.g / 255, c.b / 255]; }

    /* Sample a multi-stop palette as a continuous gradient. */
    function ramp(pal, u) {
      var n = pal.length;
      if (n === 1) return pal[0];
      u = clamp(u, 0, 1) * (n - 1);
      var i = Math.floor(u);
      if (i >= n - 1) return pal[n - 1];
      return mixRgb(pal[i], pal[i + 1], u - i);
    }
    function smoothstep01(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
    /* Frame-rate independent exponential approach. */
    function approach(dt, rate) { return 1 - Math.exp(-dt * rate); }
    var WHITE = { r: 255, g: 255, b: 255 };

    /* ----------------------------------------------------------
     * 76. Gravity well — orbits around a mass you drag, tinted by orbital speed
     * -------------------------------------------------------- */
    registerAnimation("gravityWell", {
      defaults: {
        count: 700, mass: 1, softening: 0.09, trail: 0.15, speed: 1,
        colors: ["#12266b", "#2563eb", "#22d3ee", "#a7f3d0", "#fde68a", "#fb7185"],
        background: "#04050e", interactive: true,
      },
      setup: function (h) {
        var ps = [], pal, R, GM, sqGM, eps, vLo, vSpan, first = true;
        var wx = 0, wy = 0, wvx = 0, wvy = 0;
        var ax = 0, ay = 0;                       // scratch for the accelerator
        var BUCKETS = 12, paths = [];

        function gravAt(x, y) {
          var dx = wx - x, dy = wy - y;
          var s = dx * dx + dy * dy + eps * eps;
          var inv = GM / (s * Math.sqrt(s));
          ax = dx * inv; ay = dy * inv;
        }
        function vcirc(r) { return (r * sqGM) / Math.pow(r * r + eps * eps, 0.75); }

        /* Seeded as real Kepler ellipses whose apsides rotate linearly with
         * semi-major axis. Nested, progressively turned ellipses crowd into a
         * two-armed spiral — so the idle state is a structured disk rather
         * than a smooth ring, and it slowly winds as the orbits precess. */
        function seed(p) {
          var a = R * (0.32 + Math.pow(Math.random(), 0.72) * 0.98);
          var e = clamp(0.24 + rand(-0.07, 0.07), 0.02, 0.45);
          var om = 2.6 * (a / R) + rand(-0.09, 0.09);
          var nu = Math.random() * TAU();
          var pf = a * (1 - e * e);
          var r = pf / (1 + e * Math.cos(nu));
          var th = om + nu;
          var vk = Math.sqrt(GM / pf);
          var vr = vk * e * Math.sin(nu), vt = vk * (1 + e * Math.cos(nu));
          var ct = Math.cos(th), st = Math.sin(th);
          p.x = wx + r * ct; p.y = wy + r * st;
          p.vx = vr * ct - vt * st;
          p.vy = vr * st + vt * ct;
          p.px = p.x - p.vx * 0.05;               // a streak exists on frame one
          p.py = p.y - p.vy * 0.05;
          p.r = rand(0.45, 1.5);
          gravAt(p.x, p.y);
          p.ax = ax; p.ay = ay;
        }

        function build() {
          pal = paletteOf(h.opts, ["#12266b", "#2563eb", "#22d3ee", "#fde68a", "#fb7185"]);
          R = Math.min(h.width, h.height) * 0.34;
          wx = h.width / 2; wy = h.height / 2; wvx = 0; wvy = 0;
          eps = Math.max(2.5, (h.opts.softening || 0.09) * R);
          // GM set so a circular orbit at R takes PERIOD seconds: the piece
          // then looks and paces identically at every canvas size.
          var period = 5.8;
          GM = (h.opts.mass || 1) * 4 * Math.PI * Math.PI * R * R * R / (period * period);
          sqGM = Math.sqrt(GM);
          vLo = vcirc(R * 1.7); vSpan = vcirc(R * 0.30) - vLo;
          var n = Math.max(300, Math.round((h.opts.count * h.width * h.height) / (1280 * 720)));
          ps = [];
          for (var i = 0; i < n; i++) { var p = {}; seed(p); ps.push(p); }
          paths = [];
          for (var b = 0; b < BUCKETS; b++) paths.push({ col: ramp(pal, b / (BUCKETS - 1)), seg: [], dot: [] });
          first = true;
        }
        build();

        return {
          resize: build,
          draw: function (t, dt) {
            var c = h.ctx, i, p, b, k;
            if (first) { clearBG(h); first = false; } else { fade(h, h.opts.trail); }

            var steps = 3;
            var sdt = Math.min(dt, 0.05) * (h.opts.speed || 1) / steps;
            var tx = h.mouse.active ? h.mouse.x : h.width / 2;
            var ty = h.mouse.active ? h.mouse.y : h.height / 2;

            for (var s = 0; s < steps; s++) {
              // The well is itself a mass on a spring: it lags the pointer,
              // overshoots a little and keeps coasting after you stop. That
              // momentum is what makes dragging it feel like dragging weight.
              wvx += ((tx - wx) * 44 - wvx * 10) * sdt;
              wvy += ((ty - wy) * 44 - wvy * 10) * sdt;
              wx += wvx * sdt; wy += wvy * sdt;

              for (i = 0; i < ps.length; i++) {
                p = ps[i];
                if (s === 0) { p.px = p.x; p.py = p.y; }
                // velocity-Verlet: orbits stay closed instead of decaying
                p.x += p.vx * sdt + 0.5 * p.ax * sdt * sdt;
                p.y += p.vy * sdt + 0.5 * p.ay * sdt * sdt;
                gravAt(p.x, p.y);
                p.vx += 0.5 * (p.ax + ax) * sdt;
                p.vy += 0.5 * (p.ay + ay) * sdt;
                p.ax = ax; p.ay = ay;
              }
            }

            for (b = 0; b < BUCKETS; b++) { paths[b].seg.length = 0; paths[b].dot.length = 0; }
            for (i = 0; i < ps.length; i++) {
              p = ps[i];
              var dx = p.x - wx, dy = p.y - wy;
              if (dx * dx + dy * dy > R * R * 12) { seed(p); continue; }
              var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
              var u = Math.pow(clamp((sp - vLo) / vSpan, 0, 1), 0.8);
              b = Math.min(BUCKETS - 1, (u * BUCKETS) | 0);
              var bk = paths[b];
              bk.seg.push(p.px, p.py, p.x, p.y);
              if (u > 0.34) bk.dot.push(p.x, p.y, p.r);
            }

            c.globalCompositeOperation = "lighter";
            for (b = 0; b < BUCKETS; b++) {
              var bp = paths[b], u2 = b / (BUCKETS - 1);
              if (bp.seg.length) {
                c.strokeStyle = rgba(bp.col, 0.17 + 0.5 * u2);
                c.lineWidth = 0.6 + u2 * 1.0;
                c.beginPath();
                for (k = 0; k < bp.seg.length; k += 4) {
                  c.moveTo(bp.seg[k], bp.seg[k + 1]); c.lineTo(bp.seg[k + 2], bp.seg[k + 3]);
                }
                c.stroke();
              }
              if (bp.dot.length) {
                c.fillStyle = rgba(mixRgb(bp.col, WHITE, u2 * 0.5), 0.07 + 0.3 * u2);
                c.beginPath();
                for (k = 0; k < bp.dot.length; k += 3) {
                  var rr = bp.dot[k + 2] * (0.8 + u2 * 1.1);
                  c.moveTo(bp.dot[k] + rr, bp.dot[k + 1]);
                  c.arc(bp.dot[k], bp.dot[k + 1], rr, 0, TAU());
                }
                c.fill();
              }
            }

            // the well itself
            var hot = pal[pal.length - 1], cool = pal[0];
            var gr = c.createRadialGradient(wx, wy, 0, wx, wy, R * 0.7);
            gr.addColorStop(0, rgba(hot, 0.34));
            gr.addColorStop(0.14, rgba(ramp(pal, 0.6), 0.13));
            gr.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = gr;
            c.beginPath(); c.arc(wx, wy, R * 0.7, 0, TAU()); c.fill();

            var er = Math.max(3, eps * 0.5);
            c.fillStyle = rgba({ r: 255, g: 246, b: 226 }, 0.92);
            c.beginPath(); c.arc(wx, wy, er * 0.42, 0, TAU()); c.fill();
            c.strokeStyle = rgba(hot, 0.42); c.lineWidth = 1.1;
            c.beginPath(); c.arc(wx, wy, er * 1.7, 0, TAU()); c.stroke();

            // grip ring: shows the mass is held, and how far it is lagging you
            if (h.mouse.active) {
              c.strokeStyle = rgba(cool, 0.34); c.lineWidth = 1;
              c.beginPath(); c.arc(tx, ty, 9 + Math.sin(t * 3.4) * 2, 0, TAU()); c.stroke();
              c.strokeStyle = rgba(ramp(pal, 0.45), 0.16);
              c.beginPath(); c.moveTo(tx, ty); c.lineTo(wx, wy); c.stroke();
            }
            c.globalCompositeOperation = "source-over";
          },
        };
      },
    });

    /* ----------------------------------------------------------
     * 77. Nebula paint — semi-Lagrangian gas you paint with the pointer
     * -------------------------------------------------------- */
    registerAnimation("nebulaPaint", {
      defaults: {
        resolution: 96, dissipation: 0.9955, swirl: 1, speed: 1,
        colors: ["#3b1178", "#7c3aed", "#e0499b", "#22d3ee", "#bff3ff"],
        background: "#04030c", interactive: true,
      },
      setup: function (h) {
        var GW, GH, cw, ch, N, K;
        var u0, v0, d0, k0, u1, v1, d1, k1;      // velocity, density, colour key
        var off, octx, img, pal, stars, first = true;
        var pgx = 0, pgy = 0, hadPointer = false, hue = 0;

        function bilerp(f, x, y) {
          if (x < 0) x = 0; else if (x > GW - 1.002) x = GW - 1.002;
          if (y < 0) y = 0; else if (y > GH - 1.002) y = GH - 1.002;
          var i0 = x | 0, j0 = y | 0, fx = x - i0, fy = y - j0;
          var a = j0 * GW + i0, b = a + GW;
          return (f[a] * (1 - fx) + f[a + 1] * fx) * (1 - fy) + (f[b] * (1 - fx) + f[b + 1] * fx) * fy;
        }

        /* Ambient flow is the curl of a drifting three-octave stream function,
         * so it is divergence-free by construction: eddies at three scales,
         * no pressure solve, and nothing ever piles up in a corner. */
        var amb = [0, 0];
        function ambient(i, j, t) {
          var x = i * K, y = j * K;
          var s = (h.opts.swirl == null ? 1 : h.opts.swirl) * 7.4;
          var a1 = x + t * 0.30, b1 = y - t * 0.23;
          var a2 = x * 1.9 - t * 0.17, b2 = y * 1.7 + t * 0.21;
          var a3 = x * 3.7 + t * 0.13, b3 = y * 3.2 - t * 0.15;
          var dy = -Math.sin(a1) * Math.sin(b1)
            - 0.94 * Math.sin(a2) * Math.sin(b2)
            - 0.90 * Math.sin(a3) * Math.sin(b3);
          var dx = Math.cos(a1) * Math.cos(b1)
            + 1.05 * Math.cos(a2) * Math.cos(b2)
            + 1.04 * Math.cos(a3) * Math.cos(b3);
          amb[0] = dy * s; amb[1] = -dx * s;
        }

        function blob(gx, gy, rad, amt, key, sw) {
          var i, j, r2 = rad * rad;
          var i0 = Math.max(0, Math.floor(gx - rad * 2.3)), i1 = Math.min(GW - 1, Math.ceil(gx + rad * 2.3));
          var j0 = Math.max(0, Math.floor(gy - rad * 2.3)), j1 = Math.min(GH - 1, Math.ceil(gy + rad * 2.3));
          for (j = j0; j <= j1; j++) {
            for (i = i0; i <= i1; i++) {
              var dx = i - gx, dy = j - gy, q = (dx * dx + dy * dy) / r2;
              if (q > 5.3) continue;
              var w = Math.exp(-q), a = j * GW + i;
              d0[a] += amt * w;
              k0[a] += (key - k0[a]) * Math.min(0.9, w * 0.8);
              if (sw) { u0[a] += -dy * sw * w; v0[a] += dx * sw * w; }
            }
          }
        }

        function step(t, dt) {
          var i, j, a, rate = approach(dt, 1.15);
          // 1 · self-advect velocity, then relax toward the ambient curl
          for (j = 0; j < GH; j++) {
            for (i = 0; i < GW; i++) {
              a = j * GW + i;
              var nu = bilerp(u0, i - u0[a] * dt, j - v0[a] * dt);
              var nv = bilerp(v0, i - u0[a] * dt, j - v0[a] * dt);
              ambient(i, j, t);
              u1[a] = nu + (amb[0] - nu) * rate;
              v1[a] = nv + (amb[1] - nv) * rate;
            }
          }
          // 2 · advect density and colour through the new velocity field
          var diss = Math.pow(clamp(h.opts.dissipation == null ? 0.9955 : h.opts.dissipation, 0.9, 1), dt * 60);
          for (j = 0; j < GH; j++) {
            for (i = 0; i < GW; i++) {
              a = j * GW + i;
              var x2 = i - u1[a] * dt, y2 = j - v1[a] * dt;
              var bx = Math.min(i, GW - 1 - i) / (GW * 0.14), by = Math.min(j, GH - 1 - j) / (GH * 0.14);
              var edge = Math.min(1, Math.min(bx, by));
              d1[a] = bilerp(d0, x2, y2) * diss * (0.25 + 0.75 * edge * edge);
              k1[a] = bilerp(k0, x2, y2);
            }
          }
          var tu = u0; u0 = u1; u1 = tu;
          var tv = v0; v0 = v1; v1 = tv;
          var td = d0; d0 = d1; d1 = td;
          var tk = k0; k0 = k1; k1 = tk;

          /* Diffusion. Advection alone folds the field into discontinuous fronts —
           * real gas has viscosity, and without this the nebula reads as hard-edged
           * slabs instead of cloud. One explicit Laplacian pass is enough. */
          var kd = clamp(h.opts.diffusion == null ? 0.34 : h.opts.diffusion, 0, 0.6);
          if (kd > 0.001) {
            for (var jj = 1; jj < GH - 1; jj++) {
              for (var ii = 1; ii < GW - 1; ii++) {
                var b = jj * GW + ii;
                var lap = d0[b - 1] + d0[b + 1] + d0[b - GW] + d0[b + GW] - 4 * d0[b];
                d1[b] = d0[b] + kd * 0.25 * lap;
                var lk = k0[b - 1] + k0[b + 1] + k0[b - GW] + k0[b + GW] - 4 * k0[b];
                k1[b] = k0[b] + kd * 0.25 * lk;
              }
            }
            for (var e2 = 0; e2 < GW; e2++) { d1[e2] = d0[e2]; k1[e2] = k0[e2];
              var lr = (GH - 1) * GW + e2; d1[lr] = d0[lr]; k1[lr] = k0[lr]; }
            for (var e3 = 0; e3 < GH; e3++) { var l0 = e3 * GW, l1 = l0 + GW - 1;
              d1[l0] = d0[l0]; k1[l0] = k0[l0]; d1[l1] = d0[l1]; k1[l1] = k0[l1]; }
            var td2 = d0; d0 = d1; d1 = td2;
            var tk2 = k0; k0 = k1; k1 = tk2;
          }
        }

        /* Three slow wandering sources keep feeding the nebula, so the field is
         * never empty and never settles into a still frame on its own. */
        var EM = [{ p: 0, h: 0.14, s: 1 }, { p: 2.1, h: 0.52, s: -1 }, { p: 4.3, h: 0.86, s: 1 }];
        function emitters(t, dt) {
          for (var e = 0; e < EM.length; e++) {
            var m = EM[e], ph = m.p;
            var gx = GW * (0.5 + 0.35 * Math.sin(t * 0.23 + ph) * Math.cos(t * 0.13 + ph * 0.7));
            var gy = GH * (0.5 + 0.34 * Math.sin(t * 0.19 + ph * 1.6));
            blob(gx, gy, GW * 0.026 + 1.1, dt * 11, m.h, m.s * dt * 9);
          }
        }

        function build() {
          pal = paletteOf(h.opts, ["#3b1178", "#7c3aed", "#e0499b", "#22d3ee", "#bff3ff"]);
          GW = Math.round(clamp(h.opts.resolution || 124, 24, 160));
          GH = Math.max(14, Math.round(GW * h.height / Math.max(1, h.width)));
          N = GW * GH; K = 6.1 / GW;
          cw = h.width / GW; ch = h.height / GH;
          u0 = new Float32Array(N); v0 = new Float32Array(N);
          d0 = new Float32Array(N); k0 = new Float32Array(N);
          u1 = new Float32Array(N); v1 = new Float32Array(N);
          d1 = new Float32Array(N); k1 = new Float32Array(N);
          off = document.createElement("canvas");
          off.width = GW; off.height = GH;
          octx = off.getContext("2d");
          img = octx.createImageData(GW, GH);

          stars = [];
          var ns = Math.round((h.width * h.height) / 5200);
          for (var s = 0; s < ns; s++) {
            stars.push({ x: Math.random() * h.width, y: Math.random() * h.height, r: rand(0.3, 1.0), a: rand(0.10, 0.42) });
          }

          // seed clouds, then run the solver forward so frame one is already
          // sheared into filaments rather than three tidy circles
          blob(GW * 0.34, GH * 0.42, GW * 0.09, 0.95, 0.18, 2.2);
          blob(GW * 0.64, GH * 0.60, GW * 0.075, 0.80, 0.60, -2.6);
          blob(GW * 0.50, GH * 0.28, GW * 0.055, 0.62, 0.92, 1.4);
          for (var w = 0; w < 96; w++) { emitters(w / 24, 1 / 24); step(w / 24, 1 / 24); }
          first = true;
        }
        build();

        return {
          resize: build,
          draw: function (t, dt) {
            var c = h.ctx, i, j, a;
            var sdt = Math.min(dt, 0.045) * (h.opts.speed || 1);

            // pointer injects dye *and* momentum along its motion vector
            if (h.mouse.active) {
              var gx = h.mouse.x / cw, gy = h.mouse.y / ch;
              if (!hadPointer) { pgx = gx; pgy = gy; hadPointer = true; }
              var mvx = gx - pgx, mvy = gy - pgy;
              var sp = Math.sqrt(mvx * mvx + mvy * mvy);
              var inv = sdt > 0.0005 ? 1 / sdt : 0;
              var vx = clamp(mvx * inv, -46, 46), vy = clamp(mvy * inv, -46, 46);
              hue += (sp * 0.03 + 0.1) * Math.max(sdt, 0.008);
              var key = (hue % 1 + 1) % 1;
              var rad = GW * 0.030 + 1.2 + Math.min(3, sp * 0.4);
              var wgt = Math.min(1, sdt * 9), r2 = rad * rad;
              var i0 = Math.max(0, Math.floor(gx - rad * 2.3)), i1 = Math.min(GW - 1, Math.ceil(gx + rad * 2.3));
              var j0 = Math.max(0, Math.floor(gy - rad * 2.3)), j1 = Math.min(GH - 1, Math.ceil(gy + rad * 2.3));
              for (j = j0; j <= j1; j++) {
                for (i = i0; i <= i1; i++) {
                  var dx = i - gx, dy = j - gy, q = (dx * dx + dy * dy) / r2;
                  if (q > 5.3) continue;
                  var w2 = Math.exp(-q);
                  a = j * GW + i;
                  d0[a] += w2 * (1.1 + Math.min(3.4, sp * 1.1)) * Math.max(sdt, 0.006) * 4.5;
                  k0[a] += (key - k0[a]) * w2 * 0.5;
                  u0[a] += (vx - u0[a]) * w2 * wgt + (-dy) * w2 * wgt * 2.2;
                  v0[a] += (vy - v0[a]) * w2 * wgt + (dx) * w2 * wgt * 2.2;
                }
              }
              pgx = gx; pgy = gy;
            } else { hadPointer = false; }

            if (sdt > 0) { emitters(t, sdt); step(t, sdt); }

            // rasterise the coarse grid, upsample with bilinear smoothing
            var px = img.data;
            for (a = 0; a < N; a++) {
              var dv = d0[a], o = a * 4;
              if (dv < 0.004) { px[o + 3] = 0; continue; }
              var col = ramp(pal, k0[a]);
              var wht = clamp((dv - 0.95) * 0.42, 0, 0.55);
              px[o] = col.r + (255 - col.r) * wht;
              px[o + 1] = col.g + (255 - col.g) * wht;
              px[o + 2] = col.b + (255 - col.b) * wht;
              px[o + 3] = clamp(dv * 150, 0, 240);
            }
            octx.putImageData(img, 0, 0);

            clearBG(h);
            c.globalCompositeOperation = "lighter";
            for (i = 0; i < stars.length; i++) {
              var st = stars[i];
              c.fillStyle = rgba({ r: 214, g: 226, b: 255 }, st.a);
              c.fillRect(st.x, st.y, st.r + 0.6, st.r + 0.6);
            }
            c.imageSmoothingEnabled = true;
            if (c.imageSmoothingQuality) c.imageSmoothingQuality = "high";
            c.drawImage(off, 0, 0, h.width, h.height);
            // one soft bloom pass so the gas glows instead of reading as texture
            c.globalAlpha = 0.22;
            var bw = h.width * 1.08, bh = h.height * 1.08;
            c.drawImage(off, (h.width - bw) / 2, (h.height - bh) / 2, bw, bh);
            c.globalAlpha = 1;
            c.globalCompositeOperation = "source-over";
            first = false;
          },
        };
      },
    });

    /* ----------------------------------------------------------
     * 78. Solar wind — a magnetosphere you can squash from any direction
     * -------------------------------------------------------- */
    registerAnimation("solarWind", {
      defaults: {
        count: 520, pressure: 1, tilt: 0.3, speed: 1,
        colors: ["#34d399", "#22d3ee", "#c4b5fd", "#fca5a5"],
        background: "#03040d", interactive: true,
      },
      setup: function (h) {
        var ps = [], pal, cx, cy, R, half, first = true;
        var wdx = 1, wdy = 0, press = 1, Rmp = 1, psi = 0.4;
        var m3, e1, e2;
        var NB = 72, nEn = [], sEn = [], tmpE = [];

        function setAxis() {
          var ti = h.opts.tilt || 0;
          var ux = Math.sin(ti), uy = -Math.cos(ti);
          // tip the dipole 38° out of the screen so the auroral ovals project
          // as ellipses instead of degenerating into a line
          var cz = Math.sin(0.66), cxy = Math.cos(0.66);
          m3 = { x: ux * cxy, y: uy * cxy, z: cz };
          var l = Math.sqrt(m3.x * m3.x + m3.y * m3.y) || 1;
          e1 = { x: m3.y / l, y: -m3.x / l, z: 0 };
          e2 = {
            x: m3.y * e1.z - m3.z * e1.y,
            y: m3.z * e1.x - m3.x * e1.z,
            z: m3.x * e1.y - m3.y * e1.x,
          };
        }
        /* Point on the auroral oval: colatitude `ps2` from the pole, azimuth phi. */
        var opt = { x: 0, y: 0, z: 0 };
        function ovalPoint(sign, phi, ps2) {
          var cp = Math.cos(ps2), sp = Math.sin(ps2);
          var ex = Math.cos(phi) * sp, ey = Math.sin(phi) * sp;
          opt.x = cx + R * (sign * m3.x * cp + ex * e1.x + ey * e2.x);
          opt.y = cy + R * (sign * m3.y * cp + ex * e1.y + ey * e2.y);
          opt.z = sign * m3.z * cp + ex * e1.z + ey * e2.z;
          return opt;
        }
        /* Shue-style magnetopause: standoff at the nose, flaring into a tail. */
        function rmpAt(ct) { return Rmp * Math.sqrt(2 / (1 + Math.max(ct, -0.35))); }

        function launch(p, spread) {
          var offs = rand(-half, half);
          var along = spread ? rand(-half, half * 0.85) : -half;
          p.x = cx + (-wdy) * offs + wdx * along;
          p.y = cy + (wdx) * offs + wdy * along;
          var V = 215 * (h.opts.speed || 1) * Math.sqrt(press);
          p.vx = wdx * V; p.vy = wdy * V;
          p.px = p.x; p.py = p.y;
          p.st = 0; p.fp = 0; p.shock = 0; p.out = true;
        }

        function build() {
          pal = paletteOf(h.opts, ["#34d399", "#22d3ee", "#c4b5fd", "#fca5a5"]);
          cx = h.width * 0.45; cy = h.height * 0.5;
          R = Math.min(h.width, h.height) * 0.15;
          half = Math.sqrt(h.width * h.width + h.height * h.height) * 0.5 + 14;
          press = h.opts.pressure || 1;
          Rmp = R * 1.95;
          setAxis();
          nEn = []; sEn = []; tmpE = [];
          for (var b = 0; b < NB; b++) { nEn.push(0.3); sEn.push(0.22); tmpE.push(0); }
          var n = Math.max(280, Math.round((h.opts.count * h.width * h.height) / (1280 * 720)));
          ps = [];
          for (var i = 0; i < n; i++) { var p = {}; launch(p, true); ps.push(p); }
          for (var w = 0; w < 150; w++) sim(1 / 60);       // establish the streamlines
          first = true;
        }

        function diffuse(arr, dt) {
          var b, k = clamp(dt * 6, 0, 0.4);
          for (b = 0; b < NB; b++) tmpE[b] = arr[b];
          for (b = 0; b < NB; b++) {
            var l = tmpE[(b + NB - 1) % NB], r = tmpE[(b + 1) % NB];
            arr[b] += (0.5 * (l + r) - tmpE[b]) * k;
            arr[b] *= Math.exp(-dt * 0.85);
            if (arr[b] < 0.2) arr[b] = 0.2;
          }
        }

        function sim(dt) {
          var i, p;
          var V = 215 * (h.opts.speed || 1) * Math.sqrt(press);
          Rmp = Math.max(R * 1.2, R * 1.95 / Math.pow(Math.max(0.2, press), 0.34));
          psi = 0.34 + clamp(press - 0.6, 0, 2.6) * 0.055;    // the oval widens under pressure
          var nx = -wdy, ny = wdx;
          var mml = Math.sqrt(m3.x * m3.x + m3.y * m3.y) || 1;
          var mmx = m3.x / mml, mmy = m3.y / mml;

          for (i = 0; i < ps.length; i++) {
            p = ps[i];
            p.px = p.x; p.py = p.y;

            if (p.st === 1) {                            // funnelling down a cusp
              p.fp += dt * 2.0 * (h.opts.speed || 1);
              var q = Math.min(1, p.fp), iq = 1 - q;
              p.x = iq * iq * p.f0x + 2 * iq * q * p.c1x + q * q * p.tgx;
              p.y = iq * iq * p.f0y + 2 * iq * q * p.c1y + q * q * p.tgy;
              if (p.fp >= 1) {
                var en = p.pole > 0 ? nEn : sEn;
                en[p.bin] += 2.2;
                en[(p.bin + 1) % NB] += 0.9; en[(p.bin + NB - 1) % NB] += 0.9;
                launch(p, false);
              }
              continue;
            }

            var dx = p.x - cx, dy = p.y - cy;
            var r = Math.sqrt(dx * dx + dy * dy) || 0.001;
            // wind frame: X downstream, Y across
            var X = dx * wdx + dy * wdy, Y = dx * nx + dy * ny;
            var ct = -X / r;
            var a = rmpAt(ct);
            var rbs = a * 1.28 + R * 0.24;

            if (p.out && r < rbs) { p.out = false; p.shock = 1; }
            else if (!p.out && r > rbs * 1.06) p.out = true;
            if (p.shock > 0) p.shock -= dt * 2.4;

            // cusp capture: high magnetic latitude, dayside, near the boundary
            if (ct > 0.02 && r < a * 1.3 && r > a * 0.55) {
              var la = (dx * mmx + dy * mmy) / r;
              var alat = Math.abs(la);
              if (alat > 0.34 && alat < 0.95 && Math.random() < dt * 22) {
                var north = la > 0;
                if (!north && Math.random() < 0.62) north = true;   // bias to the visible pole
                var a1 = (dx / r) * e1.x + (dy / r) * e1.y;
                var a2 = (dx / r) * e2.x + (dy / r) * e2.y;
                var phi = Math.atan2(a2, a1);
                var tg = ovalPoint(north ? 1 : -1, phi, psi);
                p.st = 1; p.fp = 0; p.pole = north ? 1 : -1;
                p.f0x = p.x; p.f0y = p.y;
                p.tgx = tg.x; p.tgy = tg.y;
                // bow the path outward so it reads as a field line, not a laser
                var mx2 = (p.x + tg.x) * 0.5 - cx, my2 = (p.y + tg.y) * 0.5 - cy;
                p.c1x = cx + mx2 * 2.15; p.c1y = cy + my2 * 2.15;
                p.bin = (Math.floor(((phi + Math.PI) / TAU()) * NB) % NB + NB) % NB;
                continue;
              }
            }

            /* Potential flow past a cylinder of the local magnetopause radius:
             * exact wrap-around streamlines with no pile-up at the nose. The
             * wake term keeps the downstream flow deflected so a real tail
             * opens up instead of the field closing symmetrically. */
            var r2 = X * X + Y * Y;
            var kk = (a * a) / (r2 * r2);
            var wake = 1 / (1 + Math.max(0, X) / (a * 2.0));
            var uX = V * (1 - kk * (X * X - Y * Y) * wake);
            var uY = V * (-kk * 2 * X * Y * wake);
            var tvx = uX * wdx + uY * nx, tvy = uX * wdy + uY * ny;
            var mix = Math.min(1, dt * 7);
            p.vx += (tvx - p.vx) * mix;
            p.vy += (tvy - p.vy) * mix;
            if (!p.out) {                                  // shocked plasma is turbulent
              p.vx += rand(-1, 1) * V * 0.1;
              p.vy += rand(-1, 1) * V * 0.1;
            }
            p.x += p.vx * dt; p.y += p.vy * dt;

            // safety: nothing gets inside the magnetopause
            dx = p.x - cx; dy = p.y - cy;
            r = Math.sqrt(dx * dx + dy * dy) || 0.001;
            if (r < a) { p.x = cx + (dx / r) * a; p.y = cy + (dy / r) * a; }

            var mrg = half + 40;   // must exceed the launch distance, or particles are culled at birth
            if (p.x < -mrg || p.x > h.width + mrg || p.y < -mrg || p.y > h.height + mrg) launch(p, false);
          }
          diffuse(nEn, dt); diffuse(sEn, dt);
        }
        build();

        function oval(c, sign, en, ps2, wide, gain, alpha) {
          var b, prev = null;
          for (b = 0; b <= NB; b++) {
            var bi = b % NB;
            var pt = ovalPoint(sign, (bi / NB) * TAU(), ps2);
            var sx = pt.x, sy = pt.y;
            var vis = clamp((pt.z + 0.04) * 5, 0, 1);
            var e = en[bi] * gain * vis;
            if (prev && (vis > 0.01 || prev.v > 0.01)) {
              c.strokeStyle = rgba(ramp(pal, clamp(0.03 + e * 0.22, 0, 1)), clamp(e * alpha, 0, 0.9));
              c.lineWidth = wide * (0.55 + clamp(e, 0, 3) * 0.42);
              c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(sx, sy); c.stroke();
            }
            prev = { x: sx, y: sy, v: vis };
          }
        }
        /* Discrete auroral rays rising out of the brightest parts of the oval. */
        function rays(c, sign, en, ps2) {
          var b;
          c.beginPath();
          for (b = 0; b < NB; b += 2) {
            var e = en[b];
            if (e < 0.55) continue;
            var phi = (b / NB) * TAU();
            var p0 = ovalPoint(sign, phi, ps2);
            if (p0.z < -0.02) continue;
            var x0 = p0.x, y0 = p0.y, z0 = p0.z;
            var p1 = ovalPoint(sign, phi, ps2 * (1 - clamp(e, 0, 3) * 0.075));
            c.moveTo(x0, y0);
            c.lineTo(x0 + (p1.x - x0) * 2.4, y0 + (p1.y - y0) * 2.4);
            if (z0 < 0) continue;
          }
          c.stroke();
        }

        return {
          resize: build,
          draw: function (t, dt) {
            var c = h.ctx, i, p, q;
            var sdt = Math.min(dt, 0.04);
            if (first) { clearBG(h); first = false; } else { fade(h, 0.13); }

            // pointer: the wind blows from wherever you are, and pressing in
            // toward the planet visibly crushes the dayside magnetopause
            // The upstream direction veers slowly on its own, so the shock and tail
            // are alive before anyone touches it.
            var base = 0.26 * Math.sin(t * 0.13) + 0.10 * Math.sin(t * 0.31 + 1.1);
            var tdx = Math.cos(base), tdy = Math.sin(base);
            var tp = (h.opts.pressure || 1) * (1 + 0.22 * Math.sin(t * 0.19));
            if (h.mouse.active) {
              var ddx = cx - h.mouse.x, ddy = cy - h.mouse.y;
              var dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
              tdx = ddx / dd; tdy = ddy / dd;
              tp = clamp(3.6 - dd / (R * 1.5), 0.5, 3.0);
            }
            var k = approach(sdt, 3);
            wdx += (tdx - wdx) * k; wdy += (tdy - wdy) * k;
            var wl = Math.sqrt(wdx * wdx + wdy * wdy) || 1;
            wdx /= wl; wdy /= wl;
            press += (tp - press) * approach(sdt, 2.2);

            if (sdt > 0) sim(sdt);

            c.globalCompositeOperation = "lighter";

            // bow shock + magnetopause envelopes
            var seg = 90, nx = -wdy, ny = wdx;
            for (var pass = 0; pass < 2; pass++) {
              c.beginPath();
              for (q = 0; q <= seg; q++) {
                var th = -Math.PI + (q / seg) * TAU();
                var ct2 = Math.cos(th), stt = Math.sin(th);
                var rr = rmpAt(ct2) * (pass ? 1.28 : 1) + (pass ? R * 0.24 : 0);
                var sx = cx + (-wdx * ct2 + nx * stt) * rr;
                var sy = cy + (-wdy * ct2 + ny * stt) * rr;
                if (q === 0) c.moveTo(sx, sy); else c.lineTo(sx, sy);
              }
              c.strokeStyle = rgba(pal[pass ? 3 : 1] || pal[0], pass ? 0.2 : 0.3);
              c.lineWidth = pass ? 1.3 : 1;
              c.stroke();
            }

            // particles, in three lanes so the whole field is a few draw calls
            var lanes = [[], [], []];
            for (i = 0; i < ps.length; i++) {
              p = ps[i];
              lanes[p.st === 1 ? 2 : (p.shock > 0 ? 1 : 0)].push(p.px, p.py, p.x, p.y);
            }
            var laneCol = [pal[1] || pal[0], pal[3] || pal[0], pal[0]];
            var laneA = [0.72, 0.86, 1], laneW = [1.5, 1.9, 2.5];
            for (var L = 0; L < 3; L++) {
              var arr = lanes[L];
              if (!arr.length) continue;
              c.strokeStyle = rgba(laneCol[L], laneA[L]);
              c.lineWidth = laneW[L];
              c.beginPath();
              for (i = 0; i < arr.length; i += 4) { c.moveTo(arr[i], arr[i + 1]); c.lineTo(arr[i + 2], arr[i + 3]); }
              c.stroke();
            }

            // planet: opaque body, faint dayside, atmospheric limb
            c.globalCompositeOperation = "source-over";
            c.fillStyle = "#060911";
            c.beginPath(); c.arc(cx, cy, R, 0, TAU()); c.fill();
            var lg = c.createRadialGradient(cx - wdx * R * 0.7, cy - wdy * R * 0.7, R * 0.1, cx - wdx * R * 0.2, cy - wdy * R * 0.2, R * 1.5);
            lg.addColorStop(0, rgba(pal[1] || pal[0], 0.17));
            lg.addColorStop(0.45, rgba(pal[2] || pal[0], 0.05));
            lg.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = lg;
            c.beginPath(); c.arc(cx, cy, R, 0, TAU()); c.fill();

            c.globalCompositeOperation = "lighter";
            var atm = c.createRadialGradient(cx, cy, R * 0.93, cx, cy, R * 1.26);
            atm.addColorStop(0, rgba(pal[1] || pal[0], 0.26));
            atm.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = atm;
            c.beginPath(); c.arc(cx, cy, R * 1.26, 0, TAU()); c.fill();

            // auroral ovals — brightness *is* the precipitation actually landing
            oval(c, 1, nEn, psi, 8, 1, 0.10);
            oval(c, 1, nEn, psi, 3, 1, 0.30);
            oval(c, 1, nEn, psi, 1.1, 1, 0.60);
            oval(c, -1, sEn, psi, 6, 0.85, 0.10);
            oval(c, -1, sEn, psi, 2.2, 0.85, 0.34);
            c.strokeStyle = rgba(pal[0], 0.22); c.lineWidth = 1;
            rays(c, 1, nEn, psi);
            c.strokeStyle = rgba(pal[0], 0.14);
            rays(c, -1, sEn, psi);
            c.globalCompositeOperation = "source-over";
          },
        };
      },
    });

    /* ----------------------------------------------------------
     * 79. Star forge — sweep up dust and watch a star system condense
     * -------------------------------------------------------- */
    registerAnimation("starForge", {
      defaults: {
        maxSystems: 4, formation: 1, speed: 1,
        colors: ["#fde68a", "#22d3ee", "#a78bfa", "#fb7185"],
        background: "#03040c", interactive: true,
      },
      setup: function (h) {
        var sys = [], dust = [], bgStars = [], pal, first = true;
        var charge = 0, pmx = 0, pmy = 0, hadP = false, nextSeed = 5, unit = 1;

        var SPEC = [
          { c: { r: 255, g: 142, b: 92 }, s: 0.70 },
          { c: { r: 255, g: 194, b: 116 }, s: 0.86 },
          { c: { r: 255, g: 240, b: 206 }, s: 1.0 },
          { c: { r: 210, g: 228, b: 255 }, s: 1.22 },
          { c: { r: 172, g: 204, b: 255 }, s: 1.42 },
        ];
        function planetCol(f) {
          if (f < 0.30) return mixRgb({ r: 182, g: 140, b: 108 }, { r: 228, g: 176, b: 118 }, Math.random());
          if (f < 0.58) return mixRgb({ r: 104, g: 170, b: 150 }, { r: 118, g: 184, b: 228 }, Math.random());
          return mixRgb({ r: 148, g: 200, b: 234 }, { r: 208, g: 226, b: 248 }, Math.random());
        }

        function mkSystem(x, y, age) {
          var sc = rand(0.60, 1.0) * Math.min(h.width, h.height) * 0.30;
          var s = {
            x: x, y: y, age: age, life: rand(20, 32),
            disk: sc, incl: rand(0.18, 0.60), rot: Math.random() * Math.PI,
            spin: Math.random() < 0.5 ? 1 : -1,
            star: SPEC[(Math.random() * SPEC.length) | 0], motes: [], planets: [],
            vx: rand(-3, 3), vy: rand(-2.2, 2.2),
          };
          var i;
          for (i = 0; i < 78; i++) {
            var rt = sc * rand(0.26, 1.14);
            s.motes.push({
              a: Math.random() * TAU(), r0: sc * rand(1.7, 3.6), rt: rt,
              w: s.spin * (0.95 / Math.pow(rt / sc, 1.5)) * rand(0.85, 1.15),
              br: rand(0.3, 1.05),
            });
          }
          var np = 3 + ((Math.random() * 4) | 0);
          var base = sc * rand(0.26, 0.34);
          for (i = 0; i < np; i++) {
            var pr = base * Math.pow(rand(1.45, 1.72), i);
            if (pr > sc * 1.18) break;
            var f = pr / (sc * 1.18);
            s.planets.push({
              r: pr, a: Math.random() * TAU(),
              w: s.spin * (1.05 / Math.pow(pr / sc, 1.5)) * 0.55,
              sz: (1.0 + Math.random() * 2.0) * (0.5 + f) * unit,
              col: planetCol(f), ring: f > 0.5 && Math.random() < 0.42,
              born: 2.6 + i * 0.46,
            });
          }
          return s;
        }

        function farSpot() {
          var bx = 0, by = 0, best = -1;
          for (var k = 0; k < 14; k++) {
            var x = rand(h.width * 0.15, h.width * 0.85), y = rand(h.height * 0.18, h.height * 0.82);
            var d = 1e9;
            for (var i = 0; i < sys.length; i++) {
              var dx = x - sys[i].x, dy = y - sys[i].y;
              d = Math.min(d, dx * dx + dy * dy);
            }
            if (d > best) { best = d; bx = x; by = y; }
          }
          return { x: bx, y: by };
        }

        function build() {
          pal = paletteOf(h.opts, ["#fde68a", "#22d3ee", "#a78bfa", "#fb7185"]);
          unit = Math.min(h.width, h.height) / 300;
          bgStars = [];
          var ns = Math.round((h.width * h.height) / 3600);
          for (var i = 0; i < ns; i++) {
            bgStars.push({ x: Math.random() * h.width, y: Math.random() * h.height, r: rand(0.25, 1.0), a: rand(0.07, 0.44) });
          }
          dust = [];
          var nd = Math.max(110, Math.round((h.width * h.height) / 1800));
          for (i = 0; i < nd; i++) {
            dust.push({
              x: Math.random() * h.width, y: Math.random() * h.height,
              vx: rand(-5, 5), vy: rand(-4, 4), r: rand(0.35, 1.2),
            });
          }
          // three systems staggered across the lifecycle, so the very first
          // frame shows the whole story: a cloud, a disk and a finished system
          sys = [];
          sys.push(mkSystem(h.width * 0.24, h.height * 0.38, 9.5));
          sys.push(mkSystem(h.width * 0.62, h.height * 0.62, 3.5));
          sys.push(mkSystem(h.width * 0.85, h.height * 0.26, 0.6));
          charge = 0; nextSeed = rand(7, 12); first = true;
        }
        build();

        return {
          resize: build,
          draw: function (t, dt) {
            var c = h.ctx, i, j, s;
            var sdt = Math.min(dt, 0.045) * (h.opts.speed || 1);
            var form = h.opts.formation == null ? 1 : h.opts.formation;
            if (first) { clearBG(h); first = false; } else { fade(h, 0.30); }

            c.globalCompositeOperation = "lighter";
            for (i = 0; i < bgStars.length; i++) {
              var b = bgStars[i];
              c.fillStyle = rgba({ r: 202, g: 218, b: 255 }, b.a * (0.7 + 0.3 * Math.sin(t * 0.7 + i)));
              c.fillRect(b.x, b.y, b.r + 0.5, b.r + 0.5);
            }

            // ambient dust — and the pointer vacuuming it up into a new seed
            var act = h.mouse.active, mx = h.mouse.x, my = h.mouse.y;
            if (act && !hadP) { pmx = mx; pmy = my; }
            var pspd = act ? Math.sqrt((mx - pmx) * (mx - pmx) + (my - pmy) * (my - pmy)) / Math.max(sdt, 0.008) : 0;
            hadP = act;
            c.beginPath();
            for (i = 0; i < dust.length; i++) {
              var d = dust[i];
              if (act) {
                var dx = mx - d.x, dy = my - d.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
                if (dd < 180) {
                  var pull = (1 - dd / 180) * 520;
                  d.vx += (dx / dd) * pull * sdt + (-dy / dd) * pull * 0.55 * sdt;
                  d.vy += (dy / dd) * pull * sdt + (dx / dd) * pull * 0.55 * sdt;
                  if (dd < 12) {
                    charge += 0.055;
                    d.x = Math.random() * h.width; d.y = Math.random() * h.height;
                    d.vx = rand(-5, 5); d.vy = rand(-4, 4);
                  }
                }
              }
              var damp = 1 - Math.min(0.6, sdt * 1.1);
              d.vx *= damp; d.vy *= damp;
              d.x += d.vx * sdt; d.y += d.vy * sdt;
              if (d.x < -6) d.x += h.width + 12; if (d.x > h.width + 6) d.x -= h.width + 12;
              if (d.y < -6) d.y += h.height + 12; if (d.y > h.height + 6) d.y -= h.height + 12;
              c.moveTo(d.x + d.r, d.y); c.arc(d.x, d.y, d.r, 0, TAU());
            }
            c.fillStyle = rgba({ r: 168, g: 186, b: 230 }, 0.3);
            c.fill();

            if (act) {
              charge += sdt * (0.3 + Math.min(1.5, pspd * 0.004));
              if (charge >= 1 && sys.length < (h.opts.maxSystems || 4)) {
                sys.push(mkSystem(mx, my, 0)); charge = 0;
              }
              var cr = 4 + charge * 24;
              var ng = c.createRadialGradient(mx, my, 0, mx, my, cr);
              ng.addColorStop(0, rgba(pal[0], 0.5 + charge * 0.4));
              ng.addColorStop(0.4, rgba(pal[2] || pal[0], 0.18));
              ng.addColorStop(1, "rgba(0,0,0,0)");
              c.fillStyle = ng;
              c.beginPath(); c.arc(mx, my, cr, 0, TAU()); c.fill();
              c.strokeStyle = rgba(pal[0], 0.2 + charge * 0.45); c.lineWidth = 1;
              c.beginPath(); c.arc(mx, my, cr * 0.55 + 3, -Math.PI / 2, -Math.PI / 2 + TAU() * clamp(charge, 0.02, 1)); c.stroke();
              pmx = mx; pmy = my;
            } else if (charge > 0) { charge = Math.max(0, charge - sdt * 0.5); }

            // keep regenerating on its own, whether or not anyone is here
            nextSeed -= sdt;
            if (nextSeed <= 0) {
              nextSeed = rand(7, 13);
              if (sys.length < (h.opts.maxSystems || 4)) { var f = farSpot(); sys.push(mkSystem(f.x, f.y, 0)); }
            }

            for (i = sys.length - 1; i >= 0; i--) {
              s = sys[i];
              s.age += sdt * form;
              s.x += s.vx * sdt; s.y += s.vy * sdt;
              if (s.age > s.life) { sys.splice(i, 1); continue; }

              var A = smoothstep01(s.age / 0.3) * smoothstep01((s.life - s.age) / 4.5);
              var cr2 = Math.cos(s.rot), sr = Math.sin(s.rot);
              var collapse = smoothstep01(s.age / 1.0);
              var ign = clamp((s.age - 1.0) / 0.32, 0, 1);
              var diskA = A * (s.age < 6 ? smoothstep01(s.age / 1.3) : Math.max(0.1, 1 - (s.age - 6) / 6));

              // the disk itself: a real glowing annulus, drawn in disk space
              if (diskA > 0.01 && s.age > 0.55) {
                c.save();
                c.translate(s.x, s.y); c.rotate(s.rot); c.scale(1, s.incl);
                var dr = s.disk * 1.2;
                var dg = c.createRadialGradient(0, 0, s.disk * 0.14, 0, 0, dr);
                dg.addColorStop(0, rgba(mixRgb(s.star.c, pal[1] || pal[0], 0.45), 0.20 * diskA));
                dg.addColorStop(0.42, rgba(mixRgb(pal[2] || pal[0], s.star.c, 0.35), 0.11 * diskA));
                dg.addColorStop(1, "rgba(0,0,0,0)");
                c.fillStyle = dg;
                c.beginPath(); c.arc(0, 0, dr, 0, TAU()); c.fill();
                c.restore();
              }

              // in-falling / orbiting dust, with gaps carved by new planets
              c.beginPath();
              for (j = 0; j < s.motes.length; j++) {
                var m = s.motes[j];
                m.a += m.w * sdt * (h.opts.speed || 1) * (0.5 + collapse);
                var r = lerp(m.r0, m.rt, collapse);
                var gap = 1;
                for (var g = 0; g < s.planets.length; g++) {
                  var pl = s.planets[g];
                  if (s.age > pl.born) {
                    var gw = s.disk * 0.08 * clamp((s.age - pl.born) / 1.4, 0, 1);
                    var ad = Math.abs(r - pl.r);
                    if (ad < gw) gap = Math.min(gap, ad / gw);
                  }
                }
                if (gap < 0.05) continue;
                var ex = Math.cos(m.a) * r, ey = Math.sin(m.a) * r * s.incl;
                var sx = s.x + ex * cr2 - ey * sr, sy = s.y + ex * sr + ey * cr2;
                var rr = m.br * unit * (0.5 + 0.5 * gap);
                c.moveTo(sx + rr, sy); c.arc(sx, sy, rr, 0, TAU());
              }
              c.fillStyle = rgba(mixRgb(pal[1] || pal[0], s.star.c, 0.45), 0.42 * A * (s.age < 6 ? 1 : Math.max(0.12, 1 - (s.age - 6) / 6)));
              c.fill();

              // collapsing envelope before ignition
              if (s.age < 2.0) {
                var er2 = s.disk * lerp(2.7, 0.95, collapse);
                var eg = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, er2);
                eg.addColorStop(0, rgba(pal[2] || pal[0], 0.19 * A * (0.35 + collapse)));
                eg.addColorStop(0.45, rgba(pal[2] || pal[0], 0.055 * A));
                eg.addColorStop(1, "rgba(0,0,0,0)");
                c.fillStyle = eg;
                c.beginPath(); c.arc(s.x, s.y, er2, 0, TAU()); c.fill();
              }

              // ignition: a flash ring and a brief bipolar outflow up the axis
              if (s.age > 1.0 && s.age < 2.6) {
                var fp = (s.age - 1.0) / 1.6, ifp = 1 - fp;
                var fr = s.disk * (0.18 + fp * 2.3);
                c.strokeStyle = rgba({ r: 255, g: 248, b: 230 }, 0.55 * ifp * ifp * A);
                c.lineWidth = 2.6 * ifp + 0.4;
                c.beginPath(); c.ellipse(s.x, s.y, fr, fr * lerp(1, s.incl, 0.5), s.rot, 0, TAU()); c.stroke();
                var jl = s.disk * 1.7 * Math.sin(Math.PI * clamp(fp * 1.15, 0, 1));
                var jx = -sr, jy = cr2;                     // disk normal, on screen
                var jg = c.createLinearGradient(s.x - jx * jl, s.y - jy * jl, s.x + jx * jl, s.y + jy * jl);
                jg.addColorStop(0, "rgba(0,0,0,0)");
                jg.addColorStop(0.5, rgba(pal[1] || pal[0], 0.4 * A * ifp));
                jg.addColorStop(1, "rgba(0,0,0,0)");
                c.strokeStyle = jg; c.lineWidth = 2.4 * unit * ifp + 0.6;
                c.beginPath();
                c.moveTo(s.x - jx * jl, s.y - jy * jl); c.lineTo(s.x + jx * jl, s.y + jy * jl);
                c.stroke();
              }

              // orbit traces + planets
              for (j = 0; j < s.planets.length; j++) {
                var q = s.planets[j];
                if (s.age < q.born) continue;
                var pa = clamp((s.age - q.born) / 0.9, 0, 1);
                q.a += q.w * sdt * (h.opts.speed || 1);
                c.strokeStyle = rgba(pal[1] || pal[0], 0.055 * A * pa);
                c.lineWidth = 0.7;
                c.beginPath(); c.ellipse(s.x, s.y, q.r, q.r * s.incl, s.rot, 0, TAU()); c.stroke();
                var px2 = Math.cos(q.a) * q.r, py2 = Math.sin(q.a) * q.r * s.incl;
                var qx = s.x + px2 * cr2 - py2 * sr, qy = s.y + px2 * sr + py2 * cr2;
                var qs = q.sz * pa;
                if (q.ring) {
                  c.strokeStyle = rgba(mixRgb(q.col, WHITE, 0.35), 0.45 * A * pa);
                  c.lineWidth = 0.9;
                  c.beginPath(); c.ellipse(qx, qy, qs * 2.2, qs * 0.6, s.rot + 0.4, 0, TAU()); c.stroke();
                }
                // lit toward the star, dark away from it
                var ldx = s.x - qx, ldy = s.y - qy, ld = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
                c.fillStyle = rgba(mixRgb(q.col, { r: 8, g: 10, b: 20 }, 0.55), 0.9 * A * pa);
                c.beginPath(); c.arc(qx, qy, qs, 0, TAU()); c.fill();
                c.fillStyle = rgba(mixRgb(q.col, s.star.c, 0.25), 0.9 * A * pa);
                c.beginPath(); c.arc(qx + (ldx / ld) * qs * 0.32, qy + (ldy / ld) * qs * 0.32, qs * 0.78, 0, TAU()); c.fill();
              }

              // the star
              var starA = A * ign;
              if (starA > 0.002) {
                var sr2 = (1.9 + s.star.s * 3.0) * unit * (0.55 + 0.45 * ign);
                var flare = 1 + 0.7 * Math.exp(-Math.max(0, s.age - 1.0) * 3.4);
                var hr = sr2 * 5.5 * flare;
                var hg = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, hr);
                hg.addColorStop(0, rgba(s.star.c, 0.6 * starA));
                hg.addColorStop(0.22, rgba(s.star.c, 0.14 * starA));
                hg.addColorStop(1, "rgba(0,0,0,0)");
                c.fillStyle = hg;
                c.beginPath(); c.arc(s.x, s.y, hr, 0, TAU()); c.fill();
                c.fillStyle = rgba(mixRgb(s.star.c, WHITE, 0.55), 0.95 * starA);
                c.beginPath(); c.arc(s.x, s.y, sr2 * flare, 0, TAU()); c.fill();
              }
            }
            c.globalCompositeOperation = "source-over";
          },
        };
      },
    });

    /* ----------------------------------------------------------
     * 80. Relativistic jets — twin beams whose brightness follows your pointer
     *
     * The pointer sets the spin axis: its screen angle picks the direction the
     * jets fire, and its distance from centre sets how far the axis tips
     * toward the viewer. Tip it your way and Doppler beaming makes that jet
     * blaze while the counter-jet collapses to a ghost.
     * -------------------------------------------------------- */
    registerShader("relativisticJets", {
      defaults: {
        beta: 0.96, tilt: 0.75, knots: 6, speed: 1,
        colors: ["#dbeafe", "#7c5cff", "#ffb168"],
        background: "#03040d", interactive: true,
      },
      staticTime: 9,
      uniforms: function (o, h) {
        var s = h.__rjets;
        if (!s) { s = h.__rjets = { cx: Math.cos(o.tilt || 0), sy: Math.sin(o.tilt || 0), psi: 0.35, lt: h.t }; }
        var dt = clamp(h.t - s.lt, 0, 0.06); s.lt = h.t;
        var tphi = (o.tilt || 0) + Math.sin(h.t * 0.085) * 0.52;
        var tpsi = 0.6 * Math.sin(h.t * 0.055 + 0.7);
        if (h.mouse.active && h.width > 2) {
          var mx = (h.mouse.x / h.width) * 2 - 1;
          var my = -((h.mouse.y / h.height) * 2 - 1);
          tphi = Math.atan2(my, mx);
          tpsi = (1 - Math.min(1, Math.sqrt(mx * mx + my * my) / 0.92)) * 1.02;
        }
        // smooth the axis as a vector so it never snaps across the ±pi seam
        var k = approach(dt, 5.5);
        s.cx += (Math.cos(tphi) - s.cx) * k;
        s.sy += (Math.sin(tphi) - s.sy) * k;
        var l = Math.sqrt(s.cx * s.cx + s.sy * s.sy) || 1;
        s.cx /= l; s.sy /= l;
        s.psi += (tpsi - s.psi) * approach(dt, 3.4);
        var cp = Math.cos(s.psi);
        var pal = (o.colors && o.colors.length ? o.colors : ["#dbeafe", "#7c5cff", "#ffb168"]);
        var bg = hexToRgb(o.background || "#03040d");
        return {
          uSpeed: o.speed == null ? 1 : o.speed,
          uBeta: clamp(o.beta == null ? 0.96 : o.beta, 0, 0.998),
          uKnots: clamp(o.knots == null ? 6 : o.knots, 1, 8),
          uAxis: [s.cx * cp, s.sy * cp, Math.sin(s.psi)],
          uTint: vec3of(pal[0]),
          uSheath: vec3of(pal[1] || pal[0]),
          uTorus: vec3of(pal[2] || pal[0]),
          uBg: [bg.r / 255, bg.g / 255, bg.b / 255],
        };
      },
      fragment: [
        "float h11(float n){ return fract(sin(n*127.1)*43758.5453123); }",
        "float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }",
        "float sq(float x){ return x*x; }",
        "float starfield(vec2 p){",
        "  vec2 g=floor(p*40.0); float r=h21(g);",
        "  vec2 c=(g+vec2(h21(g+1.3),h21(g+7.1)))/40.0;",
        "  return smoothstep(0.0038,0.0,length(p-c))*step(0.955,r)*(0.3+0.7*h21(g+3.7));",
        "}",
        "void main(){",
        "  float mn = min(uResolution.x, uResolution.y);",
        "  vec2 p = (gl_FragCoord.xy - 0.5*uResolution)/mn;",
        "  float t = uTime*uSpeed;",
        "  vec3 n = normalize(uAxis);",
        "  float L = max(length(n.xy), 1e-4);",
        "  vec2 ax = n.xy/L;",
        "  vec2 pr = vec2(-ax.y, ax.x);",
        "  float s = dot(p, ax);",
        "  float q = dot(p, pr);",
        "  float Lc = max(L, 0.16);",
        "  float rr = length(p);",
        // relativistic beaming: delta = 1/(gamma(1 - beta cos th)), I ~ delta^3.4.
        // Normalised so the near jet always reads at full strength and the
        // counter-jet sinks to a ghost — the ratio is the whole point.
        "  float b2 = clamp(uBeta, 0.0, 0.998);",
        "  float gam = 1.0/sqrt(max(1e-4, 1.0-b2*b2));",
        "  float dA = 1.0/max(1e-3, gam*(1.0-b2*n.z));",
        "  float dB = 1.0/max(1e-3, gam*(1.0+b2*n.z));",
        "  float pA = pow(max(dA,1e-3), 3.4);",
        "  float pB = pow(max(dB,1e-3), 3.4);",
        "  float pm = max(pA, pB);",
        "  float bA = max(pA/pm, 0.035);",
        "  float bB = max(pB/pm, 0.035);",
        "  vec3 col = vec3(0.0);",
        "  for (int j = 0; j < 2; j++) {",
        "    float sg = (j==0) ? 1.0 : -1.0;",
        "    float bo = (j==0) ? bA : bB;",
        "    float df = (j==0) ? dA : dB;",
        "    float sd = s*sg;",
        "    float inj = step(0.0008, sd);",
        "    float d3 = max(sd,0.0)/Lc;",                  // undo the foreshortening
        "    float emerge = smoothstep(0.03, 0.22, d3);",  // the base hides in the torus
        "    float w = 0.0085 + d3*0.058;",
        "    float core = exp(-sq(q/w));",
        "    float sheath = exp(-sq(q/(w*2.6)));",
        "    float cocoon = exp(-sq(q/(w*6.5)));",
        "    float reach = smoothstep(1.28, 0.06, d3);",
        "    float atten = 1.0/(0.55 + d3*1.5);",
        "    float base = reach*atten*inj*emerge;",
        // internal shocks: knots ride outward, and time runs fast on the
        // approaching side, so the boosted jet's knots visibly race
        "    float kn = 0.0;",
        "    float rate = min(df, 3.0);",
        "    for (int i = 0; i < 8; i++) {",
        "      float fi = float(i);",
        "      float m = step(fi+0.5, uKnots);",
        "      float ph = fract(t*0.17*rate + fi/max(uKnots,1.0) + sg*0.37 + h11(fi+sg*11.0)*0.22);",
        "      float kp = ph*1.24;",
        "      float kw = 0.022 + kp*0.05;",
        "      kn += m*exp(-sq((d3-kp)/kw))*(1.0-ph*0.72);",
        "    }",
        "    float lobe = exp(-sq((d3-1.1)/0.24))*exp(-sq(q/(w*1.6)))*inj;",
        "    col += uTint*(core*0.6 + kn*core*1.55)*base*bo;",
        "    col += uSheath*(sheath*0.3 + cocoon*0.12)*base*bo*1.4;",
        "    col += uTint*lobe*bo*0.45;",
        "  }",
        // accretion torus: a circle in the plane normal to the spin axis, so it
        // projects to an ellipse squashed along the jet direction
        "  float eu = dot(p, pr)/0.135;",
        "  float ev = dot(p, ax)/(0.135*max(abs(n.z),0.15));",
        "  float er = sqrt(eu*eu + ev*ev);",
        "  float ring = exp(-sq((er-1.0)*2.6));",
        "  float cphi = (er>1e-4) ? eu/er : 0.0;",
        "  float rb = clamp(0.6/max(0.22, 1.0-0.6*cphi*L), 0.32, 2.2);",
        "  float turb = 0.78 + 0.34*sin(atan(ev, eu+1e-5)*5.0 - t*2.0);",
        "  float torus = (ring*rb*turb + exp(-er*er*2.2)*0.16)*smoothstep(0.030,0.056,rr);",
        "  col += uTorus*torus*0.7;",
        "  col += vec3(1.0,0.94,0.84)*exp(-sq((rr-0.060)*46.0))*0.3;",
        "  col += uSheath*exp(-rr*rr*72.0)*0.32;",
        "  col += vec3(0.8,0.87,1.0)*starfield(p)*0.42;",
        "  col += uSheath*0.035*exp(-rr*1.8) + uBg;",
        "  col = vec3(1.0) - exp(-col*1.15);",
        "  fragColor = vec4(col, 1.0);",
        "}",
      ].join("\n"),
    });
  })();

  /* ============================================================
   * three.js scenes (the optional tier) — 81-86
   *
   * Everything below needs a scene graph, real volumetrics, GPU-side state or a
   * post-processing chain, which is exactly what the 2D and fragment-shader
   * tiers cannot give. Nothing here loads until one of them is mounted.
   * ========================================================== */

  /* 81. eventHorizon — a Schwarzschild black hole, ray-traced in curved spacetime.
   *
   * The 2D `blackHole` and `lensing` scenes paint what lensing looks like. This
   * one solves for it. Each pixel's photon is integrated through the Schwarzschild
   * metric in the orbit-plane form
   *
   *     d²u/dφ² = -u + (3/2)·rs·u²        where u = 1/r
   *
   * so the photon ring, the Einstein ring of the starfield behind the hole, and
   * the way the far side of the disk is bent up over the top all fall out of the
   * integration instead of being drawn on. The disk carries relativistic Doppler
   * shift and beaming (I ∝ δ⁴), which is why one side is bright blue-white and
   * the other is dim and red — the asymmetry is the physics, not a gradient.
   */
  registerThree("eventHorizon", {
    defaults: {
      spin: 1,             // how fast the disk material orbits
      tilt: 0.42,          // camera inclination above the disk plane, radians
      diskInner: 2.6,      // inner disk radius in units of rs (ISCO ≈ 3)
      diskOuter: 9,
      steps: 220,          // integration steps per photon
      exposure: 0.85,
      colors: ["#fff4e2", "#ffb46b", "#7c5cff"],
      background: "#03040a",
      interactive: true,
    },
    scene: function (T, h) {
      var renderer = threeRenderer(T, h);
      renderer.toneMapping = T.NoToneMapping; // the shader tonemaps itself
      var scene = new T.Scene();
      var cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      var pal = paletteOf(h.opts, ["#fff4e2", "#ffb46b", "#7c5cff"]);
      // hexToRgb returns {r,g,b} — indexing it like an array yields NaN uniforms,
      // and a NaN colour turns the whole frame white with no compile error.
      var v3 = function (c) {
        var f = function (x) { return Math.pow(x / 255, 2.2); };
        return new T.Vector3(f(c.r), f(c.g), f(c.b));
      };

      var uni = {
        uRes: { value: new T.Vector2(1, 1) },
        uTime: { value: 0 },
        uTilt: { value: h.opts.tilt },
        uInner: { value: h.opts.diskInner },
        uOuter: { value: h.opts.diskOuter },
        uSpin: { value: h.opts.spin },
        uSteps: { value: h.opts.steps },
        uExposure: { value: h.opts.exposure },
        uHot: { value: v3(pal[0]) },
        uWarm: { value: v3(pal[1 % pal.length]) },
        uCool: { value: v3(pal[2 % pal.length]) },
        uBg: { value: v3(hexToRgb(h.opts.background || "#03040a")) },
      };

      var mat = new T.ShaderMaterial({
        uniforms: uni,
        vertexShader:
          "void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }",
        fragmentShader: [
          "precision highp float;",
          "uniform vec2 uRes; uniform float uTime, uTilt, uInner, uOuter, uSpin, uSteps, uExposure;",
          "uniform vec3 uHot, uWarm, uCool, uBg;",
          "out vec4 fragColor;",

          "float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }",
          "float noise(vec3 p){",
          "  vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);",
          "  float a = mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),",
          "                mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);",
          "  return a;",
          "}",
          "float fbm(vec3 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*noise(p); p*=2.03; a*=0.5; } return s; }",

          /* The starfield the hole lenses. Sampled by direction, so a bent ray
           * genuinely looks somewhere else in the sky. */
          /* Stars as actual points on a spherical grid, not lit grid cells.
           * Hashing floor(direction*k) paints cube-shaped cells, and because a
           * lensed ray sweeps slowly along some loci it draws them as dotted
           * straight lines across the sky. Placing one star at a random offset
           * inside each cell with a smooth radial falloff removes the artifact
           * and gives round stars that survive magnification near the ring. */
          "vec3 sky(vec3 d){",
          "  vec3 c = uBg;",
          "  float lon = atan(d.z, d.x);",
          "  float lat = asin(clamp(d.y, -1.0, 1.0));",
          "  vec2 sc = vec2(lon * 0.1591549, lat * 0.3183099) * 150.0;",   // lon/2pi, lat/pi
          "  vec2 cell = floor(sc), frc = fract(sc);",
          "  for (int oy = -1; oy <= 1; oy++) {",
          "    for (int ox = -1; ox <= 1; ox++) {",
          "      vec2 o = vec2(float(ox), float(oy));",
          "      vec2 id = cell + o;",
          "      float r1 = hash(vec3(id, 1.0));",
          "      if (r1 < 0.90) continue;",                              // ~10% of cells hold a star
          "      vec2 pos = o + vec2(hash(vec3(id, 7.0)), hash(vec3(id, 13.0)));",
          "      float dist = length(frc - pos);",
          "      float mag = (r1 - 0.90) * 10.0;",                       // 0..1 brightness draw
          "      float tw = 0.72 + 0.28 * sin(uTime * 1.9 + r1 * 90.0);",
          "      vec3 tint = mix(vec3(0.62, 0.74, 1.0), vec3(1.0, 0.82, 0.62), hash(vec3(id, 21.0)));",
          "      c += tint * pow(mag, 3.0) * tw * exp(-dist * dist * 190.0);",
          "    }",
          "  }",
          // a faint galactic band, so lensing has large-scale structure to bend
          "  float dy = d.y * 7.0;",
          "  float band = exp(-dy * dy) * (0.012 + 0.05 * fbm(d * 7.0));",
          "  c += uCool * band * 0.35;",
          "  return c;",
          "}",

          /* Disk emission: temperature rises inward (T ∝ r^-3/4), turbulence in
           * the orbiting frame, and a sharp inner cut. */
          "vec3 disk(float r, float phi){",
          "  float x = clamp((r - uInner) / max(0.001, uOuter - uInner), 0.0, 1.0);",
          "  float temp = pow(uInner / r, 0.75);",
          "  float orbit = uTime * uSpin * 34.0 / pow(r, 1.5);",   // Keplerian shear
          "  float turb = fbm(vec3(cos(phi + orbit) * r, sin(phi + orbit) * r, r * 0.4) * 0.9);",
          "  float dens = smoothstep(0.0, 0.09, x) * (1.0 - smoothstep(0.30, 0.95, x));",
          "  dens *= 0.30 + 1.05 * turb * turb;",
          "  vec3 col = mix(uWarm, uHot, clamp(temp * 1.25, 0.0, 1.0));",
          "  return col * dens * (0.85 * temp * temp);",
          "}",

          "void main(){",
          "  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;",
          // camera: looking at the hole from above the disk plane
          "  float ct = cos(uTilt), st = sin(uTilt);",
          "  vec3 eye = vec3(0.0, st, -ct) * 22.0;",
          "  vec3 fwd = normalize(-eye);",
          "  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));",
          "  vec3 up = cross(fwd, right);",
          "  vec3 dir = normalize(fwd * 2.4 + right * uv.x + up * uv.y);",

          /* Integrate in the plane spanned by (eye, dir). Everything below is
           * 2D in that plane, which is what makes a real geodesic affordable. */
          "  vec3 nrm = normalize(cross(eye, dir));",   // orbital plane normal
          "  vec3 e1 = normalize(eye);",
          "  vec3 e2 = normalize(cross(nrm, e1));",
          "  float r = length(eye);",
          "  float u = 1.0 / r;",
          // du/dphi from the projection of the ray direction onto the plane basis
          "  float dr = dot(dir, e1);",
          "  float rdphi = dot(dir, e2);",
          "  float du = -u * dr / max(1e-4, rdphi);",   // u' = -(1/r²)(dr/dphi)
          "  float phi0 = 0.0;",
          "  float dphi = 3.2 / uSteps;",              // sweep up to ~pi
          "  vec3 acc = vec3(0.0);",
          "  bool captured = false;",
          "  float prevY = dot(eye, vec3(0.0, 1.0, 0.0));",
          "  vec3 pos = eye;",

          "  for (int i = 0; i < 512; i++) {",
          "    if (float(i) >= uSteps) break;",
          // RK2 on u'' = -u + 1.5*rs*u², rs = 1
          "    float k1 = -u + 1.5 * u * u;",
          "    float uMid = u + 0.5 * dphi * du;",
          "    float duMid = du + 0.5 * dphi * k1;",
          "    float k2 = -uMid + 1.5 * uMid * uMid;",
          "    u += dphi * duMid;",
          "    du += dphi * k2;",
          "    phi0 += dphi;",
          "    if (u <= 0.0) break;",                 // escaped to infinity
          "    if (u > 1.0) { captured = true; break; }", // crossed the horizon r < rs
          "    float rr = 1.0 / u;",
          "    vec3 next = (e1 * cos(phi0) + e2 * sin(phi0)) * rr;",
          "    float y = next.y;",
          // disk crossing: sign change of y between steps, interpolated
          "    if (prevY * y < 0.0) {",
          "      float f = prevY / (prevY - y);",
          "      vec3 hit = mix(pos, next, f);",
          "      float hr = length(hit.xz);",
          "      if (hr > uInner && hr < uOuter) {",
          "        float ph = atan(hit.z, hit.x);",
          // Doppler: orbital velocity of the material, projected on the line of sight
          "        vec3 vdir = normalize(vec3(-hit.z, 0.0, hit.x));",
          "        float beta = min(0.78, 1.02 / sqrt(max(1.2, hr)));",
          "        vec3 look = normalize(hit - eye);",
          "        float mu = dot(vdir, -look);",
          "        float g = 1.0 / sqrt(1.0 - beta * beta);",
          "        float delta = 1.0 / (g * (1.0 - beta * mu));",   // Doppler factor
          "        float beam = pow(delta, 4.0);",                  // relativistic beaming
          "        vec3 em = disk(hr, ph) * beam;",
          // blueshift the approaching side, redden the receding side
          "        em *= mix(vec3(1.0, 0.72, 0.5), vec3(0.72, 0.86, 1.0), clamp(delta * 0.5, 0.0, 1.0));",
          "        acc += em;",
          "      }",
          "    }",
          "    prevY = y; pos = next;",
          "  }",

          "  vec3 col = acc;",
          "  if (!captured) {",
          /* The outgoing direction is the full geodesic tangent:
           *     d/dphi [ r(phi) * rhat ] = r' * rhat + r * phihat,   r' = -u'/u^2
           * Using only the phihat term (the obvious mistake) leaves the far
           * field a non-identity map, which smears background stars into long
           * straight streaks right across the frame. */
          "    vec3 rhat = e1 * cos(phi0) + e2 * sin(phi0);",
          "    vec3 phat = -e1 * sin(phi0) + e2 * cos(phi0);",
          "    vec3 tangent = normalize(rhat * (-du / max(1e-6, u)) + phat);",
          "    col += sky(tangent);",
          "  }",
          "  col *= uExposure;",
          "  col = col / (1.0 + col);",                       // Reinhard
          "  col = pow(col, vec3(1.0 / 2.2));",
          "  fragColor = vec4(col, 1.0);",
          "}",
        ].join("\n"),
        glslVersion: T.GLSL3,
      });

      var quad = new T.Mesh(new T.PlaneGeometry(2, 2), mat);
      quad.frustumCulled = false;
      scene.add(quad);

      return {
        resize: function (w, hh) {
          renderer.setPixelRatio(h.dpr);
          renderer.setSize(w, hh, false);
          uni.uRes.value.set(h.canvas.width, h.canvas.height);
        },
        update: function (o) {
          uni.uTilt.value = o.tilt;
          uni.uInner.value = o.diskInner;
          uni.uOuter.value = o.diskOuter;
          uni.uSpin.value = o.spin;
          uni.uExposure.value = o.exposure;
        },
        draw: function (t) {
          uni.uTime.value = t;
          // the pointer leans the camera, so the lensing asymmetry is explorable
          if (h.mouse.active) {
            var ny = (h.mouse.y / Math.max(1, h.height)) - 0.5;
            uni.uTilt.value += (h.opts.tilt - ny * 0.9 - uni.uTilt.value) * 0.06;
          } else {
            uni.uTilt.value += (h.opts.tilt - uni.uTilt.value) * 0.04;
          }
          renderer.render(scene, cam);
        },
        destroy: function () { threeDispose(scene, [mat, renderer]); },
      };
    },
  });

  /* molecularCloud — a real single-scattering volume raymarch.
   *
   * A 128^3 R8 Data3DTexture is filled on the CPU with curl-warped multiplicative
   * ridged noise plus two dense cores, then marched inside a box in the box's own
   * local space: entry/exit come from a slab intersection of the unit AABB, every
   * sample takes a 6-step shadow march toward the embedded protostar, and the result
   * composites with Beer-Lambert extinction and a Henyey-Greenstein phase function.
   * Because the march happens in the mesh's local space, rotating the mesh rotates
   * the volume *and* its star field: near filaments genuinely slide in front of far
   * ones. No 2D fragment shader can produce that parallax.
   */
  registerThree("molecularCloud", {
    defaults: {
      colors: ["#ffb37a", "#78aaff", "#c58cff"],
      background: "#04060e",
      res: 128,           // 3D texture edge (128^3 = 2.1M voxels)
      steps: 64,          // primary march samples
      density: 9.0,       // extinction coefficient
      shadow: 2.60,       // absorption along the light march
      emission: 1.35,     // scatter gain
      forward: 0.62,      // Henyey-Greenstein g
      spin: 0.13,         // rad/s of volume rotation
      churn: 0.30,        // amplitude of the internal shear
      distance: 2.02,
    },

    scene: function (T, h) {
      var renderer = threeRenderer(T, h);
      var o = h.opts;
      var pal = paletteOf(o, ["#ffb37a", "#78aaff", "#c58cff"]);
      function lin(c) { // sRGB byte -> linear float triple
        return [Math.pow(c.r / 255, 2.2), Math.pow(c.g / 255, 2.2), Math.pow(c.b / 255, 2.2)];
      }
      function v3(a) { return new T.Vector3(a[0], a[1], a[2]); }
      var bg = lin(hexToRgb(o.background || "#04060e"));

      /* ---- CPU volume -------------------------------------------------- */
      var N = Math.max(48, Math.min(128, o.res | 0));
      var G = 64, GM = G - 1, GS = 6;               // tiling value-noise lattice
      var lat = new Float32Array(G * G * G), sd = 1337;
      for (var i = 0; i < lat.length; i++) {
        sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0;
        lat[i] = sd / 4294967296;
      }
      // Lattice fetch wrapped to period m+1 then shifted, so every octave tiles
      // exactly over the volume and no octave shows a seam at the box faces.
      function gv(x, y, z, m, s) {
        return lat[((((x & m) + s) & GM) << (GS * 2)) | ((((y & m) + s * 3) & GM) << GS) | (((z & m) + s * 7) & GM)];
      }
      function vn(x, y, z, m, s) {                   // trilinear value noise, period m+1
        var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
        var fx = x - xi, fy = y - yi, fz = z - zi;
        fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
        var a = gv(xi, yi, zi, m, s), b = gv(xi + 1, yi, zi, m, s);
        var c = gv(xi, yi + 1, zi, m, s), d = gv(xi + 1, yi + 1, zi, m, s);
        var e = gv(xi, yi, zi + 1, m, s), f = gv(xi + 1, yi, zi + 1, m, s);
        var g = gv(xi, yi + 1, zi + 1, m, s), k = gv(xi + 1, yi + 1, zi + 1, m, s);
        var x0 = a + (b - a) * fx, x1 = c + (d - c) * fx;
        var x2 = e + (f - e) * fx, x3 = g + (k - g) * fx;
        var l0 = x0 + (x1 - x0) * fy, l1 = x2 + (x3 - x2) * fy;
        return l0 + (l1 - l0) * fz;
      }
      // curl of a low-frequency vector potential, on a coarse grid we interpolate
      var C = 24, curl = new Float32Array(C * C * C * 3), eps = 0.30;
      function pot(x, y, z, s) { return vn(x, y, z, 3, s * 5 + 2); }
      for (var cz = 0; cz < C; cz++) for (var cy = 0; cy < C; cy++) for (var cx = 0; cx < C; cx++) {
        var gx = (cx / C) * 4, gy = (cy / C) * 4, gz = (cz / C) * 4;
        var dP3y = pot(gx, gy + eps, gz, 3) - pot(gx, gy - eps, gz, 3);
        var dP2z = pot(gx, gy, gz + eps, 2) - pot(gx, gy, gz - eps, 2);
        var dP1z = pot(gx, gy, gz + eps, 1) - pot(gx, gy, gz - eps, 1);
        var dP3x = pot(gx + eps, gy, gz, 3) - pot(gx - eps, gy, gz, 3);
        var dP2x = pot(gx + eps, gy, gz, 2) - pot(gx - eps, gy, gz, 2);
        var dP1y = pot(gx, gy + eps, gz, 1) - pot(gx, gy - eps, gz, 1), ci = (cz * C * C + cy * C + cx) * 3;
        curl[ci] = (dP3y - dP2z) / eps; curl[ci + 1] = (dP1z - dP3x) / eps; curl[ci + 2] = (dP2x - dP1y) / eps;
      }
      function curlAt(u, v, w, comp) {              // nearest-ish coarse fetch, cheap
        var ix = ((u * C) | 0) % C, iy = ((v * C) | 0) % C, iz = ((w * C) | 0) % C;
        return curl[((iz * C * C + iy * C + ix) * 3) + comp];
      }
      var cores = [[0.12, -0.04, 0.05, 0.17, 0.85], [-0.36, 0.24, -0.30, 0.12, 0.55]];
      var data = new Uint8Array(N * N * N);
      var warpAmp = 0.55, ptr = 0;
      for (var z = 0; z < N; z++) for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
        var u = x / N, v = y / N, w = z / N;
        var qx = u + curlAt(u, v, w, 0) * warpAmp;
        var qy = v + curlAt(u, v, w, 1) * warpAmp;
        var qz = w + curlAt(u, v, w, 2) * warpAmp;
        // Multiplicative ridges: a voxel is only dense where every octave's ridge
        // agrees, which is what leaves thin branching filaments and empty voids.
        var fil = 1;
        for (var oc = 0; oc < 5; oc++) {            // periods 4/8/16/32/64 (powers of two: the wrap is a mask)
          var per = 4 << oc;
          var wt = 0.30 + 0.14 * oc;                // fine octaves only modulate, so
          var n = vn(qx * per, qy * per, qz * per, per - 1, oc * 5 + 1);
          fil *= wt + (1 - wt) * (1 - Math.abs(n * 2 - 1));  // the big shapes survive
        }
        // hard-ish transfer function: sharp filament boundaries read as structure,
        // a smooth ramp just reads as haze
        fil = (fil - 0.42) / 0.20; if (fil < 0) fil = 0; if (fil > 1) fil = 1;
        fil = fil * fil * (3 - 2 * fil);
        var env = vn(u * 4, v * 4, w * 4, 3, 19);   // big clouds and voids
        env = (env - 0.30) * 2.3; if (env < 0) env = 0; if (env > 1) env = 1;
        var dv = fil * (0.10 + 1.15 * env);
        var px = u * 2 - 1, py = v * 2 - 1, pz = w * 2 - 1;
        // irregular envelope, so the silhouette is not a smooth ellipsoid
        var rr = Math.sqrt(px * px + py * py * 1.80 + pz * pz);
        var lowN = vn(u * 4 + 0.5, v * 4 + 0.5, w * 4 + 0.5, 3, 41) * 0.68
                 + vn(u * 8 + 0.5, v * 8 + 0.5, w * 8 + 0.5, 7, 53) * 0.32;
        var sh = (1.00 - rr + 0.52 * (lowN - 0.5)) / 0.42;
        if (sh < 0) sh = 0; if (sh > 1) sh = 1;
        dv *= sh * sh * (3 - 2 * sh);
        for (var ci2 = 0; ci2 < cores.length; ci2++) {
          var cc = cores[ci2];
          var ddx = px - cc[0], ddy = py - cc[1], ddz = pz - cc[2];
          dv += cc[4] * Math.exp(-(ddx * ddx + ddy * ddy + ddz * ddz) / (cc[3] * cc[3]));
        }
        data[ptr++] = dv > 1 ? 255 : (dv * 255) | 0;
      }
      var vol = new T.Data3DTexture(data, N, N, N);
      vol.format = T.RedFormat; vol.type = T.UnsignedByteType;
      vol.minFilter = T.LinearFilter; vol.magFilter = T.LinearFilter;
      vol.wrapS = vol.wrapT = vol.wrapR = T.RepeatWrapping;
      vol.unpackAlignment = 1; vol.needsUpdate = true;

      /* ---- shader ------------------------------------------------------ */
      var VERT = ["out vec3 vLocal;",
        "void main(){ vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }"].join("\n");

      var FRAG = [
        "precision highp float;", "precision highp sampler3D;",
        "uniform sampler3D uVol;",
        "uniform vec3 uCam, uStar, uBg, uWarm, uCool, uRim;",
        "uniform float uDens, uShadow, uEmit, uG, uSteps, uTwist;",
        "in vec3 vLocal;", "out vec4 outColor;",
        "float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }",
        "float h31(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }",
        "float dens(vec3 p){",
        "  float r = length(p * vec3(1.0,1.34,1.0));",
        "  if (r > 1.04) return 0.0;",              // cheap early-out; the envelope is baked in
        "  float a = uTwist * (1.0 - r*0.55);",     // differential shear: the cloud churns
        "  vec3 q = vec3(p.x - a*p.z, p.y, p.z + a*p.x);",
        "  return texture(uVol, q*0.5 + 0.5).r * smoothstep(1.04, 0.96, r);",
        "}",
        "float hg(float c, float g){ float d = 1.0 + g*g - 2.0*g*c; return (1.0-g*g)/(12.566371*pow(max(d,1e-4),1.5)); }",
        "vec3 sky(vec3 d){",
        "  vec3 c = uBg * (0.60 + 0.85*(d.y*0.5+0.5)) + uCool*0.0085 + uRim*0.0035;",
        "  for (int L=0; L<2; L++){",
        "    float sc = L==0 ? 27.0 : 47.0;",
        "    vec3 g = d*sc; vec3 cel = floor(g); vec3 f = g - cel;",
        "    float br = h31(cel + float(L)*3.7);",
        "    if (br > 0.60){",
        "      vec3 off = clamp(vec3(h31(cel+11.7), h31(cel+23.3), h31(cel+31.9)), 0.10, 0.90);",
        "      float dd = length(f - off);",
        "      float s = exp(-dd*dd*220.0) * (br-0.60)*2.6 / sc * 32.0;",
        "      c += s * mix(vec3(0.62,0.74,1.0), vec3(1.0,0.86,0.66), h31(cel+7.3));",
        "    }",
        "  }",
        "  return c;",
        "}",
        "void main(){",
        "  vec3 ro = uCam;",
        "  vec3 rd = normalize(vLocal - uCam);",
        "  vec3 iv = 1.0/rd;",
        "  vec3 t0 = (vec3(-1.0)-ro)*iv, t1 = (vec3(1.0)-ro)*iv;",
        "  vec3 tn = min(t0,t1), tf = max(t0,t1);",
        "  float tE = max(max(tn.x,tn.y),tn.z), tX = min(min(tf.x,tf.y),tf.z);",
        "  vec3 col = sky(rd);",
        "  tE = max(tE, 0.0);",
        "  if (tX > tE){",
        "    int NS = int(uSteps);",
        "    float dt = (tX-tE)/float(NS);",
        "    float t = tE + dt*h21(gl_FragCoord.xy);",
        "    float tr = 1.0; vec3 acc = vec3(0.0);",
        "    for (int i=0; i<96; i++){",
        "      if (i>=NS || tr<0.012) break;",
        "      vec3 p = ro + rd*t;",
        "      float d = dens(p);",
        "      if (d > 0.004){",
        "        vec3 tos = uStar - p; float sdist = length(tos);",
        "        vec3 ld = tos/max(sdist,1e-3);",
        "        float ls = min(sdist, 0.60)/6.0; float tau = 0.0;",
        "        for (int j=0; j<6; j++) tau += dens(p + ld*(ls*(float(j)+0.5)));",
        "        float sh = exp(-tau*ls*uShadow*uDens);",
        "        float ph = hg(dot(rd, ld), uG);",
        "        float fall = min(1.0/(0.10 + sdist*sdist*2.6), 5.0);",
        "        vec3 tint = mix(uWarm, mix(uRim, uCool, 0.62)*0.52, clamp((sdist-0.06)*0.92, 0.0, 1.0));",
        "        tint *= mix(vec3(1.0), vec3(1.30,0.84,0.58), (1.0-sh)*exp(-sdist*1.6));",   // dust reddens what gets through
        "        vec3 amb = (uCool*0.80 + uRim*0.20) * exp(-d*3.2) * 0.017;",
        "        vec3 rad = tint*sh*fall*(0.30 + 9.0*ph) + amb;",
        "        float a = 1.0 - exp(-d*uDens*dt);",
        "        acc += tr * a * rad * uEmit;",
        "        tr *= 1.0 - a;",
        "      }",
        "      vec3 sv = p - uStar; float r2 = dot(sv,sv);",
        "      acc += tr * uWarm * (44.0/(1.0 + r2*r2*300000.0)) * dt;",
        "      t += dt;",
        "    }",
        "    col = col*tr + acc;",
        "  }",
        "  col = (col*(2.10*col + 0.06)) / (col*(2.10*col + 0.90) + 0.16);",
        "  outColor = vec4(pow(max(col, 0.0), vec3(1.0/2.2)), 1.0);",
        "}"].join("\n");

      var U = {
        uVol: { value: vol },
        uCam: { value: new T.Vector3() },
        uStar: { value: new T.Vector3(0.10, -0.05, 0.06) },
        uBg: { value: v3(bg) },
        uWarm: { value: v3(lin(pal[0])) },
        uCool: { value: v3(lin(pal[1 % pal.length])) },
        uRim: { value: v3(lin(pal[2 % pal.length])) },
        uDens: { value: o.density }, uShadow: { value: o.shadow },
        uEmit: { value: o.emission }, uG: { value: o.forward },
        uSteps: { value: Math.max(16, Math.min(96, o.steps | 0)) },
        uTwist: { value: 0 },
      };
      var mat = new T.ShaderMaterial({
        glslVersion: T.GLSL3, uniforms: U, vertexShader: VERT, fragmentShader: FRAG,
        side: T.BackSide, depthWrite: false, depthTest: false,
      });
      var scene = new T.Scene();
      var box = new T.Mesh(new T.BoxGeometry(18, 18, 18), mat);
      box.frustumCulled = false;
      scene.add(box);

      var cam = new T.PerspectiveCamera(46, h.width / Math.max(1, h.height), 0.05, 200);
      var camLocal = new T.Vector3(), origin = new T.Vector3();
      var dist = o.distance, az = 0, el = 0;

      function place(t) {
        var mx = h.mouse.active ? (h.mouse.x / Math.max(1, h.width)) * 2 - 1 : 0;
        var my = h.mouse.active ? (h.mouse.y / Math.max(1, h.height)) * 2 - 1 : 0;
        az += (mx * 0.55 - az) * 0.06; el += (-my * 0.38 - el) * 0.06;
        cam.position.set(
          Math.sin(az) * Math.cos(el) * dist,
          Math.sin(el) * dist,
          Math.cos(az) * Math.cos(el) * dist
        );
        cam.lookAt(origin);
        box.rotation.set(0.22 + t * o.spin * 0.31, 0.60 + t * o.spin, t * o.spin * 0.14);
        box.updateMatrixWorld(true);
        camLocal.copy(cam.position); box.worldToLocal(camLocal);
        U.uCam.value.copy(camLocal);
        U.uTwist.value = o.churn * Math.sin(t * 0.23) + o.churn * 0.5 * Math.sin(t * 0.41 + 1.0);
      }
      place(0);

      return {
        resize: function (w, hh) {
          renderer.setPixelRatio(h.dpr); renderer.setSize(w, hh, false);
          cam.aspect = w / Math.max(1, hh); cam.updateProjectionMatrix();
        },
        update: function (n) {
          if (n.density != null) U.uDens.value = n.density;
          if (n.emission != null) U.uEmit.value = n.emission;
          if (n.forward != null) U.uG.value = n.forward;
          if (n.shadow != null) U.uShadow.value = n.shadow;
          if (n.distance != null) dist = n.distance;
          if (n.spin != null) o.spin = n.spin;
        },
        draw: function (t) { place(h.reduced ? 0 : t); renderer.render(scene, cam); },
        destroy: function () { threeDispose(scene, [vol, mat, renderer]); },
      };
    },
  });

  /* ============================================================
   * spiralForge — a 340,000-star spiral galaxy in one draw call.
   *
   * WHY THIS NEEDS THREE.JS: it is a single T.Points over a BufferGeometry of
   * ~340k real stars, each an independent body with its own orbital radius,
   * phase, scale height, mass and photospheric temperature. A fullscreen
   * fragment shader can fake a smear of arms; it cannot give you a third of a
   * million individually-coloured, individually-orbiting point masses seen
   * through a perspective camera with correct 1/w foreshortening.
   *
   * NO CPU WORK PER FRAME. The per-star attributes are baked exactly once in
   * scene(). draw() touches four uniforms and the camera transform — there is
   * no JavaScript loop over stars anywhere in the animation loop. Each star's
   * orbital angle is integrated entirely in the VERTEX SHADER as
   *     angle = phase + uTime * omega(r),  omega(r) = v0 / (r + rc)
   * which is a real flat rotation curve: v(r) = v0 * r/(r+rc) is constant
   * outside the core, so omega falls as 1/r. Consequence, and it is the correct
   * one: the logarithmic-spiral arms baked into the phase distribution are a
   * density-wave *pattern the stars drift through*, not a rigid structure.
   * Because omega varies with radius the pattern shears and winds up over
   * time. That is visible, and it is physics, not a bug.
   * ========================================================== */
  registerThree("spiralForge", {
    defaults: {
      stars: 340000,        // individual point masses (clamped to 60k..500k)
      arms: 2,              // density-wave arms (2 = grand design)
      pitch: 0.50,          // log-spiral pitch, radians
      spin: 1,              // time scale on the rotation curve
      bulge: 0.26,           // fraction of stars in the spheroidal old bulge
      thickness: 1,         // thin-disk scale-height multiplier
      tilt: 36,             // camera elevation above the disk plane, degrees
      size: 1,
      tint: 0.34,           // how far the palette pulls the blackbody colours
      colors: ["#ffc98a", "#fff4e6", "#a8c8ff"],
      background: "#03040c",
    },
    scene: function (T, h) {
      var renderer = threeRenderer(T, h);
      var o = h.opts;
      var pal = paletteOf(o, ["#ffc98a", "#fff4e6", "#a8c8ff"]);
      function pc(i) { var c = pal[i % pal.length]; return new T.Vector3(c.r / 255, c.g / 255, c.b / 255); }

      var scene = new T.Scene();
      var FOV = 40;
      var cam = new T.PerspectiveCamera(FOV, Math.max(0.2, h.width / h.height), 0.05, 60);
      renderer.setClearColor(new T.Color(o.background || "#03040c"), 1);

      /* ---- one-time CPU bake of the stellar population ------------------ */
      var N = Math.max(60000, Math.min(500000, Math.round(o.stars || 340000)));
      var ARMS = Math.max(1, Math.round(o.arms || 2));
      var TANP = Math.tan(Math.max(0.08, Math.min(0.9, o.pitch || 0.5)));
      var HR = 0.95, RMAX = 3.0, RB = 0.085;
      var THK = Math.max(0.15, o.thickness || 1);
      var BF = Math.max(0, Math.min(0.6, o.bulge === undefined ? 0.26 : o.bulge));
      var SZ = Math.max(0.2, o.size || 1);

      var seed = 0x51ea2f1;
      function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed >>> 8) / 16777216; }
      function ln() { return -Math.log(1e-7 + rnd()); }
      function sat(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

      var pos = new Float32Array(N * 3);   // packed (radius, height, phase)
      var st = new Float32Array(N * 3);    // packed (worldSize, temp01, intensity)
      var i, r, y, ph, temp, dim, u;
      for (i = 0; i < N; i++) {
        if (rnd() < 0.07) {
          // Metal-poor stellar halo: a sparse spheroid well outside the disk,
          // old and red, on strongly inclined orbits.
          r = 1.1 + 3.4 * Math.pow(rnd(), 1.7);
          y = 0.75 * r * (rnd() + rnd() + rnd() - 1.5) * 1.2;
          temp = 0.04 + 0.26 * Math.pow(rnd(), 1.6);
          dim = 0.75;
          ph = rnd() * Math.PI * 2;
        } else if (rnd() < BF) {
          // Spheroidal bulge: 3D exponential density, rho ~ exp(-r/RB), so the
          // radius is Gamma(3) distributed. Flattened slightly onto the disk.
          r = RB * (ln() + ln() + ln());
          if (r > 1.3) r = 1.3 * rnd();
          // The innermost few percent are the nuclear star cluster — a real
          // component, and it keeps the projected centre from thinning out.
          if (rnd() < 0.10) r *= 0.35;
          y = 0.42 * r * (rnd() * 2 - 1);
          // Age/metallicity gradient: the packed centre is whiter, the outer
          // spheroid is the classic red old population.
          temp = 0.12 + 0.32 * Math.pow(rnd(), 1.3) + 0.22 * sat(1.0 - r / 0.35);
          dim = 0.72;
          ph = rnd() * Math.PI * 2;
        } else {
          // Exponential thin disk: surface density Sigma ~ exp(-r/HR) means the
          // radial PDF is r*exp(-r/HR), i.e. Gamma(2) — sampled exactly.
          r = HR * (ln() + ln());
          while (r > RMAX) r = HR * (ln() + ln());   // rejection, keeps the profile exact
          var hz = (0.028 + 0.014 * r) * THK;          // gentle outward flare
          y = hz * (rnd() + rnd() + rnd() - 1.5) * 1.7;
          // Density-wave arms: pile the initial phase up on a logarithmic
          // spiral theta = ln(r/r0)/tan(pitch), with a scatter that widens
          // outward. Arms fade out inside the bar region and past the disk edge.
          var af = sat((r - 0.3) / 0.45) * sat((RMAX + 0.5 - r) / 1.1);
          var ridge = Math.log(Math.max(r, 0.1) / 0.26) / TANP;
          var sep = (Math.PI * 2) / ARMS;
          var w = 0.34 + 0.46 * (r / RMAX);
          if (rnd() < 0.44 * af) {
            var g = (rnd() + rnd() + rnd() - 1.5) * 1.15 * w;
            ph = ridge + sep * Math.floor(rnd() * ARMS) + g;
            // Young population: arms are where gas collapses, so this is where
            // the rare, short-lived, hot O/B stars live.
            u = rnd();
            if (u < 0.05) temp = 0.82 + 0.18 * rnd();
            else if (u < 0.21) temp = 0.60 + 0.20 * rnd();
            else temp = 0.18 + 0.40 * rnd();
            dim = 0.88;
          } else {
            ph = rnd() * Math.PI * 2;
            temp = 0.14 + 0.44 * Math.pow(rnd(), 1.15);
            dim = 0.68;
          }
          // Dust lanes. Signed angular offset from the nearest arm ridge, in
          // units of the arm width; a narrow band on the concave side of each
          // arm is where the molecular gas and dust sit, so stars behind it are
          // extinguished. This is the dark thread that makes an arm read as an
          // arm rather than a stripe.
          var dd = ph - ridge;
          dd -= Math.round(dd / sep) * sep;
          var e = dd / w;
          if (e > 0.32 && e < 0.80) dim *= 1.0 - 0.55 * af;
          // Smooth outer truncation so the disk fades away instead of ending.
          var tap = sat((RMAX - r) / 1.0);
          dim *= 0.25 + 0.75 * tap * tap;
        }
        // Mass-temperature relation for the main sequence, then the
        // mass-luminosity relation L ~ M^3.5. The dynamic range is 10^7, so it
        // is compressed by fractional powers — apparent radius ~ L^0.10 and
        // surface brightness ~ L^0.17 — which still leaves the hot blue giants
        // several times bigger and brighter than the red dwarfs around them.
        var mass = 0.18 * Math.pow(10, 2.05 * temp);
        var lum = Math.pow(mass, 3.5);
        pos[i * 3] = r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = ph;
        st[i * 3] = 0.0112 * SZ * (0.85 + 1.95 * Math.pow(lum, 0.10));
        st[i * 3 + 1] = temp;
        st[i * 3 + 2] = dim * (0.020 + 0.115 * Math.pow(lum, 0.17));
      }

      var geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.BufferAttribute(pos, 3));
      geo.setAttribute("aStar", new T.BufferAttribute(st, 3));
      geo.boundingSphere = new T.Sphere(new T.Vector3(0, 0, 0), 6.0);

      var mat = new T.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSpin: { value: 0.1 * (o.spin === undefined ? 1 : o.spin) },
          uCore: { value: 0.4 },
          uPx: { value: 500 },
          uTint: { value: Math.max(0, Math.min(1, o.tint === undefined ? 0.34 : o.tint)) },
          uCool: { value: pc(0) }, uWarm: { value: pc(1) }, uHot: { value: pc(2) },
        },
        vertexShader: [
          "attribute vec3 aStar;",
          "uniform float uTime, uSpin, uCore, uPx, uTint;",
          "uniform vec3 uCool, uWarm, uHot;",
          "varying vec3 vCol; varying float vI;",
          // Blackbody locus, ~2500 K red -> 5800 K white -> 20000 K blue.
          "vec3 bb(float t){",
          "  vec3 a=vec3(1.00,0.36,0.09), b=vec3(1.00,0.64,0.33), c=vec3(1.00,0.93,0.86);",
          "  vec3 d=vec3(0.80,0.86,1.00), e=vec3(0.60,0.71,1.00);",
          "  if(t<0.30) return mix(a,b,t/0.30);",
          "  if(t<0.58) return mix(b,c,(t-0.30)/0.28);",
          "  if(t<0.82) return mix(c,d,(t-0.58)/0.24);",
          "  return mix(d,e,(t-0.82)/0.18);",
          "}",
          "void main(){",
          "  float r = position.x, hgt = position.y, ph = position.z;",
          // Flat rotation curve: v(r)=v0*r/(r+rc) -> omega=v/r=v0/(r+rc).
          "  float ang = ph + uTime * (uSpin / (r + uCore));",
          "  vec3 p = vec3(cos(ang)*r, hgt, sin(ang)*r);",
          "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
          "  gl_Position = projectionMatrix * mv;",
          "  float w = max(gl_Position.w, 0.02);",
          "  float px = aStar.x * uPx / w;",           // perspective 1/w scaling
          "  gl_PointSize = clamp(px, 1.0, 16.0);",
          "  float sub = min(px, 1.0);",               // sub-pixel stars dim, not shrink
          "  vec3 t = bb(aStar.y);",
          "  vec3 q = aStar.y < 0.5 ? mix(uCool, uWarm, aStar.y*2.0)",
          "                        : mix(uWarm, uHot, (aStar.y-0.5)*2.0);",
          "  vCol = mix(t, t*0.35 + q*0.8, uTint);",
          "  vI = aStar.z * sub * sub;",
          "}",
        ].join("\n"),
        fragmentShader: [
          "precision mediump float;",
          "varying vec3 vCol; varying float vI;",
          "void main(){",
          "  vec2 q = gl_PointCoord - 0.5;",
          "  float d2 = dot(q, q);",
          "  if (d2 > 0.25) discard;",                 // round stars, never square
          "  float a = 1.0 - d2 * 4.0;",
          "  a = a * a * (0.35 + 0.65 * a);",          // soft airy-ish core
          "  gl_FragColor = vec4(vCol * vI, a * vI);",
          "}",
        ].join("\n"),
        blending: T.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      });

      var stars = new T.Points(geo, mat);
      stars.frustumCulled = false;
      scene.add(stars);

      var az = 0.65;
      var el = (Math.max(6, Math.min(80, o.tilt || 36)) * Math.PI) / 180;
      var elT = el;
      function place() {
        var R = 3.9;
        cam.position.set(R * Math.cos(el) * Math.cos(az), R * Math.sin(el), R * Math.cos(el) * Math.sin(az));
        cam.lookAt(0, -0.16, 0);
      }
      place();

      return {
        resize: function (w, hh) {
          renderer.setPixelRatio(h.dpr);
          renderer.setSize(w, hh, false);
          cam.aspect = Math.max(0.2, w / hh);
          cam.updateProjectionMatrix();
          // gl_PointSize is in framebuffer pixels, so DPR belongs in here.
          mat.uniforms.uPx.value = 0.5 * hh * h.dpr / Math.tan((FOV * 0.5 * Math.PI) / 180);
        },
        update: function (op) {
          if (op.spin !== undefined) mat.uniforms.uSpin.value = 0.1 * op.spin;
          if (op.tint !== undefined) mat.uniforms.uTint.value = op.tint;
          if (op.background) renderer.setClearColor(new T.Color(op.background), 1);
          if (op.tilt !== undefined) elT = (op.tilt * Math.PI) / 180;
        },
        draw: function (t, dt) {
          mat.uniforms.uTime.value = t;
          az = 0.65 + t * 0.035;                       // slow azimuthal drift
          if (h.mouse && h.mouse.active) {
            // Mouse height sweeps the view from near face-on to near edge-on.
            var my = Math.max(0, Math.min(1, h.mouse.y / Math.max(1, h.height)));
            elT = 1.18 + (0.06 - 1.18) * my;
          }
          var k = Math.min(1, (dt || 0.016) * 2.5);
          el += (elT - el) * k;
          place();
          renderer.render(scene, cam);
        },
        destroy: function () { threeDispose(scene, [mat, geo, renderer]); },
      };
    },
  });

  /* ringedWorld — a ringed gas giant with real single-scattering optics. Four
   * systems on one scene graph: a 1024x512 DataTexture of domain-warped tiling
   * noise banded by latitude (zonal belts, not a marble); a Rayleigh shell marched
   * 16 view samples deep with a 5-step solar march and chromatic Beer-Lambert
   * extinction, so the limb is blue and the terminator reddens because the light
   * reaching it took the longest path through the air; an annulus with radial
   * optical depth, ringlets and a Cassini-style gap; and — the point of the scene —
   * MUTUAL SHADOWING computed analytically in both directions (the blocks marked
   * SHADOW), the rings darkening the planet and the planet darkening the rings out
   * of one shared ringTau(), so the shadow carries the gap structure with it.
   * Everything renders into a half-float target, tonemapped once at the end so the
   * additive atmosphere composites in linear light.
   */
  registerThree("ringedWorld", {
    defaults: {
      colors: ["#f7e7c8", "#d59a5c", "#7a4f34", "#cfe0ff"],
      background: "#03040a",
      bands: 9.0,          // zonal band count
      ringInner: 1.34,
      ringOuter: 2.44,
      ringTau: 0.74,       // vertical optical depth of the densest ringlets
      spin: 0.055,         // planet rotation, texture widths per second
      sunElev: 15.5,       // degrees above the ring plane
      haze: 0.34,          // overlying-haze extinction -> limb darkening
      sun: 4.0,
      exposure: 1.05,
      distance: 4.55,
    },

    scene: function (T, h) {
      var renderer = threeRenderer(T, h);
      var o = h.opts;
      var pal = paletteOf(o, ["#f7e7c8", "#d59a5c", "#7a4f34", "#cfe0ff"]);
      function lin(c) { return new T.Vector3(Math.pow(c.r / 255, 2.2), Math.pow(c.g / 255, 2.2), Math.pow(c.b / 255, 2.2)); }
      function P(i) { return lin(pal[i % pal.length]); }
      var bg = lin(hexToRgb(o.background || "#03040a"));

      /* ---- CPU cloud deck: tiling value noise, banded by latitude ---------- */
      var TW = 1024, TH = 512, G = 256, GM = 255;
      var lat0 = new Float32Array(G * G), sd = 20240719;
      for (var i = 0; i < lat0.length; i++) { sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0; lat0[i] = sd / 4294967296; }
      function gv(x, y, m, s) { return lat0[((((x & m) + s) & GM) << 8) | ((y + s * 7) & GM)]; }
      function vn(x, y, m, s) {           // bilinear value noise, period (m+1) in x
        var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
        fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
        var a = gv(xi, yi, m, s) * (1 - fx) + gv(xi + 1, yi, m, s) * fx;
        var b = gv(xi, yi + 1, m, s) * (1 - fx) + gv(xi + 1, yi + 1, m, s) * fx;
        return a + (b - a) * fy;
      }
      // sy < 1 makes each octave vary fast in longitude and slowly in latitude,
      // which is what stretches every eddy into a belt-parallel streak. `per` must
      // be a power of two or the wrap in u grows a seam down the terminator.
      function fbm(u, v, per, sy, s, oct) {
        var amp = 0.5, t = 0, nrm = 0, p = per;
        for (var k = 0; k < oct; k++) { t += amp * vn(u * p, v * p * sy, p - 1, s + k * 13); nrm += amp; amp *= 0.5; p *= 2; }
        return t / nrm;
      }
      var data = new Uint8Array(TW * TH * 4), ptr = 0, nb = Math.max(3, o.bands);
      var SU = [0.28, 0.72, 0.06], SV = [0.36, 0.60, 0.66], SR = [0.075, 0.045, 0.032];
      for (var j = 0; j < TH; j++) {
        var v = (j + 0.5) / TH, phi = (v - 0.5) * Math.PI;
        for (var ii = 0; ii < TW; ii++) {
          var u = (ii + 0.5) / TW;
          // shear the latitude coordinate: belt boundaries buckle and braid along
          // their own length, the way a shear instability rolls up in a jet stream
          var y = phi + (fbm(u, v, 8, 0.30, 1, 4) - 0.5) * 0.105 + (fbm(u, v, 32, 0.30, 2, 3) - 0.5) * 0.038;
          var q = 0.5 + 0.5 * (0.60 * Math.sin(y * nb) + 0.30 * Math.sin(y * nb * 1.9 + 1.3) + 0.34 * Math.sin(y * nb * 0.44 - 0.6));
          q += (fbm(u, v, 32, 0.22, 3, 4) - 0.5) * 0.26;
          var pole = Math.max(0, (Math.abs(phi) / 1.5708 - 0.62) / 0.38);
          q = q * (1 - pole * pole) + 0.30 * pole * pole;   // darker polar hoods
          var st = 0;                                       // anticyclonic ovals
          for (var k2 = 0; k2 < 3; k2++) {
            var du = u - SU[k2]; if (du > 0.5) du -= 1; if (du < -0.5) du += 1;
            var dv = (v - SV[k2]) * 2.1, rr = Math.sqrt(du * du + dv * dv) / SR[k2];
            if (rr < 1.7) {                                 // swirl the fine noise
              var m = (1 - rr / 1.7) * (1 - rr / 1.7), ang = Math.atan2(dv, du) + rr * 1.9;
              st = Math.max(st, m);
              q += m * (0.30 + 0.34 * (vn(Math.cos(ang) * 9 + 40, Math.sin(ang) * 9 + rr * 5, 255, 7) - 0.5));
            }
          }
          q = q < 0 ? 0 : q > 1 ? 1 : q;
          data[ptr++] = (q * 255) | 0;                      // R: band / cloud albedo
          data[ptr++] = (fbm(u, v, 64, 0.18, 5, 3) * 255) | 0;   // G: micro-contrast
          data[ptr++] = (st * 255) | 0; data[ptr++] = 255;       // B: storm mask
        }
      }
      var map = new T.DataTexture(data, TW, TH, T.RGBAFormat);
      map.wrapS = T.RepeatWrapping; map.wrapT = T.ClampToEdgeWrapping;
      map.minFilter = T.LinearMipmapLinearFilter; map.magFilter = T.LinearFilter;
      map.generateMipmaps = true; map.needsUpdate = true;

      /* ---- shared uniforms + the one density function both shadows use ----- */
      var uL = { value: new T.Vector3(1, 0, 0) }, uCam = { value: new T.Vector3() };
      var uRi = { value: o.ringInner }, uRo = { value: o.ringOuter }, uTauK = { value: o.ringTau };
      var uSpin = { value: 0 }, uSun = { value: o.sun }, uIce = { value: P(3) };
      var VERT = "out vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }";

      // Radial optical depth of the sheet. The ring material AND the planet's
      // shadow term both call this, so the shadow inherits every gap.
      var RINGD = [
        "uniform float uRi, uRo, uTauK;",
        "float h11(float x){ return fract(sin(x*127.1)*43758.5453); }",
        "float vn1(float x){ float i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f); return mix(h11(i),h11(i+1.0),f); }",
        "float ringTau(float r){",
        "  if (r < uRi || r > uRo) return 0.0;    float x = (r - uRi)/(uRo - uRi);",
        // Band-limit the fine octaves to the screen footprint of one radial step.
        // Both have a mean of 1, so fading them where they cannot be resolved kills
        // the moire without shifting the sheet's average density.
        "  float fw = fwidth(x)*1.7;",
        "  float d = 0.58 + 0.42*sin(x*7.5 - 0.8);",                                       // A/B plateaus
        "  d *= mix(1.0, 0.72 + 0.58*vn1(x*27.0 + 3.1), 1.0 - smoothstep(0.0, 0.075, fw));",  // ringlets
        "  d *= mix(1.0, 0.66 + 0.68*vn1(x*104.0),      1.0 - smoothstep(0.0, 0.034, fw));",  // grain
        "  d *= smoothstep(0.022, 0.070, abs(x - 0.47));",                                 // Cassini gap
        "  float g = (x - 0.80)/0.013; d *= 1.0 - 0.85*exp(-g*g);",                        // Encke gap
        "  return max(d*smoothstep(0.0,0.05,x)*smoothstep(1.0,0.93,x), 0.0) * uTauK;",
        "}"].join("\n");

      var scene = new T.Scene();
      var cam = new T.PerspectiveCamera(38, h.width / Math.max(1, h.height), 0.05, 300);

      /* ---- planet --------------------------------------------------------- */
      var pu = {
        uMap: { value: map }, uL: uL, uCam: uCam, uSpin: uSpin, uSun: uSun,
        uRi: uRi, uRo: uRo, uTauK: uTauK, uIce: uIce, uHaze: { value: o.haze },
        uC0: { value: P(0) }, uC1: { value: P(1) }, uC2: { value: P(2) },
        // storm tint: the belt colour pushed brighter and redder, still palette-derived
        uHot: { value: P(1).clone().multiply(new T.Vector3(1.75, 1.05, 0.72)) },
      };
      var planetMat = new T.ShaderMaterial({
        glslVersion: T.GLSL3, uniforms: pu,
        vertexShader: "out vec2 vUv; out vec3 vP;\nvoid main(){ vUv=uv; vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: ["precision highp float;", "uniform sampler2D uMap;",
          "uniform vec3 uL,uCam,uC0,uC1,uC2,uHot,uIce; uniform float uSpin,uSun,uHaze;",
          "in vec2 vUv; in vec3 vP; out vec4 outColor;", RINGD,
          /* SHADOW #1 — THE RINGS ONTO THE PLANET.
             Walk from the surface point toward the sun. The ring plane is y = 0, so
             the crossing is at s = -p.y/L.y; if that lands inside the annulus the
             sheet is between this point and the sun. The slant path through a sheet
             of vertical depth tau is tau/sin(elevation) = tau/|L.y|, which is why a
             low sun throws a much blacker ring shadow than a high one. */
          "float ringShadow(vec3 p){",
          "  if (abs(uL.y) < 1e-4) return 1.0;   float s = -p.y/uL.y;",
          "  if (s <= 0.0) return 1.0;",                     // plane is anti-sunward
          "  return exp(-ringTau(length((p + uL*s).xz))/max(abs(uL.y), 0.05));",
          "}",
          "void main(){",
          "  vec3 n = normalize(vP);   vec4 tx = texture(uMap, vec2(vUv.x + uSpin, vUv.y));",
          "  vec3 alb = mix(mix(uC2, uC1, smoothstep(0.0,0.54,tx.r)), uC0, smoothstep(0.46,1.0,tx.r));",
          "  alb = mix(alb, uHot, tx.b*0.80) * (0.84 + 0.30*tx.g);   float nl = dot(n, uL);",
          // wrapped diffuse: a deep scattering atmosphere carries light past the
          // geometric terminator, so the day/night edge is soft, never a hard step
          "  float wrap = clamp((nl + 0.14)/1.14, 0.0, 1.0), li = wrap*wrap;",
          // limb darkening as Beer-Lambert extinction of the overlying haze along
          // the slant view path — 1/mu air masses, so the limb goes dark smoothly
          "  float mu = clamp(dot(n, normalize(uCam - vP)), 0.0, 1.0);",
          "  float ld = exp(-uHaze*(1.0/max(mu,0.09) - 1.0));",
          "  vec3 c = alb*(li*ld*ringShadow(vP)*uSun + 0.010);",
          "  outColor = vec4(c + alb*uIce*0.055*smoothstep(-0.55,0.25,-nl), 1.0);",   // + ringshine
          "}"].join("\n"),
      });
      scene.add(new T.Mesh(new T.SphereGeometry(1, 128, 80), planetMat));

      /* ---- Rayleigh shell -------------------------------------------------- */
      var RA = 1.105, au = {
        uL: uL, uCam: uCam, uBeta: { value: new T.Vector3(2.60, 6.10, 15.5) },
        uSky: { value: P(3) }, uRa: { value: RA }, uHs: { value: 0.030 }, uSunI: { value: 5.6 },
      };
      var airMat = new T.ShaderMaterial({
        glslVersion: T.GLSL3, uniforms: au, transparent: true, blending: T.AdditiveBlending,
        side: T.BackSide, depthTest: false, depthWrite: false, vertexShader: VERT,
        fragmentShader: ["precision highp float;",
          "uniform vec3 uL,uCam,uBeta,uSky; uniform float uRa,uHs,uSunI;",
          "in vec3 vP; out vec4 outColor;",
          "vec2 sph(vec3 ro, vec3 rd, float r){ float b=dot(ro,rd), c=dot(ro,ro)-r*r, d=b*b-c;",
          "  if (d < 0.0) return vec2(1.0,-1.0); d=sqrt(d); return vec2(-b-d,-b+d); }",
          "float dns(vec3 p){ return exp(-(length(p)-1.0)/uHs); }",
          // solar optical depth from a sample: 5 steps out to the shell, plus the
          // planet's own shadow as a soft cylinder (a hard test bands the terminator)
          "float odSun(vec3 p){",
          "  float sc = -dot(p, uL), od = 0.0, f = sph(p, uL, uRa).y/5.0;",
          "  float occ = sc > 0.0 ? smoothstep(0.985, 1.030, length(p + uL*sc)) : 1.0;",
          "  for (int i=0;i<5;i++) od += dns(p + uL*(f*(float(i)+0.5)));",
          "  return od*f + (1.0 - occ)*40.0;",
          "}",
          "void main(){",
          "  vec3 ro = uCam, rd = normalize(vP - uCam);   vec2 a = sph(ro, rd, uRa);",
          "  if (a.y <= a.x) discard;",
          "  float t0 = max(a.x, 0.0), t1 = a.y;   vec2 s = sph(ro, rd, 1.0);",
          "  if (s.y > 0.0 && s.x > t0) t1 = min(t1, s.x);",       // stop at the cloud deck
          "  float mu = dot(rd, uL), ds = (t1-t0)/16.0, odV = 0.0;",
          "  vec3 acc = vec3(0.0), beta = uBeta*normalize(uSky+0.35)*1.7;",
          "  for (int i=0;i<16;i++){",
          "    vec3 p = ro + rd*(t0 + ds*(float(i)+0.5));   float d = dns(p)*ds; odV += d;",
          // chromatic extinction over solar path + view path: blue is scrubbed
          // first, so the long grazing paths leave the warm reddened terminator band
          "    acc += d*exp(-beta*(odSun(p) + odV));",
          "  }",
          "  outColor = vec4(acc*beta*(0.0596831*(1.0+mu*mu))*uSunI, 1.0);",   // 3/16pi phase
          "}"].join("\n"),
      });
      var air = new T.Mesh(new T.SphereGeometry(RA, 72, 48), airMat);
      air.renderOrder = 2; scene.add(air);

      /* ---- rings: a flat annulus built directly in the equatorial plane ---- */
      var SEG = 320, pos = [], idx = [];
      for (var ri = 0; ri < 2; ri++) for (var si = 0; si <= SEG; si++) {
        // distinct names: `ang`/`rr` are already var-declared in the cloud-texture
        // block above, and var is function-scoped.
        var rAng = si / SEG * Math.PI * 2, rRad = ri ? o.ringOuter : o.ringInner;
        pos.push(Math.cos(rAng) * rRad, 0, Math.sin(rAng) * rRad);
      }
      for (var s2 = 0; s2 < SEG; s2++) idx.push(s2, SEG + 1 + s2, s2 + 1, s2 + 1, SEG + 1 + s2, SEG + 2 + s2);
      var rg = new T.BufferGeometry();
      rg.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
      rg.setIndex(idx);
      var ru = { uL: uL, uCam: uCam, uRi: uRi, uRo: uRo, uTauK: uTauK, uIce: uIce, uSun: uSun, uWarm: { value: P(0) } };
      var ringMat = new T.ShaderMaterial({
        glslVersion: T.GLSL3, uniforms: ru, transparent: true, side: T.DoubleSide,
        depthWrite: false, vertexShader: VERT,
        fragmentShader: ["precision highp float;",
          "uniform vec3 uL,uCam,uIce,uWarm; uniform float uSun;",
          "in vec3 vP; out vec4 outColor;", RINGD,
          "void main(){",
          "  float tau = ringTau(length(vP.xz));   if (tau <= 0.0005) discard;",
          "  vec3 rd = normalize(vP - uCam);",
          /* SHADOW #2 — THE PLANET ONTO THE RINGS.
             The planet's shadow is a cylinder of radius 1 pointing down -uL. The
             closest approach of the ray vP + s*uL to the planet centre is at
             s = -dot(vP,uL); if that is sunward and the perpendicular miss distance
             is under one radius, this ring point sits in the umbra. The smoothstep
             is the penumbra the star's finite angular size would cast. */
          "  float sc = -dot(vP, uL);   vec3 icy = mix(uIce, uWarm, 0.30);",
          "  float shp = sc > 0.0 ? smoothstep(0.985, 1.075, length(vP + uL*sc)) : 1.0;",
          "  float el = max(abs(uL.y), 0.02);",          // sin of the solar elevation
          "  float alpha = 1.0 - exp(-tau/max(abs(rd.y), 0.42));",  // slant depth to the eye
          "  float trans = exp(-tau/el);",               // sunlight surviving the sheet
          "  float unlit = step(uL.y*(-rd.y), 0.0);",    // eye and sun on opposite faces
          // diffuse off the lit face, plus the forward/diffracted light that reaches
          // the shaded face — bright gaps, dark plateaus, the Cassini negative look
          "  vec3 c = icy*shp*(0.10 + 0.85*el)*uSun*0.30*(1.0 - 0.78*unlit);",
          "  c += icy*shp*trans*unlit*uSun*0.30 + icy*0.010;",
          "  outColor = vec4(c, alpha);",
          "}"].join("\n"),
      });
      var rings = new T.Mesh(rg, ringMat);
      rings.renderOrder = 3; scene.add(rings);

      /* ---- star field ----------------------------------------------------- */
      var su = { uBg: { value: bg }, uCool: { value: P(3) } };
      var skyMat = new T.ShaderMaterial({
        glslVersion: T.GLSL3, uniforms: su, side: T.BackSide, depthWrite: false,
        depthTest: false, vertexShader: VERT,
        fragmentShader: ["precision highp float;", "uniform vec3 uBg,uCool;",
          "in vec3 vP; out vec4 outColor;",
          "float h31(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }",
          "void main(){",
          "  vec3 d = normalize(vP), c = uBg*(0.75+0.5*(d.y*0.5+0.5)) + uCool*0.004;",
          "  for (int L=0;L<3;L++){",
          "    float sc = L==0 ? 34.0 : (L==1 ? 58.0 : 92.0);",
          "    vec3 g = d*sc, cel = floor(g), f = g - cel;   float br = h31(cel + float(L)*4.1);",
          "    if (br > 0.70){",     // one jittered point per cell, so never a grid
          "      vec3 of = clamp(vec3(h31(cel+11.7), h31(cel+23.3), h31(cel+31.9)), 0.12, 0.88);",
          "      float dd = length(f - of);",
          "      c += exp(-dd*dd*300.0)*(br-0.70)*3.4*mix(vec3(0.65,0.76,1.0), vec3(1.0,0.87,0.7), h31(cel+7.3));",
          "    } }",
          "  outColor = vec4(c, 1.0);",
          "}"].join("\n"),
      });
      var sky = new T.Mesh(new T.SphereGeometry(150, 32, 24), skyMat);
      sky.renderOrder = -1; scene.add(sky);

      /* ---- half-float target, one tonemap at the end ---------------------- */
      var rt = new T.WebGLRenderTarget(Math.max(2, h.width * h.dpr), Math.max(2, h.height * h.dpr), {
        type: T.HalfFloatType, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: true,
      });
      var qu = { uTex: { value: rt.texture }, uExp: { value: o.exposure } };
      var quadMat = new T.ShaderMaterial({
        glslVersion: T.GLSL3, uniforms: qu, depthTest: false, depthWrite: false,
        vertexShader: "out vec2 vU; void main(){ vU=uv; gl_Position=vec4(position.xy,0.0,1.0); }",
        fragmentShader: ["precision highp float;", "uniform sampler2D uTex; uniform float uExp;",
          "in vec2 vU; out vec4 outColor;",
          "void main(){",
          "  vec3 c = texture(uTex, vU).rgb * uExp * (1.0 - 0.30*dot(vU-0.5, vU-0.5));",
          "  c = (c*(2.30*c+0.05))/(c*(2.30*c+0.95)+0.16);",    // filmic, then sRGB
          "  outColor = vec4(pow(max(c, 0.0), vec3(1.0/2.2)), 1.0);",
          "}"].join("\n"),
      });
      var quadScene = new T.Scene();
      quadScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), quadMat));
      var quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      /* ---- animation ------------------------------------------------------ */
      var az = 0.9, el = -0.245, origin = new T.Vector3();
      function place(t) {
        var my = h.mouse.active ? h.mouse.y / Math.max(1, h.height) : 0.52;
        // The eye rides just BELOW the ring plane while the sun is above it, so we
        // face the shadowed hemisphere and look at the rings' unlit side.
        el += (-0.055 - (1 - my) * 0.40 - el) * 0.05;        // mouse -> inclination
        var A = az + t * 0.048, d = o.distance;              // slow orbital drift
        cam.position.set(Math.cos(A) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(A) * Math.cos(el) * d);
        cam.lookAt(origin);
        uCam.value.copy(cam.position);
        // The star holds a moderate phase angle to the eye so the lit hemisphere
        // stays presented; librating both angles walks the ring shadow across the
        // disk instead of parking it on the far side.
        var se = o.sunElev * Math.PI / 180 + 0.085 * Math.sin(t * 0.085);
        var sa = A + 0.86 + 0.22 * Math.sin(t * 0.062);
        uL.value.set(Math.cos(sa) * Math.cos(se), Math.sin(se), Math.sin(sa) * Math.cos(se)).normalize();
        uSpin.value = t * o.spin;
      }
      place(0);

      return {
        resize: function (w, hh) {
          renderer.setPixelRatio(h.dpr); renderer.setSize(w, hh, false);
          rt.setSize(Math.max(2, w * h.dpr), Math.max(2, hh * h.dpr));
          cam.aspect = w / Math.max(1, hh); cam.updateProjectionMatrix();
        },
        update: function (n) {
          if (n.exposure != null) qu.uExp.value = n.exposure;
          if (n.ringTau != null) uTauK.value = n.ringTau;
          if (n.sun != null) uSun.value = n.sun;
          if (n.haze != null) pu.uHaze.value = n.haze;
          if (n.sunElev != null) o.sunElev = n.sunElev;
          if (n.distance != null) o.distance = n.distance;
          if (n.spin != null) o.spin = n.spin;
        },
        draw: function (t) {
          place(h.reduced ? 0 : t);
          renderer.setRenderTarget(rt); renderer.render(scene, cam);
          renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
        },
        destroy: function () {
          threeDispose(quadScene, []);
          threeDispose(scene, [map, planetMat, airMat, ringMat, skyMat, quadMat, rt, renderer]);
        },
      };
    },
  });

  /* gravitySim — a real GPGPU gravitational integrator, not a fragment trick.
   * Particle state (position + velocity) lives in floating-point render targets;
   * once the initial conditions are seeded the CPU never touches a particle again.
   * Two Plummer-softened masses ride a genuine *eccentric* Kepler orbit (Newton
   * iteration on M = E - e sin E each step), so the pair plunges through pericentre
   * once a period and raises fresh tidal bridges and tails; a diffuse Plummer halo
   * at the barycentre keeps stripped material weakly bound; the pointer is a
   * movable third mass. Integration is SYMPLECTIC — kick then drift (v += a(x)dt
   * in one pass, then x += v dt in the next, reading the freshly written velocity).
   * That ordering is the whole ballgame: explicit Euler with the same step pumps in
   * energy every revolution and the disks unwind into numerical junk within
   * seconds, while the symplectic map conserves a shadow Hamiltonian and the orbits
   * stay closed for as long as the tab is open. dt is clamped so a stalled frame
   * cannot blow the integrator up. Light accumulates in a half-float buffer and is
   * tone-mapped in a resolve pass — that is what keeps a huge density range legible
   * instead of clipping every core to a white blob. */
  var GS_QV = "varying vec2 vUv;\nvoid main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
  // Plummer softening: |a| = GM r / (r^2+eps^2)^1.5, bounded as r -> 0, so a
  // particle threading a centre is slung out instead of reaching infinity.
  var GS_FORCE =
    "uniform sampler2D tPos;uniform sampler2D tVel;uniform vec4 uAtt[3];" +
    "uniform float uEps2,uDt,uHalo,uHaloEps2;varying vec2 vUv;void main(){" +
    "vec3 x=texture2D(tPos,vUv).xyz;vec3 v=texture2D(tVel,vUv).xyz;vec3 a=vec3(0.0);" +
    "for(int i=0;i<3;i++){vec3 d=uAtt[i].xyz-x;float rr=dot(d,d)+uEps2;" +
    "a+=d*(uAtt[i].w/(rr*sqrt(rr)));}float hr=dot(x,x)+uHaloEps2;" +
    "a-=x*(uHalo/(hr*sqrt(hr)));gl_FragColor=vec4(v+a*uDt,1.0);}";
  var GS_DRIFT =
    "uniform sampler2D tPos;\nuniform sampler2D tVel;\nuniform float uDt;\nvarying vec2 vUv;\n" +
    "void main(){ gl_FragColor = vec4(texture2D(tPos, vUv).xyz + texture2D(tVel, vUv).xyz * uDt, 1.0); }";
  // Each vertex reads its own texel of the current position/velocity textures.
  // Fast particles are the crowded ones, so shrinking them keeps cores from
  // flattening into featureless discs and lets the faint outer streams read.
  var GS_PTV =
    "uniform sampler2D tPos;uniform sampler2D tVel;uniform float uSize,uVMax,uUseTex,uDpr;" +
    "attribute vec2 aRef;attribute float aSpd;varying float vS;void main(){" +
    "vec3 p=position;float sp=aSpd;" +
    "if(uUseTex>0.5){p=texture2D(tPos,aRef).xyz;sp=length(texture2D(tVel,aRef).xyz);}" +
    "vS=clamp(sp/uVMax,0.0,1.0);vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;" +
    "gl_PointSize=clamp(uSize*uDpr*(190.0/max(1.0,-mv.z))*(1.2-0.35*vS),1.0,4.5);}";
  var GS_PTF =
    "uniform vec3 uC0,uC1,uC2,uC3;uniform float uGlow,uEnc;varying float vS;void main(){" +
    "vec2 q=gl_PointCoord-0.5;float d=dot(q,q);if(d>0.25)discard;" +
    "float m=exp(-d*13.0)*(1.0-d*4.0);vec3 c=mix(uC0,uC1,smoothstep(0.0,0.34,vS));" +
    "c=mix(c,uC2,smoothstep(0.3,0.68,vS));c=mix(c,uC3,smoothstep(0.62,1.0,vS));" +
    "c*=(0.02+2.4*vS*vS*vS)*uGlow*m;" +
    "if(uEnc>0.5)c=pow(max(c,0.0),vec3(0.4545));gl_FragColor=vec4(c,1.0);}";
  var GS_BG =
    "uniform vec3 uBg,uHalo;uniform float uAsp,uEnc;varying vec2 vUv;void main(){" +
    "vec2 p=vUv-0.5;p.x*=uAsp;float r=length(p);" +
    "vec3 c=uBg+uHalo*(0.0030*exp(-r*r*2.2)+0.0022*exp(-r*4.5));" +
    "if(uEnc>0.5)c=pow(max(c,0.0),vec3(0.4545));gl_FragColor=vec4(c,1.0);}";
  // Quarter-res 25-tap gather: the downsample does most of the blurring, so one
  // pass buys a convincing core glow for almost nothing on software GL.
  var GS_BLOOM =
    "uniform sampler2D tSrc;uniform vec2 uTexel;varying vec2 vUv;void main(){" +
    "vec3 s=vec3(0.0);float wsum=0.0;for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){" +
    "vec2 d=vec2(float(x),float(y));float w=exp(-dot(d,d)*0.32);" +
    "s+=max(texture2D(tSrc,vUv+d*uTexel).rgb,0.0)*w;wsum+=w;}gl_FragColor=vec4(s/wsum,1.0);}";
  // Luminance-weighted Reinhard: compresses the range without bleaching a bright
  // core to pure white the way per-channel clipping does, then encodes sRGB.
  var GS_RESOLVE =
    "uniform sampler2D tSrc;uniform sampler2D tBloom;uniform float uExp,uBloom;varying vec2 vUv;" +
    "void main(){vec3 c=(max(texture2D(tSrc,vUv).rgb,0.0)+texture2D(tBloom,vUv).rgb*uBloom)*uExp;" +
    "float L=dot(c,vec3(0.2126,0.7152,0.0722));c*=(L/(1.0+L))/max(L,1e-5);" +
    "gl_FragColor=vec4(pow(min(c,vec3(1.0)),vec3(0.4545)),1.0);}";
  var GS_STARV = "varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);" +
    "gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}";
  var GS_STARF = "uniform vec3 uC;uniform float uEnc;varying vec3 vN;void main(){" +
    "vec3 c=uC*(0.3+2.2*pow(max(0.0,vN.z),1.5));" +
    "if(uEnc>0.5)c=pow(c,vec3(0.4545));gl_FragColor=vec4(c,1.0);}";

  registerThree("gravitySim", {
    defaults: {
      grid: 160, speed: 1, mass: 9000, separation: 40, eccentricity: 0.45,
      softening: 2.2, pointSize: 1.0, glow: 1, exposure: 1.6, bloom: 0.45, interactive: true,
      colors: ["#2f4bff", "#22d3ee", "#ffd08a", "#fff3df"], background: "#03040a",
    },
    scene: function (T, h) {
      var renderer = threeRenderer(T, h);
      var gl = renderer.getContext();
      // Float colour attachments are not universal. Probe before committing to the
      // GPGPU path — without them every FBO reads back black and the scene dies.
      var gpu = !!(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("WEBGL_color_buffer_float"));
      var o = h.opts, pal = paletteOf(o, ["#2f4bff", "#22d3ee", "#ffd08a", "#fff3df"]);
      var N = gpu ? Math.max(32, Math.min(160, Math.round(o.grid || 160))) : 44, COUNT = N * N;
      // sRGB hex -> linear light, or a #03040a background becomes a blue wash
      function lin(i) {
        var c = pal[Math.round((i / 3) * (pal.length - 1))];
        return new T.Vector3(Math.pow(c.r / 255, 2.2), Math.pow(c.g / 255, 2.2), Math.pow(c.b / 255, 2.2));
      }
      var bc = hexToRgb(o.background || "#03040a");
      var bgv = new T.Vector3(Math.pow(bc.r / 255, 2.2), Math.pow(bc.g / 255, 2.2), Math.pow(bc.b / 255, 2.2));
      var MASS = o.mass || 9000, A = o.separation || 40, EPS = o.softening || 2.2;
      var ECC = Math.max(0, Math.min(0.7, o.eccentricity === undefined ? 0.45 : o.eccentricity));
      var OM = Math.sqrt(2 * MASS / (A * A * A));          // Kepler mean motion
      var HALO = 1.1 * MASS, HEPS = 30, VMAX = Math.sqrt(MASS / (EPS * 1.2)) + 10;
      var RMIN = 1.5, RMAX = A * 0.30, TILT = 0.22, enc = gpu ? 0 : 1;

      // ---- the binary: true Kepler two-body solution, phased to start at apo ----
      var hp = new T.Vector3(), hv = new T.Vector3(), t2 = new T.Vector3();
      function hostAt(tt, out) {
        var Ma = Math.PI + tt * OM, E = Ma, q;
        for (q = 0; q < 5; q++) E -= (E - ECC * Math.sin(E) - Ma) / (1 - ECC * Math.cos(E));
        var r = A * (1 - ECC * Math.cos(E)) * 0.5;
        var nu = Math.atan2(Math.sqrt(1 - ECC * ECC) * Math.sin(E), Math.cos(E) - ECC);
        return out.set(Math.cos(nu) * r, 0, Math.sin(nu) * r);
      }
      hostAt(0, hp); hostAt(0.02, hv); hostAt(-0.02, t2);
      hv.sub(t2).multiplyScalar(25);   // central difference -> host velocity

      // ---- initial conditions: two inclined, near-circular co-moving disks -----
      var P = new Float32Array(COUNT * 4), V = new Float32Array(COUNT * 4);
      var i, k, ct, st;
      for (i = 0; i < COUNT; i++) {
        var sg = (i % 2) === 0 ? 1 : -1;
        var r = RMIN + (RMAX - RMIN) * Math.pow(Math.random(), 0.75);
        var an = Math.random() * Math.PI * 2, zz = (Math.random() + Math.random() - 1) * 0.06 * r;
        // exact circular speed for the softened potential, +-3% scatter
        var vc = Math.sqrt(MASS * r * r / Math.pow(r * r + EPS * EPS, 1.5)) * (0.97 + Math.random() * 0.06);
        var lx = r * Math.cos(an), lz = r * Math.sin(an);
        var wx = -Math.sin(an) * vc, wz = Math.cos(an) * vc;
        ct = Math.cos(TILT * sg); st = Math.sin(TILT * sg); k = i * 4;
        P[k] = lx + sg * hp.x; P[k + 1] = zz * ct - lz * st; P[k + 2] = zz * st + lz * ct + sg * hp.z;
        V[k] = wx + sg * hv.x; V[k + 1] = -wz * st; V[k + 2] = wz * ct + sg * hv.z;
      }

      // ---- GPGPU plumbing -----------------------------------------------------
      var fsScene = new T.Scene(), fsCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      var quadGeo = new T.PlaneGeometry(2, 2), quad = new T.Mesh(quadGeo);
      quad.frustumCulled = false; fsScene.add(quad);
      function mkrt(w, hh, ty) {
        return new T.WebGLRenderTarget(w, hh, { minFilter: T.NearestFilter, magFilter: T.NearestFilter,
          format: T.RGBAFormat, type: ty, depthBuffer: false, stencilBuffer: false, generateMipmaps: false });
      }
      function pass(frag, u) {
        return new T.ShaderMaterial({ vertexShader: GS_QV, fragmentShader: frag,
          depthTest: false, depthWrite: false, uniforms: u });
      }
      function dtex(a) {
        var t = new T.DataTexture(a, N, N, T.RGBAFormat, T.FloatType);
        t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true; return t;
      }
      function soft(t) { t.texture.minFilter = t.texture.magFilter = T.LinearFilter; return t; }
      var rtP = null, rtV = null, texP = null, texV = null, forceMat = null, driftMat = null;
      var rtHDR = null, rtBloom = null, resMat = null, bloomMat = null, curP = null, curV = null, wi = 0;
      var att = [new T.Vector4(), new T.Vector4(), new T.Vector4(0, 0, 0, 0)];
      if (gpu) {
        rtP = [mkrt(N, N, T.FloatType), mkrt(N, N, T.FloatType)];
        rtV = [mkrt(N, N, T.FloatType), mkrt(N, N, T.FloatType)];
        texP = dtex(P); texV = dtex(V); curP = texP; curV = texV;
        rtHDR = soft(mkrt(2, 2, T.HalfFloatType)); rtBloom = soft(mkrt(2, 2, T.HalfFloatType));
        forceMat = pass(GS_FORCE, { tPos: { value: null }, tVel: { value: null }, uAtt: { value: att },
          uEps2: { value: EPS * EPS }, uDt: { value: 0 }, uHalo: { value: HALO }, uHaloEps2: { value: HEPS * HEPS } });
        driftMat = pass(GS_DRIFT, { tPos: { value: null }, tVel: { value: null }, uDt: { value: 0 } });
        bloomMat = pass(GS_BLOOM, { tSrc: { value: rtHDR.texture }, uTexel: { value: new T.Vector2(0.01, 0.01) } });
        resMat = pass(GS_RESOLVE, { tSrc: { value: rtHDR.texture }, tBloom: { value: rtBloom.texture },
          uExp: { value: o.exposure || 1.6 }, uBloom: { value: o.bloom === undefined ? 0.45 : o.bloom } });
      }
      var bgMat = pass(GS_BG, { uBg: { value: bgv }, uAsp: { value: 1 },
        uEnc: { value: enc }, uHalo: { value: lin(1).lerp(lin(0), 0.55) } });

      // ---- the visible scene graph -------------------------------------------
      var scene = new T.Scene(), geo = new T.BufferGeometry();
      var cam = new T.PerspectiveCamera(45, 1.7, 1, 900);
      var ref = new Float32Array(COUNT * 2), spd = new Float32Array(COUNT), pos = new Float32Array(COUNT * 3);
      for (i = 0; i < COUNT; i++) {
        ref[i * 2] = ((i % N) + 0.5) / N; ref[i * 2 + 1] = (Math.floor(i / N) + 0.5) / N;
        pos[i * 3] = P[i * 4]; pos[i * 3 + 1] = P[i * 4 + 1]; pos[i * 3 + 2] = P[i * 4 + 2];
      }
      geo.setAttribute("position", new T.BufferAttribute(pos, 3));
      geo.setAttribute("aRef", new T.BufferAttribute(ref, 2));
      geo.setAttribute("aSpd", new T.BufferAttribute(spd, 1));
      var ptMat = new T.ShaderMaterial({
        vertexShader: GS_PTV, fragmentShader: GS_PTF, transparent: true,
        blending: T.AdditiveBlending, depthTest: false, depthWrite: false,
        uniforms: { tPos: { value: null }, tVel: { value: null }, uUseTex: { value: gpu ? 1 : 0 },
          uSize: { value: o.pointSize || 1 }, uVMax: { value: VMAX }, uDpr: { value: h.dpr },
          uGlow: { value: o.glow === undefined ? 1 : o.glow }, uEnc: { value: enc },
          uC0: { value: lin(0) }, uC1: { value: lin(1) }, uC2: { value: lin(2) }, uC3: { value: lin(3) } },
      });
      var pts = new T.Points(geo, ptMat);
      pts.frustumCulled = false; scene.add(pts);
      var starGeo = new T.SphereGeometry(0.8, 14, 10);
      var starMat = new T.ShaderMaterial({ vertexShader: GS_STARV, fragmentShader: GS_STARF,
        blending: T.AdditiveBlending, transparent: true, depthWrite: false,
        uniforms: { uC: { value: lin(3) }, uEnc: { value: enc } } });
      var stars = [new T.Mesh(starGeo, starMat), new T.Mesh(starGeo, starMat)];
      scene.add(stars[0], stars[1]);

      // ---- stepping -----------------------------------------------------------
      var simT = 0, mm = 0, mp = new T.Vector3(), ray = new T.Vector3();
      function attractors() {
        hostAt(simT, hp); att[0].set(hp.x, 0, hp.z, MASS); att[1].set(-hp.x, 0, -hp.z, MASS);
        att[2].set(mp.x, mp.y, mp.z, mm * MASS * 0.85);
        stars[0].position.set(hp.x, 0, hp.z); stars[1].position.set(-hp.x, 0, -hp.z);
      }
      function step(dt) {
        simT += dt; attractors();
        if (!gpu) { cpuStep(dt); return; }
        forceMat.uniforms.tPos.value = curP; forceMat.uniforms.tVel.value = curV;
        forceMat.uniforms.uDt.value = dt; quad.material = forceMat;
        renderer.setRenderTarget(rtV[wi]); renderer.render(fsScene, fsCam);
        driftMat.uniforms.tPos.value = curP; driftMat.uniforms.tVel.value = rtV[wi].texture;
        driftMat.uniforms.uDt.value = dt; quad.material = driftMat;
        renderer.setRenderTarget(rtP[wi]); renderer.render(fsScene, fsCam);
        curV = rtV[wi].texture; curP = rtP[wi].texture; wi = 1 - wi;
        renderer.setRenderTarget(null);
      }
      function cpuStep(dt) {          // identical symplectic map, fallback only
        for (var j = 0; j < COUNT; j++) {
          var q = j * 4, ax = 0, ay = 0, az = 0, m, rr, f, in3;
          for (m = 0; m < 4; m++) {           // 3 masses plus the halo at the origin
            in3 = m < 3;
            var dx = (in3 ? att[m].x : 0) - P[q], dy = (in3 ? att[m].y : 0) - P[q + 1];
            var dz = (in3 ? att[m].z : 0) - P[q + 2];
            rr = dx * dx + dy * dy + dz * dz + (in3 ? EPS * EPS : HEPS * HEPS);
            f = (in3 ? att[m].w : HALO) / (rr * Math.sqrt(rr));
            ax += dx * f; ay += dy * f; az += dz * f;
          }
          V[q] += ax * dt; V[q + 1] += ay * dt; V[q + 2] += az * dt;
          P[q] += V[q] * dt; P[q + 1] += V[q + 1] * dt; P[q + 2] += V[q + 2] * dt;
          pos[j * 3] = P[q]; pos[j * 3 + 1] = P[q + 1]; pos[j * 3 + 2] = P[q + 2];
          spd[j] = Math.sqrt(V[q] * V[q] + V[q + 1] * V[q + 1] + V[q + 2] * V[q + 2]);
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.aSpd.needsUpdate = true;
      }
      // Warm-up runs here, not in draw: reduced motion gets exactly one frame and
      // it has to already show a post-pericentre bridge, not two pristine disks.
      var warm = gpu ? 580 : 110;
      for (i = 0; i < warm; i++) step(1 / 68);

      function aim(t) {
        var a = 1.12 + t * 0.05;
        cam.position.set(Math.sin(a) * 76, 33 + Math.sin(t * 0.09) * 6, Math.cos(a) * 76);
        cam.lookAt(0, 0, 0);
      }
      aim(0);
      return {
        resize: function (w, hh) {
          renderer.setPixelRatio(h.dpr); renderer.setSize(w, hh, false);
          cam.aspect = w / Math.max(1, hh); cam.updateProjectionMatrix();
          bgMat.uniforms.uAsp.value = cam.aspect; ptMat.uniforms.uDpr.value = h.dpr;
          if (rtHDR) {
            var pw = Math.max(2, Math.round(w * h.dpr)), ph = Math.max(2, Math.round(hh * h.dpr));
            var bw = Math.max(2, pw >> 2), bh = Math.max(2, ph >> 2);
            rtHDR.setSize(pw, ph); rtBloom.setSize(bw, bh);
            bloomMat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
          }
        },
        update: function (n) {
          if (n.glow !== undefined) ptMat.uniforms.uGlow.value = n.glow;
          if (n.pointSize !== undefined) ptMat.uniforms.uSize.value = n.pointSize;
          if (resMat && n.exposure !== undefined) resMat.uniforms.uExp.value = n.exposure;
          if (resMat && n.bloom !== undefined) resMat.uniforms.uBloom.value = n.bloom;
        },
        draw: function (t, dt) {
          var sdt = Math.min(dt || 1 / 60, 1 / 30) * (o.speed === undefined ? 1 : o.speed);
          // the pointer becomes a third mass; ramping it keeps streams from snapping
          var want = (o.interactive !== false && h.mouse && h.mouse.active) ? 1 : 0;
          if (want) {
            ray.set((h.mouse.x / Math.max(1, h.width)) * 2 - 1, 1 - (h.mouse.y / Math.max(1, h.height)) * 2, 0.5);
            ray.unproject(cam).sub(cam.position).normalize();
            var kk = ray.y < -0.03 ? -cam.position.y / ray.y : 90;
            mp.copy(cam.position).addScaledVector(ray, Math.max(6, Math.min(240, kk)));
          }
          mm += (want - mm) * 0.06;
          if (!h.reduced) { step(sdt * 0.5); step(sdt * 0.5); } else attractors();
          aim(t);
          ptMat.uniforms.tPos.value = curP; ptMat.uniforms.tVel.value = curV;
          renderer.setRenderTarget(gpu ? rtHDR : null);
          quad.material = bgMat; renderer.autoClear = true; renderer.render(fsScene, fsCam);
          renderer.autoClear = false; renderer.render(scene, cam); renderer.autoClear = true;
          if (gpu) {
            quad.material = bloomMat; renderer.setRenderTarget(rtBloom); renderer.render(fsScene, fsCam);
            renderer.setRenderTarget(null);
            quad.material = resMat; renderer.render(fsScene, fsCam);
          }
        },
        destroy: function () {
          var ex = [bgMat, ptMat, starMat, starGeo, quadGeo, renderer];
          if (gpu) ex = ex.concat([rtP[0], rtP[1], rtV[0], rtV[1], rtHDR, rtBloom, texP, texV,
            forceMat, driftMat, bloomMat, resMat]);
          threeDispose(scene, ex);
        },
      };
    },
  });

  /* starGlare — a hand-rolled HDR post chain (no EffectComposer, no addons).
   * 13 render targets, 22 fullscreen passes + 1 scene render per frame:
   *   HDR scene -> bright-pass -> 4x (13-tap downsample + separable Gaussian)
   *   -> 4 tent upsamples, each added into the level below -> 2 anamorphic
   *   streak passes -> composite (ghosts, radial chromatic aberration, ACES).
   * The pyramid matters: one blur radius gives you a tight core or a wide halo,
   * never both, and reads as a cheap glow. Summing every mip is a lens' falloff.
   */
  registerThree("starGlare", {
    defaults: {
      speed: 1,
      bloomStrength: 1.0,
      bloomRadius: 1.15,
      threshold: 1.0,
      streak: 0.7,
      aberration: 1.0,
      exposure: 0.9,
      colors: ["#fff4d6", "#ffcf8a", "#a8c8ff", "#7d8dff"],
      background: "#03040a",
    },
    scene: function (T, h) {
      var renderer = threeRenderer(T, h);
      renderer.toneMapping = T.NoToneMapping; // we tonemap in the composite
      renderer.setClearColor(0x000000, 1);

      var pal = paletteOf(h.opts, ["#fff4d6", "#ffcf8a", "#a8c8ff", "#7d8dff"]);
      // Palette hex is sRGB; the whole chain is linear light, so linearise.
      function lin(c) { return new T.Vector3(Math.pow(c.r / 255, 2.2), Math.pow(c.g / 255, 2.2), Math.pow(c.b / 255, 2.2)); }
      var cStar = lin(pal[0]), cWarm = lin(pal[1 % pal.length]);
      var cCool = lin(pal[2 % pal.length]), cDust = lin(pal[3 % pal.length]);
      var bg = lin(hexToRgb(h.opts.background || "#03040a"));

      var scene = new T.Scene();
      var cam = new T.PerspectiveCamera(42, h.width / Math.max(1, h.height), 0.1, 400);
      cam.position.set(0, 0, 15);

      /* ---- subject: a close binary behind a dark occluding body ---- */
      var VERT_Q = "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }";
      var GLOW = new T.ShaderMaterial({
        uniforms: { uC: { value: cStar }, uI: { value: 52.0 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader:
          "varying vec2 vUv; uniform vec3 uC; uniform float uI;" +
          "void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); if(r>1.0) discard;" +
          " float k=max(0.0,1.0-r); float core=k*k*k*k*k*k*k*k;" +   // pow() on a clamped base
          " float halo=exp(-r*3.4)-exp(-3.4);" +
          " gl_FragColor=vec4(uC*uI*(core+halo*0.055),1.0); }",
        transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide,
      });
      var starGrp = new T.Group();
      scene.add(starGrp);
      var glowA = new T.Mesh(new T.PlaneGeometry(3.6, 3.6), GLOW), coreA = new T.Mesh(new T.SphereGeometry(0.16, 20, 14), GLOW);
      var glowB = new T.Mesh(new T.PlaneGeometry(1.7, 1.7), GLOW.clone());
      glowB.material.uniforms.uC.value = cWarm; glowB.material.uniforms.uI.value = 15.0;
      var coreB = new T.Mesh(new T.SphereGeometry(0.07, 14, 10), glowB.material);
      starGrp.add(glowA); starGrp.add(coreA); starGrp.add(glowB); starGrp.add(coreB);

      // Real PBR on the occluder, lit by a point light sitting inside the star,
      // so its limb genuinely brightens as the star swings behind it.
      var lightC = new T.Color(pal[0].r / 255, pal[0].g / 255, pal[0].b / 255);
      var pl = new T.PointLight(lightC, 420, 0, 2);
      scene.add(pl);
      scene.add(new T.AmbientLight(0x14213a, 0.35));
      var occMat = new T.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.92, metalness: 0.05 });
      var occ = new T.Mesh(new T.SphereGeometry(2.6, 96, 64), occMat);
      occ.position.z = 3.4;
      scene.add(occ);
      // Back-facing shell: the opaque body draws first and hides all of it but
      // the sliver outside its silhouette — an atmospheric limb. Density falls
      // off with the ray's impact parameter, not with fresnel; fresnel peaks at
      // the OUTER edge and gives a hard-edged grey donut instead of air.
      var atmMat = new T.ShaderMaterial({
        uniforms: {
          uC: { value: cCool }, uSun: { value: new T.Vector3(0, 0, -1) }, uI: { value: 2.6 },
          uEcl: { value: 0 }, uCen: { value: new T.Vector3() }, uRb: { value: 2.6 }, uRa: { value: 3.5 },
        },
        vertexShader:
          "varying vec3 vR; varying vec3 vV;" +
          "uniform vec3 uCen;" +
          "void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vR=wp.xyz-uCen;" +
          " vV=normalize(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }",
        fragmentShader:
          "varying vec3 vR; varying vec3 vV; uniform vec3 uC; uniform vec3 uSun;" +
          "uniform float uI; uniform float uEcl; uniform float uRb; uniform float uRa;" +
          "void main(){ vec3 V=-vV;" +
          " vec3 pr=vR-V*dot(vR,V); float b=length(pr);" +   // ray impact parameter
          " float alt=clamp((b-uRb)/max(0.001,uRa-uRb),0.0,1.0);" +
          " float dens=exp(-alt*4.5)*(1.0-alt);" +
          // star direction projected into the screen plane: a raw dot(N,sun)
          // has the sun's z lighting the entire ring evenly, which reads neon
          " vec3 sd=uSun-V*dot(uSun,V); float ls=length(sd);" +
          " float sn=(ls>1e-4&&b>1e-4)?max(0.0,dot(pr/b,sd/ls)):0.0;" +
          " gl_FragColor=vec4(uC*uI*dens*(0.03+4.0*sn*sn*sn+0.9*uEcl),1.0); }",
        transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.BackSide,
      });
      var atm = new T.Mesh(new T.SphereGeometry(3.5, 48, 32), atmMat);
      scene.add(atm);

      /* ---- background stars + thin dust (Points, HDR colours) ---- */
      function cloud(n, spread, sz, col, gain) {
        var pos = new Float32Array(n * 3), sc = new Float32Array(n), sd = new Float32Array(n), cl = new Float32Array(n * 3);
        for (var i = 0; i < n; i++) {
          // random point inside a shell — never floor(dir*k), that paints cubes
          var u = Math.random() * 2 - 1, a = Math.random() * TAU(), rr = spread * (0.55 + 0.45 * Math.random()), s = Math.sqrt(Math.max(0, 1 - u * u));
          pos[i * 3] = Math.cos(a) * s * rr; pos[i * 3 + 1] = u * rr * 0.6; pos[i * 3 + 2] = Math.sin(a) * s * rr - spread * 0.35;
          sc[i] = sz * (0.85 + Math.random() * Math.random() * 2.2); sd[i] = Math.random() * 10;
          var mixc = Math.random() < 0.5 ? col : cCool, g = gain * (0.25 + Math.random() * Math.random() * 3.0);
          cl[i * 3] = mixc.x * g; cl[i * 3 + 1] = mixc.y * g; cl[i * 3 + 2] = mixc.z * g;
        }
        var g2 = new T.BufferGeometry();
        g2.setAttribute("position", new T.BufferAttribute(pos, 3)); g2.setAttribute("aSize", new T.BufferAttribute(sc, 1));
        g2.setAttribute("aSeed", new T.BufferAttribute(sd, 1)); g2.setAttribute("aColor", new T.BufferAttribute(cl, 3));
        return g2;
      }
      var pMat = new T.ShaderMaterial({
        uniforms: { uScale: { value: 400 }, uTime: { value: 0 }, uSoft: { value: 3.4 } },
        vertexShader:
          "attribute float aSize; attribute float aSeed; attribute vec3 aColor;" +
          "uniform float uScale; uniform float uTime; varying vec3 vC;" +
          "void main(){ float tw=0.72+0.28*sin(uTime*1.7+aSeed*6.283); vC=aColor*tw;" +
          " vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv;" +
          " gl_PointSize=aSize*uScale/max(0.5,-mv.z); }",
        fragmentShader:
          "varying vec3 vC; uniform float uSoft;" +
          "void main(){ vec2 p=gl_PointCoord*2.0-1.0; float r2=dot(p,p); if(r2>1.0) discard;" +
          " gl_FragColor=vec4(vC*exp(-r2*uSoft),1.0); }",
        transparent: true, blending: T.AdditiveBlending, depthWrite: false,
      });
      var stars = new T.Points(cloud(950, 90, 0.5, cStar, 1.3), pMat);
      scene.add(stars);
      var dustMat = pMat.clone();
      dustMat.uniforms.uSoft.value = 3.4;
      var dust = new T.Points(cloud(80, 24, 2.6, cDust, 0.03), dustMat);
      scene.add(dust);

      /* ---------------- post chain ---------------- */
      var LV = 4; // downsample levels past the half-res bright pass
      function mkRT(depth) {
        return new T.WebGLRenderTarget(2, 2, {
          type: T.HalfFloatType, minFilter: T.LinearFilter, magFilter: T.LinearFilter,
          wrapS: T.ClampToEdgeWrapping, wrapT: T.ClampToEdgeWrapping, depthBuffer: !!depth,
        });
      }
      var rtScene = mkRT(true); // needs depth so the occluder actually occludes
      var rtBright = mkRT(), rtBloom = mkRT(), rtSk1 = mkRT(), rtSk2 = mkRT();
      var down = [], up = [], i;
      for (i = 0; i < LV; i++) { down.push(mkRT()); up.push(mkRT()); }
      var allRT = [rtScene, rtBright, rtBloom, rtSk1, rtSk2].concat(down, up);

      function sm(frag, uni) {
        return new T.ShaderMaterial({ uniforms: uni, vertexShader: VERT_Q, fragmentShader: frag, depthTest: false, depthWrite: false });
      }
      var TAP = "vec3 tap(sampler2D s, vec2 uv, vec2 o){ return texture2D(s, uv+o).rgb; }\n";
      var mBright = sm(
        "varying vec2 vUv; uniform sampler2D tS; uniform float uT;" +
        "void main(){ vec3 c=texture2D(tS,vUv).rgb; float l=max(max(c.r,c.g),c.b);" +
        " float kn=0.55; float s=clamp(l-uT+kn,0.0,2.0*kn); s=s*s/(4.0*kn);" +
        " float w=max(s,l-uT)/max(l,1e-4); gl_FragColor=vec4(c*w,1.0); }",
        { tS: { value: null }, uT: { value: 1.0 } });
      // 13-tap dual filter (the COD downsample), one pass per level.
      var mDown = sm(
        "varying vec2 vUv; uniform sampler2D tS; uniform vec2 uTx;\n" + TAP +
        "void main(){ vec2 t=uTx;" +
        " vec3 o=tap(tS,vUv,vec2(0.0))*0.125" +
        " +(tap(tS,vUv,vec2(-2,2)*t)+tap(tS,vUv,vec2(2,2)*t)+tap(tS,vUv,vec2(-2,-2)*t)+tap(tS,vUv,vec2(2,-2)*t))*0.03125" +
        " +(tap(tS,vUv,vec2(0,2)*t)+tap(tS,vUv,vec2(-2,0)*t)+tap(tS,vUv,vec2(2,0)*t)+tap(tS,vUv,vec2(0,-2)*t))*0.0625" +
        " +(tap(tS,vUv,vec2(-1,1)*t)+tap(tS,vUv,vec2(1,1)*t)+tap(tS,vUv,vec2(-1,-1)*t)+tap(tS,vUv,vec2(1,-1)*t))*0.125;" +
        " gl_FragColor=vec4(o,1.0); }",
        { tS: { value: null }, uTx: { value: new T.Vector2() } });
      // Separable Gaussian on every mip. Without it the pyramid is a stack of
      // box filters and a point source blooms into a visible SQUARE.
      var mBlur = sm(
        "varying vec2 vUv; uniform sampler2D tS; uniform vec2 uDir;\n" + TAP +
        "void main(){ vec3 s=tap(tS,vUv,vec2(0.0))*0.227027;" +
        " s+=(tap(tS,vUv,uDir*1.384615)+tap(tS,vUv,-uDir*1.384615))*0.316216;" +
        " s+=(tap(tS,vUv,uDir*3.230769)+tap(tS,vUv,-uDir*3.230769))*0.070270;" +
        " gl_FragColor=vec4(s,1.0); }",
        { tS: { value: null }, uDir: { value: new T.Vector2() } });
      var mUp = sm(
        "varying vec2 vUv; uniform sampler2D tS; uniform sampler2D tAdd; uniform vec2 uTx; uniform float uR;\n" + TAP +
        "void main(){ vec2 t=uTx*uR;" +
        " vec3 s=tap(tS,vUv,vec2(-1,1)*t)+tap(tS,vUv,vec2(0,1)*t)*2.0+tap(tS,vUv,vec2(1,1)*t)" +
        " +tap(tS,vUv,vec2(-1,0)*t)*2.0+tap(tS,vUv,vec2(0.0))*4.0+tap(tS,vUv,vec2(1,0)*t)*2.0" +
        " +tap(tS,vUv,vec2(-1,-1)*t)+tap(tS,vUv,vec2(0,-1)*t)*2.0+tap(tS,vUv,vec2(1,-1)*t);" +
        " gl_FragColor=vec4(s*0.0625+texture2D(tAdd,vUv).rgb,1.0); }",
        { tS: { value: null }, tAdd: { value: null }, uTx: { value: new T.Vector2() }, uR: { value: 1.15 } });
      // Anamorphic streak: long horizontal kernel, run twice at growing stride,
      // tinted cool so it reads as coated glass rather than a smear.
      var mStreak = sm(
        "varying vec2 vUv; uniform sampler2D tS; uniform float uStep; uniform vec3 uTint; uniform float uAtt;" +
        "void main(){ vec3 s=texture2D(tS,vUv).rgb; float wsum=1.0;" +
        " for(int i=1;i<=14;i++){ float fi=float(i); float w=pow(uAtt,fi);" +
        "  s+=(texture2D(tS,vUv+vec2(uStep*fi,0.0)).rgb+texture2D(tS,vUv-vec2(uStep*fi,0.0)).rgb)*w; wsum+=2.0*w; }" +
        " gl_FragColor=vec4(s/wsum*uTint,1.0); }",
        { tS: { value: null }, uStep: { value: 0.002 }, uAtt: { value: 0.8 }, uTint: { value: new T.Vector3(1, 1, 1) } });
      var mComp = sm(
        "varying vec2 vUv; uniform sampler2D tS; uniform sampler2D tB; uniform sampler2D tK; uniform sampler2D tG;" +
        "uniform float uBloom; uniform float uStreak; uniform float uAb; uniform float uExp; uniform vec3 uBg;" +
        // lens ghosts: an internal reflection is the image inverted through the
        // optical axis, so each ghost is the bloom sampled at a negative scale
        "vec3 ghost(vec2 d){ return texture2D(tG,0.5-d*0.45).rgb*vec3(0.09,0.05,0.03)" +
        " + texture2D(tG,0.5-d*0.82).rgb*vec3(0.03,0.06,0.10)" +
        " + texture2D(tG,0.5+d*1.55).rgb*vec3(0.05,0.03,0.08); }" +
        "vec3 grab(vec2 uv){ vec2 d=uv-0.5; return texture2D(tS,uv).rgb + texture2D(tB,uv).rgb*uBloom" +
        " + texture2D(tK,uv).rgb*uStreak + ghost(d)*uBloom; }" +
        "vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }" +
        "void main(){ vec2 d=vUv-0.5; float r2=dot(d,d);" +
        " float ca=uAb*0.007*r2;" +         // lateral CA: zero on axis, grows outward
        " vec3 c; c.r=grab(0.5+d*(1.0-ca)).r; c.g=grab(vUv).g; c.b=grab(0.5+d*(1.0+ca)).b;" +
        " c+=uBg*(1.2+16.0*exp(-2.4*r2));" +
        " c=aces(c*uExp)*(1.0-0.55*r2);" +
        " gl_FragColor=vec4(pow(max(c,vec3(0.0)),vec3(1.0/2.2)),1.0); }",
        { tS: { value: null }, tB: { value: null }, tK: { value: null }, tG: { value: null }, uBg: { value: bg },
          uBloom: { value: 1.0 }, uStreak: { value: 0.7 }, uAb: { value: 1.0 }, uExp: { value: 0.9 } });

      var quadGeo = new T.PlaneGeometry(2, 2), quad = new T.Mesh(quadGeo, mBright);
      var qScene = new T.Scene(); qScene.add(quad);
      var qCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      function pass(mat, target) {
        quad.material = mat; renderer.setRenderTarget(target || null); renderer.render(qScene, qCam);
      }
      // two-pass separable Gaussian, in place, using `tmp` as the H scratch
      function gauss(rt, tmp) {
        mBlur.uniforms.tS.value = rt.texture; mBlur.uniforms.uDir.value.set(1 / rt.width, 0); pass(mBlur, tmp);
        mBlur.uniforms.tS.value = tmp.texture; mBlur.uniforms.uDir.value.set(0, 1 / rt.height); pass(mBlur, rt);
      }

      function sizeAll(w, hh) {
        var W = Math.max(2, Math.floor(w * h.dpr)), H = Math.max(2, Math.floor(hh * h.dpr));
        rtScene.setSize(W, H);
        var bw = Math.max(2, W >> 1), bh = Math.max(2, H >> 1);
        rtBright.setSize(bw, bh); rtBloom.setSize(bw, bh); rtSk1.setSize(bw, bh); rtSk2.setSize(bw, bh);
        for (var k = 0; k < LV; k++) {
          bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1);
          down[k].setSize(bw, bh); up[k].setSize(bw, bh);
        }
        pMat.uniforms.uScale.value = H * 0.55; dustMat.uniforms.uScale.value = H * 0.55;
      }
      sizeAll(h.width, h.height);

      var opt = h.opts, ox = 0, oy = 0;
      function readOpts() {
        mBright.uniforms.uT.value = opt.threshold; mUp.uniforms.uR.value = opt.bloomRadius;
        mComp.uniforms.uBloom.value = opt.bloomStrength * 0.30; mComp.uniforms.uStreak.value = opt.streak * 0.6;
        mComp.uniforms.uAb.value = opt.aberration; mComp.uniforms.uExp.value = opt.exposure;
        mStreak.uniforms.uTint.value.set(0.70, 0.83, 1.22);
      }
      readOpts();

      return {
        resize: function (w, hh) {
          renderer.setPixelRatio(h.dpr); renderer.setSize(w, hh, false);
          cam.aspect = w / Math.max(1, hh); cam.updateProjectionMatrix(); sizeAll(w, hh);
        },
        update: function (o) { opt = o; readOpts(); },
        draw: function (t) {
          var s = t * (opt.speed || 1) * 0.6;
          // one base frequency + integer harmonics => the whole thing loops
          var bx = 4.3 * Math.sin(s), by = 1.5 * Math.cos(2 * s) + 0.62;
          if (h.mouse && h.mouse.active) { // drag the body across the star yourself
            var mx = (h.mouse.x / Math.max(1, h.width)) * 2 - 1, my = -((h.mouse.y / Math.max(1, h.height)) * 2 - 1);
            ox += (mx * 4.6 - bx - ox) * 0.12; oy += (my * 2.8 - by - oy) * 0.12;
          } else { ox += (0 - ox) * 0.05; oy += (0 - oy) * 0.05; }
          occ.position.x = bx + ox; occ.position.y = by + oy;
          occ.rotation.y = s * 0.35; occ.rotation.x = 0.2;
          atm.position.copy(occ.position); atmMat.uniforms.uCen.value.copy(occ.position);
          atmMat.uniforms.uSun.value.copy(occ.position).multiplyScalar(-1).normalize();
          // a dead-centre occultation lights the whole limb: ring of fire
          var lat = Math.sqrt(occ.position.x * occ.position.x + occ.position.y * occ.position.y) / 2.6;
          var ecl = clamp(1 - lat, 0, 1); atmMat.uniforms.uEcl.value = ecl * ecl * 1.4;
          // binary: the companion swings round the primary at 3x the base rate
          var ang = s * 3.0;
          glowB.position.set(Math.cos(ang) * 0.62, Math.sin(ang) * 0.2, Math.sin(ang) * 0.62);
          coreB.position.copy(glowB.position);
          glowA.quaternion.copy(cam.quaternion); glowB.quaternion.copy(cam.quaternion);
          pMat.uniforms.uTime.value = t; dustMat.uniforms.uTime.value = t;
          dust.rotation.z = s * 0.06; stars.rotation.y = s * 0.012;
          cam.position.set(Math.sin(s * 0.5) * 1.15, Math.sin(s) * 0.5 + 0.25, 15); cam.lookAt(0, 0, 0);
          renderer.setRenderTarget(rtScene); renderer.render(scene, cam);

          mBright.uniforms.tS.value = rtScene.texture; pass(mBright, rtBright);
          // streaks come off the *unblurred* bright pass; blur first and the
          // flare fattens into a bar
          mStreak.uniforms.tS.value = rtBright.texture; mStreak.uniforms.uAtt.value = 0.90;
          mStreak.uniforms.uStep.value = 1.5 / rtBright.width; pass(mStreak, rtSk1);
          mStreak.uniforms.tS.value = rtSk1.texture; mStreak.uniforms.uAtt.value = 0.80;
          mStreak.uniforms.uStep.value = 5.0 / rtSk1.width; pass(mStreak, rtSk2);
          // level 0 blur; rtSk1 is free again now the streak has been captured
          gauss(rtBright, rtSk1);
          var src = rtBright, k;
          for (k = 0; k < LV; k++) {
            mDown.uniforms.tS.value = src.texture; mDown.uniforms.uTx.value.set(1 / src.width, 1 / src.height);
            pass(mDown, down[k]);
            gauss(down[k], up[k]); src = down[k]; // up[k] is free until upsampling
          }
          // upsample, adding each coarse level into the finer one below it
          var cur = down[LV - 1];
          for (k = LV - 2; k >= 0; k--) {
            mUp.uniforms.tS.value = cur.texture; mUp.uniforms.tAdd.value = down[k].texture;
            mUp.uniforms.uTx.value.set(1 / cur.width, 1 / cur.height); pass(mUp, up[k]); cur = up[k];
          }
          mUp.uniforms.tS.value = cur.texture; mUp.uniforms.tAdd.value = rtBright.texture;
          mUp.uniforms.uTx.value.set(1 / cur.width, 1 / cur.height); pass(mUp, rtBloom);

          mComp.uniforms.tS.value = rtScene.texture; mComp.uniforms.tB.value = rtBloom.texture;
          mComp.uniforms.tK.value = rtSk2.texture; mComp.uniforms.tG.value = down[1].texture;
          pass(mComp, null);
        },
        destroy: function () {
          threeDispose(scene, [quadGeo, mBright, mDown, mBlur, mUp, atmMat, mStreak, mComp, pMat, dustMat, GLOW, glowB.material, occMat].concat(allRT, [renderer]));
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
   * scrollScene — bind scroll progress to a crossfading sequence of scenes.
   * The GalaxyJS answer to scroll-driven timelines, at the SCENE level.
   *
   * Galaxy.scrollScene(stickyStage, {
   *   scenes: ['galaxyMerge', { type: 'quasar', options: {...} }, ...],
   *   track: '#hero',          // tall element whose scroll drives progress (default: stage.parentNode)
   *   onProgress: (p, i, s) => {},
   *   reducedScene: 0          // which scene to show as a static frame under prefers-reduced-motion
   * })
   *
   * Only the (at most two) crossfading scenes are display:block at a time, so the
   * engine's own IntersectionObserver runs exactly those and pauses the rest — no
   * extra rAF, battery-friendly. Reduced-motion: one static representative frame.
   * ========================================================== */
  function scrollScene(target, config) {
    var stage = resolve(target);
    if (!stage) throw new Error("GalaxyJS: scrollScene target not found");
    config = config || {};
    var list = (config.scenes || []).map(function (s) { return typeof s === "string" ? { type: s } : s; });
    if (!list.length) throw new Error("GalaxyJS: scrollScene needs at least one scene");

    var track = config.track ? resolve(config.track) : (stage.parentNode || stage);
    stage.classList.add("gx-scrollscene");

    var layers = list.map(function (s, i) {
      var layer = document.createElement("div");
      layer.className = "gx-scrollscene__layer";
      layer.style.cssText = "position:absolute;inset:0;opacity:" + (i === 0 ? 1 : 0) +
        ";transition:opacity .2s linear;display:" + (i < 2 ? "block" : "none") + ";";
      stage.appendChild(layer);
      var ctrl = mountAnimation(s.type, layer, Object.assign({ autoplay: false }, s.options || {}));
      return { layer: layer, ctrl: ctrl, type: s.type };
    });

    var n = list.length;
    var lastP = -1, scheduled = false, dead = false;

    function progress() {
      if (!hasDOM) return 0;
      var r = track.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight || 1;
      var scrollable = r.height - vh;
      if (scrollable <= 0) return 0;
      return Math.max(0, Math.min(1, (-r.top) / scrollable));
    }

    function apply(p) {
      var pos = p * (n - 1);
      var idx = Math.min(n - 1, Math.floor(pos));
      var frac = pos - idx;
      for (var i = 0; i < n; i++) {
        var op = 0, vis = false;
        if (i === idx) { op = idx < n - 1 ? 1 - frac : 1; vis = true; }
        else if (i === idx + 1) { op = frac; vis = true; }
        var L = layers[i].layer;
        L.style.display = vis ? "block" : "none"; // engine IO runs only the visible (crossfading) pair
        L.style.opacity = op;
      }
      if (typeof config.onProgress === "function") {
        var active = (frac >= 0.5 && idx < n - 1) ? idx + 1 : idx;
        config.onProgress(p, active, list[active]);
      }
    }

    // Reduced-motion: show one representative static frame, no scroll binding.
    if (prefersReduced) {
      var rIdx = Math.min(n - 1, config.reducedScene != null ? config.reducedScene : 0);
      layers.forEach(function (l, i) { l.layer.style.display = i === rIdx ? "block" : "none"; l.layer.style.opacity = i === rIdx ? 1 : 0; });
      try { layers[rIdx].ctrl.start(); } catch (e) {}
      if (typeof config.onProgress === "function") config.onProgress(0, rIdx, list[rIdx]);
      return { el: stage, layers: layers, progress: function () { return 0; }, destroy: destroy };
    }

    function tick() { scheduled = false; if (dead) return; var p = progress(); if (Math.abs(p - lastP) < 0.0008) return; lastP = p; apply(p); }
    function schedule() { if (!scheduled && hasDOM) { scheduled = true; requestAnimationFrame(tick); } }
    if (hasDOM) {
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule, { passive: true });
    }
    apply(progress());

    function destroy() {
      dead = true;
      if (hasDOM) { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); }
      layers.forEach(function (l) { try { l.ctrl.destroy(); } catch (e) {} if (l.layer.parentNode) l.layer.parentNode.removeChild(l.layer); });
      stage.classList.remove("gx-scrollscene");
    }

    return { el: stage, layers: layers, progress: progress, destroy: destroy };
  }

  /* ============================================================
   * Public API
   * ========================================================== */
  var Galaxy = {
    version: VERSION,
    create: function (type, target, options) { return mountAnimation(type, target, options); },
    scrollScene: scrollScene,
    register: function (name, def) { registerAnimation(name, def); return Galaxy; },
    list: function () { return Object.keys(animations); },
    defaults: function (name) { return animations[name] ? Object.assign({}, animations[name].defaults) : null; },
    /* Which tier draws this one: "2d" | "webgl2" | "three". */
    rendererOf: function (name) { return animations[name] ? animations[name].renderer : null; },
    /* Hand in your own three.js so the optional scenes never touch the network. */
    useThree: function (T) { threeMod = T; return Galaxy; },
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
