const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Register 3D model formats so Metro bundles them as assets
config.resolver.assetExts.push('glb', 'gltf', 'bin');

// ── amg-engine monorepo integration ──────────────────────────────────
const amgEngineRoot = path.resolve(__dirname, '..', 'amg-engine');

config.watchFolders = [
  ...(config.watchFolders || []),
  amgEngineRoot,
];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@amg/character-runtime': path.join(amgEngineRoot, 'packages', 'character-runtime'),
  '@amg/character-creator': path.join(amgEngineRoot, 'packages', 'character-creator'),
  '@amg/types': path.join(amgEngineRoot, 'packages', 'types'),
  '@amg/account': path.join(amgEngineRoot, 'packages', 'account'),
  '@amg/wallet': path.join(amgEngineRoot, 'packages', 'wallet'),
  '@amg/inventory': path.join(amgEngineRoot, 'packages', 'inventory'),
  '@amg/game-state': path.join(amgEngineRoot, 'packages', 'game-state'),
  '@amg/iap': path.join(amgEngineRoot, 'packages', 'iap'),
};

config.resolver.nodeModulesPaths = [
  path.join(__dirname, 'node_modules'),
  path.join(amgEngineRoot, 'node_modules'),
];

// ── Metro 0.83 + @types/* resolver fix ──────────────────────────────
// Metro 0.83's resolver resolves package names through @types/* as
// part of its TypeScript integration. @types/* packages (react, three,
// etc.) ship with main:"" (empty string) which triggers an
// InvalidPackageError. Fix: block @types/* from the resolution chain
// entirely — they're TypeScript declarations, not runtime code.
// Also disable unstable_enablePackageExports to avoid conditional
// export condition-matching failures (Expo 54 ships with empty
// conditionNames which can't match "default", "import", "require").
config.resolver.unstable_enablePackageExports = false;

// Block @types packages from Metro's module resolution. They're only
// needed by tsc, never by the runtime bundler.
const origBlockList = config.resolver.blockList;
const typesBlockPattern = /node_modules[\\/]@types[\\/].*/;
if (origBlockList instanceof RegExp) {
  config.resolver.blockList = [origBlockList, typesBlockPattern];
} else if (Array.isArray(origBlockList)) {
  config.resolver.blockList = [...origBlockList, typesBlockPattern];
} else {
  config.resolver.blockList = [typesBlockPattern];
}

module.exports = config;
