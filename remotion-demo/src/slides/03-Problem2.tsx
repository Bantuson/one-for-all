import React from 'react';
import { SlideContainer, TerminalWindow } from '../components';
import { colors, fonts, fontSizes } from '../theme';
import { SlideTransition } from '../sequences';

interface StatRowProps {
  label: string;
  value: string;
  delay: number;
}

const StatRow: React.FC<StatRowProps> = ({ label, value, delay }) => {
  return (
    <SlideTransition type="fade-slide" delay={delay}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 0',
          borderBottom: `1px solid ${colors.borderDefault}`,
        }}
      >
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSizes.lg,
            color: colors.textSecondary,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSizes.lg,
            color: colors.trafficOrange,
            fontWeight: 600,
          }}
        >
          {value}
        </span>
      </div>
    </SlideTransition>
  );
};

/**
 * Slide 3: Problem 2 - System at Breaking Point
 * Duration: 9 seconds (270 frames at 30fps)
 * Traffic Light: ORANGE (problem slide)
 */
export const Problem2Slide: React.FC = () => {
  const systemStats = [
    { label: 'applications_per_year', value: '4 million+' },
    { label: 'public_universities', value: '26' },
    { label: 'tvet_colleges', value: '50' },
    { label: 'application_to_space_ratio', value: '30:1' },
    { label: 'peak_window', value: 'Apr - Sep' },
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
          // SYSTEM AT BREAKING POINT
        </h2>
      </SlideTransition>

      {/* Stats Grid */}
      <div
        style={{
          display: 'flex',
          gap: '32px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          maxWidth: '1200px',
        }}
      >
        {/* Left Terminal - Volume Stats */}
        <SlideTransition type="fade-slide" delay={15}>
          <TerminalWindow
            title="system_load.json"
            status="orange"
            width={560}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {systemStats.slice(0, 3).map((stat, index) => (
                <StatRow
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  delay={30 + index * 20}
                />
              ))}
            </div>
          </TerminalWindow>
        </SlideTransition>

        {/* Right Terminal - Pressure Stats */}
        <SlideTransition type="fade-slide" delay={30}>
          <TerminalWindow
            title="bottlenecks.json"
            status="orange"
            width={560}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {systemStats.slice(3).map((stat, index) => (
                <StatRow
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  delay={45 + index * 20}
                />
              ))}
              <SlideTransition type="fade-slide" delay={85}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.lg,
                      color: colors.textSecondary,
                    }}
                  >
                    fragmented_portals
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.lg,
                      color: colors.trafficOrange,
                      fontWeight: 600,
                    }}
                  >
                    All different
                  </span>
                </div>
              </SlideTransition>
            </div>
          </TerminalWindow>
        </SlideTransition>
      </div>

      {/* Key Insight */}
      <SlideTransition type="fade" delay={140}>
        <div
          style={{
            marginTop: '32px',
            padding: '20px 32px',
            backgroundColor: colors.bgCard,
            border: `2px solid ${colors.trafficOrange}`,
            borderRadius: '12px',
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.lg,
              color: colors.trafficOrange,
            }}
          >
            # Each portal has different requirements, deadlines, and formats
          </span>
        </div>
      </SlideTransition>
    </SlideContainer>
  );
};
