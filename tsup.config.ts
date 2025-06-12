import { defineConfig } from 'tsup'
import { copyFileSync, mkdirSync, readdirSync, statSync, chmodSync } from 'fs'
import { join } from 'path'

function copyDir(src: string, dest: string) {
  mkdirSync(dest, { recursive: true })
  const entries = readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

export default defineConfig({
  entry: { cli: 'src/index.ts' },
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  dts: false,
  bundle: true,
  external: ['@xterm/xterm', '@xterm/addon-serialize'],
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
  onSuccess: async () => {
    copyDir('src/internal-toolsets', 'dist/internal-toolsets')
  },
})
