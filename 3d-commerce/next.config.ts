import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    // Product/category images can be local files or private product assets
    // exposed through the same-origin /api/assets proxy.
    localPatterns: [
      { pathname: "/storage/**" },
      { pathname: "/catogeries/**" },
      { pathname: "/api/assets/**" },
      { pathname: "/custom-3d-creation-studio.webp" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1536],
    imageSizes: [96, 160, 256, 384],
  },
};

export default nextConfig;

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
