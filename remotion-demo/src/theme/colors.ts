// One For All - Dark Terminal Theme Colors
// Matches dashboard design system exactly

export const colors = {
  // Backgrounds
  bgPrimary: '#0a0a0a',
  bgCard: '#141414',
  bgMuted: '#262626',

  // Text
  textPrimary: '#fafafa',
  textSecondary: '#a3a3a3',

  // Borders
  borderDefault: '#333333',

  // Traffic Lights
  trafficRed: '#EF4444',
  trafficOrange: '#F97316',  // NEW - for problem slides
  trafficYellow: '#FACC15',
  trafficGreen: '#22C55E',

  // Syntax Highlighting
  syntaxKey: '#D4A574',      // Amber - JSON keys
  syntaxString: '#60D46E',   // Green - strings, comments
  syntaxExport: '#EF8FFF',   // Pink/Purple - export keyword
  syntaxNumber: '#FACC15',   // Yellow - numbers

  // Primary Accent
  primary: '#D4A574',        // Amber/Brown

  // Status Colors
  success: '#22C55E',
  warning: '#FACC15',
  error: '#EF4444',
} as const;

export type ColorKey = keyof typeof colors;
