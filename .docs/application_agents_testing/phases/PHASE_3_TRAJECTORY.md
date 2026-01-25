# Phase 3: Agent Trajectory Tests

## Overview

**Goal:** Test complete application workflows end-to-end, validating all business logic paths through the 8-agent pipeline.

**Estimated Effort:** 4-5 days

**Dependencies:**
- Phase 1 (Unit Tests) complete
- Phase 2 (VCR Integration) substantially complete

**Success Criteria:**
- All 4 main workflow trajectories tested
- Conditional paths validated (NSFAS yes/no, eligibility promotion)
- Document workflow tested (flag → resubmit → approve)
- Tests complete in < 10 minutes
- 100% task completion for happy paths

---

## Agent Pipeline & Task Flow

### 8 Agents in the Pipeline

1. **identity_auth_agent** - Identity verification and authentication
2. **application_intake_agent** - Data collection and validation
3. **rag_specialist_agent** - Course information retrieval and eligibility checking
4. **submission_agent** - Application submission to universities
5. **nsfas_agent** - NSFAS funding application processing
6. **document_reviewer_agent** - Document validation and flagging
7. **reviewer_assistant_agent** - Document review support
8. **analytics_agent** - Application analytics and reporting

### 14-Task Sequential Workflow

**Core Application Flow (Tasks 1-10)** - All users execute these tasks:
- Tasks 1-3: Identity authentication and session management
- Tasks 4-6: Data intake, document validation, course selection
- Tasks 7-9: Eligibility checking via RAG, course matching
- Task 10: Application submission to universities

**Conditional NSFAS Flow (Tasks 11-14)** - Executed based on eligibility:
- Task 11: `ask_if_apply_for_nsfas_task` (branch point)
  - Returns "yes" → Proceed to Tasks 12-14
  - Returns "no" → Skip Tasks 12-14, workflow ends
- Tasks 12-14: NSFAS application creation, document submission, confirmation

### Workflow Trajectories

**Undergraduate (NSFAS Eligible):**
- Executes all 14 tasks (Tasks 1-14)
- Task 11 returns "yes" → NSFAS flow executes

**Undergraduate (NSFAS Ineligible):**
- Executes Tasks 1-11 only
- Task 11 returns "no" → Tasks 12-14 skipped

**Postgraduate:**
- Executes Tasks 1-11 only (same 14-task flow, different data/context)
- Task 11 returns "no" or "skip" → Tasks 12-14 skipped
- No task count difference, only conditional execution

---

## Implementation Checklist

### Core Trajectories

- [ ] **Undergraduate Flow** (14 tasks total, 10 core + 4 NSFAS conditional)
  - [ ] Tasks 1-10: Core application flow (Auth → Intake → RAG → Submission)
  - [ ] Task 11: NSFAS eligibility check (conditional branch point)
  - [ ] Tasks 12-14: NSFAS application tasks (executed if Task 11 = yes)
  - [ ] APS >= requirement → First choice accepted
  - [ ] NSFAS eligible → Funding application created

- [ ] **Postgraduate Flow** (14 tasks, same as undergraduate)
  - [ ] Tasks 1-10: Core application flow (Auth → Intake → RAG → Submission)
  - [ ] Task 11: NSFAS eligibility check returns "no" or "skip" for postgraduate
  - [ ] Tasks 12-14: NSFAS tasks skipped (postgraduate not eligible)
  - [ ] Research proposal handling (Masters/PhD)

- [ ] **Eligibility Promotion Flow**
  - [ ] APS < first choice requirement
  - [ ] Automatic promotion to second choice
  - [ ] User notified of promotion

- [ ] **Document Workflow**
  - [ ] Document flagged (blurry/incomplete)
  - [ ] Applicant notified via WhatsApp
  - [ ] Document resubmitted
  - [ ] Document approved

### Edge Cases

- [ ] **NSFAS Conditional Paths**
  - [ ] Task 11 (`ask_if_apply_for_nsfas_task`) is the conditional branch point
  - [ ] If Task 11 = "yes" → Execute Tasks 12-14 (NSFAS flow)
  - [ ] If Task 11 = "no" → Skip Tasks 12-14, workflow ends at Task 11
  - [ ] `nsfas_eligible=false` → Task 11 returns "no"
  - [ ] Postgraduate → Task 11 returns "no" or "skip" (not eligible)
  - [ ] Income threshold exceeded → Task 11 returns "no"

- [ ] **Course Selection Scenarios**
  - [ ] Single university, single course
  - [ ] Multiple universities, multiple courses per university
  - [ ] First choice ineligible, second choice eligible

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `tests/trajectories/__init__.py` | Create | Package init |
| `tests/trajectories/conftest.py` | Create | Trajectory-specific fixtures |
| `tests/trajectories/test_undergraduate_flow.py` | Create | Full undergraduate trajectory |
| `tests/trajectories/test_postgraduate_flow.py` | Create | Postgraduate with NSFAS skip |
| `tests/trajectories/test_eligibility_promotion.py` | Create | APS-based course promotion |
| `tests/trajectories/test_document_workflow.py` | Create | Flag → resubmit → approve |
| `tests/trajectories/test_nsfas_conditional.py` | Create | NSFAS conditional logic |

---

## Code Examples

### Trajectory Test Fixtures

```python
# tests/trajectories/conftest.py
import pytest
import uuid
from datetime import datetime

@pytest.fixture
def eligible_undergraduate_profile():
    """Undergraduate profile with high APS (eligible for most courses)."""
    return {
        "profile_id": f"TEST-UG-{uuid.uuid4().hex[:8]}",
        "first_name": "Thabo",
        "last_name": "Mbeki",
        "email": f"thabo.{uuid.uuid4().hex[:4]}@test.com",
        "mobile": "+27821234567",
        "id_number": "0001010000085",
        "date_of_birth": "2000-01-01",
        "education_level": "undergraduate",
        "total_aps_score": 42,
        "matric_results": {
            "Mathematics": 85,
            "Physical Sciences": 80,
            "English": 75,
            "Life Orientation": 70,
            "Subject5": 65,
            "Subject6": 60
        },
        "universities": ["UCT", "Wits"],
        "first_choice_courses": {
            "UCT": "BSc Computer Science",
            "Wits": "BSc Computer Science"
        },
        "second_choice_courses": {
            "UCT": "BSc Information Technology",
            "Wits": "BSc Information Systems"
        },
        "nsfas_eligible": True,
        "documents_status": {
            "id_document": "uploaded",
            "matric_certificate": "uploaded",
            "proof_of_residence": "uploaded"
        }
    }

@pytest.fixture
def low_aps_undergraduate_profile(eligible_undergraduate_profile):
    """Undergraduate with APS below first choice threshold."""
    profile = eligible_undergraduate_profile.copy()
    profile["profile_id"] = f"TEST-LOW-{uuid.uuid4().hex[:8]}"
    profile["total_aps_score"] = 28  # Below most requirements
    return profile

@pytest.fixture
def postgraduate_profile():
    """Masters/PhD applicant profile."""
    return {
        "profile_id": f"TEST-PG-{uuid.uuid4().hex[:8]}",
        "first_name": "Nomvula",
        "last_name": "Mokonyane",
        "email": f"nomvula.{uuid.uuid4().hex[:4]}@test.com",
        "mobile": "+27829876543",
        "id_number": "9001015000087",
        "education_level": "postgraduate",
        "degree_type": "masters",
        "undergraduate_degree": "BSc Computer Science",
        "undergraduate_institution": "UCT",
        "undergraduate_average": 72,
        "universities": ["UCT"],
        "first_choice_courses": {
            "UCT": "MSc Computer Science"
        },
        "has_research_proposal": True,
        "nsfas_eligible": False,  # Postgrad not NSFAS eligible anyway
        "documents_status": {
            "id_document": "uploaded",
            "undergraduate_transcript": "uploaded",
            "research_proposal": "uploaded"
        }
    }

@pytest.fixture
def nsfas_ineligible_profile(eligible_undergraduate_profile):
    """Undergraduate not eligible for NSFAS."""
    profile = eligible_undergraduate_profile.copy()
    profile["profile_id"] = f"TEST-NO-NSFAS-{uuid.uuid4().hex[:8]}"
    profile["nsfas_eligible"] = False
    return profile
```

### Undergraduate Full Flow Test

```python
# tests/trajectories/test_undergraduate_flow.py
import pytest
from one_for_all.crew import OneForAllCrew

@pytest.mark.trajectory
@pytest.mark.vcr()
class TestUndergraduateApplicationFlow:
    """End-to-end undergraduate application trajectory."""

    def test_complete_flow_eligible_student(
        self, test_crew, eligible_undergraduate_profile
    ):
        """Full undergraduate flow: All 14 tasks (Tasks 1-14 with NSFAS)."""
        result = test_crew.crew().kickoff(inputs=eligible_undergraduate_profile)

        # Verify all phases completed
        result_str = str(result).lower()

        # Tasks 1-3: Authentication completed
        assert any(x in result_str for x in ["session", "verified", "authenticated"]), \
            "Authentication should complete"

        # Tasks 4-6: Data intake completed
        assert any(x in result_str for x in ["personal", "academic", "collected"]), \
            "Data intake should complete"

        # Tasks 7-9: Eligibility checked
        assert any(x in result_str for x in ["eligible", "aps", "requirements"]), \
            "Eligibility should be checked"

        # Task 10: Application submitted
        assert any(x in result_str for x in ["submitted", "application_id", "confirmation"]), \
            "Application should be submitted"

        # Tasks 11-14: NSFAS processed (Task 11 returns "yes" → Tasks 12-14 execute)
        assert any(x in result_str for x in ["nsfas", "funding", "financial"]), \
            "NSFAS should be processed"

    def test_multi_university_submission(
        self, test_crew, eligible_undergraduate_profile
    ):
        """Applications submitted to multiple universities."""
        profile = eligible_undergraduate_profile.copy()
        profile["universities"] = ["UCT", "Wits", "UP"]

        result = test_crew.crew().kickoff(inputs=profile)
        result_str = str(result).lower()

        # Should have submission confirmations for each university
        for university in ["uct", "wits", "up"]:
            assert university in result_str, \
                f"Should have confirmation for {university}"

    def test_documents_validated_before_submission(
        self, test_crew, eligible_undergraduate_profile
    ):
        """Documents should be validated before submission (Task 6 before Task 10)."""
        result = test_crew.crew().kickoff(inputs=eligible_undergraduate_profile)

        # Task 6 (document_validation_task) runs before Task 10 (application_submission_task)
        # Sequential process enforces order: Tasks 1-14 execute in sequence
        # This test verifies the output confirms validation occurred
        result_str = str(result).lower()

        assert any(x in result_str for x in ["document", "validated", "approved", "verified"]), \
            "Documents should be validated"
```

### Postgraduate Flow (NSFAS Skip)

```python
# tests/trajectories/test_postgraduate_flow.py
import pytest

@pytest.mark.trajectory
@pytest.mark.vcr()
class TestPostgraduateApplicationFlow:
    """Postgraduate application trajectory with NSFAS skip."""

    def test_postgrad_skips_nsfas_entirely(
        self, test_crew, postgraduate_profile
    ):
        """Postgraduate follows same 14-task flow but Task 11 returns 'no' → Tasks 12-14 skipped."""
        result = test_crew.crew().kickoff(inputs=postgraduate_profile)
        result_str = str(result).lower()

        # Should have application submission (Task 10)
        assert any(x in result_str for x in ["submitted", "application", "msc"]), \
            "Application should be submitted"

        # Task 11 should return "no" or "skip" → Tasks 12-14 not executed
        assert any(x in result_str for x in ["skip", "postgrad", "not applicable", "no_nsfas"]), \
            "NSFAS should be skipped for postgraduate (Task 11 returns 'no')"

    def test_research_proposal_handling(
        self, test_crew, postgraduate_profile
    ):
        """Masters/PhD applications should handle research proposals."""
        result = test_crew.crew().kickoff(inputs=postgraduate_profile)
        result_str = str(result).lower()

        # Research proposal should be part of submission
        assert any(x in result_str for x in ["research", "proposal", "thesis"]), \
            "Research proposal should be handled"

    def test_phd_application_flow(
        self, test_crew, postgraduate_profile
    ):
        """PhD application with additional requirements."""
        profile = postgraduate_profile.copy()
        profile["degree_type"] = "phd"
        profile["has_masters_degree"] = True
        profile["first_choice_courses"]["UCT"] = "PhD Computer Science"

        result = test_crew.crew().kickoff(inputs=profile)
        result_str = str(result).lower()

        assert any(x in result_str for x in ["phd", "doctoral", "submitted"]), \
            "PhD application should be processed"
```

### Eligibility Promotion Tests

```python
# tests/trajectories/test_eligibility_promotion.py
import pytest

@pytest.mark.trajectory
@pytest.mark.vcr()
class TestEligibilityPromotion:
    """Test APS-based course promotion from first to second choice."""

    def test_low_aps_promotes_to_second_choice(
        self, test_crew, low_aps_undergraduate_profile
    ):
        """Student with low APS should be promoted to second choice."""
        profile = low_aps_undergraduate_profile
        profile["first_choice_courses"]["UCT"] = "BSc Medicine"  # APS 42+ required
        profile["second_choice_courses"]["UCT"] = "BSc Biological Sciences"  # APS 28 required

        result = test_crew.crew().kickoff(inputs=profile)
        result_str = str(result).lower()

        # Should indicate promotion occurred
        assert any(x in result_str for x in [
            "second choice",
            "promoted",
            "alternative",
            "biological sciences",
            "not eligible for first"
        ]), "Should indicate promotion to second choice"

        # Should NOT indicate medicine was submitted
        assert "medicine submitted" not in result_str.lower(), \
            "First choice (Medicine) should not be submitted"

    def test_eligible_for_first_choice_no_promotion(
        self, test_crew, eligible_undergraduate_profile
    ):
        """Student eligible for first choice should not be promoted."""
        result = test_crew.crew().kickoff(inputs=eligible_undergraduate_profile)
        result_str = str(result).lower()

        # Should indicate first choice was accepted
        assert any(x in result_str for x in ["first choice", "eligible", "accepted"]), \
            "First choice should be accepted for eligible student"

    def test_ineligible_for_both_choices(
        self, test_crew, low_aps_undergraduate_profile
    ):
        """Student ineligible for both choices should be notified."""
        profile = low_aps_undergraduate_profile
        profile["total_aps_score"] = 18  # Very low APS
        profile["first_choice_courses"]["UCT"] = "BSc Medicine"
        profile["second_choice_courses"]["UCT"] = "BSc Engineering"  # Also high APS

        result = test_crew.crew().kickoff(inputs=profile)
        result_str = str(result).lower()

        # Should indicate both choices failed
        assert any(x in result_str for x in [
            "not eligible",
            "insufficient",
            "requirements not met",
            "consider other"
        ]), "Should indicate ineligibility for both choices"
```

### Document Workflow Tests

```python
# tests/trajectories/test_document_workflow.py
import pytest

@pytest.mark.trajectory
@pytest.mark.vcr()
class TestDocumentWorkflow:
    """Test document flagging → notification → resubmit → approve flow."""

    def test_blurry_document_flagged(
        self, test_crew, eligible_undergraduate_profile
    ):
        """Blurry document should be flagged with actionable reason."""
        profile = eligible_undergraduate_profile.copy()
        profile["documents_status"]["id_document"] = "uploaded_blurry"

        result = test_crew.crew().kickoff(inputs=profile)
        result_str = str(result).lower()

        # Should indicate document was flagged
        assert any(x in result_str for x in [
            "flagged",
            "blurry",
            "unclear",
            "reupload",
            "clearer"
        ]), "Blurry document should be flagged"

    def test_applicant_notified_of_document_issue(
        self, test_crew, eligible_undergraduate_profile
    ):
        """Applicant should be notified via WhatsApp when document flagged."""
        profile = eligible_undergraduate_profile.copy()
        profile["documents_status"]["matric_certificate"] = "uploaded_incomplete"

        result = test_crew.crew().kickoff(inputs=profile)
        result_str = str(result).lower()

        # Should indicate notification sent
        assert any(x in result_str for x in [
            "notified",
            "whatsapp",
            "message sent",
            "informed"
        ]), "Applicant should be notified of document issue"

    def test_document_approved_after_resubmit(
        self, test_crew, eligible_undergraduate_profile
    ):
        """Resubmitted document should be approved if valid."""
        profile = eligible_undergraduate_profile.copy()
        # Simulate document that was flagged then resubmitted as valid
        profile["documents_status"] = {
            "id_document": "resubmitted_valid",
            "matric_certificate": "uploaded",
            "proof_of_residence": "uploaded"
        }

        result = test_crew.crew().kickoff(inputs=profile)
        result_str = str(result).lower()

        # Document should be approved
        assert any(x in result_str for x in [
            "approved",
            "accepted",
            "valid",
            "verified"
        ]), "Resubmitted document should be approved"
```

### NSFAS Conditional Tests

```python
# tests/trajectories/test_nsfas_conditional.py
import pytest

@pytest.mark.trajectory
@pytest.mark.vcr()
class TestNSFASConditional:
    """Test NSFAS conditional logic based on eligibility."""

    def test_nsfas_eligible_creates_application(
        self, test_crew, eligible_undergraduate_profile
    ):
        """NSFAS-eligible undergraduate should have funding application created."""
        result = test_crew.crew().kickoff(inputs=eligible_undergraduate_profile)
        result_str = str(result).lower()

        assert any(x in result_str for x in [
            "nsfas",
            "funding",
            "financial aid",
            "nsfas_application_id"
        ]), "NSFAS application should be created"

    def test_nsfas_ineligible_skips_funding(
        self, test_crew, nsfas_ineligible_profile
    ):
        """NSFAS-ineligible student executes Tasks 1-11, Task 11 returns 'no' → Tasks 12-14 skipped."""
        result = test_crew.crew().kickoff(inputs=nsfas_ineligible_profile)
        result_str = str(result).lower()

        # Application should still be submitted (Task 10)
        assert any(x in result_str for x in ["submitted", "application"]), \
            "University application should still be submitted"

        # Task 11 returns "no" → Tasks 12-14 skipped
        assert any(x in result_str for x in [
            "nsfas_skipped",
            "no_nsfas",
            "not eligible for nsfas",
            "skip"
        ]), "NSFAS should be skipped (Task 11 returns 'no')"

    def test_postgrad_always_skips_nsfas(
        self, test_crew, postgraduate_profile
    ):
        """Postgraduate executes same 14 tasks; Task 11 returns 'no' regardless of nsfas_eligible flag."""
        profile = postgraduate_profile.copy()
        profile["nsfas_eligible"] = True  # Even if marked eligible

        result = test_crew.crew().kickoff(inputs=profile)
        result_str = str(result).lower()

        # Task 11 should return "no" or "skip" due to postgrad status
        assert "postgrad" in result_str or "skip" in result_str, \
            "Postgrad Task 11 should return 'no' → Tasks 12-14 skipped"
```

---

## Verification

### Running Trajectory Tests

```bash
# Run all trajectory tests
cd apps/backend && pytest tests/trajectories/ -v -m trajectory

# Run specific workflow
pytest tests/trajectories/test_undergraduate_flow.py -v

# Run with verbose output
pytest tests/trajectories/ -v -m trajectory -s

# Run and record new cassettes
pytest tests/trajectories/ -v --vcr-record=new_episodes
```

### Expected Outcomes

```
tests/trajectories/test_undergraduate_flow.py::TestUndergraduateApplicationFlow::test_complete_flow_eligible_student PASSED
tests/trajectories/test_undergraduate_flow.py::TestUndergraduateApplicationFlow::test_multi_university_submission PASSED
tests/trajectories/test_postgraduate_flow.py::TestPostgraduateApplicationFlow::test_postgrad_skips_nsfas_entirely PASSED
tests/trajectories/test_eligibility_promotion.py::TestEligibilityPromotion::test_low_aps_promotes_to_second_choice PASSED
tests/trajectories/test_document_workflow.py::TestDocumentWorkflow::test_blurry_document_flagged PASSED
tests/trajectories/test_nsfas_conditional.py::TestNSFASConditional::test_nsfas_eligible_creates_application PASSED

======================== X passed in Y.YYs ========================
```

### Success Criteria Checklist

- [ ] Undergraduate full flow passes
- [ ] Postgraduate flow skips NSFAS
- [ ] Eligibility promotion works correctly
- [ ] Document workflow (flag → notify → approve) works
- [ ] NSFAS conditional logic verified
- [ ] Tests complete in < 10 minutes
- [ ] 100% task completion for happy paths

---

## Next Phase

[Phase 4: Security Tests](./PHASE_4_SECURITY.md)
