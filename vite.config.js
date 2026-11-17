import { defineConfig } from 'vite';


// base './' so the build works on GitHub Pages under /<repo>/
export default defineConfig({
  root: 'web',
  base: './',
  
  build: { outDir: '../dist', emptyOutDir: true },
  server: { fs: { allow: ['..'] } },
});
