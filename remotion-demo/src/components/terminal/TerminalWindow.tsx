import React from 'react';
import { colors, fonts, cardStyle } from '../../theme';
import { TrafficLights } from './TrafficLights';

interface TerminalWindowProps {
  /** Title shown in the terminal header */
  title?: string;
  /** Content inside the terminal */
  children: React.ReactNode;
  /** Width of the terminal window */
  width?: number | string;
  /** Traffic light status */
  status?: 'red' | 'orange' | 'yellow' | 'green' | 'none';
  /** Custom style overrides */
  style?: React.CSSProperties;
}

/**
 * Terminal window with header, traffic lights, and content area
 * Core visual component of the One For All design system
 */
export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  title = 'terminal',
  children,
  width = 'auto',
  status = 'none',
  style,
}) => {
  return (
    <div
      style={{
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.borderDefault}`,
        borderRadius: cardStyle.borderRadius,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        width,
        ...style,
      }}
    >
      {/* Terminal Header */}
      <div
        style={{
          backgroundColor: colors.bgMuted,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${colors.borderDefault}`,
        }}
      >
        <TrafficLights size={10} gap={6} active={status} />
        <span
          style={{
            marginLeft: 'auto',
            color: colors.textSecondary,
            fontFamily: fonts.mono,
            fontSize: '12px',
          }}
        >
          {title}
        </span>
      </div>

      {/* Terminal Content */}
      <div
        style={{
          padding: cardStyle.padding,
        }}
      >
        {children}
      </div>
    </div>
  );
};
