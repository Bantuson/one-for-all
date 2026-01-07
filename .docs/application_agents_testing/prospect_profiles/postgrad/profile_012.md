# Prospect Profile 012: Masters Candidate - Working Professional

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_012 |
| **Name** | Dr. Themba Ndlovu |
| **ID Number** | 9206158901234 |
| **Date of Birth** | 1992-06-15 |
| **Gender** | Male |
| **Home Language** | isiXhosa |
| **Province** | Western Cape |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 83 456 7890 |
| **Email** | themba.ndlovu@corporate.co.za |
| **WhatsApp** | +27 83 456 7890 |
| **Physical Address** | 45 Waterfront Apartments, Cape Town, 8001 |

---

## Academic Profile

### Previous Qualifications

| Qualification | Institution | Year | Result |
|---------------|-------------|------|--------|
| BCom (Economics) | University of Cape Town | 2014 | 65% |
| BCom Honours (Economics) | University of Cape Town | 2015 | 72% |

### Professional Experience
- 8 years in economic consulting
- Currently: Senior Economist at major consulting firm
- Published 3 industry reports

### Academic Highlights
- Honours dissertation distinction
- Economic Society of SA member
- Guest lecturer (part-time)

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | University of Cape Town |
| **Faculty** | Commerce |
| **Programme** | MCom (Economics) - Coursework |
| **Minimum Requirement** | Honours degree with 65%+ |
| **Specific Requirements** | Honours in Economics or related field |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | Stellenbosch University |
| **Faculty** | Economic and Management Sciences |
| **Programme** | MCom (Economics) |
| **Minimum Requirement** | Honours degree with 60%+ |
| **Specific Requirements** | Honours in Economics |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | No (Postgraduate + Employed) |
| **Employer Sponsorship** | Yes (partial) |
| **Self-Funded** | Partially |
| **Employment Status** | Full-time employed |

---

## Documents Available

- [x] ID Document
- [x] Honours Degree Certificate
- [x] Honours Academic Transcript
- [x] BCom Degree Certificate
- [x] CV/Resume
- [x] Employer Support Letter
- [ ] Research Proposal
- [ ] Reference Letters (academic)

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Standard OTP flow, generate Masters student number
2. **application_intake_agent**:
   - Capture multiple qualifications
   - Handle working professional context
   - Part-time study preference
3. **rag_specialist_agent**:
   - Verify Honours as prerequisite
   - Check years since graduation (9 years)
   - Confirm eligibility
4. **submission_agent**: Submit Masters application
5. **nsfas_agent**: SKIP (postgraduate - immediate skip expected)

### Edge Cases to Test
- Multiple previous qualifications
- Long gap since Honours (9 years)
- Working professional context
- Part-time study options
- Employer sponsorship handling

---

## Notes

- Profile tests mature postgraduate applicant
- Important for working professional workflow
- Tests qualification chain verification
