# Agent Expected Behaviors and Success Metrics

This document defines the expected behaviors, success metrics, and failure conditions for each agent in the application workflow.

---

## Table of Contents

1. [identity_auth_agent](#1-identity_auth_agent)
2. [application_intake_agent](#2-application_intake_agent)
3. [rag_specialist_agent](#3-rag_specialist_agent)
4. [submission_agent](#4-submission_agent)
5. [nsfas_agent](#5-nsfas_agent)
6. [Cross-Agent Metrics](#cross-agent-metrics)
7. [Failure Recovery Patterns](#failure-recovery-patterns)

---

## 1. identity_auth_agent

### Primary Function
Identity verification, OTP delivery, and student number generation.

### Success Metrics

| Metric | Target | Critical | Measurement |
|--------|--------|----------|-------------|
| OTP Delivery Time | < 30 seconds | Yes | Time from request to delivery confirmation |
| OTP Delivery Success | > 99% | Yes | Successful delivery / total attempts |
| Student Number Format | 100% valid | Yes | Regex validation per institution |
| Identity Verification | 100% correct | Yes | ID/passport validation accuracy |
| Conversation Turns | < 3 | No | Turns to complete verification |

### Student Number Formats

| Institution | Format | Example |
|-------------|--------|---------|
| University of Pretoria | `u{year}{7-digit}` | `u24012345` |
| UCT | `{SURNAME}{5-digit}` | `SMITH12345` |
| Wits | `{year}{6-digit}` | `2401234` |
| UKZN | `{year}{7-digit}` | `224012345` |
| UJ | `{year}{6-digit}` | `202401234` |
| Stellenbosch | `{year}{5-digit}` | `24012345` |
| UNISA | `{8-digit}` | `12345678` |
| NWU | `{year}{5-digit}` | `24012345` |
| UFS | `{year}{7-digit}` | `2024001234` |
| TUT | `{year}{6-digit}` | `24012345` |

### Expected Trajectory

```
1. Receive user contact (phone/WhatsApp)
2. Validate contact format
3. Generate OTP (6-digit)
4. Send OTP via WhatsApp/SMS
5. Receive OTP confirmation from user
6. Validate OTP (max 3 attempts)
7. Generate institution-specific student number
8. Store verification status
9. Hand off to application_intake_agent
```

### Failure Conditions

| Condition | Action | Recovery |
|-----------|--------|----------|
| OTP delivery failure | Retry 2x, then offer SMS fallback | Auto-retry |
| Invalid OTP 3x | Lock for 15 minutes | User notification |
| Invalid ID format | Request correction | User retry |
| System timeout | Queue for retry | Auto-recovery |

### Concise Response Examples

**Good** (concise):
```
OTP sent to your WhatsApp. Please share the 6-digit code.
```

**Bad** (verbose):
```
We have successfully sent a one-time password (OTP) to your WhatsApp
number ending in 6789. This code is valid for 5 minutes and will be
used to verify your identity. Please check your WhatsApp messages
and share the 6-digit code with us when you receive it.
```

---

## 2. application_intake_agent

### Primary Function
Personal details collection, course selection (first/second choice), and document handling.

### Success Metrics

| Metric | Target | Critical | Measurement |
|--------|--------|----------|-------------|
| Required Fields Captured | 100% | Yes | All mandatory fields completed |
| First Choice Recorded | 100% | Yes | Valid programme selection |
| Second Choice Recorded | 100% | Yes | Valid alternative selection |
| Data Validation | 100% | Yes | Format and range validation |
| Document Handling | Graceful | No | Missing docs don't block progress |
| Conversation Turns | < 5 | No | Turns to capture all details |

### Required Fields by Category

#### Personal Information
- Full name (first, middle, last)
- ID number / Passport number
- Date of birth
- Gender
- Home language
- Citizenship
- Contact details (phone, email, address)

#### Academic Information (Undergraduate)
- Matric year
- School name
- Examination body (NSC/IEB/ZIMSEC/etc.)
- Subjects and marks
- APS score (calculated)

#### Academic Information (Postgraduate)
- Previous qualification(s)
- Institution(s)
- Year(s) completed
- Results/GPA

#### Course Selection
- First choice institution
- First choice programme
- Second choice programme
- Study mode (full-time/part-time)

### Expected Trajectory

```
1. Receive verified user from identity_auth_agent
2. Greet and confirm identity
3. Collect personal information
4. Collect academic information
5. Calculate APS (if undergraduate)
6. Capture first choice course
7. Capture second choice course
8. Request documents (optional collection)
9. Validate all captured data
10. Hand off to rag_specialist_agent
```

### Document Handling Rules

1. **Documents CAN be skipped** - Application proceeds without documents
2. Agent notes missing documents for later collection
3. No blocking on document upload
4. Clear communication on what's pending

### Failure Conditions

| Condition | Action | Recovery |
|-----------|--------|----------|
| Missing required field | Prompt specifically | User input |
| Invalid data format | Explain format, retry | User correction |
| Course not found | Suggest alternatives | RAG handoff |
| Session timeout | Save progress, resume | Auto-recovery |

---

## 3. rag_specialist_agent

### Primary Function
APS comparison, course eligibility verification, and alternative suggestions.

### Success Metrics

| Metric | Target | Critical | Measurement |
|--------|--------|----------|-------------|
| APS Comparison Accuracy | > 95% | Yes | Correct eligibility determination |
| Course Eligibility Check | 100% correct | Yes | Match against requirements |
| Alternative Suggestions | Relevant | No | Quality of backup options |
| Response Time | < 5 seconds | No | RAG query + response |
| Conversation Turns | < 4 | No | Turns for eligibility feedback |

### APS Calculation Rules

| Mark Range | APS Points |
|------------|------------|
| 80-100% | 7 |
| 70-79% | 6 |
| 60-69% | 5 |
| 50-59% | 4 |
| 40-49% | 3 |
| 30-39% | 2 |
| 0-29% | 1 |

**Note**: Life Orientation is excluded from APS calculation.

### Expected Trajectory

```
1. Receive applicant data from intake_agent
2. Extract APS score and subject marks
3. Query course requirements from RAG
4. Compare applicant APS vs minimum APS
5. Check specific subject requirements
6. Determine eligibility status:
   - ELIGIBLE: Meets all requirements
   - BORDERLINE: Close to requirements
   - INELIGIBLE: Does not meet requirements
7. If ineligible/borderline, suggest alternatives
8. Compile eligibility report
9. Hand off to submission_agent
```

### Eligibility Decision Matrix

| APS Status | Subject Req | Decision | Action |
|------------|-------------|----------|--------|
| Above | Met | ELIGIBLE | Proceed |
| Above | Not Met | INELIGIBLE | Suggest alt |
| Equal | Met | ELIGIBLE | Proceed |
| Equal | Not Met | INELIGIBLE | Suggest alt |
| Below (1-2) | Met | BORDERLINE | Warn + proceed |
| Below (3+) | Any | INELIGIBLE | Suggest alt |

### Alternative Suggestion Rules

1. Same faculty, lower requirements
2. Same institution, related field
3. Different institution, same programme
4. Maximum 3 alternatives suggested

### Failure Conditions

| Condition | Action | Recovery |
|-----------|--------|----------|
| Course not in database | Flag for manual review | Admin alert |
| Ambiguous requirements | Conservative eligibility | Manual verification |
| RAG timeout | Cache fallback | Retry with cache |

---

## 4. submission_agent

### Primary Function
Application payload assembly, multi-institution submission, and confirmation handling.

### Success Metrics

| Metric | Target | Critical | Measurement |
|--------|--------|----------|-------------|
| Payload Validity | 100% | Yes | Schema validation pass rate |
| Multi-Institution Handling | 100% correct | Yes | Correct routing per institution |
| Submission Confirmation | 100% received | Yes | Confirmation per submission |
| Error Recovery | > 85% | No | Successful retries / failures |
| Conversation Turns | < 3 | No | Turns to complete submission |

### Payload Structure

```json
{
  "application_id": "string (UUID)",
  "institution_code": "string",
  "student_number": "string",
  "applicant": {
    "id_number": "string",
    "full_name": "string",
    "contact": {...}
  },
  "academic": {
    "matric_year": "number",
    "aps_score": "number",
    "subjects": [...]
  },
  "courses": {
    "first_choice": {
      "programme_code": "string",
      "programme_name": "string"
    },
    "second_choice": {
      "programme_code": "string",
      "programme_name": "string"
    }
  },
  "documents": [...],
  "submitted_at": "ISO timestamp"
}
```

### Expected Trajectory

```
1. Receive eligibility report from rag_specialist_agent
2. Assemble application payload(s)
3. Validate payload(s) against schema
4. For each institution:
   a. Prepare institution-specific format
   b. Submit to institution endpoint
   c. Await confirmation
   d. Store submission record
5. Compile submission summary
6. Notify applicant of status
7. Hand off to nsfas_agent (if applicable)
```

### Multi-Institution Handling

| Scenario | Behavior |
|----------|----------|
| Single institution | Single submission |
| Multiple institutions | Sequential submissions |
| Same programme, diff institutions | Duplicate data, diff student numbers |
| Submission failure | Retry 3x, then queue |

### Failure Conditions

| Condition | Action | Recovery |
|-----------|--------|----------|
| Payload validation fail | Log error, fix data | Auto-correction |
| Institution API timeout | Retry with backoff | 3 retries |
| Duplicate submission | Detect and skip | Idempotency check |
| Partial multi-submit fail | Complete successes, retry failures | Manual queue |

---

## 5. nsfas_agent

### Primary Function
NSFAS funding application, data reuse optimization, and postgraduate handling.

### Success Metrics

| Metric | Target | Critical | Measurement |
|--------|--------|----------|-------------|
| Data Reuse Rate | > 80% | Yes | Reused fields / total fields |
| Postgrad Skip Rate | 100% | Yes | Immediate skip for postgrad |
| New Fields Collected | Minimal | No | New inputs required |
| Eligibility Assessment | 100% correct | Yes | Income threshold accuracy |
| Conversation Turns | < 4 (undergrad), 1 (postgrad) | No | Turns to complete |

### Data Reuse Fields

| Field | Source | Reuse Rate Target |
|-------|--------|-------------------|
| Full Name | Application | 100% |
| ID Number | Application | 100% |
| Contact Details | Application | 100% |
| Institution | Application | 100% |
| Home Address | Application | 100% |
| Date of Birth | Application | 100% |

### NSFAS-Specific Fields

| Field | Description | Required |
|-------|-------------|----------|
| Household Income | Annual combined income | Yes |
| SASSA Grant Status | Current grants received | Yes |
| Disability Status | Disability grant | Yes |
| Parent/Guardian Employment | Employment details | Yes |
| Dependants | Number of dependants | Yes |
| Bank Details | For funding disbursement | Yes |

### Expected Trajectory (Undergraduate)

```
1. Receive submission confirmation
2. Check education level:
   - If Postgraduate: SKIP immediately
3. Check income eligibility
4. Reuse existing application data (80%+ fields)
5. Collect NSFAS-specific fields only
6. Validate NSFAS application
7. Submit to NSFAS
8. Provide confirmation
```

### Expected Trajectory (Postgraduate)

```
1. Receive submission confirmation
2. Detect postgraduate application
3. Display skip message:
   "NSFAS funding is for undergraduate students.
    For postgraduate funding, please visit [NRF/institutional bursary links]."
4. Complete workflow
```

### Skip Conditions

| Condition | Skip? | Message |
|-----------|-------|---------|
| Postgraduate | Yes | NSFAS is for undergrad only |
| International | Yes | NSFAS is for SA citizens |
| Income > R350k | Yes | Income exceeds threshold |
| Already funded | Yes | Active NSFAS funding exists |

### Failure Conditions

| Condition | Action | Recovery |
|-----------|--------|----------|
| Income verification fail | Request documentation | User upload |
| SASSA validation fail | Manual verification | Admin review |
| Duplicate application | Warn and link existing | User choice |

---

## Cross-Agent Metrics

### End-to-End Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Full Workflow Completion | > 90% | Completed / Started |
| Average Conversation Turns | < 15 | Total turns per application |
| Error Recovery Rate | > 85% | Recovered / Total errors |
| Multi-Institution Success | 100% | Correct routing |
| Data Consistency | 100% | Cross-agent data integrity |

### Handoff Success Rates

| From | To | Target Success |
|------|-----|----------------|
| identity_auth | application_intake | > 99% |
| application_intake | rag_specialist | > 99% |
| rag_specialist | submission | > 95% |
| submission | nsfas | > 99% |

---

## Failure Recovery Patterns

### Retry Strategies

| Error Type | Strategy | Max Retries | Backoff |
|------------|----------|-------------|---------|
| Network timeout | Exponential backoff | 3 | 1s, 2s, 4s |
| API error (5xx) | Immediate retry | 3 | None |
| Validation error | Fix and retry | 2 | None |
| Rate limit | Wait and retry | 5 | As specified |

### Escalation Path

```
1. Automatic retry (per strategy)
2. Alternative method (e.g., SMS instead of WhatsApp)
3. Queue for delayed processing
4. Manual admin review
5. User notification with options
```

### Data Persistence

- All progress saved after each turn
- Session recoverable for 24 hours
- Partial applications resumable
- No data loss on agent failure

---

## Prompt Constraints Reminder

### Never Verbose Rule

All agent responses must follow these constraints:

1. **Maximum 3 sentences per response**
2. **No lengthy explanations**
3. **Direct questions only**
4. **No repetition of information**
5. **No filler phrases**

### Response Length Guidelines

| Context | Max Length |
|---------|------------|
| Simple confirmation | 1 sentence |
| Data request | 1-2 sentences |
| Error/warning | 2 sentences |
| Complex decision | 3 sentences max |
