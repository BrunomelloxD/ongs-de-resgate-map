import path from 'node:path';
import type { NextConfig } from 'next';
import { serverActionsBodySizeLimit } from './src/lib/upload-limit';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  output: 'standalone',
  // SEC-02/SEC-08: the dev server logs each request line, query included; the map
  // search must never log its bbox, nor a reset link its token. Production doesn't log requests.
  // It also logs each Server Function with its arguments (e-mails, the reset token): off.
  logging: {
    incomingRequests: { ignore: [/^\/map\/ngos/, /^\/recuperar-senha\/./] },
    serverFunctions: false,
  },
  experimental: {
    // Photos go through a Server Action (AD-001): file limit + 1 MB of multipart.
    serverActions: {
      bodySizeLimit: serverActionsBodySizeLimit(process.env['MAX_UPLOAD_MB']),
    },
  },
  // Trace from the monorepo root so packages/* are included.
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  turbopack: {
    root: path.join(import.meta.dirname, '../../'),
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
