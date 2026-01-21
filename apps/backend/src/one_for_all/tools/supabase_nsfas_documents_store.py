import asyncio
from crewai.tools import tool
from .supabase_client import supabase
from ..utils.db_audit import audit_service_role_access

@audit_service_role_access(table="nsfas_documents", operation="insert")
@tool
def supabase_nsfas_documents_store(document_json: dict) -> str:
    """
    Store metadata for NSFAS document uploads.

    document_json MUST include:
    - nsfas_application_id
    - file_url
    - document_type
    """

    async def async_logic():
        result = (
            await supabase
            .table("nsfas_documents")
            .insert(document_json)
            .execute()
        )

        return str(result.data)

    return asyncio.run(async_logic())
