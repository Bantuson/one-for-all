import React from 'react';
import { SlideContainer, TerminalWindow } from '../components';
import { colors, fonts, fontSizes } from '../theme';
import { SlideTransition } from '../sequences';

interface FlowStepProps {
  step: number;
  title: string;
  description: string;
  delay: number;
}

const FlowStep: React.FC<FlowStepProps> = ({ step, title, description, delay }) => {
  return (
    <SlideTransition type="fade-slide" delay={delay}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          padding: '12px 0',
          borderBottom: `1px solid ${colors.borderDefault}`,
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fonts.mono,
            fontSize: fontSizes.xl,
            color: colors.bgPrimary,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {step}
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
            {title}
          </div>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: fontSizes.base,
              color: colors.textSecondary,
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        </div>
      </div>
    </SlideTransition>
  );
};

/**
 * Slide 5: Solution - For Students
 * Duration: 9 seconds (270 frames at 30fps)
 * Traffic Light: GREEN
 */
export const SolutionStudentSlide: React.FC = () => {
  const steps = [
    {
      step: 1,
      title: 'Message WhatsApp',
      description: 'Student sends a message to our WhatsApp number - no app download needed',
    },
    {
      step: 2,
      title: 'AI Agent Guides',
      description: 'Conversational AI collects preferences, subjects, and marks through chat',
    },
    {
      step: 3,
      title: 'Auto-Submit',
      description: 'Applications submitted automatically to selected universities',
    },
    {
      step: 4,
      title: 'Status Updates',
      description: 'Receive application status and responses via WhatsApp',
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
            marginBottom: '32px',
            textAlign: 'center',
          }}
        >
          // FOR STUDENTS
        </h2>
      </SlideTransition>

      {/* Flow Diagram Container */}
      <div
        style={{
          display: 'flex',
          gap: '32px',
          justifyContent: 'center',
          alignItems: 'flex-start',
          maxWidth: '1300px',
        }}
      >
        {/* Steps Terminal */}
        <SlideTransition type="scale" delay={15}>
          <TerminalWindow
            title="student_journey.flow"
            status="green"
            width={700}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {steps.map((step, index) => (
                <FlowStep
                  key={step.step}
                  step={step.step}
                  title={step.title}
                  description={step.description}
                  delay={40 + index * 25}
                />
              ))}
            </div>
          </TerminalWindow>
        </SlideTransition>

        {/* Visual Flow Arrow */}
        <SlideTransition type="fade" delay={150}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              padding: '24px',
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.borderDefault}`,
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSizes.base,
                color: colors.syntaxString,
                textAlign: 'center',
              }}
            >
              # Simple Flow
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {['Student', 'WhatsApp', 'AI Agent', 'University'].map((item, index) => (
                <React.Fragment key={item}>
                  <div
                    style={{
                      padding: '10px 20px',
                      backgroundColor: index === 2 ? colors.primary : colors.bgMuted,
                      borderRadius: '8px',
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.base,
                      color: index === 2 ? colors.bgPrimary : colors.textPrimary,
                      fontWeight: 600,
                    }}
                  >
                    {item}
                  </div>
                  {index < 3 && (
                    <div
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: fontSizes.xl,
                        color: colors.primary,
                      }}
                    >
                      v
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </SlideTransition>
      </div>

      {/* Key Benefit */}
      <SlideTransition type="fade" delay={200}>
        <div
          style={{
            marginTop: '28px',
            fontFamily: fonts.mono,
            fontSize: fontSizes.lg,
            color: colors.syntaxString,
          }}
        >
          # Apply to multiple universities in 15 minutes, not 4 hours
        </div>
      </SlideTransition>
    </SlideContainer>
  );
};
