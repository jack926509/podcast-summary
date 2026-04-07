/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
