import { registerRootComponent } from 'expo';

// ─────────────────────────────────────────────────────────────────────
// iOS perf 2026-05-15: silence expo-gl's "EXGL: gl.pixelStorei()
// doesn't support this parameter yet!" log spam.
//
// THREE.js calls pixelStorei with UNPACK_PREMULTIPLY_ALPHA_WEBGL and
// UNPACK_COLORSPACE_CONVERSION_WEBGL on every texture upload. expo-gl
// supports only UNPACK_FLIP_Y_WEBGL and UNPACK_ALIGNMENT (see
// node_modules/expo-gl/common/EXWebGLMethods.cpp:271 — the `default`
// case calls jsConsoleLog from C++ via JSI). With shadow maps regen-
// erating every render and 12+ part textures per character, this fires
// continuously on iPhone. In dev mode each warning serializes through
// the dev bridge to Metro — synchronous JS-thread cost per call.
//
// Short-circuiting here drops the message before it ever reaches the
// bridge. The C++ still calls jsConsoleLog (we can't stop that without
// patching the package), but the JS hop short-returns instantly. Saves
// the bridge serialization, which is the bulk of the per-call cost.
//
// Filter both console.log and console.warn — the message has historically
// landed on both channels depending on the RN version.
// ─────────────────────────────────────────────────────────────────────
const _exglIsExglMessage = (args: unknown[]): boolean =>
  typeof args[0] === 'string' && (args[0] as string).startsWith('EXGL:');

const _origLog = console.log;
console.log = (...args: unknown[]) => {
  if (_exglIsExglMessage(args)) return;
  return _origLog.apply(console, args as []);
};

const _origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (_exglIsExglMessage(args)) return;
  return _origWarn.apply(console, args as []);
};

// eslint-disable-next-line import/first
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
