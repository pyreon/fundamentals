import { createVitestConfig } from '@vitus-labs/tools-vitest'
import { defineConfig, mergeConfig } from 'vitest/config'

export default mergeConfig(
  createVitestConfig({
    environment: 'happy-dom',
  }),
  defineConfig({
    oxc: {
      jsx: {
        runtime: 'automatic',
        importSource: '@pyreon/core',
      },
    },
    resolve: {
      conditions: ['bun'],
    },
    test: {
      coverage: {
        exclude: [
          'src/types.ts',
          'src/components/',
          'src/layout.ts',
          'src/styles.ts',
        ],
        thresholds: {
          statements: 85,
          branches: 77,
          functions: 86,
          lines: 88,
        },
      },
    },
  }),
)
