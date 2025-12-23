import React from 'react';
import { SlideContainer, TerminalWindow } from '../components';
import { colors, fonts, fontSizes } from '../theme';
import { SlideTransition } from '../sequences';

/**
 * Slide 2: Problem 1 - The Human Cost
 * Duration: 10 seconds (300 frames at 30fps)
 * Traffic Light: ORANGE (problem slide)
 */
export const Problem1Slide: React.FC = () => {
  const humanCosts = [
    'Township youth lack tech skills and computer access',
    'Library computers booked for weeks during peak season',
    'University portals crash when you need them most',
    'Students pay third parties (individuals, internet cafes) to apply for them',
  ];

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
          // FRAGMENTATION IN ADMISSIONS ECOSYSTEM
        </h2>
      </SlideTransition>

      {/* Terminal Window with Human Stories */}
      <SlideTransition type="scale" delay={20}>
        <TerminalWindow
          title="reality_check.log"
          status="orange"
          width={1200}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '12px 0',
            }}
          >
            {humanCosts.map((cost, index) => (
              <SlideTransition key={index} type="fade-slide" delay={40 + index * 30}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.lg,
                      color: colors.trafficOrange,
                      minWidth: '24px',
                    }}
                  >
                    x
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: fontSizes.lg,
                      color: colors.textPrimary,
                      lineHeight: 1.4,
                    }}
                  >
                    {cost}
                  </span>
                </div>
              </SlideTransition>
            ))}
          </div>
        </TerminalWindow>
      </SlideTransition>

      {/* Personal Story Callout */}
      <SlideTransition type="fade" delay={180}>
        <div
          style={{
            marginTop: '32px',
            padding: '20px 32px',
            backgroundColor: colors.bgCard,
            border: `2px solid ${colors.trafficOrange}`,
            borderRadius: '12px',
            maxWidth: '900px',
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.base,
              color: colors.trafficOrange,
            }}
          >
            // Personal experience: TUT portal was down the entire day I needed to apply
          </span>
        </div>
      </SlideTransition>

      {/* Bottom Comment */}
      <SlideTransition type="fade" delay={220}>
        <div
          style={{
            marginTop: '28px',
            fontFamily: fonts.mono,
            fontSize: fontSizes.base,
            color: colors.syntaxString,
          }}
        >
          # The system fails those who need it most
        </div>
      </SlideTransition>
    </SlideContainer>
  );
};
