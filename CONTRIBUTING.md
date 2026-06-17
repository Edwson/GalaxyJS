# Contributing to GalaxyJS

The manifest is the single source of truth and must never drift from the runtime.

```bash
git clone https://github.com/Edwson/GalaxyJS && cd GalaxyJS
npm install
npm run validate     # manifest + lint + build:min + test + test:mcp
```

## Rules CI enforces
1. **Add animations/components in `galaxy.js`** (the runtime's `Galaxy.list()` / `Galaxy.defaults()` are
   authoritative), then add a one-line description in `mcp/build-manifest.cjs` and run `npm run manifest`.
   The committed `galaxy.manifest.json` must match — CI fails on drift.
2. **Keep counts in sync** across `package.json`, `galaxy.d.ts`, `llms.txt`, and the manifest (the test checks this).
3. **Lint clean** (`npm run lint`) and **both tests green** (`npm test`, `npm run test:mcp`).
4. **Tokens-first CSS** — colours/radii/spacing via `--gx-*` custom properties; honour `prefers-reduced-motion`.

Commit style: `feat:` / `fix:` / `docs:` / `chore:`.
