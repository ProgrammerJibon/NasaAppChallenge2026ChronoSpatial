import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/api/files/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4000",
        pathname: "/api/files/**",
      },
      {
        protocol: "https",
        hostname: "irsa.ipac.caltech.edu",
      },
    ],
  },
};

export default nextConfig;
