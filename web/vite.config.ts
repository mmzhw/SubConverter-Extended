import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: { outDir: 'dist', assetsDir: 'assets' },
  test: { environment: 'jsdom' },
});
