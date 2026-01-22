"""
Enhanced security fixtures for trajectory tests with VCR cassette protection.

This module provides enhanced security for VCR cassettes used in trajectory tests:
- Comprehensive header filtering for all API key variations
- Regex-based secret detection in request/response bodies
- Post-test audit to verify no secrets leaked into cassettes
- State tracking for applicant state transitions
- Trajectory-specific profile fixtures

SECURITY CRITICAL: All cassettes MUST be audited before commit.
"""

import pytest
import re
import os
import yaml
from pathlib import Path
from typing import Any, Optional
from dataclasses import dataclass, field

# Import unified secret patterns from centralized module
from .security.secret_patterns import (
    SECRET_PATTERNS,
    SECURITY_FILTER_HEADERS,
    scan_text_for_secrets,
)


# =============================================================================
# Body Filtering Functions
# =============================================================================

def filter_request_body(request) -> Any:
    """
    Sanitize secrets from request bodies before recording.

    This function processes request bodies to:
    1. Detect and redact JWT tokens
    2. Detect and redact API keys (OpenAI, SendGrid, Twilio, etc.)
    3. Normalize timestamps for deterministic matching

    Args:
        request: VCR request object with body attribute

    Returns:
        Modified request object with secrets redacted
    """
    if not request.body:
        return request

    try:
        # Decode body if bytes
        body = request.body.decode('utf-8') if isinstance(request.body, bytes) else request.body

        # Apply all secret patterns (dict format: name -> pattern)
        for pattern_name, pattern in SECRET_PATTERNS.items():
            body = pattern.sub(f'[REDACTED_{pattern_name.upper()}]', body)

        # Normalize timestamps (from root conftest pattern)
        body = re.sub(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', 'TIMESTAMP', body)
        body = re.sub(r'"timestamp":\s*\d+', '"timestamp": 0', body)

        # Re-encode if originally bytes
        request.body = body.encode('utf-8') if isinstance(request.body, bytes) else body

    except (UnicodeDecodeError, AttributeError):
        # If body can't be decoded, leave as-is (binary content)
        pass

    return request


def filter_response_body(response: dict) -> dict:
    """
    Sanitize secrets from response bodies before recording.

    This function processes response bodies to remove any accidentally
    echoed secrets or tokens from API responses.

    Args:
        response: VCR response dict with 'body' key

    Returns:
        Modified response dict with secrets redacted
    """
    if 'body' not in response or not response['body']:
        return response

    body_data = response['body']

    # Handle different body formats (string or dict with 'string' key)
    if isinstance(body_data, dict) and 'string' in body_data:
        body_string = body_data['string']
    elif isinstance(body_data, (str, bytes)):
        body_string = body_data
    else:
        return response

    try:
        # Decode if bytes
        if isinstance(body_string, bytes):
            body_string = body_string.decode('utf-8')

        # Apply all secret patterns (dict format: name -> pattern)
        for pattern_name, pattern in SECRET_PATTERNS.items():
            body_string = pattern.sub(f'[REDACTED_{pattern_name.upper()}]', body_string)

        # Update response body
        if isinstance(body_data, dict):
            response['body']['string'] = body_string
        else:
            response['body'] = body_string

    except (UnicodeDecodeError, AttributeError):
        pass

    return response


# =============================================================================
# VCR Configuration for Trajectory Tests
# =============================================================================

@pytest.fixture(scope="module")
def vcr_config():
    """
    Enhanced VCR configuration for trajectory tests with comprehensive security.

    This configuration extends the root conftest.py vcr_config with:
    - Expanded header filtering for all API key variations
    - Request/response body filtering callbacks
    - Trajectory-specific cassette directory
    - Stricter matching for deterministic replay

    Security Features:
    - ALL header variations filtered (case-insensitive coverage)
    - JWT tokens redacted from bodies
    - API keys for all services redacted
    - Timestamps normalized for reproducibility
    """
    trajectories_cassette_dir = Path(__file__).parent.parent / "cassettes" / "trajectories"
    trajectories_cassette_dir.mkdir(parents=True, exist_ok=True)

    return {
        # SECURITY: Comprehensive header filtering
        "filter_headers": SECURITY_FILTER_HEADERS,
        # SECURITY: Query parameter filtering
        "filter_query_parameters": [
            "api_key",
            "apiKey",
            "access_token",
            "accessToken",
            "apikey",
            "key",
            "token",
            "auth",
            "authorization",
        ],
        # Record mode: "once" for deterministic CI replay
        "record_mode": "once",
        # Trajectory-specific cassette directory
        "cassette_library_dir": str(trajectories_cassette_dir),
        # Strict matching for trajectory tests
        "match_on": ["method", "scheme", "host", "port", "path"],
        # Decode for readable cassettes and easier auditing
        "decode_compressed_response": True,
        # Don't record on exception to avoid partial cassettes
        "record_on_exception": False,
        # SECURITY: Filter request bodies
        "before_record_request": filter_request_body,
        # SECURITY: Filter response bodies
        "before_record_response": filter_response_body,
        # Ignore local hosts
        "ignore_hosts": ["localhost", "127.0.0.1", "0.0.0.0"],
    }


@pytest.fixture(scope="module")
def vcr_cassette_dir(request):
    """Override cassette directory for trajectory tests."""
    return str(Path(__file__).parent.parent / "cassettes" / "trajectories")


# =============================================================================
# Trajectory Tool Tracker
# =============================================================================

@dataclass
class ApplicantState:
    """Track applicant state transitions during trajectory tests."""
    authenticated: bool = False
    session_active: bool = False
    profile_complete: bool = False
    documents_uploaded: bool = False
    application_submitted: bool = False
    nsfas_submitted: bool = False

    def to_dict(self) -> dict[str, bool]:
        """Convert state to dictionary."""
        return {
            "authenticated": self.authenticated,
            "session_active": self.session_active,
            "profile_complete": self.profile_complete,
            "documents_uploaded": self.documents_uploaded,
            "application_submitted": self.application_submitted,
            "nsfas_submitted": self.nsfas_submitted,
        }


@dataclass
class TrajectoryToolTracker:
    """
    Extended tool tracker for trajectory tests with state tracking.

    Extends the ToolCallTracker pattern from integration/conftest.py with:
    - Applicant state transition tracking
    - Task sequence verification
    - Task order validation

    Usage:
        def test_trajectory(trajectory_tracker):
            # Record tool calls
            tracker.record("otp_verify", {"code": "123456"}, "verified")
            tracker.update_state(authenticated=True)

            # Verify sequence
            assert tracker.verify_task_order([
                "otp_verify",
                "session_create",
                "profile_update"
            ])
    """
    calls: list[dict[str, Any]] = field(default_factory=list)
    state: ApplicantState = field(default_factory=ApplicantState)
    state_history: list[dict[str, Any]] = field(default_factory=list)

    def record(self, tool_name: str, args: dict, result: str) -> None:
        """
        Record a tool call with its arguments and result.

        Args:
            tool_name: Name of the tool called
            args: Arguments passed to the tool
            result: Result returned by the tool
        """
        self.calls.append({
            "tool": tool_name,
            "args": args,
            "result": result,
            "state_snapshot": self.state.to_dict(),
        })

    def update_state(self, **kwargs) -> None:
        """
        Update applicant state and record in history.

        Args:
            **kwargs: State fields to update (e.g., authenticated=True)
        """
        for key, value in kwargs.items():
            if hasattr(self.state, key):
                setattr(self.state, key, value)

        self.state_history.append({
            "state": self.state.to_dict(),
            "call_count": len(self.calls),
        })

    def get_sequence(self) -> list[str]:
        """Get the sequence of tool names called."""
        return [c["tool"] for c in self.calls]

    def get_task_sequence(self) -> list[str]:
        """
        Get unique task sequence (deduplicated tool sequence).

        Returns:
            List of unique tool names in order of first call
        """
        seen = set()
        sequence = []
        for tool_name in self.get_sequence():
            if tool_name not in seen:
                seen.add(tool_name)
                sequence.append(tool_name)
        return sequence

    def verify_task_order(self, expected_order: list[str]) -> bool:
        """
        Verify that tasks were called in the expected order.

        This checks that each task in expected_order appears in the
        actual sequence AND in the correct relative order. Additional
        tasks between expected tasks are allowed.

        Args:
            expected_order: List of tool names in expected order

        Returns:
            True if order matches, False otherwise
        """
        sequence = self.get_sequence()

        # Find positions of expected tasks
        positions = []
        for task in expected_order:
            if task not in sequence:
                return False
            positions.append(sequence.index(task))

        # Check positions are monotonically increasing
        return positions == sorted(positions)

    def called(self, tool_name: str) -> bool:
        """Check if a specific tool was called."""
        return tool_name in self.get_sequence()

    def called_before(self, first: str, second: str) -> bool:
        """Check if first tool was called before second tool."""
        seq = self.get_sequence()
        if first not in seq or second not in seq:
            return False
        return seq.index(first) < seq.index(second)

    def call_count(self, tool_name: str) -> int:
        """Count how many times a tool was called."""
        return self.get_sequence().count(tool_name)

    def get_call_args(self, tool_name: str, call_index: int = 0) -> Optional[dict]:
        """Get arguments for a specific tool call."""
        matching_calls = [c for c in self.calls if c["tool"] == tool_name]
        if call_index < len(matching_calls):
            return matching_calls[call_index]["args"]
        return None

    def get_state_at_call(self, call_index: int) -> Optional[dict]:
        """Get the applicant state at a specific call index."""
        if 0 <= call_index < len(self.calls):
            return self.calls[call_index]["state_snapshot"]
        return None


@pytest.fixture
def trajectory_tracker() -> TrajectoryToolTracker:
    """Provide a TrajectoryToolTracker instance for tests."""
    return TrajectoryToolTracker()


# =============================================================================
# Trajectory Profile Fixtures
# =============================================================================

@pytest.fixture
def trajectory_undergraduate_profile() -> dict[str, Any]:
    """
    Standard undergraduate profile for trajectory tests.

    Uses TEST-TRAJ- prefix to distinguish from other test profiles
    and ensure proper cleanup isolation.

    Returns:
        Dict containing a complete undergraduate applicant profile
        with high APS score, all documents, and NSFAS eligibility.
    """
    return {
        # Identity
        "profile_id": "TEST-TRAJ-UG-001",
        "full_name": "Trajectory Test Undergraduate",
        "id_number": "0501015000001",
        "date_of_birth": "2005-01-01",
        "gender": "Female",
        "home_language": "English",
        "province": "Gauteng",
        "citizenship": "South African",

        # Contact
        "mobile_number": "+27821111001",
        "email": "traj.undergrad@example.com",
        "whatsapp_number": "+27821111001",
        "physical_address": "1 Trajectory Lane, Pretoria, 0001",

        # Academic
        "matric_results": {
            "English Home Language": {"level": "HL", "mark": 78, "aps_points": 6},
            "Mathematics": {"level": "HL", "mark": 82, "aps_points": 7},
            "Physical Sciences": {"level": "HL", "mark": 75, "aps_points": 6},
            "Life Sciences": {"level": "HL", "mark": 70, "aps_points": 5},
            "Afrikaans FAL": {"level": "FAL", "mark": 65, "aps_points": 5},
            "Life Orientation": {"level": "-", "mark": 80, "aps_points": 6},
            "Information Technology": {"level": "HL", "mark": 85, "aps_points": 7},
        },
        "total_aps_score": 42,
        "academic_highlights": [
            "Top performer in Mathematics and IT",
            "Consistent academic excellence",
        ],

        # Course Selection
        "course_choices": [
            {
                "priority": 1,
                "institution": "University of Pretoria",
                "faculty": "Engineering, Built Environment and IT",
                "programme": "BSc Computer Science",
                "minimum_aps": 35,
                "requirements": "Mathematics HL (minimum 60%)",
            },
            {
                "priority": 2,
                "institution": "University of Pretoria",
                "faculty": "Engineering, Built Environment and IT",
                "programme": "BSc Information Technology",
                "minimum_aps": 32,
                "requirements": "Mathematics or Maths Literacy",
            },
        ],
        "primary_institution": "University of Pretoria",

        # Financial
        "nsfas_eligible": True,
        "household_income": "R180,000 per year",
        "sassa_recipient": False,
        "disability_grant": False,
        "guardian_employment": "Employed - administrative worker",

        # Documents
        "documents_available": [
            "ID Document",
            "Matric Certificate",
            "Academic Transcript",
            "Proof of Residence",
        ],
        "documents_missing": [],
    }


@pytest.fixture
def trajectory_postgraduate_profile() -> dict[str, Any]:
    """
    Postgraduate profile for trajectory tests.

    Uses TEST-TRAJ- prefix for isolation.

    Returns:
        Dict with completed undergraduate degree, applying for Honours.
    """
    return {
        # Identity
        "profile_id": "TEST-TRAJ-PG-001",
        "full_name": "Trajectory Test Postgraduate",
        "id_number": "9601015000001",
        "date_of_birth": "1996-01-01",
        "gender": "Male",
        "home_language": "English",
        "province": "Western Cape",
        "citizenship": "South African",

        # Contact
        "mobile_number": "+27821111002",
        "email": "traj.postgrad@example.com",
        "whatsapp_number": "+27821111002",
        "physical_address": "2 Trajectory Road, Cape Town, 7700",

        # Postgraduate specific
        "education_level": "Honours",
        "previous_qualification": "Bachelor's Degree",
        "undergraduate_degree": "BSc Computer Science",
        "undergraduate_institution": "University of Cape Town",
        "undergraduate_graduation_year": 2024,
        "undergraduate_average": 75.0,

        # Course Selection
        "course_choices": [
            {
                "priority": 1,
                "institution": "University of Cape Town",
                "faculty": "Science",
                "programme": "BSc Honours Computer Science",
                "minimum_avg": 65,
                "requirements": "BSc degree in Computer Science or related field",
            },
        ],
        "primary_institution": "University of Cape Town",

        # Financial - postgrad typically not NSFAS eligible
        "nsfas_eligible": False,
        "household_income": "N/A - independent",
        "sassa_recipient": False,
        "disability_grant": False,
        "guardian_employment": "N/A",

        # Documents
        "documents_available": [
            "ID Document",
            "Undergraduate Degree Certificate",
            "Academic Transcript",
            "Proof of Residence",
        ],
        "documents_missing": [],
    }


@pytest.fixture
def trajectory_low_aps_profile() -> dict[str, Any]:
    """
    Low APS profile for trajectory tests (fallback scenario testing).

    Uses TEST-TRAJ- prefix for isolation.

    Returns:
        Dict with APS score below first choice requirement.
    """
    return {
        # Identity
        "profile_id": "TEST-TRAJ-LOW-001",
        "full_name": "Trajectory Test Low APS",
        "id_number": "0601015000001",
        "date_of_birth": "2006-01-01",
        "gender": "Female",
        "home_language": "IsiZulu",
        "province": "KwaZulu-Natal",
        "citizenship": "South African",

        # Contact
        "mobile_number": "+27821111003",
        "email": "traj.lowaps@example.com",
        "whatsapp_number": "+27821111003",
        "physical_address": "3 Trajectory Street, Durban, 4001",

        # Academic - low scores
        "matric_results": {
            "English FAL": {"level": "FAL", "mark": 52, "aps_points": 4},
            "Mathematics": {"level": "HL", "mark": 42, "aps_points": 3},
            "Physical Sciences": {"level": "HL", "mark": 48, "aps_points": 3},
            "Life Sciences": {"level": "HL", "mark": 55, "aps_points": 4},
            "IsiZulu HL": {"level": "HL", "mark": 70, "aps_points": 5},
            "Life Orientation": {"level": "-", "mark": 68, "aps_points": 5},
            "Geography": {"level": "HL", "mark": 50, "aps_points": 4},
        },
        "total_aps_score": 28,
        "academic_highlights": ["Strong performance in home language"],

        # Course Selection - first choice unrealistic
        "course_choices": [
            {
                "priority": 1,
                "institution": "University of Pretoria",
                "faculty": "Health Sciences",
                "programme": "MBChB (Medicine)",
                "minimum_aps": 42,
                "requirements": "Mathematics HL (70%+), Physical Sciences HL (70%+)",
            },
            {
                "priority": 2,
                "institution": "University of Pretoria",
                "faculty": "Natural and Agricultural Sciences",
                "programme": "BSc Biological Sciences",
                "minimum_aps": 28,
                "requirements": "Life Sciences HL (50%+)",
            },
        ],
        "primary_institution": "University of Pretoria",

        # Financial
        "nsfas_eligible": True,
        "household_income": "R75,000 per year",
        "sassa_recipient": True,
        "disability_grant": False,
        "guardian_employment": "Unemployed",

        # Documents - some missing
        "documents_available": ["ID Document", "Matric Certificate"],
        "documents_missing": ["Academic Transcript", "Proof of Residence"],
    }


# =============================================================================
# Post-Test Cassette Audit
# =============================================================================

def scan_cassette_for_secrets(cassette_path: Path) -> list[tuple[str, str, int]]:
    """
    Scan a cassette file for unredacted secrets.

    Uses the unified scan_text_for_secrets function from secret_patterns module.

    Args:
        cassette_path: Path to the cassette YAML file

    Returns:
        List of tuples (pattern_name, matched_text, line_number)
    """
    if not cassette_path.exists():
        return []

    findings = []

    try:
        with open(cassette_path, 'r') as f:
            content = f.read()
            lines = content.split('\n')

        for line_num, line in enumerate(lines, 1):
            # Skip already redacted content
            if '[REDACTED-' in line or '[REDACTED_' in line:
                continue

            # Use unified scan function
            line_findings = scan_text_for_secrets(line)
            for finding in line_findings:
                matched = finding["matched"]
                # Avoid false positives on short strings
                if len(matched) > 10 or matched.endswith("..."):
                    findings.append((finding["pattern"], matched, line_num))

    except Exception as e:
        # Log but don't fail on read errors
        print(f"Warning: Could not audit cassette {cassette_path}: {e}")

    return findings


@pytest.fixture(autouse=True)
def post_test_cassette_audit(request):
    """
    Audit cassettes after each test for unredacted secrets.

    This fixture runs AFTER each test and:
    1. Identifies which cassette(s) were used/created
    2. Scans them for unredacted secrets
    3. Fails the test if secrets are found

    SECURITY CRITICAL: This is the last line of defense against
    accidentally committing secrets to version control.
    """
    # Run the test first
    yield

    # After test: audit any created cassettes
    cassette_dir = Path(__file__).parent.parent / "cassettes" / "trajectories"

    # Get test name for cassette lookup
    test_class = request.node.parent.name if request.node.parent else ""
    test_name = request.node.name
    full_test_name = f"{test_class}.{test_name}" if test_class else test_name

    # Check for cassette
    cassette_path = cassette_dir / f"{full_test_name}.yaml"

    if cassette_path.exists():
        findings = scan_cassette_for_secrets(cassette_path)

        if findings:
            # Format findings for error message
            finding_details = "\n".join(
                f"  - {name}: '{text}' at line {line}"
                for name, text, line in findings
            )

            pytest.fail(
                f"SECURITY ALERT: Unredacted secrets found in cassette!\n"
                f"Cassette: {cassette_path}\n"
                f"Findings:\n{finding_details}\n\n"
                f"ACTION REQUIRED:\n"
                f"1. Delete the cassette file\n"
                f"2. Check for secrets in git history\n"
                f"3. Rotate any exposed credentials\n"
                f"4. Re-record with proper filtering"
            )


# =============================================================================
# Cleanup Fixture for Trajectory Tests
# =============================================================================

@pytest.fixture(autouse=True)
def cleanup_trajectory_test_data():
    """
    Clean up trajectory test data after each test.

    Extends root conftest cleanup with TEST-TRAJ- prefix handling.
    """
    yield

    # Import here to avoid circular imports
    try:
        import sys
        src_path = Path(__file__).resolve().parent.parent.parent / "src"
        sys.path.insert(0, str(src_path))
        from one_for_all.tools.supabase_client import supabase

        if not supabase:
            return

        # Clean up trajectory-specific test data
        try:
            supabase.table("applicant_sessions").delete().like("applicant_id", "TEST-TRAJ-%").execute()
            supabase.table("application_documents").delete().like("application_id", "TEST-TRAJ-%").execute()
            supabase.table("applications").delete().like("confirmation_number", "TEST-TRAJ-%").execute()
            supabase.table("applicant_accounts").delete().like("primary_student_number", "TEST-TRAJ-%").execute()
            supabase.table("otp_codes").delete().like("identifier", "TEST-TRAJ-%").execute()
            supabase.table("otp_codes").delete().like("identifier", "%traj%@example.com").execute()
            supabase.table("nsfas_documents").delete().like("nsfas_application_id", "TEST-TRAJ-%").execute()
            supabase.table("nsfas_applications").delete().like("reference_number", "TEST-TRAJ-NSFAS-%").execute()
        except Exception as e:
            print(f"Warning: Trajectory test cleanup encountered error: {e}")

    except ImportError:
        pass  # Supabase client not available


# =============================================================================
# Additional Helper Fixtures
# =============================================================================

@pytest.fixture
def mock_trajectory_otp():
    """Provide a mock OTP code for trajectory tests."""
    return "999888"


@pytest.fixture
def trajectory_session_token():
    """Provide a test session token for trajectory tests."""
    return "TEST-TRAJ-SESSION-" + os.urandom(8).hex()
