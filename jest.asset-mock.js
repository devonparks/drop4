// Jest mock for binary/static assets (GLB, PNG, etc). Without this,
// requires like `require('.../idle_base.glb')` inside the app code
// crash the test runner because Node tries to parse the binary as JS.
// We return a stable numeric id so equality checks in tests still work.
module.exports = 1;
