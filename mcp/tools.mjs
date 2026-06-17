// GalaxyJS MCP — tool logic (pure, framework-independent).
// Each function returns an MCP-style result: { content, structuredContent, isError? }.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "galaxy.manifest.json"), "utf8"));

export function getManifest() { return MANIFEST; }

function result(data, isError) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text", text: text }],
    structuredContent: typeof data === "string" ? { text: data } : data,
    isError: !!isError,
  };
}

function findAnimation(name) { return MANIFEST.animations.find((a) => a.name === name); }
function findComponent(name) { return MANIFEST.components.find((c) => c.name === name); }

function optsToJs(options) {
  if (!options || !Object.keys(options).length) return "";
  return ", " + JSON.stringify(options);
}

/** Ready-to-paste code for an animation. */
function animationSnippet(anim, target, options, format) {
  const id = (target || "#galaxy").replace(/^#/, "");
  const sel = target && target[0] !== "#" && target[0] !== "." ? "#" + target : (target || "#galaxy");
  const js = `Galaxy.create('${anim.name}', '${sel}'${optsToJs(options)});`;
  if (format === "html") {
    return (
      `<link rel="stylesheet" href="${MANIFEST.cdn.css}">\n` +
      `<div id="${id}" style="position:relative;height:60vh"></div>\n` +
      `<script src="${MANIFEST.cdn.js}"></script>\n` +
      `<script>\n  ${js}\n</script>`
    );
  }
  return js;
}

// --- Tools ---

export function quickstart() {
  return result({
    summary: MANIFEST.description,
    version: MANIFEST.version,
    include: MANIFEST.install.script,
    oneLiner: MANIFEST.oneLiner,
    api: MANIFEST.api,
    declarative: MANIFEST.api.declarative,
    npm: MANIFEST.install.npm,
    notes: MANIFEST.notes,
    counts: { animations: MANIFEST.animations.length, components: MANIFEST.components.length },
    docs: "https://github.com/Edwson/GalaxyJS/blob/main/docs/API.md",
  });
}

export function list({ kind = "all", query = "" } = {}) {
  const q = String(query || "").toLowerCase();
  const match = (name, desc) => !q || (name + " " + (desc || "")).toLowerCase().includes(q);
  const anims = MANIFEST.animations.filter((a) => match(a.name, a.desc)).map((a) => ({ name: a.name, desc: a.desc }));
  const comps = MANIFEST.components.filter((c) => match(c.name, c.desc)).map((c) => ({ name: c.name, desc: c.desc, usage: c.usage }));
  const out = {};
  if (kind === "all" || kind === "animations") out.animations = anims;
  if (kind === "all" || kind === "components") out.components = comps;
  if (kind === "all") out.cssClasses = MANIFEST.cssClasses;
  return result(out);
}

export function get({ name } = {}) {
  if (!name) return result("Provide a `name` (an animation or component). Use galaxy_list to see options.", true);
  const anim = findAnimation(name);
  if (anim) {
    return result({
      type: "animation",
      name: anim.name,
      description: anim.desc,
      options: anim.options,
      usage: animationSnippet(anim, "#galaxy", null, "js"),
      example: animationSnippet(anim, "#hero", { speed: anim.options.speed ?? 1 }, "js"),
    });
  }
  const comp = findComponent(name);
  if (comp) {
    return result({ type: "component", name: comp.name, description: comp.desc, usage: comp.usage });
  }
  const names = MANIFEST.animations.map((a) => a.name).concat(MANIFEST.components.map((c) => c.name));
  const near = names.filter((n) => n.toLowerCase().includes(String(name).toLowerCase())).slice(0, 5);
  return result(`"${name}" not found. ${near.length ? "Did you mean: " + near.join(", ") + "?" : "Use galaxy_list to browse all " + names.length + " names."}`, true);
}

export function snippet({ type, target, options, format = "js" } = {}) {
  if (!type) return result("Provide a `type` (animation or component name).", true);
  const anim = findAnimation(type);
  if (anim) return result(animationSnippet(anim, target, options, format));
  const comp = findComponent(type);
  if (comp) {
    if (comp.kind === "js") {
      return result(comp.usage);
    }
    return result(
      `${comp.usage}\n<!-- ${comp.desc} Components are wired automatically by Galaxy.autoInit(). -->`
    );
  }
  return result(`Unknown type "${type}". Use galaxy_list to see all names.`, true);
}
