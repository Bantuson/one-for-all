import React from 'react';
import { SlideContainer, TerminalWindow, CodeBlock, codeLine } from '../components';
import { colors, fonts, fontSizes } from '../theme';
import { SlideTransition } from '../sequences';

interface FeatureBoxProps {
  title: string;
  description: string;
  delay: number;
}

const FeatureBox: React.FC<FeatureBoxProps> = ({ title, description, delay }) => {
  return (
    <SlideTransition type="fade-slide" delay={delay}>
      <div
        style={{
          padding: '16px',
          backgroundColor: colors.bgCard,
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: '12px',
          width: '240px',
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSizes.lg,
            color: colors.syntaxExport,
            fontWeight: 600,
            marginBottom: '10px',
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
    </SlideTransition>
  );
};

/**
 * Slide 6: Solution - For Institutions
 * Duration: 9 seconds (270 frames at 30fps)
 * Traffic Light: GREEN
 */
export const SolutionInstitutionSlide: React.FC = () => {
  const features = [
    {
      title: 'CrewAI Agents',
      description: 'Specialized AI agents work together to process applications',
    },
    {
      title: 'Bun Sandbox',
      description: 'Secure, isolated processing for each batch',
    },
    {
      title: 'NLP Sorting',
      description: 'Natural language ranking based on your criteria',
    },
    {
      title: '4M+ Scale',
      description: 'Built to handle national application volume',
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
          // FOR INSTITUTIONS
        </h2>
      </SlideTransition>

      {/* Main Content */}
      <div
        style={{
          display: 'flex',
          gap: '32px',
          justifyContent: 'center',
          alignItems: 'flex-start',
          maxWidth: '1400px',
        }}
      >
        {/* Code Block showing AI processing */}
        <SlideTransition type="scale" delay={20}>
          <TerminalWindow
            title="institution_processing.py"
            status="green"
            width={600}
          >
            <CodeBlock
              lines={[
                codeLine('# Intelligent application processing', 'comment'),
                codeLine('class AdmissionsEngine:', 'plain'),
                codeLine('', 'plain'),
                codeLine('def process(self, applications):', 'plain', 4),
                codeLine('# AI agents review each application', 'comment', 8),
                codeLine('agents = self.crew.assemble()', 'plain', 8),
                codeLine('', 'plain'),
                codeLine('# Secure processing environment', 'comment', 8),
                codeLine('with bun.sandbox():', 'plain', 8),
                codeLine('results = agents.evaluate(applications)', 'string', 12),
                codeLine('', 'plain'),
                codeLine('return self.rank(results)', 'plain', 8),
              ]}
            />
          </TerminalWindow>
        </SlideTransition>

        {/* Feature Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
          }}
        >
          {features.map((feature, index) => (
            <FeatureBox
              key={feature.title}
              title={feature.title}
              description={feature.description}
              delay={60 + index * 20}
            />
          ))}
        </div>
      </div>

      {/* Vision Statement */}
      <SlideTransition type="fade" delay={160}>
        <div
          style={{
            marginTop: '32px',
            padding: '20px 40px',
            backgroundColor: colors.bgCard,
            border: `2px solid ${colors.syntaxExport}`,
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
            Vision: One unified platform for all South African admissions
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.base,
              color: colors.syntaxString,
              textAlign: 'center',
            }}
          >
            # Public universities, private institutions, NSFAS, and bursaries
          </div>
        </div>
      </SlideTransition>
    </SlideContainer>
  );
};
