import React from 'react';
import { SlideContainer, TerminalWindow } from '../components';
import { colors, fonts, fontSizes } from '../theme';
import { SlideTransition } from '../sequences';

/**
 * Slide 10: Business Model
 * Duration: 9 seconds (270 frames at 30fps)
 * Traffic Light: GREEN
 */
export const BusinessModelSlide: React.FC = () => {
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
          // BUSINESS MODEL
        </h2>
      </SlideTransition>

      {/* Main Content */}
      <div
        style={{
          display: 'flex',
          gap: '32px',
          justifyContent: 'center',
          alignItems: 'flex-start',
          maxWidth: '1200px',
        }}
      >
        {/* Left - Revenue Model */}
        <SlideTransition type="scale" delay={20}>
          <TerminalWindow
            title="revenue_model.py"
            status="green"
            width={460}
          >
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSizes.lg,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ color: colors.syntaxString }}>
                # B2B SaaS for institutions
              </div>
              <div>
                <span style={{ color: colors.textSecondary }}>revenue_per_app = </span>
                <span style={{ color: colors.trafficYellow, fontWeight: 600 }}>R50</span>
              </div>
              <div style={{ color: colors.syntaxString, marginTop: '6px' }}>
                # Students apply for FREE
              </div>
              <div>
                <span style={{ color: colors.textSecondary }}>student_cost = </span>
                <span style={{ color: colors.trafficYellow, fontWeight: 600 }}>R0</span>
              </div>
              <div style={{ color: colors.syntaxString, marginTop: '6px' }}>
                # Target margin
              </div>
              <div>
                <span style={{ color: colors.textSecondary }}>profit_margin = </span>
                <span style={{ color: colors.trafficYellow, fontWeight: 600 }}>60%+</span>
              </div>
            </div>
          </TerminalWindow>
        </SlideTransition>

        {/* Right - Unit Economics */}
        <SlideTransition type="scale" delay={50}>
          <TerminalWindow
            title="unit_economics.py"
            status="green"
            width={460}
          >
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSizes.lg,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ color: colors.syntaxString }}>
                # Per application breakdown
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: `1px solid ${colors.borderDefault}`,
                }}
              >
                <span style={{ color: colors.textSecondary }}>Revenue</span>
                <span style={{ color: colors.trafficYellow }}>R50</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: `1px solid ${colors.borderDefault}`,
                }}
              >
                <span style={{ color: colors.textSecondary }}>DeepSeek API</span>
                <span style={{ color: colors.trafficRed }}>-R8</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: `1px solid ${colors.borderDefault}`,
                }}
              >
                <span style={{ color: colors.textSecondary }}>Twilio (WhatsApp)</span>
                <span style={{ color: colors.trafficRed }}>-R7</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: `1px solid ${colors.borderDefault}`,
                }}
              >
                <span style={{ color: colors.textSecondary }}>Compute</span>
                <span style={{ color: colors.trafficRed }}>-R5</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  marginTop: '6px',
                }}
              >
                <span style={{ color: colors.textPrimary, fontWeight: 600 }}>Margin</span>
                <span style={{ color: colors.trafficYellow, fontWeight: 700 }}>R30 (60%)</span>
              </div>
            </div>
          </TerminalWindow>
        </SlideTransition>
      </div>

      {/* Key Value Prop */}
      <SlideTransition type="fade" delay={140}>
        <div
          style={{
            marginTop: '32px',
            padding: '20px 40px',
            backgroundColor: colors.bgCard,
            border: `2px solid ${colors.trafficYellow}`,
            borderRadius: '12px',
          }}
        >
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: fontSizes.lg,
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: '10px',
            }}
          >
            Institutions save R1,750 per application vs manual processing
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.base,
              color: colors.syntaxString,
              textAlign: 'center',
            }}
          >
            # Our R50 fee delivers 35x ROI for customers
          </div>
        </div>
      </SlideTransition>
    </SlideContainer>
  );
};
