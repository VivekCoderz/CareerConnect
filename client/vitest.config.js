import { defineConfig } from 'vitest/config'

// Unit tests for React components (Vitest + React Testing Library). Kept apart from
// vite.config.js so tests don't load the Tailwind plugin or the dev-server proxy.
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
})
