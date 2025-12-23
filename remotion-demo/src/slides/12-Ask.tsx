import React from 'react';
import { SlideContainer, TerminalWindow, CommandPrompt } from '../components';
import { colors, fonts, fontSizes } from '../theme';
import { SlideTransition } from '../sequences';

interface BudgetLineProps {
  label: string;
  amount: string;
  isTotal?: boolean;
  delay: number;
}

const BudgetLine: React.FC<BudgetLineProps> = ({ label, amount, isTotal = false, delay }) => {
  return (
    <SlideTransition type="fade-slide" delay={delay}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isTotal ? '12px 0' : '10px 0',
          borderBottom: isTotal ? 'none' : `1px solid ${colors.borderDefault}`,
          borderTop: isTotal ? `2px solid ${colors.primary}` : 'none',
          marginTop: isTotal ? '6px' : 0,
        }}
      >
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: isTotal ? fontSizes.xl : fontSizes.lg,
            color: isTotal ? colors.textPrimary : colors.textSecondary,
            fontWeight: isTotal ? 700 : 400,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: isTotal ? fontSizes.xl : fontSizes.lg,
            color: isTotal ? colors.primary : colors.trafficYellow,
            fontWeight: isTotal ? 700 : 600,
          }}
        >
          {amount}
        </span>
      </div>
    </SlideTransition>
  );
};

/**
 * Slide 12: The Ask
 * Duration: 10 seconds (300 frames at 30fps)
 * Traffic Light: GREEN
 */
export const AskSlide: React.FC = () => {
  const budget = [
    { label: 'Full Stack Developer (Intermediate)', amount: 'R576,000' },
    { label: 'Backend Engineer (Intermediate)', amount: 'R660,000' },
    { label: 'DevOps Engineer (Intermediate)', amount: 'R720,000' },
    { label: 'Total Salaries', amount: 'R1,956,000' },
    { label: 'Employer Costs (20%)', amount: 'R391,000' },
    { label: 'Infrastructure & APIs', amount: 'R300,000' },
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
          // THE ASK
        </h2>
      </SlideTransition>

      {/* Total Amount */}
      <SlideTransition type="scale" delay={15}>
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSizes['4xl'],
            fontWeight: 700,
            color: colors.primary,
            marginBottom: '12px',
            textAlign: 'center',
          }}
        >
          R2,650,000
        </div>
      </SlideTransition>

      <SlideTransition type="fade" delay={25}>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSizes.lg,
            color: colors.textSecondary,
            marginBottom: '28px',
            textAlign: 'center',
          }}
        >
          12-month runway to product-market fit
        </div>
      </SlideTransition>

      {/* Budget Breakdown Terminal */}
      <SlideTransition type="scale" delay={40}>
        <TerminalWindow
          title="budget_breakdown.json"
          status="green"
          width={650}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {budget.map((item, index) => (
              <BudgetLine
                key={item.label}
                label={item.label}
                amount={item.amount}
                delay={55 + index * 12}
              />
            ))}
            <BudgetLine
              label="TOTAL ASK"
              amount="R2,650,000"
              isTotal={true}
              delay={130}
            />
          </div>
        </TerminalWindow>
      </SlideTransition>

      {/* Contact & CTA */}
      <SlideTransition type="fade" delay={170}>
        <div
          style={{
            marginTop: '28px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.lg,
              color: colors.textSecondary,
              marginBottom: '16px',
            }}
          >
            Contact: hello@oneforall.co.za
          </div>
          <div
            style={{
              backgroundColor: colors.bgCard,
              border: `2px solid ${colors.primary}`,
              borderRadius: '12px',
              padding: '16px 32px',
              display: 'inline-block',
            }}
          >
            <CommandPrompt
              command="crew.kickoff()  # Let's build the future"
              prefix=">>> "
              speed={0.4}
              delay={200}
            />
          </div>
        </div>
      </SlideTransition>
    </SlideContainer>
  );
};
