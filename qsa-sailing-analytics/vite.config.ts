import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/core': resolve(__dirname, 'src/core'),
      '@/store': resolve(__dirname, 'src/store'),
      '@/assets': resolve(__dirname, 'assets'),
    },
  },

  // Electron requires a relative base path
  base: './',

  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      // Ensure proper code splitting for better performance
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['echarts', 'echarts-for-react'],
          maps: ['maplibre-gl'],
          state: ['zustand'],
        },
      },
    },
    // Enable source maps for easier debugging
    sourcemap: true,
  },

  server: {
    port: 5173,
    strictPort: true,
  },

  // Worker configuration for Web Workers
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        entryFileNames: '[name].worker.js',
      },
    },
  },

  // Optimize dependencies for faster dev startup
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      'echarts',
      'echarts-for-react',
      'maplibre-gl',
      'date-fns',
      'clsx',
    ],
    exclude: ['better-sqlite3'], // Exclude Node.js modules
  },

  // Prevent Vite from clearing the screen
  clearScreen: false,

  // Environment variables accessible in the app
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});