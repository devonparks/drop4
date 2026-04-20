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

// Metro walks up from the importing file looking for node_modules.
// amg-engine/node_modules intentionally does NOT contain react/three/
// @react-three/fiber/react-native — those must come from Drop4's copy
// so we get exactly one React dispatcher (duplicates trigger the
// "Cannot read properties of null (reading 'useState')" crash).
// Drop4's node_modules comes first in this fallback list.
config.resolver.nodeModulesPaths = [
  path.join(__dirname, 'node_modules'),
  path.join(amgEngineRoot, 'node_modules'),
];

module.exports = config;
