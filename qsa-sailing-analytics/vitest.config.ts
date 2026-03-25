import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

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

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'electron', 'tests/e2e'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'electron/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/index.{js,ts}', // Usually just re-exports
        'src/core/models/', // Interface definitions
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Mock configuration
    deps: {
      // External dependencies to mock in tests
      external: ['electron'],
    },

    // Test timeout
    testTimeout: 10000,

    // Performance monitoring
    logHeapUsage: true,
    reporter: ['default', 'html'],
  },
});