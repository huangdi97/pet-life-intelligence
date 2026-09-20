import type { NextConfig } from "next";

/** PLI admin. Standalone output + optional path prefix (NEXT_BASE_PATH).
 *  PLIT_LOCAL_BUILD=1 (Stage H): local Windows validation builds skip the
 *  standalone assembly (pnpm12 + Windows symlink EPERM on optional platform
 *  binaries); deployment builds (env unset) keep standalone unchanged. */
const nextConfig: NextConfig = {
  output: process.env.PLIT_LOCAL_BUILD ? undefined : "standalone",
  basePath: process.env.NEXT_BASE_PATH || "",
  transpilePackages: ["@pli/api-client", "@pli/ui-tokens"],
};
export default nextConfig;
