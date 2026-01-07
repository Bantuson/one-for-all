# Application Agents Testing Documentation

## Project Overview

This documentation covers the systematic testing of CrewAI application agents for the One For All multi-tenant admissions management platform. The testing framework evaluates 5 specialized agents across 20 diverse South African prospect profiles to ensure robust, production-ready agent behavior.

### Test Subjects

- **20 Prospect Profiles**: Diverse SA students covering various demographics, academic backgrounds, and application scenarios
  - 10 Undergraduate profiles
  - 10 Postgraduate profiles

### Agents Under Test

| Agent | Primary Function |
|-------|------------------|
| `identity_auth_agent` | OTP delivery, identity verification, student number generation |
| `application_intake_agent` | Personal details collection, course selection (first/second choice) |
| `rag_specialist_agent` | APS calculation, course eligibility, alternative suggestions |
| `submission_agent` | Application payload assembly, multi-institution submission |
| `nsfas_agent` | NSFAS funding application, data reuse optimization |

---

## Experiment Labeling Convention

All experiments follow the format: `exp-NNN`

| Range | Category | Description |
|-------|----------|-------------|
| exp-001 to exp-010 | Undergraduate | Fresh matric and gap year students |
| exp-011 to exp-020 | Postgraduate | Honours, Masters, and PhD candidates |

---

## Testing Methodology

### Sequential Workflow Execution

**Critical Rule**: One prospect at a time, full workflow completion before moving to next.

```
1. Initialize prospect profile
2. Execute identity_auth_agent
3. Execute application_intake_agent
4. Execute rag_specialist_agent
5. Execute submission_agent
6. Execute nsfas_agent (if applicable)
7. Document results in exp_NNN.md
8. Move to next prospect
```

### Key Testing Constraints

1. **Never Verbose Prompts**
   - Agent prompts must be concise
   - No lengthy explanations in agent-to-user communication
   - Maximum 3 sentences per agent response

2. **Documents Can Be Skipped**
   - Document upload is optional during testing
   - Agents must handle missing documents gracefully
   - Validation errors should be clear and actionable

3. **Student Numbers Auto-Generated**
   - Format: `{institution_code}{year}{sequence}`
   - Example: `UP2024000001`
   - No manual entry required during testing

4. **Multi-Institution Support**
   - Prospects may apply to multiple institutions
   - Each application maintains separate state
   - Cross-institution data sharing where appropriate

---

## Directory Structure

```
.docs/application_agents_testing/
|-- README.md                      # This file
|-- exp_results/
|   |-- exp_001.md                 # Experiment results (1-20)
|   |-- ...
|   |-- exp_020.md
|-- prospect_profiles/
|   |-- undergrad/                 # 10 undergraduate profiles
|   |   |-- profile_001.md
|   |   |-- ...
|   |-- postgrad/                  # 10 postgraduate profiles
|       |-- profile_011.md
|       |-- ...
|-- agent_trajectories/
|   |-- expected_behaviors.md      # Success metrics per agent
|-- schema_changes.md              # DB migration documentation
|-- whatsapp_integration.md        # WhatsApp setup guide
```

---

## Success Criteria

### Per-Agent Metrics

| Agent | Key Metric | Target |
|-------|------------|--------|
| identity_auth_agent | OTP delivery time | < 30 seconds |
| application_intake_agent | Field completion rate | 100% required fields |
| rag_specialist_agent | APS match accuracy | > 95% |
| submission_agent | Valid payload rate | 100% |
| nsfas_agent | Data reuse rate | > 80% |

### End-to-End Metrics

- **Full workflow completion**: > 90% of prospects
- **Average conversation turns**: < 15 per application
- **Error recovery rate**: > 85%
- **Multi-institution handling**: 100% correct routing

---

## Getting Started

1. Review prospect profiles in `prospect_profiles/`
2. Understand expected agent behaviors in `agent_trajectories/expected_behaviors.md`
3. Execute experiments sequentially
4. Document results in corresponding `exp_results/exp_NNN.md`
5. Aggregate findings for agent improvements

---

## Related Documentation

- [Backend CLAUDE.md](/apps/backend/CLAUDE.md) - Agent configuration and tools
- [Unified Schema Design](/apps/backend/docs/unified-schema-design.md) - Database architecture
- [Schema Changes](./schema_changes.md) - Testing-related migrations
- [WhatsApp Integration](./whatsapp_integration.md) - Twilio setup guide
