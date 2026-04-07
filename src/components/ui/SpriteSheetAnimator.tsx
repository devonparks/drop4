import React, { useEffect, useRef } from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';

// ═══════════════════════════════════════════════════════════
// SPRITE SHEET ANIMATOR
// Renders a sprite sheet with viewport clipping instead of
// swapping individual PNGs. Dramatically reduces Image source
// swaps and improves animation performance.
//
// How it works:
// - A View with overflow:'hidden' acts as the viewport (1 frame)
// - A full-size Image of the entire sheet sits inside
// - left/top positioning shifts the Image so the correct frame is visible
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

  // Calculate sheet dimensions at native resolution
  const rows = Math.ceil(totalFrames / columns);
  const nativeSheetWidth = columns * frameWidth;
  const nativeSheetHeight = rows * frameHeight;

  // Scale factor: display size vs native frame size
  // When size=320 and frameWidth=256, scale=1.25
  const scale = size / frameWidth;
  const displaySheetWidth = nativeSheetWidth * scale;
  const displaySheetHeight = nativeSheetHeight * scale;
  const displayFrameWidth = frameWidth * scale;
  const displayFrameHeight = frameHeight * scale;

  // Calculate frame position at display scale
  const col = frameIndex % columns;
  const row = Math.floor(frameIndex / columns);
  const left = -(col * displayFrameWidth);
  const top = -(row * displayFrameHeight);

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
          width: displaySheetWidth,
          height: displaySheetHeight,
          position: 'absolute',
          left,
          top,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}

// Wrapper that renders at the target `size` by passing it straight through.
// No CSS transform scaling needed — `SpriteSheetAnimator` sets the Image
// width/height proportionally so the correct frame region is visible at
// whatever display size is requested.
export function ScaledSpriteSheet(props: SpriteSheetAnimatorProps) {
  const { size = 256, style, ...rest } = props;

  return (
    <SpriteSheetAnimator
      {...rest}
      size={size}
      style={style}
    />
  );
}
