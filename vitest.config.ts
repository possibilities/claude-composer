import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 5000,
    env: {
      NODE_ENV: 'test',
    },
  },
})
