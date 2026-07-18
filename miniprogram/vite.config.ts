import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
export default defineConfig({
  plugins: [uni()],
  test: {
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.spec.ts'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: '../reports/miniprogram-coverage',
      include: ['src/services/**/*.ts', 'src/stores/**/*.ts', 'src/view-models/**/*.ts'],
      thresholds: { lines: 85, statements: 85, functions: 80, branches: 75 }
    }
  },
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } }
});
