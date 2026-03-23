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
        exclude: ['src/types.ts', 'src/render.ts', 'src/download.ts', 'src/renderers/pdf.ts', 'src/renderers/docx.ts', 'src/renderers/xlsx.ts'],
      },
    },
  }),
)
