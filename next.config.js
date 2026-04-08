/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  output: 'standalone',
  webpack(config) {
    // Explicitly resolve the @ alias to the project root.
    // This is required because Next.js 14 + Docker/Nixpacks builds can sometimes
    // fail to pick up tsconfig paths for certain files.
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: [
      'fluent-ffmpeg',
      '@ffmpeg-installer/ffmpeg',
    ],
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*', // single-level wildcard; allows podcast CDN images
      },
    ],
  },
};

module.exports = nextConfig;
