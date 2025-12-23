import React from 'react';
import { SlideContainer, Logo, CommandPrompt } from '../components';
import { colors, fonts, fontSizes, textStyles } from '../theme';
import { SlideTransition } from '../sequences';

/**
 * Slide 1: Title
 * Duration: 6 seconds (180 frames at 30fps)
 */
export const TitleSlide: React.FC = () => {
  return (
    <SlideContainer justify="center" align="center">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '48px',
        }}
      >
        {/* Logo - larger size */}
        <Logo width={700} delay={0} />

        {/* Tagline - updated message */}
        <SlideTransition type="fade-slide" delay={20}>
          <p
            style={{
              fontFamily: fonts.sans,
              fontSize: fontSizes['2xl'],
              color: colors.textSecondary,
              textAlign: 'center',
              maxWidth: '1000px',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Democratizing Higher Education Access
          </p>
        </SlideTransition>

        {/* Terminal Command */}
        <SlideTransition type="fade" delay={45}>
          <div
            style={{
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.borderDefault}`,
              borderRadius: '12px',
              padding: '24px 48px',
            }}
          >
            <CommandPrompt
              command="export one_for_all"
              prefix="$ "
              speed={0.4}
              delay={55}
            />
          </div>
        </SlideTransition>
      </div>
    </SlideContainer>
  );
};
