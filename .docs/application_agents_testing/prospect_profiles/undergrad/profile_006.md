# Prospect Profile 006: Disability Applicant

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_006 |
| **Name** | Palesa Mokoena |
| **ID Number** | 0604176543210 |
| **Date of Birth** | 2006-04-17 |
| **Gender** | Female |
| **Home Language** | Setswana |
| **Province** | North West |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 71 890 1234 |
| **Email** | palesa.mokoena@gmail.com |
| **WhatsApp** | +27 71 890 1234 |
| **Physical Address** | 23 Freedom Avenue, Rustenburg, 0300 |

---

## Academic Profile

### Matric Results (NSC 2024)

| Subject | Level | Mark | APS Points |
|---------|-------|------|------------|
| English FAL | FAL | 68% | 5 |
| Setswana Home Language | HL | 82% | 7 |
| Mathematics | - | 75% | 6 |
| Physical Sciences | - | 70% | 5 |
| Computer Applications Technology | - | 85% | 7 |
| Tourism | - | 78% | 6 |
| Life Orientation | - | 88% | - |

**Total APS Score**: 36

### Academic Highlights
- Received concessions for visual impairment
- Top achiever in Computer Applications Technology
- Peer tutor for grade 10 learners

### Disability Information
| Field | Value |
|-------|-------|
| **Type** | Visual Impairment |
| **Severity** | Moderate (legally blind) |
| **Assistive Technology** | Screen reader, magnification software |
| **Concessions Required** | Extended time, enlarged print, screen reader access |

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | North-West University |
| **Faculty** | Natural and Agricultural Sciences |
| **Programme** | BSc (Information Technology) |
| **Minimum APS** | 28 |
| **Specific Requirements** | Maths 50%+ |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | North-West University |
| **Faculty** | Humanities |
| **Programme** | BA (Communication Studies) |
| **Minimum APS** | 26 |
| **Specific Requirements** | English 50%+ |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | Yes |
| **Household Income** | < R250,000 per annum |
| **SASSA Grant Recipient** | Yes (Disability Grant) |
| **Disability Grant** | Yes |
| **Parent/Guardian Employment** | Father employed (mine worker) |

---

## Documents Available

- [x] ID Document
- [x] Matric Certificate
- [x] Final Matric Results
- [x] Disability Assessment Report
- [x] SASSA Disability Grant Statement
- [ ] Proof of Residence
- [ ] Parent/Guardian ID

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Standard OTP flow (ensure accessibility), generate NWU student number
2. **application_intake_agent**: Capture disability information, accommodation needs
3. **rag_specialist_agent**: Confirm eligibility, flag disability support services
4. **submission_agent**: Submit with disability accommodation request
5. **nsfas_agent**: Disability-specific NSFAS flow

### Edge Cases to Test
- Disability grant handling
- Accommodation needs capture
- Accessible communication (WhatsApp compatible)
- Disability-specific NSFAS processing
- Special needs routing

---

## Notes

- Profile tests disability accommodation workflow
- Important for accessibility compliance
- Disability grant data reuse in NSFAS
