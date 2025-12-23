import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { colors, fonts, cardStyle } from '../../theme';
import { TrafficLights } from '../terminal/TrafficLights';

interface MetricCardProps {
  /** Label for the metric */
  label: string;
  /** Value to display */
  value: string;
  /** Optional status indicator */
  status?: 'red' | 'yellow' | 'green' | 'none';
  /** Animation delay in frames */
  delay?: number;
  /** Card width */
  width?: number | string;
  /** Custom style overrides */
  style?: React.CSSProperties;
}

/**
 * Animated metric card with terminal styling
 * Used for displaying KPIs and statistics
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  status = 'none',
  delay = 0,
  width = 'auto',
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation values
  const effectiveFrame = Math.max(0, frame - delay);

  const opacity = interpolate(effectiveFrame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const scale = spring({
    frame: effectiveFrame,
    fps,
    from: 0.9,
    to: 1,
    config: {
      damping: 15,
      stiffness: 120,
    },
  });

  return (
    <div
      style={{
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.borderDefault}`,
        borderRadius: cardStyle.borderRadius,
        overflow: 'hidden',
        width,
        opacity,
        transform: `scale(${scale})`,
        ...style,
      }}
    >
      {/* Card Header */}
      <div
        style={{
          backgroundColor: colors.bgMuted,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${colors.borderDefault}`,
        }}
      >
        <TrafficLights size={8} gap={5} active={status} />
      </div>

      {/* Card Content */}
      <div
        style={{
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: '14px',
            color: colors.syntaxKey,
            marginBottom: '8px',
          }}
        >
          {label}:
        </div>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: '24px',
            color: colors.textPrimary,
            fontWeight: 600,
          }}
        >
          <span style={{ color: colors.syntaxString }}>"</span>
          {value}
          <span style={{ color: colors.syntaxString }}>"</span>
        </div>
      </div>
    </div>
  );
};
