# Memory and Session Isolation in Test Suite

This document describes how the One For All test suite maintains isolation between tests, ensuring each test runs independently without cross-contamination from prior tests.

## Overview

In production, each prospect applies separately:
1. New crew instance created
2. Fresh agent memory (no prior context)
3. Unique session token
4. Independent database records

The test suite mirrors this behavior to ensure reliable, reproducible tests.

---

## Memory Isolation

### How CrewAI Memory Works

Agents with `memory: true` in `config/agents.yaml`:
- `identity_auth_agent`: memory enabled
- `application_intake_agent`: memory enabled
- `rag_specialist_agent`: memory enabled
- `nsfas_agent`: memory enabled
- `submission_agent`: memory disabled

**Important**: CrewAI memory is **in-memory only** by default:
- Memory lives in process RAM
- Memory is NOT persisted to disk or database
- Memory is lost when the crew instance is destroyed

### Test Isolation Mechanism

```python
# tests/conftest.py
@pytest.fixture
def test_crew():
    """Each test gets a NEW crew instance."""
    return OneForAllCrew()  # Fresh instance with empty memory
```

The `test_crew` fixture is **function-scoped** (default), meaning:
1. Test 1 runs → new crew created → agents have empty memory
2. Test 1 completes → crew instance garbage collected → memory lost
3. Test 2 runs → new crew created → agents have empty memory (no Test 1 data)

### What NOT To Do

```python
# BAD: Session-scoped fixture would share memory across tests
@pytest.fixture(scope="session")  # NEVER DO THIS
def test_crew():
    return OneForAllCrew()

# BAD: Reusing crew instance
crew = OneForAllCrew()  # Module-level singleton

def test_one():
    crew.crew().kickoff(...)  # Uses shared crew

def test_two():
    crew.crew().kickoff(...)  # CONTAMINATED with test_one's memory
```

---

## Session Isolation

### The Problem

Each test creates database records including sessions:
- `user_sessions` - Authentication sessions
- `applicant_sessions` - Applicant-specific sessions
- `otp_codes` - One-time passwords

Without cleanup, these accumulate across test runs.

### The Solution

The `cleanup_test_data` fixture runs after every test:

```python
@pytest.fixture(autouse=True)
def cleanup_test_data():
    yield  # Test runs here

    # Cleanup runs after test
    supabase.table("user_sessions").delete().like("user_id", "TEST-%").execute()
    supabase.table("applicant_sessions").delete().like("session_token", "TEST-%").execute()
    # ... more cleanup
```

### TEST- Prefix Convention

All test data MUST use `TEST-` prefix for reliable cleanup:

| Data Type | Prefix Pattern | Example |
|-----------|----------------|---------|
| Profile IDs | `TEST-XX-NNN` | `TEST-UG-001` |
| Student Numbers | `TEST-YYYY-NNNNNN` | `TEST-2024-001234` |
| Session Tokens | `TEST-{uuid}` | `TEST-abc123-def456` |
| Confirmation Numbers | `TEST-YYYYMMDD-XXXXX` | `TEST-20260108-A1B2C` |
| NSFAS References | `TEST-NSFAS-YYYYMMDD-XXXXX` | `TEST-NSFAS-20260108-N1S2F` |

### Tables Cleaned Up

1. **Sessions** (critical for isolation)
   - `user_sessions` - by `user_id LIKE 'TEST-%'`
   - `applicant_sessions` - by `session_token LIKE 'TEST-%'`

2. **Applications**
   - `application_documents` - by `application_id LIKE 'TEST-%'`
   - `applications` - by `confirmation_number LIKE 'TEST-%'`

3. **Accounts**
   - `applicant_accounts` - by `primary_student_number LIKE 'TEST-%'`

4. **OTP**
   - `otp_codes` - by `identifier LIKE 'TEST-%'` or `'%@example.com'`

5. **NSFAS**
   - `nsfas_documents` - by `nsfas_application_id LIKE 'TEST-%'`
   - `nsfas_applications` - by `reference_number LIKE 'TEST-NSFAS-%'`

---

## Production Parity

### Production Behavior

```
Prospect A applies:
├─ New OneForAllCrew() instance
├─ Agents initialized with empty memory
├─ Session created in DB
├─ Application processed
└─ Process ends, crew destroyed

Prospect B applies (separate process):
├─ New OneForAllCrew() instance
├─ Agents initialized with empty memory (no Prospect A data)
├─ Session created in DB
├─ Application processed
└─ Process ends, crew destroyed
```

### Test Behavior (mirrors production)

```
Test profile_001:
├─ test_crew fixture creates new OneForAllCrew()
├─ Agents initialized with empty memory
├─ Test runs, creates TEST- prefixed DB records
├─ Test completes
├─ cleanup_test_data removes TEST- records
└─ Crew instance garbage collected

Test profile_002:
├─ test_crew fixture creates new OneForAllCrew()
├─ Agents initialized with empty memory (no profile_001 data)
├─ Test runs, creates TEST- prefixed DB records
├─ Test completes
├─ cleanup_test_data removes TEST- records
└─ Crew instance garbage collected
```

---

## Validation Tests

The test suite includes isolation validation tests in `tests/unit/test_isolation.py`:

### Memory Isolation Tests
- `test_new_crew_instances_are_independent`
- `test_agents_are_recreated_per_crew`
- `test_crew_fixture_is_function_scoped`
- `test_memory_enabled_agents_have_isolated_memory`

### Session Isolation Tests
- `test_session_token_format_supports_cleanup`
- `test_user_id_format_supports_cleanup`

### Cleanup Coverage Tests
- `test_cleanup_fixture_exists`
- `test_cleanup_handles_sessions`
- `test_cleanup_handles_applications`
- `test_cleanup_handles_nsfas`
- `test_cleanup_handles_otp`

### Production Parity Tests
- `test_each_prospect_gets_fresh_crew`
- `test_test_mode_environment_is_set`
- `test_profiles_represent_diverse_scenarios`

Run validation tests:
```bash
pytest tests/unit/test_isolation.py -v
```

---

## Troubleshooting

### Symptom: Test data accumulating in database

**Cause**: Cleanup fixture not running or failing silently

**Fix**:
1. Check Supabase is configured: `echo $SUPABASE_URL`
2. Verify TEST- prefix on all test data
3. Run manual cleanup: `python -m one_for_all.tests.cleanup`

### Symptom: Tests passing individually but failing together

**Cause**: Possible memory contamination from shared crew instance

**Fix**:
1. Verify `test_crew` fixture is function-scoped (default)
2. Check no module-level crew instances exist
3. Run `pytest tests/unit/test_isolation.py` to validate

### Symptom: Session lookup returns wrong session

**Cause**: User ID collision between test profiles

**Fix**:
1. Ensure all test profile IDs are unique
2. Use `TEST-{unique_id}` pattern
3. Verify session cleanup is running

### Symptom: Agent "remembers" data from prior test

**Cause**: Crew instance being reused (not destroyed between tests)

**Fix**:
1. Never use session/module-scoped crew fixtures
2. Don't store crew instances at module level
3. Always use `test_crew` fixture for crew access

---

## Best Practices

1. **Always use TEST- prefix** for all test data identifiers
2. **Use function-scoped fixtures** for crew and database-affecting operations
3. **Let cleanup run** - don't disable the autouse fixture
4. **Verify isolation** - run `test_isolation.py` when changing test infrastructure
5. **Monitor DB size** - watch for accumulating test data in staging
6. **Use @example.com emails** - ensures no real emails are sent
7. **Use TEST- phone numbers** - prevents real SMS sends

---

## Related Files

- `tests/conftest.py` - Fixtures and cleanup implementation
- `tests/unit/test_isolation.py` - Isolation validation tests
- `src/one_for_all/crew.py` - Crew lifecycle management
- `src/one_for_all/config/agents.yaml` - Agent memory configuration
- `src/one_for_all/tests/cleanup.py` - Manual cleanup utilities
