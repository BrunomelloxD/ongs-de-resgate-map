import path from 'node:path';
import type { NextConfig } from 'next';
import { serverActionsBodySizeLimit } from './src/lib/upload-limit';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  output: 'standalone',
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
