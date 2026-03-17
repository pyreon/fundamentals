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
        exclude: ['src/types.ts', 'src/setup.ts'],
      },
    },
  }),
)
