import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const target = backendUrl.endsWith('/api') ? backendUrl.substring(0, backendUrl.length - 4) : backendUrl;
    return [
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
