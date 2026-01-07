# Prospect Profile 002: Fresh Matric - Average Student

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_002 |
| **Name** | Lerato Dlamini |
| **ID Number** | 0608234567890 |
| **Date of Birth** | 2006-08-23 |
| **Gender** | Female |
| **Home Language** | isiZulu |
| **Province** | KwaZulu-Natal |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 83 456 7890 |
| **Email** | lerato.dlamini@yahoo.com |
| **WhatsApp** | +27 83 456 7890 |
| **Physical Address** | 12 Zulu Street, Umlazi, 4031 |

---

## Academic Profile

### Matric Results (NSC 2024)

| Subject | Level | Mark | APS Points |
|---------|-------|------|------------|
| English FAL | FAL | 62% | 5 |
| isiZulu Home Language | HL | 75% | 6 |
| Mathematical Literacy | - | 70% | 5 |
| Business Studies | - | 65% | 5 |
| Accounting | - | 58% | 4 |
| Economics | - | 60% | 5 |
| Life Orientation | - | 85% | - |

**Total APS Score**: 30

### Academic Highlights
- Business Studies class representative
- Participated in entrepreneurship programme

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | University of KwaZulu-Natal |
| **Faculty** | Management Studies |
| **Programme** | BCom (Accounting) |
| **Minimum APS** | 32 |
| **Specific Requirements** | Maths (not Maths Lit), English 50%+ |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | University of KwaZulu-Natal |
| **Faculty** | Management Studies |
| **Programme** | BCom (General) |
| **Minimum APS** | 28 |
| **Specific Requirements** | English 50%+ |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | Yes |
| **Household Income** | < R200,000 per annum |
| **SASSA Grant Recipient** | Yes (Child Support Grant) |
| **Disability Grant** | No |
| **Parent/Guardian Employment** | Single mother unemployed |

---

## Documents Available

- [x] ID Document
- [x] Matric Certificate
- [x] Final Matric Results
- [x] Proof of Residence
- [x] SASSA Statement
- [ ] Parent/Guardian ID

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Standard OTP flow, generate UKZN student number
2. **application_intake_agent**: Capture all fields, both course choices
3. **rag_specialist_agent**:
   - First choice: REJECT (Maths Literacy not accepted for BCom Accounting)
   - Should suggest alternatives or confirm second choice eligibility
4. **submission_agent**: Submit second choice to UKZN
5. **nsfas_agent**: Full NSFAS flow, SASSA data reuse

### Edge Cases to Test
- Maths Literacy rejection for certain programmes
- Alternative course suggestion
- SASSA grant data reuse
- Below minimum APS for first choice

---

## Notes

- Profile tests agent handling of ineligibility
- Maths Literacy is a key constraint
- Important for testing RAG specialist suggestions
