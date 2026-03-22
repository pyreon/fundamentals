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
          'src/languages.ts',
          'src/themes.ts',
          'src/minimap.ts',
          'src/editor.ts',
        ],
        thresholds: {
          statements: 85,
          branches: 65,
          functions: 90,
          lines: 85,
        },
      },
    },
  }),
)
