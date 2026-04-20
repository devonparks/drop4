const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Register 3D model formats so Metro bundles them as assets
config.resolver.assetExts.push('glb', 'gltf', 'bin');

// ── amg-engine monorepo integration ──────────────────────────────────
// amg-engine lives outside Drop4 so its packages (character-runtime,
// character-creator) can be shared with every AMG game. Metro needs
// both sides configured:
//   1. watchFolders: tell Metro to watch the amg-engine tree for
//      hot reload on edits to shared code.
//   2. extraNodeModules: alias `@amg/*` to the local package sources
//      so `import { CompositeCharacter } from '@amg/character-runtime'`
//      resolves to amg-engine/packages/character-runtime/src.
// ─────────────────────────────────────────────────────────────────────
const amgEngineRoot = path.resolve(__dirname, '..', 'amg-engine');

config.watchFolders = [
  ...(config.watchFolders || []),
  amgEngineRoot,
];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@amg/character-runtime': path.join(amgEngineRoot, 'packages', 'character-runtime'),
  '@amg/character-creator': path.join(amgEngineRoot, 'packages', 'character-creator'),
};

// Metro needs to be told it can resolve modules from amg-engine's path
// too, in case the shared packages import anything relative.
config.resolver.nodeModulesPaths = [
  path.join(__dirname, 'node_modules'),
  path.join(amgEngineRoot, 'node_modules'),
];

module.exports = config;
