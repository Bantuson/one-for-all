# Prospect Profile 017: MSc Candidate - STEM Graduate

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_017 |
| **Name** | Naledi Kgomo |
| **ID Number** | 9809165567890 |
| **Date of Birth** | 1998-09-16 |
| **Gender** | Female |
| **Home Language** | Setswana |
| **Province** | North West |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 79 901 2345 |
| **Email** | naledi.kgomo@nwu.ac.za |
| **WhatsApp** | +27 79 901 2345 |
| **Physical Address** | 45 Campus Road, Potchefstroom, 2520 |

---

## Academic Profile

### Previous Qualifications

| Qualification | Institution | Year | Result |
|---------------|-------------|------|--------|
| BSc (Physics) | North-West University | 2020 | 72% |
| BSc Honours (Physics) | North-West University | 2021 | 75% |

### Research Experience
- Honours project: Solar cell efficiency
- Lab assistant during Honours
- Co-authored 1 conference paper

### Academic Highlights
- NWU Science Faculty award
- DSI-NRF bursary recipient
- Women in Science mentee

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | North-West University |
| **Faculty** | Natural and Agricultural Sciences |
| **Programme** | MSc (Physics) - Research |
| **Minimum Requirement** | Honours with 65%+ |
| **Specific Requirements** | Honours in Physics, research potential |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | University of the Witwatersrand |
| **Faculty** | Science |
| **Programme** | MSc (Physics) |
| **Minimum Requirement** | Honours with 60%+ |
| **Specific Requirements** | Honours in Physics |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | No (Postgraduate) |
| **Funding Applied** | NRF Masters Scholarship |
| **Current Funding** | None (Honours funding ended) |
| **Employment Status** | Unemployed (full-time study intended) |

---

## Documents Available

- [x] ID Document
- [x] Honours Degree Certificate
- [x] Honours Transcript
- [x] BSc Certificate
- [x] Research Proposal
- [x] Publication (conference paper)
- [ ] Reference Letters (x2)
- [ ] NRF Application Confirmation

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Standard OTP flow, generate MSc student number
2. **application_intake_agent**:
   - Capture Honours qualification
   - Research experience details
   - Intended supervisor
3. **rag_specialist_agent**:
   - Verify Honours prerequisite (75% > 65%)
   - Research track validation
   - Same institution continuation
4. **submission_agent**: Submit MSc application
5. **nsfas_agent**: SKIP (postgraduate)

### Edge Cases to Test
- Recent Honours graduate
- Research-based Masters
- Same institution progression
- STEM field requirements
- Research funding alternatives

---

## Notes

- Profile tests standard MSc pathway
- Research-based postgraduate
- Tests Honours-to-Masters progression
