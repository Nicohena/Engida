import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow network access for local testing on mobile devices
  allowedDevOrigins: ['localhost', '127.0.0.1', '10.45.87.211', '10.29.239.211', '10.75.144.211'],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pictures-ethiopia.jijistatic.com',
      },
      {
        protocol: 'https',
        hostname: '**.jijistatic.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
