import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  assetsInclude: ['**/*.riv'],
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'web-app/src'),
      '~extension': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'assets',
    emptyOutDir: true,
    lib: {
      entry: 'src/index.tsx',
      name: 'MoodclipUploader',
      formats: ['umd'],
      fileName: () => 'app-block.v4.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'app-block.v4.css';
          }
          return assetInfo.name ?? 'asset-[hash][extname]';
        },
      },
    },
  },
});
