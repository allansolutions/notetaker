/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import istanbul from 'vite-plugin-istanbul';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    ...(process.env.VITE_COVERAGE
      ? [
          istanbul({
            include: 'src/**/*',
            exclude: ['node_modules', 'src/test/**', '**/*.test.*'],
            cypress: false,
            requireEnv: true,
            nycrcPath: path.resolve(__dirname, '.nycrc.json'),
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'text-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**'],
      thresholds: {
        // Global floor — catches major erosion across the whole codebase.
        // Low because UI components/modules are intentionally covered by E2E, not unit tests.
        lines: 15,
        branches: 13,
        functions: 10,
        statements: 15,
        // Critical: pure utilities — high coverage expected
        'src/utils/**': {
          lines: 70,
          branches: 65,
          functions: 75,
          statements: 70,
        },
        // Important: custom hooks — data-integrity hooks are well-tested
        'src/hooks/**': {
          lines: 50,
          branches: 45,
          functions: 40,
          statements: 50,
        },
        // Important: API client — data integrity layer
        'src/api/**': {
          lines: 30,
          branches: 30,
          functions: 20,
          statements: 30,
        },
      },
    },
  },
});
