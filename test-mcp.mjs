#!/usr/bin/env node
/**
 * test-mcp.mjs — end-to-end MCP integration test.
 *
 * Boots the real mcp/server.mjs over stdio with the actual SDK client, does the
 * initialize handshake, and exercises every tool the way an agent would. This is
 * the proof the server speaks MCP (test.mjs proves the contract; this proves the wire).
 *
 * Requires `npm install`.  Usage: node test-mcp.mjs   (exit 0 = pass, 1 = fail)
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = dirname(fileURLToPath(import.meta.url));
let fails = 0;
const ok = (c, m) => { if (c) console.log('  ✓ ' + m); else { console.error('  ✗ ' + m); fails++; } };
const sc = (r) => r.structuredContent || JSON.parse(r.content[0].text);

const transport = new StdioClientTransport({ command: process.execPath, args: [join(here, 'mcp', 'server.mjs')], cwd: here });
const client = new Client({ name: 'galaxyjs-itest', version: '1.0.0' });

try {
  console.log('handshake');
  await client.connect(transport);
  ok(true, 'initialize handshake completed');

  console.log('discovery');
  const tools = (await client.listTools()).tools;
  ok(tools.length === 4, `lists 4 tools (got ${tools.length})`);
  const names = tools.map((t) => t.name).sort();
  ok(['galaxy_get', 'galaxy_list', 'galaxy_quickstart', 'galaxy_snippet'].every((n) => names.includes(n)), 'all four galaxy_* tools are advertised');

  console.log('tool calls');
  const qs = sc(await client.callTool({ name: 'galaxy_quickstart', arguments: {} }));
  ok(qs.counts && qs.counts.animations === 43 && qs.counts.components === 13, 'galaxy_quickstart reports 43 animations + 13 components');

  const list = sc(await client.callTool({ name: 'galaxy_list', arguments: {} }));
  ok(list.animations.length === 43 && list.components.length === 13, 'galaxy_list returns 43 animations + 13 components');
  const filtered = sc(await client.callTool({ name: 'galaxy_list', arguments: { kind: 'animations', query: 'star' } }));
  ok(filtered.animations.length >= 1 && !filtered.components, 'galaxy_list filters by kind + query');

  const get = sc(await client.callTool({ name: 'galaxy_get', arguments: { name: 'nebula' } }));
  ok(get.type === 'animation' && get.options && /Galaxy\.create\('nebula'/.test(get.usage), 'galaxy_get returns a full animation contract + usage');

  const snipHtml = await client.callTool({ name: 'galaxy_snippet', arguments: { type: 'warp', format: 'html', target: '#hero' } });
  const snipText = snipHtml.content[0].text;
  ok(/Galaxy\.create\('warp'/.test(snipText) && /galaxy\.min\.js/.test(snipText), 'galaxy_snippet html embeds the minified CDN + the Galaxy.create call');

  const bad = await client.callTool({ name: 'galaxy_get', arguments: { name: 'no-such-thing' } });
  ok(bad.isError === true, 'an unknown name sets isError on the response');

  await client.close();
} catch (e) {
  console.error('  ✗ integration error:', e && e.message);
  fails++;
  try { await client.close(); } catch { /* already closing */ }
}

console.log(fails === 0 ? '\nPASS — the live GalaxyJS MCP server speaks the protocol end-to-end.' : `\nFAIL — ${fails} check(s) failed.`);
process.exit(fails === 0 ? 0 : 1);
