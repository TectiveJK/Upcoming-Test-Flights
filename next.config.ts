import type { NextConfig } from "next";

const hosted = process.env.HOSTED_EXPORT === "1";

const nextConfig: NextConfig = {
  /* config options here */
  ...(hosted
    ? {
        output: "export" as const,
        distDir: ".next-hosted",
        assetPrefix: "https://tectivejk.github.io/Upcoming-Test-Flights",
      }
    : {}),
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: !hosted,
  partialPrefetching: !hosted,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
