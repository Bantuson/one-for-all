import React from 'react';
import { SlideContainer, TerminalWindow } from '../components';
import { colors, fonts, fontSizes } from '../theme';
import { SlideTransition } from '../sequences';

interface TeamMemberProps {
  name: string;
  role: string;
  background: string;
  initial: string;
  delay: number;
}

const TeamMember: React.FC<TeamMemberProps> = ({ name, role, background, initial, delay }) => {
  return (
    <SlideTransition type="fade-slide" delay={delay}>
      <div
        style={{
          padding: '20px',
          backgroundColor: colors.bgCard,
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: '12px',
          width: '360px',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: colors.syntaxExport,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <span
            style={{
              fontFamily: fonts.sans,
              fontSize: fontSizes['2xl'],
              color: colors.bgPrimary,
              fontWeight: 700,
            }}
          >
            {initial}
          </span>
        </div>

        {/* Name */}
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSizes.xl,
            color: colors.textPrimary,
            fontWeight: 600,
            marginBottom: '6px',
          }}
        >
          {name}
        </div>

        {/* Role */}
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSizes.lg,
            color: colors.syntaxExport,
            marginBottom: '12px',
          }}
        >
          {role}
        </div>

        {/* Background */}
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSizes.base,
            color: colors.textSecondary,
            lineHeight: 1.4,
          }}
        >
          {background}
        </div>
      </div>
    </SlideTransition>
  );
};

/**
 * Slide 11: Team
 * Duration: 8 seconds (240 frames at 30fps)
 * Traffic Light: GREEN
 */
export const TeamSlide: React.FC = () => {
  const team = [
    {
      name: 'Founder 1',
      role: 'CEO / Co-Founder',
      background: 'EdTech + AI background, South African education system experience',
      initial: 'F',
    },
    {
      name: 'Founder 2',
      role: 'CTO / Co-Founder',
      background: 'Full-stack engineering, Python/TypeScript, AI/ML systems',
      initial: 'C',
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
          // THE TEAM
        </h2>
      </SlideTransition>

      {/* Team Members */}
      <div
        style={{
          display: 'flex',
          gap: '32px',
          justifyContent: 'center',
          marginBottom: '32px',
        }}
      >
        {team.map((member, index) => (
          <TeamMember
            key={member.name}
            name={member.name}
            role={member.role}
            background={member.background}
            initial={member.initial}
            delay={20 + index * 30}
          />
        ))}
      </div>

      {/* Equity Structure */}
      <SlideTransition type="scale" delay={100}>
        <TerminalWindow
          title="cap_table.json"
          status="green"
          width={550}
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
            <div style={{ color: colors.syntaxString }}>
              # Equity Structure
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: `1px solid ${colors.borderDefault}`,
              }}
            >
              <span style={{ color: colors.textSecondary }}>Founders (50/50 split)</span>
              <span style={{ color: colors.primary }}>68%</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: `1px solid ${colors.borderDefault}`,
              }}
            >
              <span style={{ color: colors.textSecondary }}>Staff Pool (reserved)</span>
              <span style={{ color: colors.trafficYellow }}>12%</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
              }}
            >
              <span style={{ color: colors.textSecondary }}>Investor Pool (reserved)</span>
              <span style={{ color: colors.syntaxExport }}>20%</span>
            </div>
          </div>
        </TerminalWindow>
      </SlideTransition>

      {/* Comment */}
      <SlideTransition type="fade" delay={160}>
        <div
          style={{
            marginTop: '28px',
            fontFamily: fonts.mono,
            fontSize: fontSizes.lg,
            color: colors.syntaxString,
          }}
        >
          # South African founders solving South African problems
        </div>
      </SlideTransition>
    </SlideContainer>
  );
};
