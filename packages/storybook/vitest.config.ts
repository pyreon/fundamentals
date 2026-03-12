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
        // preset.ts is server-only Node.js code (require.resolve, __dirname)
        // that can't run in happy-dom. types.ts is pure TS interfaces (no runtime).
        exclude: ['**/preset.ts', '**/types.ts'],
      },
    },
  }),
)
