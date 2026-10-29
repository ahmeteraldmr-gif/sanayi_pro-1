import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  experimental: {
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
