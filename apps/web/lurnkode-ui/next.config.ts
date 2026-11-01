import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/auth/login",
        permanent: false,
      },
      {
        source: "/courses",
        destination: "/course/catalog",
        permanent: false,
      },
      {
        source: "/courses/:slug*",
        destination: "/course/:slug*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
