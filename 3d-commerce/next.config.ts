import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  poweredByHeader: false,
  images: {
    // Product/category images can be local files or private product assets
    // exposed through the same-origin /api/assets proxy.
    localPatterns: [
      { pathname: "/storage/**" },
      { pathname: "/catogeries/**" },
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
