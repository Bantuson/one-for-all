# Prospect Profile 009: Mature Student - Career Change

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_009 |
| **Name** | Bongiwe Sithole |
| **ID Number** | 9503125876543 |
| **Date of Birth** | 1995-03-12 |
| **Gender** | Female |
| **Home Language** | isiSwati |
| **Province** | Mpumalanga |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 82 123 4567 |
| **Email** | bongiwe.sithole@corporate.co.za |
| **WhatsApp** | +27 82 123 4567 |
| **Physical Address** | 34 Executive Gardens, Midrand, 1685 |

---

## Academic Profile

### Matric Results (NSC 2013)

| Subject | Level | Mark | APS Points |
|---------|-------|------|------------|
| English Home Language | HL | 72% | 6 |
| isiSwati Home Language | HL | 78% | 6 |
| Mathematics | - | 65% | 5 |
| Business Studies | - | 70% | 5 |
| Economics | - | 68% | 5 |
| Accounting | - | 62% | 5 |
| Life Orientation | - | 80% | - |

**Total APS Score**: 32

### Post-Matric Experience
- National Certificate: Financial Management (2014)
- 8 years work experience in finance
- Currently: Senior Accounts Clerk

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | UNISA |
| **Faculty** | Economic and Management Sciences |
| **Programme** | BCom (Accounting Sciences) |
| **Minimum APS** | 28 |
| **Specific Requirements** | Maths 50%+, English 50%+ |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | UNISA |
| **Faculty** | Economic and Management Sciences |
| **Programme** | BCom (General) |
| **Minimum APS** | 24 |
| **Specific Requirements** | English 50%+ |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | No (Employed, income too high) |
| **Household Income** | R480,000 per annum |
| **SASSA Grant Recipient** | No |
| **Disability Grant** | No |
| **Employment Status** | Full-time employed |

---

## Documents Available

- [x] ID Document
- [x] Matric Certificate
- [x] Final Matric Results
- [x] National Certificate
- [x] Proof of Employment
- [x] Proof of Residence
- [ ] Academic Transcripts (previous studies)

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Standard OTP flow, generate UNISA student number
2. **application_intake_agent**:
   - Handle mature applicant (29 years old)
   - Capture work experience
   - Previous qualifications handling
3. **rag_specialist_agent**:
   - Old matric results (2013) validity
   - Recognition of prior learning potential
   - Confirm eligibility
4. **submission_agent**: Submit to UNISA (distance learning)
5. **nsfas_agent**: SKIP (employed, income exceeds threshold)

### Edge Cases to Test
- Mature student (age 29) handling
- Old matric results (11+ years)
- Distance learning institution
- Employed applicant NSFAS skip
- Prior learning recognition

---

## Notes

- Profile tests mature student workflow
- Distance learning specific handling
- Important for career change scenarios
