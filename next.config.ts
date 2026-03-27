import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  turbopack: {
    root: ".",
  },

  serverExternalPackages: ["better-sqlite3"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.openfoodfacts.org",
      },
      {
        protocol: "https",
        hostname: "world.openfoodfacts.org",
      },
    ],
  },
};

export default nextConfig;
