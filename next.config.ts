import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  serverExternalPackages: ["tesseract.js"],
} satisfies NextConfig;

export default nextConfig;
