import React, { useCallback, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';

// ═══════════════════════════════════════════════════════════
// SPRITE SHEET ANIMATOR
// Renders a sprite sheet with viewport clipping instead of
// swapping individual PNGs. Dramatically reduces Image source
// swaps and improves animation performance.
//
// How it works:
// - A View with overflow:'hidden' acts as the viewport (1 frame)
// - A full-size Image of the entire sheet sits inside
// - translateX/Y shifts the Image so the correct frame is visible
// ═══════════════════════════════════════════════════════════

export interface SpriteSheetAnimatorProps {
  /** The sprite sheet PNG (e.g. require('...sheet_idle.png')) */
  source: ImageSourcePropType;
  /** Width of a single frame in the sheet (px) */
  frameWidth: number;
  /** Height of a single frame in the sheet (px) */
  frameHeight: number;
  /** Number of columns in the sprite sheet grid */
  columns: number;
  /** Total number of frames in this animation */
  totalFrames: number;
  /** Milliseconds between frames (42 for emotes, 100 for idles) */
  frameInterval: number;
  /** Loop the animation? (true for idle, false for emotes) */
  loop?: boolean;
  /** Control playback — if false, stays on frame 0 */
  playing?: boolean;
  /** Called when a non-looping animation finishes its last frame */
  onComplete?: () => void;
  /** Display size — scales the viewport from frameWidth to this size */
  size?: number;
  /** Additional styles on the outer container */
  style?: any;
}

export function SpriteSheetAnimator({
  source,
  frameWidth,
  frameHeight,
  columns,
  totalFrames,
  frameInterval,
  loop = true,
  playing = true,
  onComplete,
  size = 256,
  style,
}: SpriteSheetAnimatorProps) {
  const frameIndexRef = useRef(0);
  const [frameIndex, setFrameIndex] = React.useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Reset frame to 0 when source changes (new animation)
  useEffect(() => {
    frameIndexRef.current = 0;
    setFrameIndex(0);
  }, [source]);

  // Animation loop
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!playing) return;

    intervalRef.current = setInterval(() => {
      const next = frameIndexRef.current + 1;

      if (next >= totalFrames) {
        if (loop) {
          // Loop back to 0
          frameIndexRef.current = 0;
          setFrameIndex(0);
        } else {
          // Animation complete — stay on last frame
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          onCompleteRef.current?.();
        }
      } else {
        frameIndexRef.current = next;
        setFrameIndex(next);
      }
    }, frameInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [source, playing, totalFrames, frameInterval, loop]);

  // Calculate sheet dimensions
  const rows = Math.ceil(totalFrames / columns);
  const sheetWidth = columns * frameWidth;
  const sheetHeight = rows * frameHeight;

  // Calculate frame position
  const col = frameIndex % columns;
  const row = Math.floor(frameIndex / columns);
  const translateX = -(col * frameWidth);
  const translateY = -(row * frameHeight);

  // Scale factor from frame size to display size
  const scale = size / frameWidth;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Image
        source={source}
        style={{
          width: sheetWidth,
          height: sheetHeight,
          position: 'absolute',
          top: 0,
          left: 0,
          transform: [
            { translateX: translateX },
            { translateY: translateY },
            // We don't scale the Image — instead we scale the viewport.
            // But since RN Image uses logical pixels and our sheets have
            // exact pixel dimensions, we need to keep the image at full
            // sheet size and scale the whole container.
          ],
        }}
        resizeMode="stretch"
      />
    </View>
  );
}

// Wrapper that applies scaling so the viewport shows at `size` dimensions
// but the internal rendering uses the native frame dimensions
export function ScaledSpriteSheet(props: SpriteSheetAnimatorProps) {
  const { size = 256, frameWidth, style, ...rest } = props;
  const scale = size / frameWidth;

  return (
    <View style={[{ width: size, height: size, overflow: 'hidden' }, style]}>
      <View style={{ transform: [{ scale }], transformOrigin: 'top left' }}>
        <SpriteSheetAnimator
          {...rest}
          frameWidth={frameWidth}
          size={frameWidth} // render at native size, container scales it
          style={{ width: frameWidth, height: frameWidth }}
        />
      </View>
    </View>
  );
}
