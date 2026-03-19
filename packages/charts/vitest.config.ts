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
    oxc: {
      jsx: {
        runtime: 'automatic',
        importSource: '@pyreon/core',
      },
    },
    test: {
      coverage: {
        exclude: [
          'src/types.ts',
          'src/use-chart.ts',
          'src/chart-component.ts',
          'src/manual.ts',
        ],
      },
    },
  }),
)
