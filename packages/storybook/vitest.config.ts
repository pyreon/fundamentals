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
        // preset.ts is server-only Node.js code (require.resolve, __dirname)
        // that can't run in happy-dom. types.ts is pure TS interfaces (no runtime).
        exclude: ['**/preset.ts', '**/types.ts'],
      },
    },
  }),
)
