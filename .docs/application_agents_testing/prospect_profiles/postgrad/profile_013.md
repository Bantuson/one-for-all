# Prospect Profile 013: PhD Candidate - Academic Track

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_013 |
| **Name** | Dr. Aisha Patel |
| **ID Number** | 9008230123456 |
| **Date of Birth** | 1990-08-23 |
| **Gender** | Female |
| **Home Language** | English |
| **Province** | KwaZulu-Natal |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 84 567 8901 |
| **Email** | aisha.patel@ukzn.ac.za |
| **WhatsApp** | +27 84 567 8901 |
| **Physical Address** | 23 Research Park, Westville, Durban, 3630 |

---

## Academic Profile

### Previous Qualifications

| Qualification | Institution | Year | Result |
|---------------|-------------|------|--------|
| BSc (Biochemistry) | UKZN | 2012 | 75% |
| BSc Honours (Biochemistry) | UKZN | 2013 | 78% |
| MSc (Biochemistry) | UKZN | 2016 | Distinction |

### Research Experience
- Masters thesis: Gene expression in cancer cells
- 5 peer-reviewed publications
- 3 conference presentations
- Current: Research Assistant at UKZN

### Academic Highlights
- NRF scholarship recipient (Masters)
- Best poster award - SASBMB 2015
- Laboratory manager experience

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | University of KwaZulu-Natal |
| **Faculty** | Science and Agriculture |
| **Programme** | PhD (Biochemistry) |
| **Minimum Requirement** | Masters degree with 65%+ |
| **Specific Requirements** | Research Masters, supervisor availability |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | University of Cape Town |
| **Faculty** | Health Sciences |
| **Programme** | PhD (Medical Biochemistry) |
| **Minimum Requirement** | Masters degree |
| **Specific Requirements** | Research experience, publications |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | No (Postgraduate) |
| **Funding Applied** | NRF Doctoral Scholarship |
| **Self-Funded** | No |
| **Employment Status** | Part-time research assistant |

---

## Documents Available

- [x] ID Document
- [x] Masters Degree Certificate
- [x] Masters Transcript
- [x] Honours Certificate
- [x] BSc Certificate
- [x] Publication List
- [x] Research Proposal (draft)
- [x] CV (Academic)
- [ ] Reference Letters (x3)
- [ ] Supervisor Acceptance Letter

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Standard OTP flow, generate PhD student number
2. **application_intake_agent**:
   - Capture full qualification chain
   - Research experience details
   - Proposed supervisor information
3. **rag_specialist_agent**:
   - Verify Masters as prerequisite
   - Research track validation
   - Supervisor matching potential
4. **submission_agent**: Submit PhD application
5. **nsfas_agent**: SKIP (postgraduate - immediate skip)

### Edge Cases to Test
- Full academic qualification chain
- Research-based programme requirements
- Publication and research experience
- Supervisor requirement handling
- NRF funding pathway (not NSFAS)

---

## Notes

- Profile tests PhD application workflow
- Important for research postgraduate handling
- Tests complex qualification verification
