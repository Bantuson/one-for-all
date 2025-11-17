import os
from supabase import create_client, AsyncClient

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: AsyncClient = create_client(SUPABASE_URL, SUPABASE_KEY, is_async=True)
