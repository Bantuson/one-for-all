# Prospect Profile 003: Gap Year Student

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_003 |
| **Name** | Sipho Nkosi |
| **ID Number** | 0503125678901 |
| **Date of Birth** | 2005-03-12 |
| **Gender** | Male |
| **Home Language** | isiXhosa |
| **Province** | Eastern Cape |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 76 567 8901 |
| **Email** | sipho.nkosi@outlook.com |
| **WhatsApp** | +27 76 567 8901 |
| **Physical Address** | 78 Nelson Mandela Blvd, East London, 5201 |

---

## Academic Profile

### Matric Results (NSC 2023)

| Subject | Level | Mark | APS Points |
|---------|-------|------|------------|
| English Home Language | HL | 70% | 5 |
| isiXhosa Home Language | HL | 80% | 6 |
| Mathematics | - | 72% | 6 |
| Physical Sciences | - | 68% | 5 |
| Life Sciences | - | 65% | 5 |
| History | - | 62% | 5 |
| Life Orientation | - | 78% | - |

**Total APS Score**: 32

### Academic Highlights
- School debating team captain
- Community volunteer (gap year activities)
- Completed online coding bootcamp during gap year

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | University of Cape Town |
| **Faculty** | Science |
| **Programme** | BSc (Computer Science) |
| **Minimum APS** | 34 |
| **Specific Requirements** | Maths 70%+, English 60%+ |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | Nelson Mandela University |
| **Faculty** | Science |
| **Programme** | BSc (Information Technology) |
| **Minimum APS** | 28 |
| **Specific Requirements** | Maths 50%+ |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | Yes |
| **Household Income** | < R300,000 per annum |
| **SASSA Grant Recipient** | No |
| **Disability Grant** | No |
| **Parent/Guardian Employment** | Both parents employed (teachers) |

---

## Documents Available

- [x] ID Document
- [x] Matric Certificate
- [x] Final Matric Results
- [ ] Proof of Residence
- [ ] Parent/Guardian ID
- [ ] Proof of Income

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Standard OTP flow, generate student numbers for both institutions
2. **application_intake_agent**: Handle gap year scenario, capture both course choices
3. **rag_specialist_agent**:
   - First choice: BORDERLINE (APS 32 vs required 34)
   - Should recommend second choice and suggest applying anyway
4. **submission_agent**: Submit to both UCT and NMU
5. **nsfas_agent**: Full NSFAS flow

### Edge Cases to Test
- Gap year handling (previous year matric)
- Multi-institution application
- Borderline APS scenario
- Missing documents handling

---

## Notes

- Profile tests gap year scenarios
- Important for testing multi-institution workflow
- Tests borderline eligibility handling
