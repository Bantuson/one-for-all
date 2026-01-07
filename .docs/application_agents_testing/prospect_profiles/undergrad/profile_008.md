# Prospect Profile 008: International Student (SADC)

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_008 |
| **Name** | Tendai Moyo |
| **ID Number** | N/A (Zimbabwean) |
| **Passport Number** | FN845632 |
| **Date of Birth** | 2006-02-14 |
| **Gender** | Female |
| **Home Language** | Shona |
| **Province** | N/A (International) |
| **Citizenship** | Zimbabwean (SADC) |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +263 77 234 5678 |
| **SA Mobile** | +27 84 012 3456 |
| **Email** | tendai.moyo@zimmail.com |
| **WhatsApp** | +27 84 012 3456 |
| **Physical Address** | Aunt's address: 89 Main Road, Johannesburg, 2001 |
| **Home Address** | 45 Samora Machel Ave, Harare, Zimbabwe |

---

## Academic Profile

### Zimbabwe A-Level Results (ZIMSEC 2024)

| Subject | Grade | SA Equivalent |
|---------|-------|---------------|
| English Language | B | 6 |
| Mathematics | A | 7 |
| Physics | B | 6 |
| Chemistry | A | 7 |
| Biology | B | 6 |

**Estimated APS Score**: 32

### Academic Highlights
- School prefect
- Science club president
- Cambridge AS Level completed

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | University of the Witwatersrand |
| **Faculty** | Health Sciences |
| **Programme** | MBBCh (Medicine) |
| **Minimum APS** | 42 |
| **Specific Requirements** | Maths, Physical Sciences, Life Sciences 70%+ |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | University of the Witwatersrand |
| **Faculty** | Science |
| **Programme** | BSc (Biological Sciences) |
| **Minimum APS** | 32 |
| **Specific Requirements** | Maths 50%+, Life Sciences 50%+ |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | No (International student) |
| **Household Income** | Unknown (Zimbabwe) |
| **SASSA Grant Recipient** | No |
| **Disability Grant** | No |
| **Parent/Guardian Employment** | Parents in Zimbabwe |
| **Study Permit** | Required |

---

## Documents Available

- [x] Passport
- [x] ZIMSEC Certificate
- [x] A-Level Results
- [ ] Study Permit (pending)
- [ ] SAQA Evaluation
- [ ] Proof of Funding
- [ ] Medical Certificate

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: International student flow, passport-based verification
2. **application_intake_agent**:
   - Handle ZIMSEC/Cambridge results
   - Capture international student details
   - Flag study permit requirement
3. **rag_specialist_agent**:
   - SAQA equivalency check
   - First choice likely ineligible (competitive programme)
   - Second choice assessment
4. **submission_agent**: International application submission
5. **nsfas_agent**: SKIP (international students ineligible)

### Edge Cases to Test
- International qualification handling
- SADC student processing
- Study permit requirements
- SAQA evaluation flags
- Non-SA ID processing

---

## Notes

- Profile tests international student workflow
- NSFAS should skip automatically
- Critical for SADC student handling
