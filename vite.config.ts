import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    https: true,
    host: true,
    port: 3000,
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
