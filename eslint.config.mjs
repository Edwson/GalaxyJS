import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'galaxy.min.js', 'galaxy.min.css', 'docs/**', 'index.html'] },
  js.configs.recommended,

  // The runtime — UMD (assigns the global Galaxy, also CommonJS-loadable).
  {
    files: ['galaxy.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.node, define: 'readonly' }
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-prototype-builtins': 'off',
      'no-cond-assign': ['error', 'except-parens'],
      'no-constant-condition': ['warn', { checkLoops: false }],
      'no-fallthrough': 'warn'
    }
  },

  // ESM tooling: MCP server, build, tests.
  {
    files: ['mcp/**/*.mjs', 'build.mjs', 'test.mjs', 'test-mcp.mjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
    rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] }
  },

  // CommonJS manifest builder.
  {
    files: ['mcp/**/*.cjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node } },
    rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] }
  }
];
