import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';

interface LogoProps {
  /** Width of the logo */
  width?: number;
  /** Animation delay in frames */
  delay?: number;
  /** Custom style overrides */
  style?: React.CSSProperties;
}

/**
 * One For All logo with entrance animation
 */
export const Logo: React.FC<LogoProps> = ({
  width = 400,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const effectiveFrame = Math.max(0, frame - delay);

  const opacity = interpolate(effectiveFrame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const scale = spring({
    frame: effectiveFrame,
    fps,
    from: 0.8,
    to: 1,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        ...style,
      }}
    >
      <Img
        src={staticFile('images/oneforall-letterman.png')}
        style={{
          width,
          height: 'auto',
        }}
      />
    </div>
  );
};
