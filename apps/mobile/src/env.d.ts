/** Ambient declaration for the global `process` object that React Native
 *  polyfills at runtime. @types/node is intentionally not installed in this
 *  app; only env reads are used (PLIDEBUG_COMPANION feature flag, same
 *  pattern as apps/mini/src/pages/companion). */
declare const process: { env: Record<string, string | undefined> };
