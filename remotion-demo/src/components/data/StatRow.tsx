import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { colors, fonts } from '../../theme';

interface StatRowProps {
  /** Label/key for the stat */
  label: string;
  /** Value to display */
  value: string;
  /** Value type for syntax coloring */
  valueType?: 'string' | 'number' | 'boolean';
  /** Animation delay in frames */
  delay?: number;
  /** Custom style overrides */
  style?: React.CSSProperties;
}

/**
 * Single row stat display with JSON-like formatting
 * Used for displaying key-value pairs in terminal style
 */
export const StatRow: React.FC<StatRowProps> = ({
  label,
  value,
  valueType = 'string',
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const effectiveFrame = Math.max(0, frame - delay);

  const opacity = interpolate(effectiveFrame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const translateX = interpolate(effectiveFrame, [0, 15], [-20, 0], {
    extrapolateRight: 'clamp',
  });

  const getValueColor = () => {
    switch (valueType) {
      case 'number':
        return colors.syntaxNumber;
      case 'boolean':
        return colors.syntaxExport;
      case 'string':
      default:
        return colors.syntaxString;
    }
  };

  const formatValue = () => {
    if (valueType === 'string') {
      return `"${value}"`;
    }
    return value;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        fontFamily: fonts.mono,
        fontSize: '18px',
        opacity,
        transform: `translateX(${translateX}px)`,
        ...style,
      }}
    >
      <span style={{ color: colors.syntaxKey }}>{label}</span>
      <span style={{ color: colors.textSecondary }}>: </span>
      <span style={{ color: getValueColor() }}>{formatValue()}</span>
      <span style={{ color: colors.textSecondary }}>,</span>
    </div>
  );
};

interface StatGroupProps {
  /** Stats to display */
  stats: Array<{
    label: string;
    value: string;
    valueType?: 'string' | 'number' | 'boolean';
  }>;
  /** Base delay before first stat appears */
  baseDelay?: number;
  /** Delay between each stat */
  staggerDelay?: number;
  /** Custom style overrides */
  style?: React.CSSProperties;
}

/**
 * Group of stat rows with staggered animation
 */
export const StatGroup: React.FC<StatGroupProps> = ({
  stats,
  baseDelay = 0,
  staggerDelay = 5,
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        ...style,
      }}
    >
      {stats.map((stat, index) => (
        <StatRow
          key={stat.label}
          label={stat.label}
          value={stat.value}
          valueType={stat.valueType}
          delay={baseDelay + index * staggerDelay}
        />
      ))}
    </div>
  );
};
