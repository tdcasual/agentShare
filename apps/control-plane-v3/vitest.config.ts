import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'threads',
    setupFiles: ['./test/setup.ts'],
    exclude: [
      'node_modules',
      'test/e2e',
      'test/integration',
      'test/performance',
      'dist',
      '.idea',
      '.git',
      '.cache',
    ],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/lib/generated-api.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.test.{ts,tsx}',
      ],
      // Ratchet strategy: instrument all source files, including modules that
      // no test imports yet. Thresholds sit 0.5 points below the measured
      // full-source baseline (61.77/59.44/51.03/62.23) and only move upward.
      thresholds: {
        statements: 61.27,
        branches: 58.94,
        functions: 50.53,
        lines: 61.73,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
