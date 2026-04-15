/**
 * Jest mock for @react-three/fiber/native.
 * Renders Canvas as a fragment (children still mount so we can assert they exist),
 * and no-ops useFrame.
 */
const React = require('react');

module.exports = {
  Canvas: ({ children }) => React.createElement(React.Fragment, null, children),
  useFrame: () => {},
  useThree: () => ({}),
  extend: () => {},
};
