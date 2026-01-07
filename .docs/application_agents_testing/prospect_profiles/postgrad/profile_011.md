# Prospect Profile 011: Honours Candidate - Recent Graduate

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_011 |
| **Name** | Zanele Mbeki |
| **ID Number** | 0001156789012 |
| **Date of Birth** | 2000-01-15 |
| **Gender** | Female |
| **Home Language** | isiZulu |
| **Province** | Gauteng |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 82 345 6789 |
| **Email** | zanele.mbeki@alumni.wits.ac.za |
| **WhatsApp** | +27 82 345 6789 |
| **Physical Address** | 12 Academic Close, Braamfontein, Johannesburg, 2001 |

---

## Academic Profile

### Undergraduate Qualification

| Field | Value |
|-------|-------|
| **Institution** | University of the Witwatersrand |
| **Degree** | BCom (Accounting) |
| **Year Completed** | 2024 |
| **GPA/Average** | 68% (Upper Second Class) |
| **Duration** | 3 years |

### Key Modules

| Module | Mark |
|--------|------|
| Financial Accounting 3 | 72% |
| Management Accounting 3 | 65% |
| Taxation 3 | 70% |
| Auditing 3 | 68% |

### Academic Highlights
- Dean's Merit List 2023
- Accounting Society member
- Completed CTA-ready modules

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | University of the Witwatersrand |
| **Faculty** | Commerce, Law and Management |
| **Programme** | BCom Honours (Accounting) / CTA |
| **Minimum Requirement** | 60% BCom average |
| **Specific Requirements** | BCom Accounting degree, specific module completion |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | University of Johannesburg |
| **Faculty** | College of Business and Economics |
| **Programme** | BCom Honours (Accounting) |
| **Minimum Requirement** | 60% BCom average |
| **Specific Requirements** | BCom Accounting degree |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | No (Postgraduate) |
| **Bursary/Funding** | Applying for firm bursary |
| **Self-Funded** | Partially |
| **Employment Status** | Unemployed (full-time study intended) |

---

## Documents Available

- [x] ID Document
- [x] Undergraduate Degree Certificate
- [x] Academic Transcript
- [x] Proof of Residence
- [ ] Reference Letters
- [ ] Statement of Purpose

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Standard OTP flow, generate Honours student number
2. **application_intake_agent**:
   - Capture undergraduate qualification details
   - Verify prerequisite modules
   - Handle postgraduate-specific fields
3. **rag_specialist_agent**:
   - Verify Honours eligibility (68% > 60% requirement)
   - Check module prerequisites
   - Confirm CTA pathway compatibility
4. **submission_agent**: Submit Honours application
5. **nsfas_agent**: SKIP (postgraduate - NSFAS not applicable)

### Edge Cases to Test
- Recent graduate transitioning to postgrad
- Same institution continuation
- CTA/professional programme requirements
- Postgraduate NSFAS skip (100% expected)

---

## Notes

- Profile tests standard Honours application
- Professional accounting pathway
- NSFAS skip is critical test
