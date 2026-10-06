import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

// Only wrap with PWA in production builds.
// In dev, next-pwa's Webpack hook conflicts with Next 15's Turbopack.
let exported: NextConfig = nextConfig;

if (!isDev) {
  // Dynamic import so dev never even loads next-pwa
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withPWAInit = require('@ducanh2912/next-pwa').default;
  const withPWA = withPWAInit({
    dest: 'public',
    register: true,
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    workboxOptions: {
      disableDevLogs: true,
      skipWaiting: true,
      clientsClaim: true,
    },
  });
  exported = withPWA(nextConfig);
}

export default exported;