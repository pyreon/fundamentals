import { createVitestConfig } from '@vitus-labs/tools-vitest'
import { defineConfig, mergeConfig } from 'vitest/config'

export default mergeConfig(
  createVitestConfig({
    environment: 'happy-dom',
  }),
  defineConfig({
    resolve: {
      conditions: ['bun'],
    },
    test: {
      coverage: {
        exclude: ['src/types.ts', 'src/indexed-db.ts'],
        thresholds: {
          // SSR guard branches (isBrowser checks, storage null checks, catch blocks)
          // cannot be triggered in happy-dom environment
          branches: 85,
        },
      },
    },
  }),
)
