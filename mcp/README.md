# GalaxyJS MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets any
AI agent discover and use **every** GalaxyJS animation and component in one line —
at minimal token cost. It reads [`galaxy.manifest.json`](../galaxy.manifest.json),
the single source of truth generated from the live library.

## Tools

| Tool | Purpose |
| --- | --- |
| `galaxy_quickstart` | Install snippet, the one-line API, theming, declarative usage. Call first. |
| `galaxy_list` | List all animations & components (filter by `kind` / `query`). |
| `galaxy_get` | Full options/defaults + a ready snippet for one animation, or a component's API. |
| `galaxy_snippet` | Generate copy-paste code (`format: "js"` or full-page `"html"`). |

All tools are read-only.

## Connect it

**Claude Desktop** — add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "galaxyjs": { "command": "npx", "args": ["-y", "galaxyjs-mcp"] }
  }
}
```

Or run from a local clone:

```json
{
  "mcpServers": {
    "galaxyjs": { "command": "node", "args": ["/absolute/path/to/GalaxyJS/mcp/server.mjs"] }
  }
}
```

## Try it locally

```bash
npm install
npx @modelcontextprotocol/inspector node mcp/server.mjs
```

## Example agent flow

> "Add a slow purple nebula background to `#hero`."

1. `galaxy_get { "name": "nebula" }` → sees options (`count`, `speed`, `colors`, …).
2. `galaxy_snippet { "type": "nebula", "target": "#hero", "options": { "speed": 0.6, "colors": ["#7c5cff", "#4c1d95"] }, "format": "html" }`
3. → returns ready-to-paste HTML with the CDN tags and the `Galaxy.create()` call.

## Maintenance

The manifest is regenerated from the runtime so names and defaults never drift:

```bash
npm run manifest   # node mcp/build-manifest.cjs
```
