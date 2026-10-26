import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photos and the logo are sent as data URLs in the form (up to ~0.9 MB each; the club form can carry a logo
  // and the coach photo together), over the 1 MB default.
  experimental: {
    serverActions: { bodySizeLimit: "3mb" },
  },
  // The graphics read their fonts from disk at runtime; make sure serverless deploys ship them.
  outputFileTracingIncludes: {
    "/c/[club]/matches/[id]/graphics/*": ["./assets/fonts/*.ttf"],
  },
  // Records and Analysis moved under Stats; keep old links working.
  async redirects() {
    return [
      { source: "/c/:club/analysis", destination: "/c/:club/stats", permanent: true },
      { source: "/c/:club/records", destination: "/c/:club/stats/records", permanent: true },
    ];
  },
};

export default nextConfig;
