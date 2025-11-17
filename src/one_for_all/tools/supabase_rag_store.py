import asyncio
from crewai_tools import tool
from .supabase_client import supabase

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
