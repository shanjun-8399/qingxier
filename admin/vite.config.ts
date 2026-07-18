import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@qingxier/contracts': fileURLToPath(new URL('../packages/contracts/src/index.ts', import.meta.url))
    }
  },
  server: { port: 5173, proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } } },
  build: { outDir: 'dist', sourcemap: true },
  test: {
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    environment: 'jsdom', globals: true, include: ['test/**/*.spec.ts'], setupFiles: ['test/setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'json-summary'], reportsDirectory: '../reports/admin-coverage', include: ['src/services/**/*.ts','src/stores/**/*.ts','src/view-models/**/*.ts'], thresholds: { lines: 85, statements: 85, functions: 80, branches: 75 } }
  }
});
