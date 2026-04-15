/**
 * Smoke test for Character3D.
 *
 * The real Canvas + THREE renderer are mocked out at the module level (see
 * jest.three-mock.js and jest.r3f-mock.js). This suite proves:
 *   1. The component mounts without throwing
 *   2. Accepts customization props without throwing
 *   3. Accepts animationGlb in creator mode without throwing
 *
 * It does NOT verify pixel output. That's an E2E concern (Detox / device).
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { Character3D } from '../Character3D';

describe('Character3D', () => {
  it('mounts with minimum props', () => {
    expect(() => {
      TestRenderer.create(
        <Character3D width={100} height={100} bodyGlb={0 as any} />
      );
    }).not.toThrow();
  });

  it('mounts with full customization', () => {
    expect(() => {
      TestRenderer.create(
        <Character3D
          width={200}
          height={300}
          bodyGlb={0 as any}
          skinColor="#ffffff"
          hairColor="#000000"
          outfitColors={{ '10TORS': '#ff0000' }}
          bodyType={50}
          bodySize={50}
          muscle={50}
        />
      );
    }).not.toThrow();
  });

  it('mounts with animationGlb in creator mode', () => {
    expect(() => {
      TestRenderer.create(
        <Character3D
          width={200}
          height={300}
          bodyGlb={0 as any}
          mode="creator"
          animationGlb={1 as any}
          animationLoop={false}
        />
      );
    }).not.toThrow();
  });
});
