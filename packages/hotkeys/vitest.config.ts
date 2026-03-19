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
        exclude: [
          'src/types.ts',
          'src/use-hotkey.ts',
          'src/use-hotkey-scope.ts',
        ],
        thresholds: {
          // SSR guards (typeof window/navigator) untestable in happy-dom
          branches: 84,
        },
      },
    },
  }),
)
