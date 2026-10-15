import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: './src/index.ts',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  format: 'esm',
  bundle: false,
  dts: true,
  clean: true,
  minify: true,
  outDir: './dist',
  tsconfig: './tsconfig.json',
});
