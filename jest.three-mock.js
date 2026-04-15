/**
 * Minimal stub for `three` in tests. Character3D references a handful of
 * classes for refs + constants. Unit tests don't need the actual renderer.
 */
class Mock {
  constructor() {}
  clone() { return new Mock(); }
  copy() { return this; }
  set() { return this; }
  setScalar() { return this; }
  add() { return this; }
  getSize() { return new Mock(); }
  getCenter() { return new Mock(); }
  union() { return this; }
  computeBoundingBox() {}
  uncacheRoot() {}
  stopAllAction() {}
  update() {}
  clipAction() { return new Mock(); }
  setLoop() { return this; }
  play() { return this; }
}

const AnimationMixer = Mock;
const Box3 = Mock;
const Vector3 = Mock;
const Group = Mock;
const Mesh = Mock;

class GLTFLoader extends Mock {
  load(_uri, onLoad) {
    setTimeout(() => onLoad && onLoad({ scene: new Mock(), animations: [] }), 0);
  }
}

module.exports = {
  AnimationMixer,
  Box3,
  Vector3,
  Group,
  Mesh,
  GLTFLoader,
  LoopOnce: 2200,
  LoopRepeat: 2201,
};
