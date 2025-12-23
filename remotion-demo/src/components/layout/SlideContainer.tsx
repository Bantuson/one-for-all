import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { Background } from './Background';
import { SafeArea } from './SafeArea';

interface SlideContainerProps {
  children: React.ReactNode;
  /** Whether to animate the slide entrance */
  animate?: boolean;
  /** Custom styles for the safe area */
  style?: React.CSSProperties;
  /** Justify content - defaults to center */
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  /** Align items - defaults to center */
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
}

/**
 * Complete slide wrapper with background, safe area, and optional entrance animation
 */
export const SlideContainer: React.FC<SlideContainerProps> = ({
  children,
  animate = true,
  style,
  justify = 'center',
  align = 'center',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animation
  const opacity = animate
    ? interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })
    : 1;

  const translateY = animate
    ? spring({
        frame,
        fps,
        from: 30,
        to: 0,
        config: {
          damping: 20,
          stiffness: 100,
        },
      })
    : 0;

  return (
    <Background>
      <SafeArea
        style={{
          justifyContent: justify,
          alignItems: align,
          opacity,
          transform: `translateY(${translateY}px)`,
          ...style,
        }}
      >
        {children}
      </SafeArea>
    </Background>
  );
};
