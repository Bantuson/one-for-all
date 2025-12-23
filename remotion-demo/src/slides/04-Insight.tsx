import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { SlideContainer, TerminalWindow } from '../components';
import { colors, fonts, fontSizes } from '../theme';
import { SlideTransition } from '../sequences';

/**
 * Slide 4: The Insight - WhatsApp + GenAI Breakthrough
 * Duration: 8 seconds (240 frames at 30fps)
 * Traffic Light: YELLOW (transition slide)
 */
export const InsightSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Converging animation for the two insights
  const leftX = spring({
    frame: Math.max(0, frame - 60),
    fps,
    from: -100,
    to: 0,
    config: { damping: 20, stiffness: 80 },
  });

  const rightX = spring({
    frame: Math.max(0, frame - 80),
    fps,
    from: 100,
    to: 0,
    config: { damping: 20, stiffness: 80 },
  });

  const convergenceOpacity = interpolate(
    frame,
    [120, 150],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );

  return (
    <SlideContainer justify="flex-start" align="center" style={{ paddingTop: '40px' }}>
      {/* Section Header - Comment Style */}
      <SlideTransition type="fade-slide" delay={0}>
        <h2
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSizes['3xl'],
            fontWeight: 600,
            color: colors.syntaxString,
            marginBottom: '32px',
            textAlign: 'center',
          }}
        >
          // THE BREAKTHROUGH
        </h2>
      </SlideTransition>

      {/* Two Converging Insights */}
      <div
        style={{
          display: 'flex',
          gap: '48px',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        {/* WhatsApp Insight */}
        <div style={{ transform: `translateX(${leftX}px)` }}>
          <SlideTransition type="fade" delay={40}>
            <TerminalWindow
              title="platform_insight.md"
              status="green"
              width={460}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  padding: '6px 0',
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSizes['2xl'],
                    color: colors.primary,
                    fontWeight: 600,
                  }}
                >
                  WhatsApp
                </div>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: fontSizes.lg,
                    color: colors.textPrimary,
                    lineHeight: 1.5,
                  }}
                >
                  93-96% penetration among SA internet users
                </div>
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.base,
                    color: colors.syntaxString,
                  }}
                >
                  # The most familiar platform for every South African
                </div>
              </div>
            </TerminalWindow>
          </SlideTransition>
        </div>

        {/* Plus Sign */}
        <SlideTransition type="scale" delay={100}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes['4xl'],
              color: colors.textPrimary,
              fontWeight: 700,
            }}
          >
            +
          </div>
        </SlideTransition>

        {/* GenAI Insight */}
        <div style={{ transform: `translateX(${rightX}px)` }}>
          <SlideTransition type="fade" delay={60}>
            <TerminalWindow
              title="tech_insight.md"
              status="green"
              width={460}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  padding: '6px 0',
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSizes['2xl'],
                    color: colors.primary,
                    fontWeight: 600,
                  }}
                >
                  Generative AI
                </div>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: fontSizes.lg,
                    color: colors.textPrimary,
                    lineHeight: 1.5,
                  }}
                >
                  Conversational processing at scale is now possible
                </div>
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.base,
                    color: colors.syntaxString,
                  }}
                >
                  # This was not possible 2 years ago
                </div>
              </div>
            </TerminalWindow>
          </SlideTransition>
        </div>
      </div>

      {/* Convergence Result */}
      <div style={{ opacity: convergenceOpacity }}>
        <div
          style={{
            padding: '24px 48px',
            backgroundColor: colors.bgCard,
            border: `3px solid ${colors.trafficGreen}`,
            borderRadius: '16px',
          }}
        >
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: fontSizes['2xl'],
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: '12px',
            }}
          >
            Meet students where they already are
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.lg,
              color: colors.syntaxString,
              textAlign: 'center',
            }}
          >
            # WhatsApp + AI Agents = Accessible admissions for everyone
          </div>
        </div>
      </div>
    </SlideContainer>
  );
};
