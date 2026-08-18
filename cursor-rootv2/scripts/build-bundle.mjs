#!/usr/bin/env node
// scripts/build-bundle.mjs — esbuild wrapper for rootagentv2 CJS executable bundle
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'

mkdirSync('dist', { recursive: true })

await build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/rootagentv2-bundle.cjs',
  external: ['fsevents'],
  // Polyfill import.meta.url for CJS output so compiled/packaged binaries can
  // resolve __dirname-equivalent paths (used in compile/index.ts).
  banner: {
    js: "const __importMetaUrl = require('node:url').pathToFileURL(__filename).href;",
  },
  define: {
    'import.meta.url': '__importMetaUrl',
  },
  logLevel: 'info',
})
