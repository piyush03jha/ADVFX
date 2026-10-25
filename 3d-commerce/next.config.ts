import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Enable HTTPS-only requests for this host without assuming that every
          // possible subdomain is HTTPS-ready.
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.voxel3d.org https://challenges.cloudflare.com https://checkout.razorpay.com",
              "frame-src https://checkout.razorpay.com https://challenges.cloudflare.com",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
  images: {
    // Product/category images can be local files or private product assets
    // exposed through the same-origin /api/assets proxy.
    localPatterns: [
      { pathname: "/storage/**" },
      { pathname: "/catogeries/**" },
      { pathname: "/placeholder-product.webp" },
      { pathname: "/api/assets/**" },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.voxel3d.org",
        pathname: "/products/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1536],
    imageSizes: [96, 160, 256, 384],
  },
};

export default nextConfig;

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
