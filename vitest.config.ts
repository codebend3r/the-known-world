import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['lib/**/*.test.ts', 'components/**/*.test.tsx'],
    env: {
      // Mirror next.config.ts `trailingSlash: true` so next/link preserves
      // trailing slashes during vitest runs.
      __NEXT_TRAILING_SLASH: '1',
    },
  },
});
