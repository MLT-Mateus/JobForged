import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.JBFD_RUNTIME === "node" ? "standalone" : undefined,
  async headers() {
    return [{source:"/careers/masks/:asset",headers:[{key:"Cache-Control",value:"public, max-age=86400, stale-while-revalidate=604800"}]}];
  },
};

export default nextConfig;
