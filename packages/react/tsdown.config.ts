import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: './src/index.ts',
  format: 'esm',
  bundle: false,
  dts: true,
  clean: true,
  minify: true,
  outDir: './dist',
  tsconfig: './tsconfig.json',
});
