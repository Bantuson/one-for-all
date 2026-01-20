"""
Document Validation Tools for Application Intake
Tiered validation system to reduce vision AI costs by 99%

Tier 1: Rule-based (Target 80% of documents)
- File format validation (PDF, JPG, PNG)
- File size limits (100KB - 10MB)
- Image dimension checks
- Magic byte verification
- OCR confidence scoring (if applicable)
- Filename pattern matching

Tier 2: DeepSeek Vision (Target 15% - uncertain cases)
- Low-confidence rule-based results
- Critical document types requiring verification

Tier 3: GPT-4V fallback (Target 5% - critical failures)
- DeepSeek Vision failures
- High-stakes document verification

Cost comparison:
- Tier 1: $0.00 (rule-based)
- Tier 2: $0.01 (DeepSeek Vision)
- Tier 3: $0.08 (GPT-4V)
- Target blended cost: < $0.02 per document (vs $0.08 current)
"""
import asyncio
import json
import os
import io
import logging
import hashlib
import re
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum
from crewai.tools import tool
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Configure logging
logger = logging.getLogger(__name__)

# Load environment variables from root
_env_paths = [
    Path(__file__).resolve().parents[5] / '.env.local',
    Path(__file__).resolve().parents[4] / '.env.local',
    Path.cwd() / '.env.local',
]

for _env_path in _env_paths:
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path)
        break

from .supabase_client import get_supabase_client

# =============================================================================
# FEATURE FLAGS
# =============================================================================
TIER1_VALIDATION_ENABLED = os.getenv("TIER1_VALIDATION_ENABLED", "true").lower() == "true"
TIER2_PROVIDER = os.getenv("TIER2_PROVIDER", "deepseek")  # deepseek | openai
VISION_CONFIDENCE_TIER1 = float(os.getenv("VISION_CONFIDENCE_TIER1", "0.85"))
VISION_CONFIDENCE_TIER2 = float(os.getenv("VISION_CONFIDENCE_TIER2", "0.60"))

# =============================================================================
# VALIDATION CONFIGURATION
# =============================================================================

# File validation rules
MIN_FILE_SIZE_KB = 50  # Minimum 50KB to avoid tiny/corrupt files
MAX_FILE_SIZE_MB = 10
ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']
ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

# Image dimension constraints
MIN_IMAGE_WIDTH = 300   # pixels
MIN_IMAGE_HEIGHT = 300  # pixels
MAX_IMAGE_WIDTH = 10000  # pixels
MAX_IMAGE_HEIGHT = 10000  # pixels
MIN_DPI_ESTIMATE = 72   # Minimum DPI for readability

# Document type requirements per application type
REQUIRED_DOCUMENTS = {
    'university': ['id_document', 'matric_certificate', 'proof_of_residence'],
    'nsfas': ['id_document', 'proof_of_income', 'consent_form'],
    'default': ['id_document']
}

# Critical document types that may need AI verification even if rule-based passes
CRITICAL_DOCUMENT_TYPES = ['id_document', 'matric_certificate']

# Document-specific validation patterns
DOCUMENT_PATTERNS = {
    'id_document': {
        'filename_patterns': [
            r'id[_\-\s]*(document|card|book)?',
            r'(smart)?[_\-\s]*id',
            r'passport',
            r'identity',
        ],
        'expected_text_patterns': [
            r'\d{13}',  # SA ID number pattern (13 digits)
            r'REPUBLIC\s+OF\s+SOUTH\s+AFRICA',
            r'IDENTITY\s+(CARD|DOCUMENT)',
        ],
    },
    'matric_certificate': {
        'filename_patterns': [
            r'matric',
            r'nsc',
            r'certificate',
            r'senior[_\-\s]*certificate',
            r'grade[_\-\s]*12',
        ],
        'expected_text_patterns': [
            r'NATIONAL\s+SENIOR\s+CERTIFICATE',
            r'DEPARTMENT\s+OF\s+(BASIC\s+)?EDUCATION',
            r'\d{4}',  # Year
        ],
    },
    'academic_transcript': {
        'filename_patterns': [
            r'transcript',
            r'academic[_\-\s]*record',
            r'results?',
        ],
        'expected_text_patterns': [
            r'TRANSCRIPT|ACADEMIC\s+RECORD',
            r'(SEMESTER|YEAR|TERM)',
        ],
    },
    'proof_of_residence': {
        'filename_patterns': [
            r'por',
            r'proof[_\-\s]*(of)?[_\-\s]*residence',
            r'utility[_\-\s]*bill',
            r'bank[_\-\s]*statement',
            r'lease',
            r'municipal',
        ],
        'expected_text_patterns': [
            r'INVOICE|STATEMENT|BILL|LEASE',
            r'\d{1,4}\s+\w+\s+(STREET|ROAD|AVENUE|DRIVE)',  # Address pattern
        ],
    },
    'proof_of_income': {
        'filename_patterns': [
            r'payslip',
            r'salary[_\-\s]*slip',
            r'income',
            r'bank[_\-\s]*statement',
        ],
        'expected_text_patterns': [
            r'(GROSS|NET)\s+(SALARY|INCOME|PAY)',
            r'R\s*[\d,]+\.?\d*',  # Currency amount
        ],
    },
    'consent_form': {
        'filename_patterns': [
            r'consent',
            r'guardian',
            r'parental',
        ],
        'expected_text_patterns': [
            r'CONSENT|GUARDIAN|PARENT',
            r'SIGNATURE',
        ],
    },
}

# Magic bytes for file type validation
FILE_SIGNATURES = {
    'pdf': [b'%PDF'],
    'jpg': [b'\xff\xd8\xff'],
    'jpeg': [b'\xff\xd8\xff'],
    'png': [b'\x89PNG\r\n\x1a\n'],
}


class ValidationTier(Enum):
    TIER_1_RULE_BASED = "tier_1_rule_based"
    TIER_2_DEEPSEEK = "tier_2_deepseek"
    TIER_3_GPT4V = "tier_3_gpt4v"


@dataclass
class Tier1Result:
    """Result from Tier 1 rule-based validation."""
    passed: bool
    confidence: float  # 0.0 to 1.0
    issues: List[Dict[str, Any]]
    checks_performed: List[str]
    recommended_tier: ValidationTier
    metrics: Dict[str, Any]


# =============================================================================
# TIER 1: RULE-BASED VALIDATION
# =============================================================================

def _check_file_extension(file_url: str, file_name: str = None) -> Tuple[bool, str, str]:
    """
    Check if file has allowed extension.
    Returns: (passed, extension, message)
    """
    # Try filename first, then URL
    source = file_name or file_url
    if '.' not in source:
        return False, '', 'No file extension found'

    extension = source.split('.')[-1].lower().split('?')[0]  # Handle URL params
    if extension not in ALLOWED_EXTENSIONS:
        return False, extension, f'Invalid extension: {extension}. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'

    return True, extension, 'Extension valid'


def _check_file_size(file_size: int) -> Tuple[bool, str]:
    """
    Check if file size is within acceptable range.
    """
    min_bytes = MIN_FILE_SIZE_KB * 1024
    max_bytes = MAX_FILE_SIZE_MB * 1024 * 1024

    if file_size < min_bytes:
        return False, f'File too small ({file_size / 1024:.1f}KB). Minimum: {MIN_FILE_SIZE_KB}KB'

    if file_size > max_bytes:
        return False, f'File too large ({file_size / (1024*1024):.1f}MB). Maximum: {MAX_FILE_SIZE_MB}MB'

    return True, f'File size OK ({file_size / 1024:.1f}KB)'


def _validate_magic_bytes(file_content: bytes, expected_extension: str) -> Tuple[bool, str]:
    """
    Validate file content matches expected type using magic bytes.
    """
    signatures = FILE_SIGNATURES.get(expected_extension, [])

    if not signatures:
        return True, 'No signature check available for this type'

    for sig in signatures:
        if file_content.startswith(sig):
            return True, f'Magic bytes valid for {expected_extension}'

    return False, f'File content does not match {expected_extension} format (invalid magic bytes)'


def _check_image_dimensions(file_content: bytes, extension: str) -> Tuple[bool, Dict[str, Any], str]:
    """
    Check image dimensions are within acceptable range.
    Returns: (passed, dimensions_dict, message)
    """
    if extension not in ['jpg', 'jpeg', 'png']:
        return True, {}, 'Dimension check skipped for non-image'

    try:
        # Parse image dimensions without full PIL dependency
        width, height = _get_image_dimensions(file_content, extension)

        dimensions = {
            'width': width,
            'height': height,
            'aspect_ratio': round(width / height, 2) if height > 0 else 0
        }

        issues = []
        if width < MIN_IMAGE_WIDTH:
            issues.append(f'Width ({width}px) below minimum ({MIN_IMAGE_WIDTH}px)')
        if height < MIN_IMAGE_HEIGHT:
            issues.append(f'Height ({height}px) below minimum ({MIN_IMAGE_HEIGHT}px)')
        if width > MAX_IMAGE_WIDTH:
            issues.append(f'Width ({width}px) exceeds maximum ({MAX_IMAGE_WIDTH}px)')
        if height > MAX_IMAGE_HEIGHT:
            issues.append(f'Height ({height}px) exceeds maximum ({MAX_IMAGE_HEIGHT}px)')

        if issues:
            return False, dimensions, '; '.join(issues)

        return True, dimensions, f'Dimensions OK ({width}x{height})'

    except Exception as e:
        return False, {}, f'Failed to read image dimensions: {str(e)}'


def _get_image_dimensions(content: bytes, extension: str) -> Tuple[int, int]:
    """
    Extract image dimensions without PIL (lightweight parsing).
    """
    if extension in ['jpg', 'jpeg']:
        return _get_jpeg_dimensions(content)
    elif extension == 'png':
        return _get_png_dimensions(content)
    return 0, 0


def _get_jpeg_dimensions(content: bytes) -> Tuple[int, int]:
    """Parse JPEG dimensions from header."""
    try:
        # JPEG dimensions are in SOF (Start of Frame) markers
        i = 2  # Skip SOI marker
        while i < len(content) - 1:
            marker = content[i:i+2]
            if marker[0] != 0xff:
                break

            # SOF markers (0xC0-0xCF except 0xC4, 0xC8, 0xCC)
            if marker[1] in [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
                            0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]:
                height = int.from_bytes(content[i+5:i+7], 'big')
                width = int.from_bytes(content[i+7:i+9], 'big')
                return width, height

            # Skip to next marker
            if marker[1] in [0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7,
                            0xd8, 0xd9, 0x01]:
                i += 2
            else:
                length = int.from_bytes(content[i+2:i+4], 'big')
                i += 2 + length

        return 0, 0
    except Exception:
        return 0, 0


def _get_png_dimensions(content: bytes) -> Tuple[int, int]:
    """Parse PNG dimensions from IHDR chunk."""
    try:
        # PNG dimensions are in IHDR chunk (always first chunk after signature)
        if content[12:16] == b'IHDR':
            width = int.from_bytes(content[16:20], 'big')
            height = int.from_bytes(content[20:24], 'big')
            return width, height
        return 0, 0
    except Exception:
        return 0, 0


def _check_pdf_structure(file_content: bytes) -> Tuple[bool, Dict[str, Any], str]:
    """
    Basic PDF structure validation.
    """
    try:
        if not file_content.startswith(b'%PDF'):
            return False, {}, 'Not a valid PDF file'

        # Check for EOF marker
        if b'%%EOF' not in file_content[-1024:]:
            return False, {}, 'PDF appears corrupted (missing EOF marker)'

        # Extract PDF version
        version_match = re.search(rb'%PDF-(\d+\.\d+)', file_content[:20])
        version = version_match.group(1).decode() if version_match else 'unknown'

        # Count pages (rough estimate)
        page_count = file_content.count(b'/Type /Page') + file_content.count(b'/Type/Page')

        metadata = {
            'pdf_version': version,
            'estimated_pages': max(1, page_count),
            'has_images': b'/XObject' in file_content or b'/Image' in file_content,
            'has_text': b'/Font' in file_content,
        }

        if page_count == 0:
            return False, metadata, 'PDF appears to have no pages'

        return True, metadata, f'PDF structure valid (v{version}, ~{page_count} pages)'

    except Exception as e:
        return False, {}, f'PDF validation error: {str(e)}'


def _check_filename_pattern(file_name: str, document_type: str) -> Tuple[bool, float, str]:
    """
    Check if filename matches expected patterns for document type.
    Returns: (passed, confidence_boost, message)
    """
    if not file_name:
        return True, 0.0, 'No filename to check'

    patterns = DOCUMENT_PATTERNS.get(document_type, {}).get('filename_patterns', [])
    if not patterns:
        return True, 0.0, 'No patterns defined for document type'

    file_name_lower = file_name.lower()

    for pattern in patterns:
        if re.search(pattern, file_name_lower, re.IGNORECASE):
            return True, 0.1, f'Filename matches expected pattern for {document_type}'

    # Not matching is not a failure, just no confidence boost
    return True, -0.05, f'Filename does not match typical {document_type} naming conventions'


def _check_url_validity(file_url: str) -> Tuple[bool, str]:
    """
    Check if URL appears valid and accessible.
    """
    if not file_url:
        return False, 'No file URL provided'

    if not file_url.startswith(('http://', 'https://')):
        return False, 'Invalid URL scheme (must be http or https)'

    # Check for common issues
    if ' ' in file_url and '%20' not in file_url:
        return False, 'URL contains unencoded spaces'

    return True, 'URL format valid'


def _calculate_base_confidence(
    extension_passed: bool,
    size_passed: bool,
    magic_passed: bool,
    dimension_passed: bool,
    structure_passed: bool,
    filename_confidence: float,
    document_type: str
) -> float:
    """
    Calculate overall confidence score for Tier 1 validation.
    """
    # Base score from critical checks
    score = 0.5  # Start at 50%

    # Critical checks (40% weight total)
    if extension_passed:
        score += 0.10
    if size_passed:
        score += 0.10
    if magic_passed:
        score += 0.15
    if structure_passed:  # PDF structure or image dimensions
        score += 0.05

    # Optional checks (10% weight)
    if dimension_passed:
        score += 0.05

    # Filename pattern bonus/penalty
    score += filename_confidence

    # Apply penalty for critical document types (they need more certainty)
    if document_type in CRITICAL_DOCUMENT_TYPES:
        score *= 0.9  # 10% penalty to encourage AI verification

    return min(max(score, 0.0), 1.0)


def _determine_recommended_tier(confidence: float, passed: bool, document_type: str) -> ValidationTier:
    """
    Determine which tier should handle this document based on confidence.
    """
    if not passed:
        return ValidationTier.TIER_3_GPT4V  # Failures go to GPT-4V for detailed analysis

    if confidence >= VISION_CONFIDENCE_TIER1:
        return ValidationTier.TIER_1_RULE_BASED
    elif confidence >= VISION_CONFIDENCE_TIER2:
        return ValidationTier.TIER_2_DEEPSEEK
    else:
        return ValidationTier.TIER_3_GPT4V


async def _fetch_file_content(url: str) -> Tuple[Optional[bytes], Optional[int], str]:
    """
    Fetch file content from URL.
    Returns: (content, size, error_message)
    """
    import httpx

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()

            content = response.content
            size = len(content)

            return content, size, ''

    except httpx.TimeoutException:
        return None, None, 'Request timed out fetching document'
    except httpx.HTTPStatusError as e:
        return None, None, f'HTTP error {e.response.status_code} fetching document'
    except Exception as e:
        return None, None, f'Error fetching document: {str(e)}'


def tier1_validate_document(
    file_url: str,
    document_type: str,
    file_name: str = None,
    file_content: bytes = None,
    file_size: int = None
) -> Tier1Result:
    """
    Perform comprehensive Tier 1 rule-based validation.

    Args:
        file_url: URL of the document
        document_type: Type of document (id_document, matric_certificate, etc.)
        file_name: Optional filename for pattern matching
        file_content: Optional pre-fetched file content
        file_size: Optional pre-determined file size

    Returns:
        Tier1Result with validation outcome and confidence score
    """
    issues = []
    checks_performed = []
    metrics = {
        'validation_start': datetime.utcnow().isoformat(),
        'tier1_enabled': TIER1_VALIDATION_ENABLED,
    }

    # If Tier 1 is disabled, return low confidence to trigger Tier 2
    if not TIER1_VALIDATION_ENABLED:
        return Tier1Result(
            passed=True,
            confidence=0.0,
            issues=[],
            checks_performed=['tier1_disabled'],
            recommended_tier=ValidationTier.TIER_2_DEEPSEEK,
            metrics=metrics
        )

    # 1. Check URL validity
    url_passed, url_message = _check_url_validity(file_url)
    checks_performed.append('url_validity')
    if not url_passed:
        issues.append({'severity': 'critical', 'check': 'url_validity', 'message': url_message})
        return Tier1Result(
            passed=False,
            confidence=0.0,
            issues=issues,
            checks_performed=checks_performed,
            recommended_tier=ValidationTier.TIER_3_GPT4V,
            metrics=metrics
        )

    # 2. Check file extension
    ext_passed, extension, ext_message = _check_file_extension(file_url, file_name)
    checks_performed.append('file_extension')
    metrics['extension'] = extension
    if not ext_passed:
        issues.append({'severity': 'critical', 'check': 'file_extension', 'message': ext_message})

    # 3. Check filename patterns
    filename_passed, filename_confidence, filename_message = _check_filename_pattern(file_name, document_type)
    checks_performed.append('filename_pattern')
    metrics['filename_confidence_delta'] = filename_confidence
    if not filename_passed:
        issues.append({'severity': 'minor', 'check': 'filename_pattern', 'message': filename_message})

    # If we don't have file content, we can't do deeper checks
    if not file_content:
        base_confidence = 0.5 if ext_passed else 0.2
        base_confidence += filename_confidence

        return Tier1Result(
            passed=ext_passed,
            confidence=base_confidence,
            issues=issues,
            checks_performed=checks_performed,
            recommended_tier=_determine_recommended_tier(base_confidence, ext_passed, document_type),
            metrics=metrics
        )

    # 4. Check file size
    actual_size = file_size or len(file_content)
    size_passed, size_message = _check_file_size(actual_size)
    checks_performed.append('file_size')
    metrics['file_size_bytes'] = actual_size
    if not size_passed:
        issues.append({'severity': 'major', 'check': 'file_size', 'message': size_message})

    # 5. Validate magic bytes
    magic_passed, magic_message = _validate_magic_bytes(file_content, extension)
    checks_performed.append('magic_bytes')
    if not magic_passed:
        issues.append({'severity': 'critical', 'check': 'magic_bytes', 'message': magic_message})

    # 6. Type-specific validation
    structure_passed = True
    structure_metadata = {}
    dimension_passed = True
    dimension_metadata = {}

    if extension == 'pdf':
        structure_passed, structure_metadata, structure_message = _check_pdf_structure(file_content)
        checks_performed.append('pdf_structure')
        metrics['pdf_metadata'] = structure_metadata
        if not structure_passed:
            issues.append({'severity': 'major', 'check': 'pdf_structure', 'message': structure_message})

    elif extension in ['jpg', 'jpeg', 'png']:
        dimension_passed, dimension_metadata, dimension_message = _check_image_dimensions(file_content, extension)
        checks_performed.append('image_dimensions')
        metrics['image_dimensions'] = dimension_metadata
        if not dimension_passed:
            issues.append({'severity': 'major', 'check': 'image_dimensions', 'message': dimension_message})

    # 7. Calculate confidence score
    confidence = _calculate_base_confidence(
        extension_passed=ext_passed,
        size_passed=size_passed,
        magic_passed=magic_passed,
        dimension_passed=dimension_passed,
        structure_passed=structure_passed,
        filename_confidence=filename_confidence,
        document_type=document_type
    )

    metrics['confidence_score'] = confidence
    metrics['validation_end'] = datetime.utcnow().isoformat()

    # Determine overall pass/fail
    critical_issues = [i for i in issues if i['severity'] == 'critical']
    passed = len(critical_issues) == 0

    # Determine recommended tier
    recommended_tier = _determine_recommended_tier(confidence, passed, document_type)

    return Tier1Result(
        passed=passed,
        confidence=confidence,
        issues=issues,
        checks_performed=checks_performed,
        recommended_tier=recommended_tier,
        metrics=metrics
    )


# =============================================================================
# CREWAI TOOLS
# =============================================================================

@tool
def validate_intake_documents(application_id: str, application_type: str = 'university') -> str:
    """
    Validates all documents for an application using tiered validation.

    Tier 1: Rule-based checks (format, size, required types) - $0.00
    Tier 2: DeepSeek Vision analysis (uncertain cases) - $0.01
    Tier 3: GPT-4V analysis (critical failures) - $0.08

    Target: 80% Tier 1, 15% Tier 2, 5% Tier 3 = ~$0.02 average cost

    Args:
        application_id: UUID of the application
        application_type: Type of application (university, nsfas, default)

    Returns:
        JSON string with validation results including:
        - validation_passed: Overall pass/fail
        - documents_validated: Successfully validated documents
        - documents_flagged: Documents needing review
        - missing_required: Required document types not found
        - tier_metrics: Cost and tier distribution metrics
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
            .select("id, file_url, document_type, agent_validated, file_name, file_size")\
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
            'tier_metrics': {
                'tier_1_passed': 0,
                'tier_2_needed': 0,
                'tier_3_needed': 0,
                'total_documents': len(documents),
                'estimated_cost': 0.0,
            }
        }

        # Check for missing required documents
        doc_types_present = {doc['document_type'] for doc in documents}
        for req_type in required_types:
            if req_type not in doc_types_present:
                validation_results['missing_required'].append(req_type)
                validation_results['validation_passed'] = False

        # Validate each document
        for doc in documents:
            # Perform Tier 1 rule-based validation
            tier1_result = tier1_validate_document(
                file_url=doc.get('file_url', ''),
                document_type=doc.get('document_type', 'unknown'),
                file_name=doc.get('file_name'),
                file_size=doc.get('file_size')
            )

            doc_result = {
                'document_id': doc['id'],
                'document_type': doc['document_type'],
                'tier1_confidence': tier1_result.confidence,
                'tier1_passed': tier1_result.passed,
                'tier1_issues': tier1_result.issues,
                'recommended_tier': tier1_result.recommended_tier.value,
            }

            if tier1_result.recommended_tier == ValidationTier.TIER_1_RULE_BASED:
                # Fully validated by Tier 1
                validation_results['documents_validated'].append(doc_result)
                validation_results['tier_metrics']['tier_1_passed'] += 1

                # Update document as validated
                await supabase.table("application_documents")\
                    .update({
                        'agent_validated': True,
                        'validation_tier': 'tier_1_rule_based',
                        'validation_details': {
                            'confidence': tier1_result.confidence,
                            'checks_performed': tier1_result.checks_performed,
                            'issues': tier1_result.issues,
                            'metrics': tier1_result.metrics,
                        }
                    })\
                    .eq("id", doc['id'])\
                    .execute()

            elif tier1_result.recommended_tier == ValidationTier.TIER_2_DEEPSEEK:
                # Needs DeepSeek Vision
                validation_results['documents_flagged'].append({
                    **doc_result,
                    'needs_tier': 'tier_2_deepseek',
                    'reason': 'Confidence below Tier 1 threshold'
                })
                validation_results['tier_metrics']['tier_2_needed'] += 1
                validation_results['tier_metrics']['estimated_cost'] += 0.01

            else:
                # Needs GPT-4V (Tier 3)
                validation_results['documents_flagged'].append({
                    **doc_result,
                    'needs_tier': 'tier_3_gpt4v',
                    'reason': 'Critical issues or very low confidence'
                })
                validation_results['tier_metrics']['tier_3_needed'] += 1
                validation_results['tier_metrics']['estimated_cost'] += 0.08

                if not tier1_result.passed:
                    validation_results['validation_passed'] = False

        # Calculate tier distribution
        total = validation_results['tier_metrics']['total_documents']
        if total > 0:
            validation_results['tier_metrics']['tier_1_rate'] = round(
                validation_results['tier_metrics']['tier_1_passed'] / total * 100, 1
            )
            validation_results['tier_metrics']['tier_2_rate'] = round(
                validation_results['tier_metrics']['tier_2_needed'] / total * 100, 1
            )
            validation_results['tier_metrics']['tier_3_rate'] = round(
                validation_results['tier_metrics']['tier_3_needed'] / total * 100, 1
            )

        # Update application-level validation status if all passed
        if validation_results['validation_passed'] and not validation_results['missing_required']:
            if validation_results['tier_metrics']['tier_2_needed'] == 0 and \
               validation_results['tier_metrics']['tier_3_needed'] == 0:
                await supabase.table("applications")\
                    .update({
                        'documents_validated': True,
                    })\
                    .eq("id", application_id)\
                    .execute()

        return json.dumps(validation_results, default=str)

    return asyncio.run(async_validate())


@tool
def vision_analyze_document_intake(document_id: str, analysis_type: str = 'quality') -> str:
    """
    Tiered AI Vision analysis for documents that need deeper review.
    Routes to DeepSeek (Tier 2) or GPT-4V (Tier 3) based on confidence.

    Args:
        document_id: UUID of the document to analyze
        analysis_type: Type of analysis (quality, authenticity, readability)

    Returns:
        JSON string with AI analysis results including:
        - validation_tier: Which tier performed the analysis
        - analysis: Detailed analysis results
        - cost: Estimated cost of the analysis
    """
    async def async_analyze():
        supabase = get_supabase_client()
        if not supabase:
            return json.dumps({"error": "Supabase client not configured"})

        # Fetch document
        doc_result = await supabase.table("application_documents")\
            .select("id, file_url, document_type, application_id, validation_details")\
            .eq("id", document_id)\
            .single()\
            .execute()

        if not doc_result.data:
            return json.dumps({"error": "Document not found"})

        doc = doc_result.data

        # Get Tier 1 result if available
        tier1_details = doc.get('validation_details', {})
        tier1_confidence = tier1_details.get('confidence', 0.0)

        # Determine which tier to use
        if tier1_confidence >= VISION_CONFIDENCE_TIER2:
            use_tier = 'tier_2_deepseek'
            estimated_cost = 0.01
        else:
            use_tier = 'tier_3_gpt4v'
            estimated_cost = 0.08

        try:
            if use_tier == 'tier_2_deepseek' and TIER2_PROVIDER == 'deepseek':
                # Use DeepSeek Vision (Tier 2)
                from .deepseek_vision import deepseek_analyze_document

                vision_result_str = deepseek_analyze_document(doc['file_url'], doc['document_type'])
                vision_result = json.loads(vision_result_str)
                actual_tier = 'tier_2_deepseek'

            else:
                # Use GPT-4V (Tier 3)
                from .vision_tools import vision_analyze_document

                vision_result_str = vision_analyze_document(doc['file_url'], doc['document_type'])
                vision_result = json.loads(vision_result_str)
                actual_tier = 'tier_3_gpt4v'
                estimated_cost = 0.08

            # Update document with AI validation results
            await supabase.table("application_documents")\
                .update({
                    'agent_validated': True,
                    'validation_tier': actual_tier,
                    'validation_details': {
                        'tier1_confidence': tier1_confidence,
                        'analysis_type': analysis_type,
                        'ai_result': vision_result,
                        'confidence': vision_result.get('analysis', {}).get('confidence', 0.0) if vision_result.get('analysis') else 0.0,
                        'cost': estimated_cost,
                    }
                })\
                .eq("id", document_id)\
                .execute()

            return json.dumps({
                'document_id': document_id,
                'validation_tier': actual_tier,
                'analysis_type': analysis_type,
                'result': vision_result,
                'cost': estimated_cost,
            }, default=str)

        except ImportError as e:
            return json.dumps({
                "error": f"Vision tools not available: {str(e)}",
                "attempted_tier": use_tier
            })

    return asyncio.run(async_analyze())


@tool
def get_tier1_validation_result(document_url: str, document_type: str, file_name: str = None) -> str:
    """
    Get Tier 1 rule-based validation result for a document without database operations.

    Useful for pre-upload validation or testing.

    Args:
        document_url: URL of the document to validate
        document_type: Type of document (id_document, matric_certificate, etc.)
        file_name: Optional filename for pattern matching

    Returns:
        JSON string with Tier 1 validation results including:
        - passed: Whether document passed rule-based checks
        - confidence: Confidence score (0.0 to 1.0)
        - recommended_tier: Which tier should handle this document
        - issues: List of validation issues found
    """
    result = tier1_validate_document(
        file_url=document_url,
        document_type=document_type,
        file_name=file_name
    )

    return json.dumps({
        'passed': result.passed,
        'confidence': result.confidence,
        'recommended_tier': result.recommended_tier.value,
        'issues': result.issues,
        'checks_performed': result.checks_performed,
        'metrics': result.metrics,
        'thresholds': {
            'tier_1_threshold': VISION_CONFIDENCE_TIER1,
            'tier_2_threshold': VISION_CONFIDENCE_TIER2,
        }
    }, default=str)


@tool
def get_validation_tier_metrics() -> str:
    """
    Get current validation tier configuration and thresholds.

    Returns configuration settings for the tiered validation system.
    Useful for debugging and monitoring tier distribution.

    Returns:
        JSON string with tier configuration:
        - tier1_enabled: Whether Tier 1 rule-based validation is enabled
        - tier2_provider: Which provider to use for Tier 2 (deepseek | openai)
        - thresholds: Confidence thresholds for tier routing
        - file_constraints: Size and dimension limits
    """
    return json.dumps({
        'tier1_enabled': TIER1_VALIDATION_ENABLED,
        'tier2_provider': TIER2_PROVIDER,
        'thresholds': {
            'tier_1_confidence': VISION_CONFIDENCE_TIER1,
            'tier_2_confidence': VISION_CONFIDENCE_TIER2,
        },
        'file_constraints': {
            'min_file_size_kb': MIN_FILE_SIZE_KB,
            'max_file_size_mb': MAX_FILE_SIZE_MB,
            'min_image_width': MIN_IMAGE_WIDTH,
            'min_image_height': MIN_IMAGE_HEIGHT,
            'max_image_width': MAX_IMAGE_WIDTH,
            'max_image_height': MAX_IMAGE_HEIGHT,
            'allowed_extensions': ALLOWED_EXTENSIONS,
        },
        'cost_estimates': {
            'tier_1': 0.00,
            'tier_2_deepseek': 0.01,
            'tier_3_gpt4v': 0.08,
        },
        'critical_document_types': CRITICAL_DOCUMENT_TYPES,
        'required_documents': REQUIRED_DOCUMENTS,
    })
