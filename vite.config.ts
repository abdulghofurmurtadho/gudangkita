import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }
          if (
            id.includes('/node_modules/d3-') ||
            id.includes('/node_modules/victory-vendor/')
          ) {
            return 'd3-vendor';
          }
          if (id.includes('/node_modules/lodash')) {
            return 'lodash-vendor';
          }
          if (id.includes('/node_modules/recharts')) {
            return 'recharts-vendor';
          }
          if (id.includes('/node_modules/lucide-react')) {
            return 'icons-vendor';
          }
          return undefined;
        },
      },
    },
  },
});
