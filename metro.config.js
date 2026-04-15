const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Register 3D model formats so Metro bundles them as assets
config.resolver.assetExts.push('glb', 'gltf', 'bin');

module.exports = config;
