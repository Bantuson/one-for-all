import React from 'react';
import { safeArea } from '../../theme';

interface SafeAreaProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Content container with 10% safe margins
 * Ensures content doesn't get cut off on various displays
 */
export const SafeArea: React.FC<SafeAreaProps> = ({ children, style }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: safeArea.vertical,
        left: safeArea.horizontal,
        width: safeArea.contentWidth,
        height: safeArea.contentHeight,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
