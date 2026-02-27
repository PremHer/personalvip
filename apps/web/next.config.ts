import type { NextConfig } from "next";

const apiUrl = process.env.API_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://gymcoreapi-production.up.railway.app'
    : 'http://localhost:3001');

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
