import { defineConfig } from 'vitest/config';
import { decoratorMetadataCoveragePlugin } from './tools/vitest/decorator-metadata-coverage.plugin.js';
import { coverageConfig } from '@repo/vitest-config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [decoratorMetadataCoveragePlugin()],
  test: {
    globals: true,
    root: './',
    // test:cov runs both projects into a single coverage report.
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['test/**/*.e2e-spec.ts'],
          // One file at a time: they share the database.
          fileParallelism: false,
          env: { LOG_LEVEL: 'silent' },
        },
      },
    ],
    // Closed list: new entries need justification in the PR.
    coverage: coverageConfig({
      include: ['src/**/*.ts'],
      exclude: [
        'src/generated/**',
        'src/app/main.ts', // logic lives in app.setup.ts
        'src/app/openapi.cli.ts', // logic lives in openapi.ts
        'src/app/cleanup.cli.ts', // logic lives in cleanup.ts
        '**/*.spec.ts',
      ],
    }),
  },
});
