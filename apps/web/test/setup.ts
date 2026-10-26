import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { server, TEST_API_URL } from './msw/server';

process.env['API_URL'] = TEST_API_URL;
process.env['INTERNAL_API_TOKEN'] = 'test-internal-token-000000000000000000';
process.env['PUBLIC_WEB_URL'] = 'http://web.test';
process.env['TILE_URL'] = 'http://tiles.test/{z}/{x}/{y}.png';
process.env['TILE_ATTRIBUTION'] = '© OpenStreetMap contributors';
process.env['MAX_UPLOAD_MB'] = '5';

// findBy*/waitFor wait 1 s by default; a busy gate needs more (T178).
configure({ asyncUtilTimeout: 5_000 });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
