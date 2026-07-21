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
    exclude: ['node_modules', 'test/e2e', 'test/integration', 'dist', '.idea', '.git', '.cache'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*'],
      // Ratchet 策略：阈值锚定在实测值向下取整减 0.5（基线 74.84/68.44/63.03/75.59，
      // 留 0.5 防抖动），只许升不许降——提升覆盖率后把阈值同步上调；
      // 薄页面（secrets/agents/agent-token-workspace、domains/*）后续专项提升。
      thresholds: {
        statements: 73.5,
        branches: 67.5,
        functions: 62.5,
        lines: 74.5,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
