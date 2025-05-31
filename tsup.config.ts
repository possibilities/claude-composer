import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    cli: 'src/index.ts',
    'test-patterns': 'test/test-patterns.ts',
  },
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  dts: false,
  bundle: true,
  external: ['tsx', '@xterm/xterm', '@xterm/addon-serialize'],
  noExternal: [],
  outExtension() {
    return {
      js: '.js',
    }
  },
  esbuildOptions(options) {
    options.banner = {
      js: '#!/usr/bin/env node',
    }
  },
})
