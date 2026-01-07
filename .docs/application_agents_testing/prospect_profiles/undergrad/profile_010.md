# Prospect Profile 010: Multi-Institution Applicant

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_010 |
| **Name** | Kagiso Tau |
| **ID Number** | 0612019876543 |
| **Date of Birth** | 2006-12-01 |
| **Gender** | Male |
| **Home Language** | Setswana |
| **Province** | Gauteng |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 74 234 5678 |
| **Email** | kagiso.tau@student.mail.com |
| **WhatsApp** | +27 74 234 5678 |
| **Physical Address** | 56 University Avenue, Hatfield, Pretoria, 0083 |

---

## Academic Profile

### Matric Results (NSC 2024)

| Subject | Level | Mark | APS Points |
|---------|-------|------|------------|
| English Home Language | HL | 76% | 6 |
| Setswana Home Language | HL | 85% | 7 |
| Mathematics | - | 80% | 6 |
| Physical Sciences | - | 78% | 6 |
| Information Technology | - | 88% | 7 |
| Life Sciences | - | 72% | 5 |
| Life Orientation | - | 85% | - |

**Total APS Score**: 37

### Academic Highlights
- National IT Olympiad top 50
- School coding club founder
- Hackathon winner (2024)

---

## Application Preferences

### Applications to Multiple Institutions

| Priority | Institution | Programme | APS Req |
|----------|-------------|-----------|---------|
| 1 | University of Pretoria | BSc (Computer Science) | 32 |
| 2 | University of Cape Town | BSc (Computer Science) | 34 |
| 3 | Stellenbosch University | BSc (Computer Science) | 32 |
| 4 | University of the Witwatersrand | BSc (Computer Science) | 34 |

### First Choice (Primary)
| Field | Value |
|-------|-------|
| **Institution** | University of Pretoria |
| **Faculty** | Engineering, Built Environment and IT |
| **Programme** | BSc (Computer Science) |
| **Minimum APS** | 32 |
| **Specific Requirements** | Maths 60%+ |

### Second Choice (Secondary at UP)
| Field | Value |
|-------|-------|
| **Institution** | University of Pretoria |
| **Faculty** | Engineering, Built Environment and IT |
| **Programme** | BIT (Information Technology) |
| **Minimum APS** | 28 |
| **Specific Requirements** | Maths 50%+ |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | Yes |
| **Household Income** | < R350,000 per annum |
| **SASSA Grant Recipient** | No |
| **Disability Grant** | No |
| **Parent/Guardian Employment** | Both parents employed (civil servants) |

---

## Documents Available

- [x] ID Document
- [x] Matric Certificate
- [x] Final Matric Results
- [x] Proof of Residence
- [x] Parent/Guardian ID (both)
- [x] Proof of Income (both parents)
- [x] Portfolio (coding projects)

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Generate student numbers for all 4 institutions
2. **application_intake_agent**:
   - Handle 4-institution application
   - Maintain separate state per institution
   - Capture preferences correctly
3. **rag_specialist_agent**:
   - Verify eligibility across all institutions
   - Compare programmes
   - Confirm all applications viable
4. **submission_agent**:
   - Submit to all 4 institutions
   - Handle different submission formats
   - Track all confirmations
5. **nsfas_agent**: Single NSFAS application (covers all public institutions)

### Edge Cases to Test
- Multi-institution state management
- Cross-institution data sharing
- Multiple student number generation
- Submission tracking across institutions
- Single NSFAS for multiple applications

---

## Notes

- Profile tests comprehensive multi-institution workflow
- Maximum complexity for submission agent
- Important for testing scalability
- All institutions should succeed
