# Prospect Profile 005: Private School - High Income

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_005 |
| **Name** | Michael van der Merwe |
| **ID Number** | 0609285432109 |
| **Date of Birth** | 2006-09-28 |
| **Gender** | Male |
| **Home Language** | Afrikaans |
| **Province** | Western Cape |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 82 789 0123 |
| **Email** | michael.vdm@private.edu |
| **WhatsApp** | +27 82 789 0123 |
| **Physical Address** | 15 Ocean View Road, Camps Bay, Cape Town, 8005 |

---

## Academic Profile

### Matric Results (NSC 2024) - IEB

| Subject | Level | Mark | APS Points |
|---------|-------|------|------------|
| English Home Language | HL | 82% | 7 |
| Afrikaans Home Language | HL | 88% | 7 |
| Mathematics | - | 90% | 7 |
| Physical Sciences | - | 85% | 7 |
| Information Technology | - | 92% | 7 |
| Accounting | - | 80% | 6 |
| Life Orientation | - | 90% | - |

**Total APS Score**: 41

### Academic Highlights
- School Dux 2024
- National IT Olympiad gold medalist
- First team rugby
- Provincial chess champion

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | University of Cape Town |
| **Faculty** | Commerce |
| **Programme** | BBusSci (Finance & Computer Science) |
| **Minimum APS** | 38 |
| **Specific Requirements** | Maths 80%+, English 60%+ |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | Stellenbosch University |
| **Faculty** | Economic and Management Sciences |
| **Programme** | BCom (Financial Analysis) |
| **Minimum APS** | 35 |
| **Specific Requirements** | Maths 70%+, English 60%+ |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | No |
| **Household Income** | > R1,500,000 per annum |
| **SASSA Grant Recipient** | No |
| **Disability Grant** | No |
| **Parent/Guardian Employment** | Father: CEO, Mother: Medical Specialist |

---

## Documents Available

- [x] ID Document
- [x] Matric Certificate (IEB)
- [x] Final Matric Results
- [x] Proof of Residence
- [x] Parent/Guardian ID
- [x] Proof of Income

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Standard OTP flow, generate UCT and SU student numbers
2. **application_intake_agent**: Handle IEB results, capture both choices
3. **rag_specialist_agent**: Confirm eligibility for both choices (exceeds all requirements)
4. **submission_agent**: Submit to both UCT and Stellenbosch
5. **nsfas_agent**: SKIP (not eligible - income too high)

### Edge Cases to Test
- IEB vs NSC result handling
- High-income NSFAS skip
- Multi-institution application
- Complete document handling
- High achiever routing

---

## Notes

- Profile tests non-NSFAS workflow
- IEB examination body handling
- Prestigious institution applications
