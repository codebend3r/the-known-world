import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['lib/**/*.test.ts', 'components/**/*.test.tsx'],
    css: {
      // Vitest-specific CSS option (separate from Vite's top-level `css`).
      // `non-scoped` makes `styles.foo` resolve to the literal `'foo'`, so
      // class-string assertions stay readable without coupling them to
      // Vite's production hash format.
      modules: { classNameStrategy: 'non-scoped' },
    },
    env: {
      // Mirror `trailingSlash: true` from next.config.ts so next/link keeps
      // trailing slashes in jsdom tests. __NEXT_TRAILING_SLASH is an
      // internal Next.js variable; see node_modules/next/dist/esm/build/define-env.js
      // — it may be renamed in a future Next release.
      __NEXT_TRAILING_SLASH: '1',
    },
  },
});
