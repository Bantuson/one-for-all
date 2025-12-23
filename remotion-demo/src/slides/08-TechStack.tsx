import React from 'react';
import { SlideContainer, TerminalWindow } from '../components';
import { colors, fonts, fontSizes } from '../theme';
import { SlideTransition } from '../sequences';

interface TechItemProps {
  name: string;
  description: string;
  delay: number;
  nameColor?: string;
}

const TechItem: React.FC<TechItemProps> = ({ name, description, delay, nameColor }) => {
  return (
    <SlideTransition type="fade-slide" delay={delay}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
          borderBottom: `1px solid ${colors.borderDefault}`,
        }}
      >
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSizes.lg,
            color: nameColor || colors.syntaxExport,
            fontWeight: 600,
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSizes.base,
            color: colors.textSecondary,
          }}
        >
          {description}
        </span>
      </div>
    </SlideTransition>
  );
};

/**
 * Slide 8: Tech Stack
 * Duration: 8 seconds (240 frames at 30fps)
 * Traffic Light: GREEN
 */
export const TechStackSlide: React.FC = () => {
  const leftStack = [
    { name: 'Twilio', description: 'WhatsApp API', color: colors.syntaxExport },
    { name: 'CrewAI', description: 'AI agent orchestration', color: colors.trafficYellow },
    { name: 'DeepSeek', description: 'LLM inference', color: colors.syntaxExport },
    { name: 'Bun', description: 'Fast JS sandbox', color: colors.trafficYellow },
  ];

  const rightStack = [
    { name: 'Next.js 15', description: 'Dashboard frontend', color: colors.syntaxExport },
    { name: 'Supabase', description: 'Database + RAG', color: colors.trafficYellow },
    { name: 'Convex', description: 'Real-time sync', color: colors.syntaxExport },
    { name: 'Clerk', description: 'Authentication', color: colors.trafficYellow },
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
          // TECH STACK
        </h2>
      </SlideTransition>

      <SlideTransition type="fade" delay={10}>
        <p
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSizes.lg,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          Modern, scalable architecture built for AI-native operations
        </p>
      </SlideTransition>

      {/* Tech Stack Grid */}
      <div
        style={{
          display: 'flex',
          gap: '32px',
          justifyContent: 'center',
          maxWidth: '1200px',
        }}
      >
        {/* Left Terminal - AI & Messaging */}
        <SlideTransition type="scale" delay={20}>
          <TerminalWindow
            title="ai_messaging.config"
            status="green"
            width={500}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {leftStack.map((tech, index) => (
                <TechItem
                  key={tech.name}
                  name={tech.name}
                  description={tech.description}
                  nameColor={tech.color}
                  delay={35 + index * 15}
                />
              ))}
            </div>
          </TerminalWindow>
        </SlideTransition>

        {/* Right Terminal - Infrastructure */}
        <SlideTransition type="scale" delay={35}>
          <TerminalWindow
            title="infrastructure.config"
            status="green"
            width={500}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rightStack.map((tech, index) => (
                <TechItem
                  key={tech.name}
                  name={tech.name}
                  description={tech.description}
                  nameColor={tech.color}
                  delay={50 + index * 15}
                />
              ))}
            </div>
          </TerminalWindow>
        </SlideTransition>
      </div>

      {/* Architecture Note */}
      <SlideTransition type="fade" delay={150}>
        <div
          style={{
            marginTop: '32px',
            padding: '16px 32px',
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.borderDefault}`,
            borderRadius: '12px',
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.lg,
              color: colors.syntaxString,
            }}
          >
            # Multi-tenant SaaS with Row-Level Security isolation
          </span>
        </div>
      </SlideTransition>
    </SlideContainer>
  );
};
