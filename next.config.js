/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Force static export - no serverless functions
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Required for static export
  },
}

module.exports = nextConfig
