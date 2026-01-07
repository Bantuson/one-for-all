# Prospect Profile 019: Honours - Career Changer

## Basic Information

| Field | Value |
|-------|-------|
| **Profile ID** | profile_019 |
| **Name** | Relebohile Moshoeshoe |
| **ID Number** | 9402156678901 |
| **Date of Birth** | 1994-02-15 |
| **Gender** | Male |
| **Home Language** | Sesotho |
| **Province** | Free State |
| **Citizenship** | South African |

---

## Contact Details

| Field | Value |
|-------|-------|
| **Mobile** | +27 71 123 4567 |
| **Email** | rele.moshoeshoe@gmail.com |
| **WhatsApp** | +27 71 123 4567 |
| **Physical Address** | 34 Universitas Drive, Bloemfontein, 9301 |

---

## Academic Profile

### Previous Qualifications

| Qualification | Institution | Year | Result |
|---------------|-------------|------|--------|
| BTech (Mechanical Engineering) | Central University of Technology | 2016 | 65% |

### Professional Experience
- 7 years as Mechanical Engineer
- Currently: Senior Engineer at manufacturing company
- Project management certification (PMP)

### Academic Highlights
- Engineering Council registered (Pr Tech Eng)
- Industry innovation award winner
- Technical trainer at company

---

## Application Preferences

### First Choice
| Field | Value |
|-------|-------|
| **Institution** | University of the Free State |
| **Faculty** | Natural and Agricultural Sciences |
| **Programme** | BSc Honours (Engineering Management) |
| **Minimum Requirement** | BTech/BEng with 60%+ |
| **Specific Requirements** | Engineering background, work experience |

### Second Choice
| Field | Value |
|-------|-------|
| **Institution** | University of Johannesburg |
| **Faculty** | Engineering and the Built Environment |
| **Programme** | BTech Honours (Mechanical Engineering) |
| **Minimum Requirement** | BTech with 60%+ |
| **Specific Requirements** | BTech in relevant field |

---

## Financial Information

| Field | Value |
|-------|-------|
| **NSFAS Eligible** | No (Postgraduate + Employed) |
| **Funding** | Self-funded |
| **Employment Status** | Full-time employed |

---

## Documents Available

- [x] ID Document
- [x] BTech Degree Certificate
- [x] Academic Transcript
- [x] ECSA Registration Certificate
- [x] PMP Certificate
- [x] Employment Letter
- [ ] Motivation Letter
- [ ] Reference (Manager)

---

## Testing Scenarios

### Expected Agent Behaviors

1. **identity_auth_agent**: Standard OTP flow, generate Honours student number
2. **application_intake_agent**:
   - Capture BTech qualification
   - Professional registration (ECSA)
   - Work experience details
3. **rag_specialist_agent**:
   - Verify BTech as prerequisite
   - UoT to University pathway validation
   - Experience consideration
4. **submission_agent**: Submit Honours application
5. **nsfas_agent**: SKIP (postgraduate)

### Edge Cases to Test
- BTech to Honours pathway
- UoT to traditional university transition
- Professional registration integration
- Career advancement motivation
- Part-time study for professionals

---

## Notes

- Profile tests BTech-to-Honours pathway
- Important for UoT graduate progression
- Tests qualification type conversion
