// One For All - Typography System
// Matches dashboard design system exactly

export const fonts = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
  sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;

export const fontSizes = {
  xs: '18px',     // 1.5x of 12
  sm: '21px',     // 1.5x of 14
  base: '24px',   // 1.5x of 16
  lg: '27px',     // 1.5x of 18
  xl: '30px',     // 1.5x of 20
  '2xl': '36px',  // 1.5x of 24
  '3xl': '48px',  // 1.5x of 32
  '4xl': '72px',  // 1.5x of 48
  '5xl': '108px', // 1.5x of 72
} as const;

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.6,
  loose: 1.7,
} as const;

// Pre-composed text styles (updated to use 1.5x scaled sizes)
export const textStyles = {
  h1: {
    fontFamily: fonts.sans,
    fontSize: fontSizes['5xl'],  // 108px
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontFamily: fonts.sans,
    fontSize: fontSizes['4xl'],  // 72px
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontFamily: fonts.sans,
    fontSize: fontSizes['3xl'],  // 48px
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
  },
  bodyLarge: {
    fontFamily: fonts.sans,
    fontSize: fontSizes['2xl'],  // 36px
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.relaxed,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xl,      // 30px
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
  },
  code: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xl,      // 30px
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.loose,
  },
  codeSmall: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.lg,      // 27px
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.relaxed,
  },
} as const;
