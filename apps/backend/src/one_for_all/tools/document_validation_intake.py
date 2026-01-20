"""
Document Validation Tools for Application Intake
Tiered validation: Rule-based first, AI Vision for edge cases only
"""
import asyncio
import json
import os
from typing import Optional
from crewai.tools import tool
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from root (multiple paths for different environments)
_env_paths = [
    Path(__file__).resolve().parents[5] / '.env.local',  # Monorepo root (local)
    Path(__file__).resolve().parents[4] / '.env.local',  # Alternative structure
    Path.cwd() / '.env.local',  # Current working directory
]

for _env_path in _env_paths:
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path)
        break

from .supabase_client import get_supabase_client

# Document type requirements per application type
REQUIRED_DOCUMENTS = {
    'university': ['id_document', 'matric_certificate', 'proof_of_residence'],
    'nsfas': ['id_document', 'proof_of_income', 'consent_form'],
    'default': ['id_document']
}

# File validation rules
MAX_FILE_SIZE_MB = 10
ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']
ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']


@tool
def validate_intake_documents(application_id: str, application_type: str = 'university') -> str:
    """
    Validates all documents for an application using tiered validation.
    Tier 1: Rule-based checks (format, size, required types)
    Tier 2: AI Vision analysis (only for uncertain cases)

    Args:
        application_id: UUID of the application
        application_type: Type of application (university, nsfas, default)

    Returns:
        JSON string with validation results
    """
    async def async_validate():
        supabase = get_supabase_client()
        if not supabase:
            return json.dumps({
                "validation_passed": False,
                "error": "Supabase client not configured"
            })

        # Fetch documents for application
        docs_result = await supabase.table("application_documents")\
            .select("id, file_url, document_type, agent_validated")\
            .eq("application_id", application_id)\
            .execute()

        if not docs_result.data:
            return json.dumps({
                "validation_passed": False,
                "error": "No documents found for application"
            })

        documents = docs_result.data
        required_types = REQUIRED_DOCUMENTS.get(application_type, REQUIRED_DOCUMENTS['default'])

        validation_results = {
            'validation_passed': True,
            'documents_validated': [],
            'documents_flagged': [],
            'missing_required': [],
            'tier_1_passed': 0,
            'tier_2_needed': 0
        }

        # Check for missing required documents
        doc_types_present = {doc['document_type'] for doc in documents}
        for req_type in required_types:
            if req_type not in doc_types_present:
                validation_results['missing_required'].append(req_type)
                validation_results['validation_passed'] = False

        # Validate each document
        for doc in documents:
            tier_1_result = _rule_based_validation(doc)

            if tier_1_result['passed']:
                validation_results['documents_validated'].append({
                    'document_id': doc['id'],
                    'document_type': doc['document_type'],
                    'validation_tier': 'rule_based',
                    'details': tier_1_result
                })
                validation_results['tier_1_passed'] += 1

                # Update document as validated
                await supabase.table("application_documents")\
                    .update({
                        'agent_validated': True,
                        'validated_at': 'now()',
                        'validation_tier': 'rule_based',
                        'validation_details': tier_1_result
                    })\
                    .eq("id", doc['id'])\
                    .execute()
            else:
                # Flag for Tier 2 or manual review
                validation_results['documents_flagged'].append({
                    'document_id': doc['id'],
                    'document_type': doc['document_type'],
                    'issues': tier_1_result['issues'],
                    'needs_ai_review': tier_1_result.get('uncertain', False)
                })
                if tier_1_result.get('uncertain', False):
                    validation_results['tier_2_needed'] += 1
                else:
                    validation_results['validation_passed'] = False

        # Update application-level validation status
        if validation_results['validation_passed'] and not validation_results['missing_required']:
            await supabase.table("applications")\
                .update({
                    'documents_validated': True,
                    'documents_validated_at': 'now()'
                })\
                .eq("id", application_id)\
                .execute()

        return json.dumps(validation_results, default=str)

    return asyncio.run(async_validate())


def _rule_based_validation(doc: dict) -> dict:
    """
    Tier 1: Rule-based validation checks
    """
    result = {
        'passed': True,
        'issues': [],
        'uncertain': False
    }

    file_url = doc.get('file_url', '')

    # Check file extension
    extension = file_url.split('.')[-1].lower() if '.' in file_url else ''
    if extension not in ALLOWED_EXTENSIONS:
        result['passed'] = False
        result['issues'].append(f"Invalid file extension: {extension}")

    # Check if URL is valid (basic check)
    if not file_url or not file_url.startswith(('http://', 'https://')):
        result['passed'] = False
        result['issues'].append("Invalid or missing file URL")

    # If no issues but document type is critical, mark for potential AI review
    if result['passed'] and doc.get('document_type') in ['id_document', 'matric_certificate']:
        result['uncertain'] = True  # These critical docs may need AI verification

    return result


@tool
def vision_analyze_document_intake(document_id: str, analysis_type: str = 'quality') -> str:
    """
    Tier 2: AI Vision analysis for documents that need deeper review.
    Only called for uncertain cases from Tier 1.

    Args:
        document_id: UUID of the document to analyze
        analysis_type: Type of analysis (quality, authenticity, readability)

    Returns:
        JSON string with AI analysis results
    """
    async def async_analyze():
        supabase = get_supabase_client()
        if not supabase:
            return json.dumps({"error": "Supabase client not configured"})

        # Fetch document
        doc_result = await supabase.table("application_documents")\
            .select("id, file_url, document_type, application_id")\
            .eq("id", document_id)\
            .single()\
            .execute()

        if not doc_result.data:
            return json.dumps({"error": "Document not found"})

        doc = doc_result.data

        # Import vision tools for GPT-4V analysis
        try:
            from .vision_tools import vision_analyze_document

            # Call GPT-4V analysis
            vision_result_str = vision_analyze_document(doc['file_url'], doc['document_type'])
            vision_result = json.loads(vision_result_str)

            # Update document with AI validation results
            await supabase.table("application_documents")\
                .update({
                    'agent_validated': True,
                    'validated_at': 'now()',
                    'validation_tier': 'ai_vision',
                    'validation_details': {
                        'analysis_type': analysis_type,
                        'ai_result': vision_result,
                        'confidence': vision_result.get('analysis', {}).get('confidence', 0.0) if vision_result.get('analysis') else 0.0
                    }
                })\
                .eq("id", document_id)\
                .execute()

            return json.dumps({
                'document_id': document_id,
                'validation_tier': 'ai_vision',
                'analysis_type': analysis_type,
                'result': vision_result
            }, default=str)

        except ImportError:
            return json.dumps({"error": "Vision tools not available"})

    return asyncio.run(async_analyze())
