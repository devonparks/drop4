/**
 * Ultra-minimal react-native mock — just enough for Character3D and friends
 * to import without pulling in the native RN bridge / jest-expo sandbox.
 *
 * This deliberately trades fidelity for speed: we don't attempt to render
 * layouts or style. Tests should assert component tree shape, not pixel
 * output. Anything needing pixel output should run in detox / Maestro.
 */
const React = require('react');

const passThrough = (name) => ({ children, ...rest }) =>
  React.createElement('rn-' + name, rest, children);

const Stub = (name) => {
  const C = passThrough(name);
  C.displayName = name;
  return C;
};

const View = Stub('View');
const Text = Stub('Text');
const Image = Stub('Image');
const Pressable = Stub('Pressable');
const ScrollView = Stub('ScrollView');
const ActivityIndicator = Stub('ActivityIndicator');
const Modal = Stub('Modal');

const StyleSheet = {
  create: (styles) => styles,
  absoluteFill: {},
  absoluteFillObject: {},
  flatten: (s) => s,
};

const Platform = { OS: 'test', select: (obj) => obj.default ?? obj.ios ?? obj.android };

const Animated = {
  View,
  Text,
  Image,
  Value: class {
    constructor(v) { this.v = v; }
    setValue(v) { this.v = v; }
    interpolate() { return new Animated.Value(0); }
  },
  timing: () => ({ start: (cb) => cb && cb({ finished: true }) }),
  spring: () => ({ start: (cb) => cb && cb({ finished: true }) }),
  sequence: () => ({ start: (cb) => cb && cb({ finished: true }) }),
  parallel: () => ({ start: (cb) => cb && cb({ finished: true }) }),
  loop: () => ({ start: () => {}, stop: () => {} }),
  createAnimatedComponent: (C) => C,
};

module.exports = {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Platform,
  Animated,
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
};
