"""
Shared pytest fixtures for integration and unit tests.

This module provides common test fixtures including:
- Test mode configuration
- VCR cassette configuration for LLM response recording
- DeepEval configuration for LLM output validation
- CrewAI crew instances
- Sample undergraduate and postgraduate profiles
- Database cleanup utilities
"""

import pytest
import os
import re
from pathlib import Path
from typing import Dict, Any

# =============================================================================
# DeepEval Configuration
# =============================================================================
# Disable telemetry by default for privacy
os.environ.setdefault("DEEPEVAL_TELEMETRY_ENABLED", "false")


# =============================================================================
# LLM-Dependent Test Skip Logic
# =============================================================================
# Tests marked with @pytest.mark.llm_required need either:
# 1. A valid DEEPSEEK_API_KEY for live API calls
# 2. Pre-recorded VCR cassettes with LLM responses
#
# Without these, tests are skipped to avoid timeouts.

def has_valid_deepseek_key() -> bool:
    """Check if a valid DeepSeek API key is available."""
    key = os.environ.get("DEEPSEEK_API_KEY", "")
    return bool(key) and not key.startswith("sk-test")


def get_cassette_path(test_name: str, cassette_dir: Path) -> Path:
    """Get the expected cassette path for a test."""
    # VCR creates cassettes with the format: TestClass.test_method.yaml
    return cassette_dir / f"{test_name}.yaml"


def cassette_has_llm_response(cassette_path: Path) -> bool:
    """Check if a cassette file has actual LLM API responses (not just cleanup calls)."""
    if not cassette_path.exists():
        return False
    try:
        import yaml
        with open(cassette_path) as f:
            cassette = yaml.safe_load(f)
        # Check if any interaction is an LLM API call (DeepSeek)
        if cassette and "interactions" in cassette:
            for interaction in cassette["interactions"]:
                request = interaction.get("request", {})
                uri = request.get("uri", "")
                if "deepseek" in uri.lower() or "openai" in uri.lower():
                    return True
        return False
    except Exception:
        return False


@pytest.fixture(autouse=True)
def skip_llm_tests_without_cassettes(request):
    """
    Skip tests marked with llm_required if no LLM access is available.

    This fixture runs before each test and skips tests that:
    1. Are marked with @pytest.mark.llm_required
    2. Don't have a valid DeepSeek API key
    3. Don't have a pre-recorded VCR cassette with LLM responses

    This prevents test timeouts when running without API keys or cassettes.
    """
    # Only check tests marked with llm_required
    marker = request.node.get_closest_marker("llm_required")
    if marker is None:
        return

    # If we have a valid API key, allow the test to run (will record cassette)
    if has_valid_deepseek_key():
        return

    # No API key - check if cassette exists with LLM responses
    cassette_dir = Path(__file__).parent / "cassettes"

    # Get test class and method name for cassette lookup
    test_class = request.node.parent.name if request.node.parent else ""
    test_name = request.node.name
    full_test_name = f"{test_class}.{test_name}" if test_class else test_name

    cassette_path = get_cassette_path(full_test_name, cassette_dir)

    if not cassette_has_llm_response(cassette_path):
        pytest.skip(
            f"Skipping {test_name}: No DEEPSEEK_API_KEY and no valid VCR cassette. "
            f"To record cassettes, run with a valid API key: "
            f"DEEPSEEK_API_KEY=sk-xxx pytest -k '{test_name}' --vcr-record=all"
        )


# =============================================================================
# VCR Request Filtering Functions
# =============================================================================

def filter_request_timestamps(request):
    """
    Remove timestamps from request body for deterministic matching.

    This function normalizes timestamp values in request bodies to ensure
    cassettes match consistently across test runs regardless of when the
    test was executed. This is critical for Phase 2 VCR integration tests.

    Filters:
    - ISO 8601 timestamps (e.g., 2024-01-15T10:30:00)
    - Unix timestamp values in JSON (e.g., "timestamp": 1705312200)

    Args:
        request: VCR request object containing headers and body

    Returns:
        Modified request object with timestamps normalized
    """
    if request.body:
        body = request.body.decode('utf-8') if isinstance(request.body, bytes) else request.body
        # Replace ISO 8601 timestamps with placeholder
        body = re.sub(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', 'TIMESTAMP', body)
        # Replace Unix timestamps in JSON with placeholder
        body = re.sub(r'"timestamp":\s*\d+', '"timestamp": 0', body)
        request.body = body.encode('utf-8') if isinstance(request.body, bytes) else body
    return request


# =============================================================================
# VCR Configuration for Integration Tests
# =============================================================================
# VCR records HTTP responses from LLM APIs (DeepSeek) on first run,
# then replays them in CI - eliminating 30+ minute timeouts.

@pytest.fixture(scope="module")
def vcr_config():
    """
    Configure VCR.py for recording/replaying LLM API responses.

    This configuration:
    - Filters out API keys from recordings (security)
    - Records once, replays forever (deterministic CI)
    - Matches on method, scheme, host, port, path (ignores body for LLM calls)
    - Filters timestamps for deterministic cassette matching (Phase 2)
    - Ignores local hosts to avoid recording localhost requests

    Usage:
        @pytest.mark.vcr()
        def test_my_llm_function():
            # First run: records to tests/cassettes/test_my_llm_function.yaml
            # All subsequent runs: replays from cassette (< 1 second)
            ...
    """
    return {
        # Filter sensitive headers from recordings
        "filter_headers": [
            "authorization",
            "x-api-key",
            "api-key",
            "bearer",
        ],
        # Filter sensitive query params (enhanced for Phase 2)
        "filter_query_parameters": [
            "api_key",
            "access_token",
            "apikey",
            "key",
        ],
        # Record mode: "once" = record if cassette missing, replay if exists
        "record_mode": "once",
        # Store cassettes in tests/cassettes/ directory
        "cassette_library_dir": str(Path(__file__).parent / "cassettes"),
        # Match requests on these attributes (ignore body for LLM variability)
        "match_on": ["method", "scheme", "host", "port", "path"],
        # Decode compressed responses for readable cassettes
        "decode_compressed_response": True,
        # Allow recording if no cassette exists
        "record_on_exception": False,
        # Phase 2: Filter timestamps from request bodies for deterministic matching
        "before_record_request": filter_request_timestamps,
        # Phase 2: Ignore local development hosts (no recording needed)
        "ignore_hosts": ["localhost", "127.0.0.1"],
    }


@pytest.fixture(scope="module")
def vcr_cassette_dir(request):
    """
    Override cassette directory per test module.

    Organizes cassettes by test module for easier navigation.
    """
    return str(Path(__file__).parent / "cassettes")


# =============================================================================
# DeepEval Configuration for LLM Testing
# =============================================================================

@pytest.fixture(scope="session")
def deepeval_config():
    """
    Configure DeepEval for the test session.

    This fixture:
    - Sets up DeepEval API key if available
    - Returns configuration dict indicating if DeepEval is enabled
    - Tests can use this to conditionally skip if not configured

    Usage:
        def test_llm_output(deepeval_config):
            if not deepeval_config["enabled"]:
                pytest.skip("DeepEval not configured")
            # ... run DeepEval tests
    """
    api_key = os.environ.get("DEEPEVAL_API_KEY", "")
    if api_key:
        try:
            from deepeval import set_api_key
            set_api_key(api_key)
        except ImportError:
            pass  # DeepEval not installed, tests will skip
    return {"enabled": bool(api_key)}


@pytest.fixture(scope="session")
def sentence_transformer_model():
    """
    Lazy-load sentence transformer model for semantic similarity tests.

    This fixture loads the model once per session to avoid repeated
    model loading overhead. Returns None if sentence-transformers
    is not installed.

    Usage:
        def test_semantic(sentence_transformer_model):
            if sentence_transformer_model is None:
                pytest.skip("sentence-transformers not installed")
            embeddings = sentence_transformer_model.encode(["text1", "text2"])
    """
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer('all-MiniLM-L6-v2')
    except ImportError:
        return None


# Add src to path for imports
import sys
src_path = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(src_path))

from one_for_all.crew import OneForAllCrew
from one_for_all.tools.supabase_client import supabase


@pytest.fixture(scope="session", autouse=True)
def set_test_mode():
    """
    Enable test mode for entire test session.

    This fixture automatically runs before all tests and sets
    the ONEFORALL_TEST_MODE environment variable to prevent
    actual API calls and database modifications during testing.
    """
    os.environ["ONEFORALL_TEST_MODE"] = "true"
    yield
    os.environ.pop("ONEFORALL_TEST_MODE", None)


@pytest.fixture
def test_crew():
    """
    Get crew instance configured for testing.

    Returns:
        OneForAllCrew: Initialized crew with all agents and tasks
    """
    return OneForAllCrew()


@pytest.fixture
def undergraduate_profile() -> Dict[str, Any]:
    """
    Sample undergraduate profile for testing.

    Returns:
        Dict containing a complete undergraduate applicant profile
        with high APS score, all documents, and NSFAS eligibility.
    """
    return {
        # Identity
        "profile_id": "TEST-UG-001",
        "full_name": "Test Undergraduate Student",
        "id_number": "0001010000000",
        "date_of_birth": "2000-01-01",
        "gender": "Female",
        "home_language": "English",
        "province": "Gauteng",
        "citizenship": "South African",

        # Contact
        "mobile_number": "+27821234567",
        "email": "test.undergrad@example.com",
        "whatsapp_number": "+27821234567",
        "physical_address": "123 Test Street, Pretoria, 0002",

        # Academic
        "matric_results": {
            "English Home Language": {"level": "HL", "mark": 75, "aps_points": 6},
            "Mathematics": {"level": "HL", "mark": 80, "aps_points": 7},
            "Physical Sciences": {"level": "HL", "mark": 78, "aps_points": 6},
            "Life Sciences": {"level": "HL", "mark": 72, "aps_points": 6},
            "Afrikaans FAL": {"level": "FAL", "mark": 68, "aps_points": 5},
            "Life Orientation": {"level": "-", "mark": 70, "aps_points": 5},
            "Geography": {"level": "HL", "mark": 65, "aps_points": 5},
        },
        "total_aps_score": 40,
        "academic_highlights": [
            "Consistent academic excellence",
            "Strong STEM performance",
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
        "household_income": "R150,000 per year",
        "sassa_recipient": False,
        "disability_grant": False,
        "guardian_employment": "Employed - retail worker",

        # Documents
        "documents_available": [
            "ID Document",
            "Matric Certificate",
            "Academic Transcript",
        ],
        "documents_missing": ["Proof of Residence"],
    }


@pytest.fixture
def undergraduate_profile_low_aps() -> Dict[str, Any]:
    """
    Undergraduate profile with low APS score for testing fallback logic.

    Returns:
        Dict with APS score below first choice requirement
    """
    return {
        "profile_id": "TEST-UG-LOW-002",
        "full_name": "Test Low APS Student",
        "id_number": "0002020000000",
        "date_of_birth": "2000-02-02",
        "gender": "Male",
        "home_language": "IsiZulu",
        "province": "KwaZulu-Natal",
        "citizenship": "South African",
        "mobile_number": "+27821234568",
        "email": "test.lowaps@example.com",
        "whatsapp_number": "+27821234568",
        "physical_address": "456 Test Ave, Durban, 4001",
        "matric_results": {
            "English FAL": {"level": "FAL", "mark": 55, "aps_points": 4},
            "Mathematics": {"level": "HL", "mark": 45, "aps_points": 3},
            "Physical Sciences": {"level": "HL", "mark": 50, "aps_points": 4},
            "Life Sciences": {"level": "HL", "mark": 48, "aps_points": 3},
            "IsiZulu HL": {"level": "HL", "mark": 68, "aps_points": 5},
            "Life Orientation": {"level": "-", "mark": 65, "aps_points": 5},
            "Geography": {"level": "HL", "mark": 52, "aps_points": 4},
        },
        "total_aps_score": 28,
        "academic_highlights": ["Consistent effort despite challenges"],
        "course_choices": [
            {
                "priority": 1,
                "institution": "University of Pretoria",
                "faculty": "Science",
                "programme": "BSc Medicine (MBChB)",
                "minimum_aps": 42,
                "requirements": "Mathematics HL (70%+), Physical Sciences HL (70%+)",
            },
            {
                "priority": 2,
                "institution": "University of Pretoria",
                "faculty": "Science",
                "programme": "BSc Biological Sciences",
                "minimum_aps": 28,
                "requirements": "Life Sciences HL (50%+)",
            },
        ],
        "primary_institution": "University of Pretoria",
        "nsfas_eligible": True,
        "household_income": "R80,000 per year",
        "sassa_recipient": True,
        "disability_grant": False,
        "guardian_employment": "Unemployed",
        "documents_available": ["ID Document", "Matric Certificate"],
        "documents_missing": ["Academic Transcript", "Proof of Residence"],
    }


@pytest.fixture
def postgraduate_profile_honours() -> Dict[str, Any]:
    """
    Postgraduate Honours profile for testing.

    Returns:
        Dict with completed undergraduate degree, applying for Honours
    """
    return {
        "profile_id": "TEST-PG-HON-011",
        "full_name": "Test Honours Candidate",
        "id_number": "9501150000000",
        "date_of_birth": "1995-01-15",
        "gender": "Female",
        "home_language": "English",
        "province": "Western Cape",
        "citizenship": "South African",
        "mobile_number": "+27821234569",
        "email": "test.honours@example.com",
        "whatsapp_number": "+27821234569",
        "physical_address": "789 Academic Rd, Cape Town, 7700",

        # Postgraduate specific
        "education_level": "Honours",
        "previous_qualification": "Bachelor's Degree",
        "undergraduate_degree": "BSc Computer Science",
        "undergraduate_institution": "University of Cape Town",
        "undergraduate_graduation_year": 2023,
        "undergraduate_average": 72.5,

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

        "documents_available": [
            "ID Document",
            "Undergraduate Degree Certificate",
            "Academic Transcript",
            "Proof of Residence",
        ],
        "documents_missing": [],
    }


@pytest.fixture
def postgraduate_profile_masters() -> Dict[str, Any]:
    """
    Postgraduate Masters profile for testing.

    Returns:
        Dict with completed Honours, applying for Masters
    """
    return {
        "profile_id": "TEST-PG-MSC-012",
        "full_name": "Test Masters Candidate",
        "id_number": "9401200000000",
        "date_of_birth": "1994-01-20",
        "gender": "Male",
        "home_language": "Afrikaans",
        "province": "Gauteng",
        "citizenship": "South African",
        "mobile_number": "+27821234570",
        "email": "test.masters@example.com",
        "whatsapp_number": "+27821234570",
        "physical_address": "321 Research Ln, Johannesburg, 2000",

        "education_level": "Masters",
        "previous_qualification": "Honours Degree",
        "undergraduate_degree": "BSc Honours Physics",
        "undergraduate_institution": "University of the Witwatersrand",
        "undergraduate_graduation_year": 2022,
        "undergraduate_average": 78.0,

        "course_choices": [
            {
                "priority": 1,
                "institution": "University of the Witwatersrand",
                "faculty": "Science",
                "programme": "MSc Physics",
                "minimum_avg": 70,
                "requirements": "BSc Honours in Physics with 70%+ average",
            },
        ],
        "primary_institution": "University of the Witwatersrand",

        "nsfas_eligible": False,
        "household_income": "N/A",
        "sassa_recipient": False,
        "disability_grant": False,
        "guardian_employment": "N/A",

        "documents_available": [
            "ID Document",
            "Honours Degree Certificate",
            "Academic Transcript",
            "Research Proposal",
        ],
        "documents_missing": [],
    }


@pytest.fixture
def mature_student_profile() -> Dict[str, Any]:
    """
    Mature student profile (career change scenario).

    Returns:
        Dict for student with prior qualification switching fields
    """
    return {
        "profile_id": "TEST-MAT-009",
        "full_name": "Test Mature Student",
        "id_number": "8505100000000",
        "date_of_birth": "1985-05-10",
        "gender": "Female",
        "home_language": "English",
        "province": "Gauteng",
        "citizenship": "South African",
        "mobile_number": "+27821234571",
        "email": "test.mature@example.com",
        "whatsapp_number": "+27821234571",
        "physical_address": "555 Career Change St, Pretoria, 0001",

        # Mature student specifics
        "age": 38,
        "prior_qualification": "National Diploma in Marketing",
        "prior_institution": "Tshwane University of Technology",
        "work_experience_years": 15,
        "current_employment": "Marketing Manager",

        "matric_results": {
            "English HL": {"level": "HL", "mark": 70, "aps_points": 5},
            "Mathematics": {"level": "HL", "mark": 65, "aps_points": 5},
            "Business Studies": {"level": "HL", "mark": 75, "aps_points": 6},
            "Accounting": {"level": "HL", "mark": 68, "aps_points": 5},
            "Afrikaans FAL": {"level": "FAL", "mark": 60, "aps_points": 4},
            "Life Orientation": {"level": "-", "mark": 72, "aps_points": 5},
            "Economics": {"level": "HL", "mark": 70, "aps_points": 5},
        },
        "total_aps_score": 35,

        "course_choices": [
            {
                "priority": 1,
                "institution": "University of South Africa (UNISA)",
                "faculty": "Science, Engineering and Technology",
                "programme": "BSc Information Technology (part-time)",
                "minimum_aps": 28,
                "requirements": "Matric + recognition of prior learning",
            },
        ],
        "primary_institution": "University of South Africa (UNISA)",

        "nsfas_eligible": False,
        "household_income": "R450,000 per year",
        "sassa_recipient": False,
        "disability_grant": False,
        "guardian_employment": "N/A",

        "documents_available": [
            "ID Document",
            "Matric Certificate",
            "Prior Diploma Certificate",
            "Employment Certificate",
        ],
        "documents_missing": [],
    }


@pytest.fixture(autouse=True)
def cleanup_test_data():
    """
    Clean up test data after each test.

    This fixture runs automatically after every test to remove
    any test records from the database, ensuring a clean state
    for subsequent tests.

    IMPORTANT: Session and memory isolation
    - Each test gets a NEW crew instance (function-scoped fixture)
    - Agent memory is NOT persisted between tests
    - Database records with TEST- prefix are cleaned up after each test
    - Sessions are explicitly cleaned to prevent accumulation
    """
    yield

    # Only run cleanup if supabase is configured
    # Note: We DO want to clean up in test mode (TEST- prefixed data)
    if not supabase:
        return

    try:
        # 1. Delete test sessions (CRITICAL for isolation)
        # Sessions accumulate if not cleaned - each test creates a new session
        # Note: Table is 'applicant_sessions' (not 'user_sessions')
        supabase.table("applicant_sessions").delete().like("applicant_id", "TEST-%").execute()
        supabase.table("applicant_sessions").delete().like("session_token", "TEST-%").execute()

        # 2. Delete test applications and their documents
        # Documents should cascade delete if FK constraints exist
        supabase.table("application_documents").delete().like("application_id", "TEST-%").execute()
        supabase.table("applications").delete().like("confirmation_number", "TEST-%").execute()

        # 3. Delete test applicant accounts
        supabase.table("applicant_accounts").delete().like("primary_student_number", "TEST-%").execute()

        # 4. Delete test OTP codes (both email and phone based)
        supabase.table("otp_codes").delete().like("identifier", "TEST-%").execute()
        supabase.table("otp_codes").delete().like("identifier", "%@example.com").execute()

        # 5. Delete test NSFAS applications and documents
        supabase.table("nsfas_documents").delete().like("nsfas_application_id", "TEST-%").execute()
        supabase.table("nsfas_applications").delete().like("reference_number", "TEST-NSFAS-%").execute()

    except Exception as e:
        # Log cleanup errors but don't fail tests
        # Some tables may not exist in all environments
        print(f"Warning: Test cleanup encountered error: {e}")


@pytest.fixture
def mock_otp_code():
    """
    Provide a mock OTP code for testing.

    Returns:
        str: 6-digit OTP code for testing
    """
    return "123456"


@pytest.fixture
def sample_student_number():
    """
    Provide a sample student number for testing.

    Returns:
        str: Test student number
    """
    return "TEST-2024-001234"
