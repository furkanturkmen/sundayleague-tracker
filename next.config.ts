import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Records and Analysis moved under Stats; keep old links working.
  async redirects() {
    return [
      { source: "/c/:club/analysis", destination: "/c/:club/stats", permanent: true },
      { source: "/c/:club/records", destination: "/c/:club/stats/records", permanent: true },
    ];
  },
};

export default nextConfig;
