import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface SlideTransitionProps {
  children: React.ReactNode;
  /** Type of transition animation */
  type?: 'fade' | 'slide-up' | 'slide-left' | 'scale' | 'fade-slide';
  /** Duration of transition in frames */
  duration?: number;
  /** Delay before transition starts */
  delay?: number;
}

/**
 * Wrapper component for slide transitions
 */
export const SlideTransition: React.FC<SlideTransitionProps> = ({
  children,
  type = 'fade-slide',
  duration = 20,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const effectiveFrame = Math.max(0, frame - delay);

  const getTransformStyle = (): React.CSSProperties => {
    switch (type) {
      case 'fade': {
        const opacity = interpolate(effectiveFrame, [0, duration], [0, 1], {
          extrapolateRight: 'clamp',
        });
        return { opacity };
      }

      case 'slide-up': {
        const opacity = interpolate(effectiveFrame, [0, duration * 0.5], [0, 1], {
          extrapolateRight: 'clamp',
        });
        const translateY = spring({
          frame: effectiveFrame,
          fps,
          from: 60,
          to: 0,
          config: { damping: 20, stiffness: 100 },
        });
        return { opacity, transform: `translateY(${translateY}px)` };
      }

      case 'slide-left': {
        const opacity = interpolate(effectiveFrame, [0, duration * 0.5], [0, 1], {
          extrapolateRight: 'clamp',
        });
        const translateX = spring({
          frame: effectiveFrame,
          fps,
          from: 60,
          to: 0,
          config: { damping: 20, stiffness: 100 },
        });
        return { opacity, transform: `translateX(${translateX}px)` };
      }

      case 'scale': {
        const opacity = interpolate(effectiveFrame, [0, duration * 0.5], [0, 1], {
          extrapolateRight: 'clamp',
        });
        const scale = spring({
          frame: effectiveFrame,
          fps,
          from: 0.9,
          to: 1,
          config: { damping: 15, stiffness: 120 },
        });
        return { opacity, transform: `scale(${scale})` };
      }

      case 'fade-slide':
      default: {
        const opacity = interpolate(effectiveFrame, [0, duration * 0.75], [0, 1], {
          extrapolateRight: 'clamp',
        });
        const translateY = spring({
          frame: effectiveFrame,
          fps,
          from: 30,
          to: 0,
          config: { damping: 20, stiffness: 100 },
        });
        return { opacity, transform: `translateY(${translateY}px)` };
      }
    }
  };

  return <div style={getTransformStyle()}>{children}</div>;
};

interface StaggerContainerProps {
  children: React.ReactNode[];
  /** Delay between each child in frames */
  staggerDelay?: number;
  /** Base delay before first child */
  baseDelay?: number;
  /** Direction of stagger */
  direction?: 'row' | 'column';
  /** Gap between children */
  gap?: number;
  /** Align items */
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  /** Justify content */
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  /** Custom style overrides */
  style?: React.CSSProperties;
}

/**
 * Container that staggers the animation of its children
 */
export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  staggerDelay = 5,
  baseDelay = 0,
  direction = 'row',
  gap = 24,
  align = 'center',
  justify = 'center',
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        gap,
        alignItems: align,
        justifyContent: justify,
        ...style,
      }}
    >
      {React.Children.map(children, (child, index) => (
        <SlideTransition
          type="fade-slide"
          delay={baseDelay + index * staggerDelay}
        >
          {child}
        </SlideTransition>
      ))}
    </div>
  );
};
