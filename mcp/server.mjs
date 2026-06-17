#!/usr/bin/env node
/* GalaxyJS MCP server (stdio). Lets any MCP client discover and use every
 * GalaxyJS animation & component in one line, at minimal token cost.
 *
 * Run:        npx -y galaxyjs-mcp        (or)  node mcp/server.mjs
 * Inspector:  npx @modelcontextprotocol/inspector node mcp/server.mjs
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import * as T from "./tools.mjs";

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export function createServer() {
const server = new McpServer({ name: "galaxyjs-mcp-server", version: T.getManifest().version });

server.registerTool(
  "galaxy_quickstart",
  {
    title: "GalaxyJS quickstart",
    description: "How to install and use GalaxyJS: the <script>/CDN include, the one-line API (Galaxy.create), theming, and declarative usage. Call this first.",
    inputSchema: {},
    annotations: RO,
  },
  async () => T.quickstart()
);

server.registerTool(
  "galaxy_list",
  {
    title: "List GalaxyJS animations & components",
    description: "List all 60 animations and 13 components (with one-line descriptions). Optionally filter by keyword or restrict to one kind.",
    inputSchema: {
      kind: z.enum(["all", "animations", "components"]).optional().describe("Restrict results. Default: all."),
      query: z.string().optional().describe("Case-insensitive keyword filter, e.g. 'star', 'rain', 'modal'."),
    },
    annotations: RO,
  },
  async (args) => T.list(args || {})
);

server.registerTool(
  "galaxy_get",
  {
    title: "Get a GalaxyJS animation or component",
    description: "Full detail for one animation (all options + defaults + a ready usage snippet) or one component (its API/usage).",
    inputSchema: {
      name: z.string().describe("An animation name (e.g. 'nebula', 'matrix') or component name (e.g. 'toast', 'drawer')."),
    },
    annotations: RO,
  },
  async (args) => T.get(args || {})
);

server.registerTool(
  "galaxy_snippet",
  {
    title: "Generate ready-to-paste GalaxyJS code",
    description: "Return copy-paste code for an animation or component. For animations, format 'js' returns the Galaxy.create() line; 'html' returns a full minimal page with CDN tags.",
    inputSchema: {
      type: z.string().describe("Animation or component name, e.g. 'nebula', 'warp', 'toast'."),
      target: z.string().optional().describe("CSS selector or element id for the host element. Default '#galaxy'."),
      options: z.record(z.any()).optional().describe("Animation options object, e.g. { speed: 1.5, colors: ['#7c5cff','#22d3ee'] }."),
      format: z.enum(["js", "html"]).optional().describe("Output format for animations. Default 'js'."),
    },
    annotations: RO,
  },
  async (args) => T.snippet(args || {})
);

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is safe for logs (stdout is the protocol channel)
  console.error("galaxyjs-mcp-server v" + T.getManifest().version + " ready (stdio)");
}

// Run only when executed directly (not when imported by a test).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
