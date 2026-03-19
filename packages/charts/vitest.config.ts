import { defineConfig, mergeConfig } from 'vitest/config'
import { createVitestConfig } from '@vitus-labs/tools-vitest'

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
