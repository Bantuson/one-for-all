# Prospect Profile 001: Fresh Matric - High Achiever

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_001 |
| **Name** | Thabo Molefe |
| **ID Number** | 0601155234089 |
| **Date of Birth** | 2006-01-15 |
| **Gender** | Male |
| **Home Language** | Sesotho |
| **Province** | Gauteng |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 72 345 6789 |
| **Email** | thabo.molefe@gmail.com |
| **WhatsApp** | +27 72 345 6789 |
| **Physical Address** | 45 Mandela Drive, Soweto, 1804 |

---

## Academic Profile

### Matric Results (NSC 2024)

| Subject | Level | Mark | APS Points |
|---------|-------|------|------------|
| English Home Language | HL | 78% | 6 |
| Afrikaans FAL | FAL | 65% | 5 |
| Mathematics | - | 85% | 7 |
| Physical Sciences | - | 82% | 7 |
| Life Sciences | - | 75% | 6 |
| Geography | - | 70% | 5 |
| Life Orientation | - | 80% | - |

**Total APS Score**: 36

### Academic Highlights
- Top 10 in grade
- Mathematics Olympiad participant
- Science Expo regional finalist

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | University of Pretoria |
| **Faculty** | Engineering, Built Environment and IT |
| **Programme** | BEng (Computer Engineering) |
| **Minimum APS** | 34 |
| **Specific Requirements** | Maths 70%+, Physical Sciences 60%+ |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | University of Pretoria |
| **Faculty** | Engineering, Built Environment and IT |
| **Programme** | BSc (Computer Science) |
| **Minimum APS** | 32 |
| **Specific Requirements** | Maths 60%+ |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | Yes |
| **Household Income** | < R350,000 per annum |
| **SASSA Grant Recipient** | No |
| **Disability Grant** | No |
| **Parent/Guardian Employment** | Mother employed (domestic worker) |

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

1. **identity_auth_agent**: Standard OTP flow, generate UP student number
2. **application_intake_agent**: Capture all fields, both course choices
3. **rag_specialist_agent**: Confirm eligibility for both choices (APS 36 > 34, 32)
4. **submission_agent**: Submit to UP successfully
5. **nsfas_agent**: Full NSFAS flow, collect financial details

### Edge Cases to Test
- High APS score processing
- Dual course application to same institution
- Complete document set handling

---

## Notes

- Profile represents ideal candidate scenario
- All requirements met for first choice
- NSFAS eligible based on household income
