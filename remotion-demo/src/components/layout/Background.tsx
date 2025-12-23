import React from 'react';
import { AbsoluteFill } from 'remotion';
import { colors, video } from '../../theme';

interface BackgroundProps {
  children?: React.ReactNode;
}

/**
 * Full-screen background with dot pattern
 * Matches the dashboard's dark terminal aesthetic
 */
export const Background: React.FC<BackgroundProps> = ({ children }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgPrimary,
        backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.3) 1.4px, transparent 1.4px)`,
        backgroundSize: '32px 32px',
        width: video.width,
        height: video.height,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
