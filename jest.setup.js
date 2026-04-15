/**
 * Jest global setup for Drop4.
 *
 * Mocks out native-ish modules that don't run in a jsdom environment:
 *   - expo-asset (returns stubs so GLBs don't try to download)
 *   - @react-three/fiber/native (just renders children as a fragment)
 *   - expo-gl (unused in tests)
 */

// Reanimated 4 + worklets don't play nice with plain jsdom. Stub to a no-op.
jest.mock('react-native-reanimated', () => ({
  useSharedValue: (v) => ({ value: v }),
  useAnimatedStyle: () => ({}),
  withSpring: (v) => v,
  withTiming: (v) => v,
  withSequence: (...args) => args[args.length - 1],
  withDelay: (_, v) => v,
  withRepeat: (v) => v,
  FadeIn: { duration: () => ({}) },
  FadeInDown: { delay: () => ({ springify: () => ({}) }) },
  FadeInUp: { delay: () => ({ springify: () => ({}) }) },
  SlideInDown: { springify: () => ({ damping: () => ({}) }) },
  default: {
    View: require('react-native').View,
    Text: require('react-native').Text,
    Image: require('react-native').Image,
    ScrollView: require('react-native').ScrollView,
    createAnimatedComponent: (C) => C,
  },
}));

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloadAsync: jest.fn().mockResolvedValue(null),
      localUri: 'mock://asset.glb',
      uri: 'mock://asset.glb',
    })),
  },
}));

jest.mock('@react-three/fiber/native', () => ({
  Canvas: ({ children }) => children,
  useFrame: jest.fn(),
}));

jest.mock('expo-gl', () => ({}));
jest.mock('expo-three', () => ({}));

// Silence AsyncStorage warnings
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
