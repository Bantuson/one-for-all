import React from 'react';
import { colors, fonts, textStyles } from '../../theme';

interface CodeLine {
  /** The content of the line */
  content: string;
  /** Syntax type for coloring */
  type?: 'key' | 'string' | 'export' | 'number' | 'comment' | 'plain';
  /** Indentation level (number of spaces) */
  indent?: number;
}

interface CodeBlockProps {
  /** Lines of code to display */
  lines: CodeLine[];
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Starting line number */
  startLine?: number;
  /** Custom style overrides */
  style?: React.CSSProperties;
}

/**
 * Syntax-highlighted code block
 * Uses One For All color palette for highlighting
 */
export const CodeBlock: React.FC<CodeBlockProps> = ({
  lines,
  showLineNumbers = false,
  startLine = 1,
  style,
}) => {
  const getColor = (type: CodeLine['type']): string => {
    switch (type) {
      case 'key':
        return colors.syntaxKey;
      case 'string':
        return colors.syntaxString;
      case 'export':
        return colors.syntaxExport;
      case 'number':
        return colors.syntaxNumber;
      case 'comment':
        return colors.syntaxString;
      case 'plain':
      default:
        return colors.textPrimary;
    }
  };

  return (
    <pre
      style={{
        margin: 0,
        padding: 0,
        ...textStyles.code,
        ...style,
      }}
    >
      {lines.map((line, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
          }}
        >
          {showLineNumbers && (
            <span
              style={{
                color: colors.textSecondary,
                opacity: 0.5,
                marginRight: '16px',
                minWidth: '24px',
                textAlign: 'right',
                userSelect: 'none',
              }}
            >
              {startLine + index}
            </span>
          )}
          <span
            style={{
              color: getColor(line.type),
              whiteSpace: 'pre',
            }}
          >
            {line.indent ? ' '.repeat(line.indent) : ''}
            {line.content}
          </span>
        </div>
      ))}
    </pre>
  );
};

/**
 * Helper to create a code line
 */
export const codeLine = (
  content: string,
  type: CodeLine['type'] = 'plain',
  indent: number = 0
): CodeLine => ({
  content,
  type,
  indent,
});
