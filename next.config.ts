import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allow production builds even with type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds even with ESLint errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
