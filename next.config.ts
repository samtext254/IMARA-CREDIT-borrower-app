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
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
};

let exported: NextConfig = nextConfig;

if (!isDev) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withPWAInit = require('@ducanh2912/next-pwa').default;
  const withPWA = withPWAInit({
    dest: 'public',
    register: true,
    // Fall back to home if a page isn't cached
    fallbacks: {
      document: '/home',
    },
    workboxOptions: {
      disableDevLogs: true,
      skipWaiting: true,
      clientsClaim: true,
      // Precache the landing page AND home
      additionalManifestEntries: [
        { url: '/', revision: null },
        { url: '/home', revision: null },
        { url: '/login', revision: null },
      ],
      // Time out network after 4s and fall back to cache
      runtimeCaching: [
        {
          urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages',
            networkTimeoutSeconds: 4,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 7 * 24 * 60 * 60,
            },
          },
        },
      ],
    },
  });
  exported = withPWA(nextConfig);
}

export default exported;