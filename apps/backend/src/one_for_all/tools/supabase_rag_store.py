import asyncio
from crewai.tools import tool
from .supabase_client import supabase
from ..utils.db_audit import audit_service_role_access

@audit_service_role_access(table="rag_embeddings", operation="insert")
@tool
def supabase_rag_store(embedding: list, metadata: dict) -> str:
    """
    Stores embeddings in Supabase vector DB.
    """
    async def async_logic():
        payload = {
            "embedding": embedding,
            "metadata": metadata
        }
        result = await supabase.table("rag_embeddings").insert(payload).execute()
        return str(result.data)

    return asyncio.run(async_logic())
