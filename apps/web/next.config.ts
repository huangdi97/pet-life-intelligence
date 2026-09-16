import type { NextConfig } from "next";

/** PLI web (Owner). `output: standalone` for lean production Docker image.
 *  `basePath` is optional — set via NEXT_BASE_PATH when deployed behind a
 *  reverse-proxy path prefix (e.g. "/pli"). Empty → root. */
const nextConfig: NextConfig = {
  output: "standalone",
  basePath: process.env.NEXT_BASE_PATH || "",
  transpilePackages: ["@pli/api-client"],
};

export default nextConfig;