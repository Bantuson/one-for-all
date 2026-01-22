"""
Phase 3: Trajectory Tests

Full workflow tests that verify the complete applicant journey through the
OneForAllCrew pipeline, including:
- Undergraduate application flow (14 tasks)
- Postgraduate application flow (NSFAS skip)
- Eligibility promotion logic (APS-based)
- Document workflow (flag → notify → approve)
- NSFAS conditional branching

Security: All cassettes are filtered for secrets before recording.
"""

import pytest

# Trajectory test marker for selective execution
trajectory = pytest.mark.trajectory
