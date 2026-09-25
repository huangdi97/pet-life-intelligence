const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// pnpm workspace: expose the monorepo node_modules to Metro.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = false;
// Monorepo react-pinning (Stage R.1-E fix): expo-keep-awake (resolved through
// the workspace pnpm store) imports hooks like useId from 'react'. The store
// also hoists react@19 (required by apps/web), so a mixed bundle can contain
// TWO React copies — the app then crashes at startup ("Invalid hook call" /
// "Objects are not valid as a React child"). The mobile app must ALWAYS use
// its own react@18.2.0 (the version paired with react-native 0.74.5), so we
// pin every react* import to apps/mobile/node_modules/react.
const appReact = path.resolve(projectRoot, "node_modules/react");
const resolveReact = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    const sub = moduleName === "react" ? "" : moduleName.slice("react".length);
    return context.resolveRequest(context, appReact + sub, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};
config.resolver.resolveRequest = resolveReact;

module.exports = config;