import type { NextConfig } from "next";

/** PLI web (Owner). `output: standalone` for lean production Docker image.
 *  `basePath` is optional — set via NEXT_BASE_PATH when deployed behind a
 *  reverse-proxy path prefix (e.g. "/pli"). Empty → root.
 *  PLIT_LOCAL_BUILD=1 (Stage H): local Windows validation builds skip the
 *  standalone assembly (pnpm12 + Windows symlink EPERM on optional platform
 *  binaries); deployment builds (env unset) keep standalone unchanged. */
const nextConfig: NextConfig = {
  output: process.env.PLIT_LOCAL_BUILD ? undefined : "standalone",
  basePath: process.env.NEXT_BASE_PATH || "",
  transpilePackages: ["@pli/api-client", "@pli/ui-kit"],
};

export default nextConfig;
