import React from 'react';
import { SlideContainer, TerminalWindow } from '../components';
import { colors, fonts, fontSizes } from '../theme';
import { SlideTransition } from '../sequences';

interface StatCardProps {
  value: string;
  label: string;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, delay }) => {
  return (
    <SlideTransition type="fade-slide" delay={delay}>
      <div
        style={{
          padding: '20px 28px',
          backgroundColor: colors.bgCard,
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: '12px',
          textAlign: 'center',
          minWidth: '180px',
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSizes['2xl'],
            color: colors.primary,
            fontWeight: 700,
            marginBottom: '6px',
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSizes.base,
            color: colors.textSecondary,
          }}
        >
          {label}
        </div>
      </div>
    </SlideTransition>
  );
};

/**
 * Slide 9: Market Opportunity
 * Duration: 9 seconds (270 frames at 30fps)
 * Traffic Light: GREEN
 */
export const MarketSlide: React.FC = () => {
  const topStats = [
    { value: '1.5M', label: 'University apps/year' },
    { value: '1.9M', label: 'NSFAS apps/year' },
    { value: '4M+', label: 'Total in ecosystem' },
  ];

  const bottomStats = [
    { value: '26', label: 'Public universities' },
    { value: '50', label: 'TVET colleges' },
    { value: '8-12%', label: 'Annual growth' },
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
          // MARKET OPPORTUNITY
        </h2>
      </SlideTransition>

      {/* Top Stats Row */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        {topStats.map((stat, index) => (
          <StatCard
            key={stat.label}
            value={stat.value}
            label={stat.label}
            delay={20 + index * 15}
          />
        ))}
      </div>

      {/* Bottom Stats Row */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          justifyContent: 'center',
          marginBottom: '32px',
        }}
      >
        {bottomStats.map((stat, index) => (
          <StatCard
            key={stat.label}
            value={stat.value}
            label={stat.label}
            delay={80 + index * 15}
          />
        ))}
      </div>

      {/* Market Data Terminal */}
      <SlideTransition type="scale" delay={140}>
        <TerminalWindow
          title="market_analysis.json"
          status="green"
          width={750}
        >
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.lg,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div>
              <span style={{ color: colors.syntaxKey }}>"Total Market"</span>
              <span style={{ color: colors.textSecondary }}>: </span>
              <span style={{ color: colors.syntaxString }}>"R150 Billion (SA higher education)"</span>
              <span style={{ color: colors.textSecondary }}>,</span>
            </div>
            <div>
              <span style={{ color: colors.syntaxKey }}>"Addressable Market"</span>
              <span style={{ color: colors.textSecondary }}>: </span>
              <span style={{ color: colors.syntaxString }}>"R2.5 Billion (admissions processing)"</span>
              <span style={{ color: colors.textSecondary }}>,</span>
            </div>
            <div>
              <span style={{ color: colors.syntaxKey }}>"Our Target"</span>
              <span style={{ color: colors.textSecondary }}>: </span>
              <span style={{ color: colors.syntaxString }}>"R200 Million (first 5 years)"</span>
            </div>
          </div>
        </TerminalWindow>
      </SlideTransition>

      {/* Growth Note */}
      <SlideTransition type="fade" delay={200}>
        <div
          style={{
            marginTop: '24px',
            fontFamily: fonts.mono,
            fontSize: fontSizes.lg,
            color: colors.syntaxString,
          }}
        >
          # Massive underserved market with clear digital transformation need
        </div>
      </SlideTransition>
    </SlideContainer>
  );
};
