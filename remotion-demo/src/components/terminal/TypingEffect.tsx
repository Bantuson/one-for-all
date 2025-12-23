import React from 'react';
import { useCurrentFrame } from 'remotion';
import { colors, fonts } from '../../theme';

interface TypingEffectProps {
  /** Text to type out */
  text: string;
  /** Characters to type per frame */
  speed?: number;
  /** Delay before starting (in frames) */
  delay?: number;
  /** Show blinking cursor */
  showCursor?: boolean;
  /** Cursor blink rate (frames per cycle) */
  cursorBlinkRate?: number;
  /** Text color */
  color?: string;
  /** Font size */
  fontSize?: string;
  /** Custom style overrides */
  style?: React.CSSProperties;
}

/**
 * Animated typing effect with optional blinking cursor
 * Creates the terminal typing aesthetic
 */
export const TypingEffect: React.FC<TypingEffectProps> = ({
  text,
  speed = 0.5,
  delay = 0,
  showCursor = true,
  cursorBlinkRate = 30,
  color = colors.textPrimary,
  fontSize = '18px',
  style,
}) => {
  const frame = useCurrentFrame();

  // Calculate how many characters to show
  const effectiveFrame = Math.max(0, frame - delay);
  const charsToShow = Math.floor(effectiveFrame * speed);
  const displayText = text.slice(0, Math.min(charsToShow, text.length));

  // Cursor visibility (blinks when typing is complete)
  const isTypingComplete = charsToShow >= text.length;
  const cursorVisible = isTypingComplete
    ? frame % cursorBlinkRate < cursorBlinkRate / 2
    : true;

  return (
    <span
      style={{
        fontFamily: fonts.mono,
        fontSize,
        color,
        ...style,
      }}
    >
      {displayText}
      {showCursor && (
        <span
          style={{
            color: colors.syntaxString,
            opacity: cursorVisible ? 1 : 0,
            marginLeft: '2px',
          }}
        >
          _
        </span>
      )}
    </span>
  );
};

/**
 * Command prompt with typing effect
 */
interface CommandPromptProps {
  command: string;
  speed?: number;
  delay?: number;
  prefix?: string;
  style?: React.CSSProperties;
}

export const CommandPrompt: React.FC<CommandPromptProps> = ({
  command,
  speed = 0.5,
  delay = 0,
  prefix = '$ ',
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: '18px',
          color: colors.syntaxString,
        }}
      >
        {prefix}
      </span>
      <TypingEffect
        text={command}
        speed={speed}
        delay={delay}
        showCursor={true}
      />
    </div>
  );
};
