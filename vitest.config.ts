import { defineConfig } from 'vitest/config';
import reactNative from 'vitest-react-native';

export default defineConfig({
  plugins: [reactNative()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
