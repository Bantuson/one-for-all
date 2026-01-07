# Prospect Profile 004: Rural Student - Limited Resources

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_004 |
| **Name** | Nomvula Khumalo |
| **ID Number** | 0607154321098 |
| **Date of Birth** | 2006-07-15 |
| **Gender** | Female |
| **Home Language** | Sepedi |
| **Province** | Limpopo |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 79 678 9012 |
| **Email** | nomvula.khumalo@gmail.com |
| **WhatsApp** | +27 79 678 9012 |
| **Physical Address** | Stand 456, Giyani Village, Limpopo, 0826 |

---

## Academic Profile

### Matric Results (NSC 2024)

| Subject | Level | Mark | APS Points |
|---------|-------|------|------------|
| English FAL | FAL | 55% | 4 |
| Sepedi Home Language | HL | 72% | 6 |
| Mathematics | - | 60% | 5 |
| Agricultural Sciences | - | 78% | 6 |
| Life Sciences | - | 70% | 5 |
| Geography | - | 65% | 5 |
| Life Orientation | - | 82% | - |

**Total APS Score**: 31

### Academic Highlights
- School garden project leader
- First in family to complete matric
- Community health volunteer

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | University of Limpopo |
| **Faculty** | Health Sciences |
| **Programme** | BSc (Nursing) |
| **Minimum APS** | 28 |
| **Specific Requirements** | Life Sciences 50%+, English 50%+ |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | University of Limpopo |
| **Faculty** | Science and Agriculture |
| **Programme** | BSc (Agriculture) |
| **Minimum APS** | 26 |
| **Specific Requirements** | Maths/Maths Lit 50%+, Agricultural Sciences 50%+ |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | Yes |
| **Household Income** | < R100,000 per annum |
| **SASSA Grant Recipient** | Yes (Old Age Pension - Grandmother) |
| **Disability Grant** | No |
| **Parent/Guardian Employment** | Orphan, raised by grandmother |

---

## Documents Available

- [x] ID Document
- [x] Matric Certificate
- [ ] Final Matric Results (pending)
- [ ] Proof of Residence
- [x] SASSA Statement (Grandmother's)
- [ ] Death Certificates (Parents)

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Standard OTP flow, generate UL student number
2. **application_intake_agent**: Handle orphan status, minimal document set
3. **rag_specialist_agent**: Confirm eligibility for both choices
4. **submission_agent**: Submit to UL
5. **nsfas_agent**: Orphan-specific flow, grandmother's SASSA data

### Edge Cases to Test
- Orphan applicant handling
- Grandmother as guardian scenario
- Minimal document set
- Rural address handling
- First-generation student

---

## Notes

- Profile represents vulnerable student category
- Tests orphan-specific NSFAS processes
- Limited document availability scenario
