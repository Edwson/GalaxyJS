# Security Policy

## Reporting
Email **ed@edwson.com** with details and a reproduction. Please do not open a public issue for a
vulnerability. Acknowledgement within 3 business days.

## Notes
- The library runs in the browser and makes no network calls.
- The MCP server is **read-only**: it serves descriptions and generates code snippets; it does not execute
  code or touch the filesystem beyond reading the bundled manifest. It speaks MCP over stdio and opens no ports.
