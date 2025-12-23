import React from 'react';
import { colors } from '../../theme';

interface TrafficLightsProps {
  /** Size of each dot in pixels */
  size?: number;
  /** Gap between dots */
  gap?: number;
  /** Which light to highlight (for status indication) */
  active?: 'red' | 'orange' | 'yellow' | 'green' | 'none';
}

/**
 * macOS-style traffic light dots for terminal window headers
 */
export const TrafficLights: React.FC<TrafficLightsProps> = ({
  size = 10,
  gap = 6,
  active = 'none',
}) => {
  const dots = [
    { color: colors.trafficRed, key: 'red' },
    { color: colors.trafficYellow, key: 'yellow' },
    { color: colors.trafficGreen, key: 'green' },
  ] as const;

  const getColor = (dotKey: 'red' | 'yellow' | 'green', defaultColor: string) => {
    // If no active state, show all lights at full color
    if (active === 'none') return defaultColor;

    // For orange status, highlight the middle (yellow) light with orange color
    if (active === 'orange' && dotKey === 'yellow') {
      return colors.trafficOrange;
    }

    // Highlight the matching light
    if (active === dotKey) return defaultColor;

    // Dim non-matching lights
    return colors.bgMuted;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: `${gap}px`,
      }}
    >
      {dots.map((dot) => {
        const displayColor = getColor(dot.key, dot.color);
        const isHighlighted = active === dot.key || (active === 'orange' && dot.key === 'yellow');

        return (
          <div
            key={dot.key}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: displayColor,
              opacity: active === 'none' || isHighlighted ? 1 : 0.4,
              boxShadow: isHighlighted ? `0 0 8px ${displayColor}` : 'none',
            }}
          />
        );
      })}
    </div>
  );
};
