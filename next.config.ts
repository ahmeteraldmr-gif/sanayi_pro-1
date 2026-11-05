import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const basePath = process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : (process.env.NODE_ENV === "production" ? "/sanayipro" : "");

const nextConfig: NextConfig = {
  basePath,
  trailingSlash: true,
  poweredByHeader: false,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_ENABLE_LOCAL_AUTH: "1",
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
