# Prospect Profile 007: Technical/Vocational Path

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_007 |
| **Name** | Andile Mthembu |
| **ID Number** | 0511207654321 |
| **Date of Birth** | 2005-11-20 |
| **Gender** | Male |
| **Home Language** | isiNdebele |
| **Province** | Mpumalanga |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 73 901 2345 |
| **Email** | andile.mthembu@techmail.co.za |
| **WhatsApp** | +27 73 901 2345 |
| **Physical Address** | 67 Industrial Road, Nelspruit, 1200 |

---

## Academic Profile

### Matric Results (NSC 2024) - Technical

| Subject | Level | Mark | APS Points |
|---------|-------|------|------------|
| English FAL | FAL | 58% | 4 |
| isiNdebele Home Language | HL | 70% | 5 |
| Technical Mathematics | - | 65% | 5 |
| Engineering Graphics and Design | - | 80% | 6 |
| Electrical Technology | - | 75% | 6 |
| Technical Sciences | - | 68% | 5 |
| Life Orientation | - | 72% | - |

**Total APS Score**: 31

### Academic Highlights
- Provincial skills competition finalist
- Technical workshop assistant
- Apprenticeship experience during holidays

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | Tshwane University of Technology |
| **Faculty** | Engineering and the Built Environment |
| **Programme** | National Diploma: Electrical Engineering |
| **Minimum APS** | 26 |
| **Specific Requirements** | Technical Maths 50%+, Technical Sciences 50%+ |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | Tshwane University of Technology |
| **Faculty** | Engineering and the Built Environment |
| **Programme** | National Diploma: Mechanical Engineering |
| **Minimum APS** | 26 |
| **Specific Requirements** | Technical Maths 50%+, Technical Sciences 50%+ |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | Yes |
| **Household Income** | < R200,000 per annum |
| **SASSA Grant Recipient** | No |
| **Disability Grant** | No |
| **Parent/Guardian Employment** | Father: Factory worker, Mother: Domestic worker |

---

## Documents Available

- [x] ID Document
- [x] Matric Certificate (Technical)
- [x] Final Matric Results
- [ ] Proof of Residence
- [ ] Parent/Guardian ID
- [ ] Proof of Income
- [x] Apprenticeship Certificate

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Standard OTP flow, generate TUT student number
2. **application_intake_agent**: Handle technical matric subjects
3. **rag_specialist_agent**:
   - Map Technical Maths/Sciences to requirements
   - Confirm diploma programme eligibility
4. **submission_agent**: Submit to TUT
5. **nsfas_agent**: Standard NSFAS flow

### Edge Cases to Test
- Technical matric subject handling
- Technical vs Pure Mathematics mapping
- Diploma programme requirements
- UoT-specific application flow

---

## Notes

- Profile tests technical stream handling
- Important for UoT application flows
- Technical subject mapping validation
