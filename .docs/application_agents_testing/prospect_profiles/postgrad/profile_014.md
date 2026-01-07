# Prospect Profile 014: PGDip Candidate - Career Upgrade

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_014 |
| **Name** | Siphelele Mkhize |
| **ID Number** | 9511125234567 |
| **Date of Birth** | 1995-11-12 |
| **Gender** | Male |
| **Home Language** | isiZulu |
| **Province** | Gauteng |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 76 678 9012 |
| **Email** | siphelele.mkhize@school.edu.za |
| **WhatsApp** | +27 76 678 9012 |
| **Physical Address** | 78 Teacher's Quarters, Pretoria North, 0182 |

---

## Academic Profile

### Previous Qualifications

| Qualification | Institution | Year | Result |
|---------------|-------------|------|--------|
| BEd (Senior Phase) | University of Pretoria | 2018 | 62% |

### Professional Experience
- 5 years as high school Mathematics teacher
- Currently: Grade 10-12 Mathematics teacher
- HOD candidate at current school

### Academic Highlights
- Consistent pass rates above provincial average
- STEM promotion committee member
- Teacher mentorship programme participant

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | University of South Africa |
| **Faculty** | Education |
| **Programme** | PGDip (Education Management) |
| **Minimum Requirement** | BEd or equivalent + 3 years experience |
| **Specific Requirements** | Teaching experience in management context |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | University of Pretoria |
| **Faculty** | Education |
| **Programme** | PGDip (Mathematics Education) |
| **Minimum Requirement** | BEd with Mathematics specialization |
| **Specific Requirements** | Mathematics teaching experience |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | No (Postgraduate + Employed) |
| **Employer Support** | Yes (Department of Education bursary) |
| **Self-Funded** | Partially |
| **Employment Status** | Full-time employed (teacher) |

---

## Documents Available

- [x] ID Document
- [x] BEd Degree Certificate
- [x] Academic Transcript
- [x] SACE Registration
- [x] Employment Confirmation Letter
- [x] Performance Reports
- [ ] Motivation Letter
- [ ] Reference (Principal)

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Standard OTP flow, generate PGDip student number
2. **application_intake_agent**:
   - Capture BEd qualification
   - Teaching experience details
   - Current employment status
3. **rag_specialist_agent**:
   - Verify BEd as prerequisite
   - Experience requirement check (5 years > 3 required)
   - Confirm eligibility for both programmes
4. **submission_agent**: Submit PGDip application(s)
5. **nsfas_agent**: SKIP (postgraduate)

### Edge Cases to Test
- Postgraduate Diploma vs Honours handling
- Professional development context
- Distance learning (UNISA) specific
- Teaching profession requirements
- Government employee bursary

---

## Notes

- Profile tests PGDip application workflow
- Professional development pathway
- Tests work experience validation
