import asyncio
from crewai.tools import tool
from .supabase_client import supabase

@tool
def supabase_rag_query(query_embedding: list, k: int = 5) -> str:
    """
    Vector similarity search for university/course information.
    """

    async def async_logic():
        result = (
            await supabase.rpc(
                "match_rag_embeddings",
                {"query_embedding": query_embedding, "match_count": k}
            )
        )

        if not result.data:
            return "NO_MATCH"

        return str(result.data)

    return asyncio.run(async_logic())
