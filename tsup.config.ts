import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { 'staking':'./src/main.ts' },
  platform: 'browser',
  format: ['iife'],
  globalName: 'UniqueStaking',
  splitting: false,
  bundle: true,
  metafile: true,
  sourcemap: true,
  minify: true,
  clean: true,
})
