// One For All - Spacing System
// Based on 8px grid with safe margins for video

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

// Video dimensions
export const video = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

// Safe margins (5% of dimensions - reduced for more content area)
export const safeArea = {
  horizontal: 96,  // 5% of 1920 (was 192)
  vertical: 54,    // 5% of 1080 (was 108)
  contentWidth: 1728, // 1920 - (96 * 2)
  contentHeight: 972, // 1080 - (54 * 2)
} as const;

// Card styling
export const cardStyle = {
  borderRadius: '12px',
  padding: spacing[8],      // was spacing[6], now 32px
  paddingLarge: spacing[12], // was spacing[8], now 48px
} as const;

// Animation timing (in frames at 30fps)
export const timing = {
  fast: 8,      // ~0.27s
  normal: 15,   // 0.5s
  slow: 30,     // 1s
  stagger: 5,   // Delay between staggered items
} as const;
