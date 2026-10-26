import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env['CI']);

// Runs against the full stack (docker compose up).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // One worker: specs share the same database.
  workers: 1,
  // `next dev` compiles a route again after it sits idle; login + compile can pass 30 s (T178).
  timeout: 60_000,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:3000',
    // Kept on any failure: the rare hangs (T178) need the trace to be diagnosed.
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
