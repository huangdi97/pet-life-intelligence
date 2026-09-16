import type { NextConfig } from "next";

/** PLI admin. Standalone output + optional path prefix (NEXT_BASE_PATH). */
const nextConfig: NextConfig = {
  output: "standalone",
  basePath: process.env.NEXT_BASE_PATH || "",
  transpilePackages: ["@pli/api-client"],
};
export default nextConfig;