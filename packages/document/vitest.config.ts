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
        thresholds: {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        exclude: [
          'src/types.ts',
          'src/env.d.ts',
          'src/render.ts',
          'src/download.ts',
          'src/renderers/pdf.ts',
          'src/renderers/docx.ts',
          'src/renderers/xlsx.ts',
          'src/renderers/pptx.ts',
          'src/renderers/discord.ts',
          'src/renderers/google-chat.ts',
          'src/renderers/confluence.ts',
          'src/renderers/notion.ts',
          'src/renderers/teams.ts',
          'src/renderers/whatsapp.ts',
          'src/renderers/svg.ts',
        ],
      },
    },
  }),
)
