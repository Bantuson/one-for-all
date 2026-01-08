import os
import warnings
from pathlib import Path
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment from monorepo root
load_dotenv(dotenv_path=Path(__file__).resolve().parents[5] / '.env.local')

# Use correct environment variable names matching .env.local
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Check if running in test mode
TEST_MODE = os.getenv("ONEFORALL_TEST_MODE", "false").lower() == "true"

# Validate configuration (only warn if not in test mode)
if not SUPABASE_URL or not SUPABASE_KEY:
    if not TEST_MODE:
        warnings.warn(
            "Supabase configuration missing. Check NEXT_PUBLIC_SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in root .env.local"
        )

# Lazy initialization to prevent blocking at import time
# This is critical for test suite execution
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """
    Get Supabase client with lazy initialization.

    The client is created on first access, not at module import time.
    This prevents blocking during test collection and allows proper
    mocking in test mode.

    Returns:
        Supabase Client instance or None if not configured
    """
    global _supabase_client

    if _supabase_client is None and SUPABASE_URL and SUPABASE_KEY:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

    return _supabase_client


# For backwards compatibility, expose as property-like access
# Tools can use either `supabase` or `get_supabase_client()`
class _LazySupabaseClient:
    """Lazy wrapper for backwards compatibility with existing tool code."""

    def __getattr__(self, name):
        client = get_supabase_client()
        if client is None:
            raise RuntimeError(
                "Supabase client not configured. "
                "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
            )
        return getattr(client, name)

    def __bool__(self):
        return get_supabase_client() is not None


# Backwards-compatible lazy client
supabase = _LazySupabaseClient()
