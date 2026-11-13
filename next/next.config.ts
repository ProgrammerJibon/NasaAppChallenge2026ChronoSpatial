import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    const apiOrigin = (process.env.API_UPSTREAM_ORIGIN || "http://127.0.0.1:4000").replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
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
      {
        protocol: "https",
        hostname: "assets.spaceappschallenge.org",
      },
    ],
  },
};

export default nextConfig;
