import React from 'react';
import { SlideContainer, TerminalWindow } from '../components';
import { colors, fonts, fontSizes } from '../theme';
import { SlideTransition } from '../sequences';

interface StoryStepProps {
  stepNumber: number;
  action: string;
  detail: string;
  delay: number;
}

const StoryStep: React.FC<StoryStepProps> = ({ stepNumber, action, detail, delay }) => {
  return (
    <SlideTransition type="fade-slide" delay={delay}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          padding: '12px 0',
          borderBottom: `1px solid ${colors.borderDefault}`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSizes.xl,
            color: colors.primary,
            fontWeight: 700,
            minWidth: '36px',
          }}
        >
          {stepNumber}.
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.lg,
              color: colors.textPrimary,
              fontWeight: 600,
              marginBottom: '6px',
            }}
          >
            {action}
          </div>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: fontSizes.base,
              color: colors.textSecondary,
              lineHeight: 1.4,
            }}
          >
            {detail}
          </div>
        </div>
      </div>
    </SlideTransition>
  );
};

/**
 * Slide 7: How It Works - Thabo's Story
 * Duration: 11 seconds (330 frames at 30fps)
 * Traffic Light: GREEN
 */
export const HowItWorksSlide: React.FC = () => {
  const steps = [
    {
      stepNumber: 1,
      action: 'Thabo messages our WhatsApp number',
      detail: 'Grade 12 learner from Soweto sends "Hi" to start',
    },
    {
      stepNumber: 2,
      action: 'AI agent asks about preferences',
      detail: 'What do you want to study? What are your subjects?',
    },
    {
      stepNumber: 3,
      action: 'Thabo shares his details',
      detail: 'Engineering at UP or Wits, Maths 75%, Science 68%',
    },
    {
      stepNumber: 4,
      action: 'Applications submitted automatically',
      detail: 'Both UP and Wits receive complete applications',
    },
    {
      stepNumber: 5,
      action: 'Status updates on WhatsApp',
      detail: '"UP has acknowledged your application"',
    },
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
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          // HOW IT WORKS
        </h2>
      </SlideTransition>

      {/* Character Introduction */}
      <SlideTransition type="fade" delay={10}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '24px',
            padding: '14px 28px',
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.primary}`,
            borderRadius: '12px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: fonts.sans,
              fontSize: fontSizes['2xl'],
              color: colors.bgPrimary,
              fontWeight: 700,
            }}
          >
            T
          </div>
          <div>
            <div
              style={{
                fontFamily: fonts.sans,
                fontSize: fontSizes.lg,
                color: colors.textPrimary,
                fontWeight: 600,
              }}
            >
              Meet Thabo
            </div>
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSizes.base,
                color: colors.textSecondary,
              }}
            >
              Grade 12 learner from Soweto, wants to study Engineering
            </div>
          </div>
        </div>
      </SlideTransition>

      {/* Journey Steps */}
      <SlideTransition type="scale" delay={25}>
        <TerminalWindow
          title="thabo_journey.log"
          status="green"
          width={1100}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0 40px',
            }}
          >
            <div>
              {steps.slice(0, 3).map((step, index) => (
                <StoryStep
                  key={step.stepNumber}
                  stepNumber={step.stepNumber}
                  action={step.action}
                  detail={step.detail}
                  delay={50 + index * 30}
                />
              ))}
            </div>
            <div>
              {steps.slice(3).map((step, index) => (
                <StoryStep
                  key={step.stepNumber}
                  stepNumber={step.stepNumber}
                  action={step.action}
                  detail={step.detail}
                  delay={140 + index * 30}
                />
              ))}
            </div>
          </div>
        </TerminalWindow>
      </SlideTransition>

      {/* Result Callout */}
      <SlideTransition type="fade" delay={260}>
        <div
          style={{
            marginTop: '24px',
            fontFamily: fonts.mono,
            fontSize: fontSizes.lg,
            color: colors.syntaxString,
          }}
        >
          # Total time: 15 minutes. No portal crashes. No errors. No stress.
        </div>
      </SlideTransition>
    </SlideContainer>
  );
};
