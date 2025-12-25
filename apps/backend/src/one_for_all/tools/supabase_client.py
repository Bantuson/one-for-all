import os
import warnings
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment from monorepo root
load_dotenv(dotenv_path=Path(__file__).resolve().parents[5] / '.env.local')

# Use correct environment variable names matching .env.local
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Validate configuration
if not SUPABASE_URL or not SUPABASE_KEY:
    warnings.warn(
        "Supabase configuration missing. Check NEXT_PUBLIC_SUPABASE_URL and "
        "SUPABASE_SERVICE_ROLE_KEY in root .env.local"
    )

# Use sync client for now (CrewAI tools use asyncio.run internally)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None
