import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow network access for local testing on mobile devices
  allowedDevOrigins: ['localhost', '127.0.0.1', '10.45.87.211', '10.29.239.211', '10.75.144.211'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
