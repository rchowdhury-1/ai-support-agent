/** @type {import('next').NextConfig} */

// All dashboard/auth/billing traffic proxies to the backend so the refresh
// cookie is first-party (SameSite=Lax works). Widget /chat traffic goes to
// the backend directly from client sites and is origin-bound there.
const BACKEND_URL = process.env.BACKEND_URL || 'https://ai-support-agent-backend-xsoi.onrender.com';

const nextConfig = {
  async rewrites() {
    return [
      { source: '/auth/:path*', destination: `${BACKEND_URL}/auth/:path*` },
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
      { source: '/billing/:path*', destination: `${BACKEND_URL}/billing/:path*` },
    ];
  },
};

export default nextConfig;
