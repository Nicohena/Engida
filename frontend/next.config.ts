import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow network access for local testing on mobile devices
  allowedDevOrigins: ['10.45.87.211'],
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
