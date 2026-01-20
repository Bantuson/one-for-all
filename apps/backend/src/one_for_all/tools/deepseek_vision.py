"""
DeepSeek Vision Tools for Document Analysis (Tier 2 Validation)

Lower-cost alternative to GPT-4V for document validation.
Used for uncertain cases that pass basic rule-based checks but need AI verification.

Cost comparison:
- GPT-4V: ~$0.05-0.10 per image
- DeepSeek Vision: ~$0.01 per image (80% cost reduction)
"""

import os
import json
import base64
import asyncio
import httpx
import logging
from pathlib import Path
from typing import Literal, Optional, Dict, Any
from crewai.tools import tool
from dotenv import load_dotenv

# Configure logging
logger = logging.getLogger(__name__)

# Load environment from monorepo root
_env_paths = [
    Path(__file__).resolve().parents[5] / '.env.local',
    Path(__file__).resolve().parents[4] / '.env.local',
    Path.cwd() / '.env.local',
]

for _env_path in _env_paths:
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path)
        break

# DeepSeek API configuration
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# Feature flags for tiered validation
TIER2_PROVIDER = os.getenv("TIER2_PROVIDER", "deepseek")  # deepseek | openai

# Document type configurations (aligned with vision_tools.py)
DOCUMENT_ANALYSIS_CONFIG = {
    "id_document": {
        "description": "South African ID book, smart ID card, or passport",
        "check_points": [
            "Document type (ID book, smart ID card, or passport)",
            "Photo clarity and visibility",
            "ID number visible and readable",
            "Name and surname visible",
            "Date of birth visible",
            "Expiry date (if applicable)",
            "Overall document condition",
        ],
        "required_elements": ["photo", "id_number", "full_name", "date_of_birth"],
    },
    "matric_certificate": {
        "description": "National Senior Certificate (NSC) or equivalent",
        "check_points": [
            "Certificate type (NSC, IEB, etc.)",
            "Student name matches application",
            "Examination year visible",
            "All subjects listed with marks",
            "Pass type indicated (Bachelor, Diploma, Higher Certificate)",
            "Department of Education stamp/seal",
            "Certificate number visible",
        ],
        "required_elements": ["student_name", "subjects_with_marks", "exam_year", "pass_type"],
    },
    "academic_transcript": {
        "description": "Official academic records from previous institution",
        "check_points": [
            "Institution name and logo visible",
            "Student name and number",
            "All courses/modules listed",
            "Grades or marks visible",
            "Academic period/semester covered",
            "Official stamp or watermark",
        ],
        "required_elements": ["institution_name", "student_name", "academic_records"],
    },
    "proof_of_residence": {
        "description": "Utility bill, bank statement, or official letter showing address",
        "check_points": [
            "Document type (utility bill, bank statement, letter)",
            "Full address visible",
            "Resident name matches applicant",
            "Date of document (within 3 months)",
            "Issuing organization name",
        ],
        "required_elements": ["full_address", "resident_name", "document_date"],
    },
    "proof_of_income": {
        "description": "Payslip, bank statement, or income verification letter",
        "check_points": [
            "Document type (payslip, bank statement, letter)",
            "Gross income amount visible",
            "Employer or source details",
            "Date of document",
            "Period covered (if applicable)",
        ],
        "required_elements": ["income_amount", "source_name", "document_date"],
    },
    "consent_form": {
        "description": "Signed parental/guardian consent form",
        "check_points": [
            "Form completeness",
            "Guardian name and signature",
            "Guardian ID number",
            "Applicant name",
            "Date signed",
        ],
        "required_elements": ["guardian_name", "guardian_signature", "applicant_name"],
    },
}

DocumentType = Literal[
    "id_document",
    "matric_certificate",
    "academic_transcript",
    "proof_of_residence",
    "proof_of_income",
    "consent_form"
]


async def _fetch_image_as_base64(url: str) -> Optional[str]:
    """
    Fetch an image from URL and convert to base64.

    Args:
        url: The URL of the image to fetch

    Returns:
        Base64-encoded image string or None if fetch fails
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()

            content_type = response.headers.get("content-type", "image/jpeg")
            if "png" in content_type:
                media_type = "image/png"
            elif "gif" in content_type:
                media_type = "image/gif"
            elif "webp" in content_type:
                media_type = "image/webp"
            elif "pdf" in content_type:
                media_type = "application/pdf"
            else:
                media_type = "image/jpeg"

            base64_image = base64.b64encode(response.content).decode("utf-8")
            return f"data:{media_type};base64,{base64_image}"

    except Exception as e:
        logger.error(f"Failed to fetch image from {url}: {str(e)}")
        return None


async def _call_deepseek_vision_api(
    image_data: str,
    document_type: DocumentType,
    additional_context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Call DeepSeek Vision API to analyze a document image.

    Args:
        image_data: Base64-encoded image or image URL
        document_type: Type of document being analyzed
        additional_context: Optional additional context for analysis

    Returns:
        Dict with analysis results
    """
    if not DEEPSEEK_API_KEY:
        return {
            "success": False,
            "error": "DEEPSEEK_API_KEY not configured",
            "analysis": None,
            "tier": "tier_2_deepseek"
        }

    config = DOCUMENT_ANALYSIS_CONFIG.get(document_type)
    if not config:
        return {
            "success": False,
            "error": f"Unknown document type: {document_type}",
            "analysis": None,
            "tier": "tier_2_deepseek"
        }

    check_points_str = "\n".join(f"- {cp}" for cp in config["check_points"])
    required_elements_str = ", ".join(config["required_elements"])

    system_prompt = f"""You are a document verification specialist for South African educational institutions.
Analyze the uploaded document for authenticity, completeness, and quality.

You are analyzing a {config['description']}.

ANALYSIS REQUIREMENTS:
{check_points_str}

REQUIRED ELEMENTS THAT MUST BE PRESENT:
{required_elements_str}

RESPONSE FORMAT (respond with valid JSON only):
{{
    "document_type_detected": "<detected document type>",
    "clarity_score": <1-10>,
    "completeness_score": <1-10>,
    "authenticity_indicators": {{
        "positive": ["<list of authenticity indicators found>"],
        "concerns": ["<list of any concerns>"]
    }},
    "required_elements_found": {{
        "<element>": {{
            "found": true/false,
            "value": "<extracted value if visible>" or null,
            "notes": "<any notes>"
        }}
    }},
    "issues_found": [
        {{
            "severity": "critical" | "major" | "minor",
            "issue": "<description>",
            "recommendation": "<actionable recommendation>"
        }}
    ],
    "overall_assessment": "approved" | "flagged" | "rejected",
    "recommendation": "<summary recommendation>",
    "confidence": <0-100>
}}

ASSESSMENT CRITERIA:
- "approved": Document is clear, complete, and appears authentic
- "flagged": Document has issues needing verification or clarification
- "rejected": Document is unreadable, incomplete, or shows tampering signs"""

    user_text = f"Analyze this {document_type.replace('_', ' ')} for a South African university application."
    if additional_context:
        user_text += f" Additional context: {additional_context}"

    # Build message content with image
    user_content = [
        {"type": "text", "text": user_text},
        {"type": "image_url", "image_url": {"url": image_data}}
    ]

    payload = {
        "model": "deepseek-chat",  # DeepSeek's vision-capable model
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "max_tokens": 2000,
        "temperature": 0.1
    }

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                DEEPSEEK_API_URL,
                json=payload,
                headers=headers
            )
            response.raise_for_status()

            result = response.json()
            content = result["choices"][0]["message"]["content"]

            # Parse JSON response (handle markdown code blocks)
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                json_str = content.split("```")[1].split("```")[0].strip()
            else:
                json_str = content.strip()

            analysis = json.loads(json_str)

            return {
                "success": True,
                "error": None,
                "analysis": analysis,
                "tier": "tier_2_deepseek",
                "raw_response": content
            }

    except httpx.HTTPStatusError as e:
        logger.error(f"DeepSeek API error: {e.response.status_code} - {e.response.text}")
        return {
            "success": False,
            "error": f"API request failed: {e.response.status_code}",
            "analysis": None,
            "tier": "tier_2_deepseek"
        }
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse DeepSeek response: {str(e)}")
        return {
            "success": False,
            "error": f"Failed to parse API response: {str(e)}",
            "analysis": None,
            "tier": "tier_2_deepseek",
            "raw_response": content if 'content' in locals() else None
        }
    except Exception as e:
        logger.error(f"DeepSeek Vision error: {str(e)}")
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "analysis": None,
            "tier": "tier_2_deepseek"
        }


@tool
def deepseek_analyze_document(document_url: str, document_type: str) -> str:
    """
    Analyze a document image using DeepSeek Vision (Tier 2 validation).

    This is a cost-effective alternative to GPT-4V for document analysis.
    Use this for uncertain cases that passed rule-based checks but need AI verification.

    Args:
        document_url: URL of the document image (from Supabase storage or direct URL)
        document_type: Type of document being analyzed. Must be one of:
                      - "id_document" (SA ID book, smart ID card, or passport)
                      - "matric_certificate" (NSC certificate)
                      - "academic_transcript" (Academic records)
                      - "proof_of_residence" (Utility bill, bank statement)
                      - "proof_of_income" (Payslip, income verification)
                      - "consent_form" (Guardian consent)

    Returns:
        JSON string with analysis results including:
        - clarity_score: 1-10 rating of image quality
        - completeness_score: 1-10 rating of document completeness
        - authenticity_indicators: Positive indicators and concerns
        - required_elements_found: Status of each required element
        - issues_found: List of issues with severity and recommendations
        - overall_assessment: "approved", "flagged", or "rejected"
        - confidence: 0-100 confidence percentage
        - tier: "tier_2_deepseek" indicating which validation tier was used

    Example:
        result = deepseek_analyze_document(
            document_url="https://storage.supabase.co/.../id_123.jpg",
            document_type="id_document"
        )
    """

    async def async_analyze():
        try:
            valid_types = list(DOCUMENT_ANALYSIS_CONFIG.keys())
            if document_type not in valid_types:
                return json.dumps({
                    "success": False,
                    "error": f"Invalid document_type. Must be one of: {', '.join(valid_types)}",
                    "analysis": None,
                    "tier": "tier_2_deepseek"
                })

            if not document_url:
                return json.dumps({
                    "success": False,
                    "error": "document_url is required",
                    "analysis": None,
                    "tier": "tier_2_deepseek"
                })

            # Fetch and convert to base64 for Supabase URLs
            if "supabase" in document_url.lower():
                image_data = await _fetch_image_as_base64(document_url)
                if not image_data:
                    return json.dumps({
                        "success": False,
                        "error": f"Failed to fetch image from URL: {document_url}",
                        "analysis": None,
                        "tier": "tier_2_deepseek"
                    })
            else:
                image_data = document_url

            result = await _call_deepseek_vision_api(image_data, document_type)
            return json.dumps(result, indent=2)

        except Exception as e:
            logger.error(f"DeepSeek analysis failed: {str(e)}")
            return json.dumps({
                "success": False,
                "error": f"Analysis failed: {str(e)}",
                "analysis": None,
                "tier": "tier_2_deepseek"
            })

    return asyncio.run(async_analyze())


@tool
def deepseek_extract_text(document_url: str) -> str:
    """
    Extract text content from a document using DeepSeek Vision.

    Cost-effective OCR alternative to GPT-4V for text extraction.

    Args:
        document_url: URL of the document image

    Returns:
        JSON string with:
        - success: True/False
        - extracted_text: All text found in the document
        - structured_data: Key-value pairs extracted from text
        - confidence: OCR confidence level
        - tier: "tier_2_deepseek"

    Example:
        result = deepseek_extract_text(
            document_url="https://storage.supabase.co/.../cert_123.jpg"
        )
    """

    async def async_extract():
        try:
            if not document_url:
                return json.dumps({
                    "success": False,
                    "error": "document_url is required",
                    "extracted_text": None,
                    "tier": "tier_2_deepseek"
                })

            if not DEEPSEEK_API_KEY:
                return json.dumps({
                    "success": False,
                    "error": "DEEPSEEK_API_KEY not configured",
                    "extracted_text": None,
                    "tier": "tier_2_deepseek"
                })

            # Fetch image if from Supabase
            if "supabase" in document_url.lower():
                image_data = await _fetch_image_as_base64(document_url)
                if not image_data:
                    return json.dumps({
                        "success": False,
                        "error": "Failed to fetch image from URL",
                        "extracted_text": None,
                        "tier": "tier_2_deepseek"
                    })
            else:
                image_data = document_url

            system_prompt = """You are an OCR specialist. Extract ALL text visible in the document image.

RESPONSE FORMAT (valid JSON only):
{
    "extracted_text": "<all text found, preserving layout>",
    "structured_data": {
        "<field_name>": "<value>",
        ...
    },
    "language": "<detected language>",
    "confidence": <0-100>
}

For structured_data, identify key-value pairs like names, ID numbers, dates, addresses, scores, grades.
Use snake_case for field names. Be thorough - extract every piece of text."""

            payload = {
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract all text from this document."},
                            {"type": "image_url", "image_url": {"url": image_data}}
                        ]
                    }
                ],
                "max_tokens": 3000,
                "temperature": 0.1
            }

            headers = {
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    DEEPSEEK_API_URL,
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()

                result = response.json()
                content = result["choices"][0]["message"]["content"]

                # Parse JSON response
                if "```json" in content:
                    json_str = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    json_str = content.split("```")[1].split("```")[0].strip()
                else:
                    json_str = content.strip()

                extracted = json.loads(json_str)

                return json.dumps({
                    "success": True,
                    "error": None,
                    "tier": "tier_2_deepseek",
                    **extracted
                }, indent=2)

        except Exception as e:
            logger.error(f"DeepSeek text extraction failed: {str(e)}")
            return json.dumps({
                "success": False,
                "error": f"Text extraction failed: {str(e)}",
                "extracted_text": None,
                "tier": "tier_2_deepseek"
            })

    return asyncio.run(async_extract())


@tool
def deepseek_validate_id_number(document_url: str, expected_id_number: str) -> str:
    """
    Validate that an ID document contains the expected ID number.

    Quick verification check using DeepSeek Vision to confirm ID matches.

    Args:
        document_url: URL of the ID document image
        expected_id_number: The ID number that should appear in the document

    Returns:
        JSON string with:
        - success: True/False
        - match: True if ID number matches, False otherwise
        - extracted_id: The ID number found in the document
        - confidence: Confidence level of the match
        - tier: "tier_2_deepseek"

    Example:
        result = deepseek_validate_id_number(
            document_url="https://storage.supabase.co/.../id.jpg",
            expected_id_number="9001015009087"
        )
    """

    async def async_validate():
        try:
            if not document_url or not expected_id_number:
                return json.dumps({
                    "success": False,
                    "error": "Both document_url and expected_id_number are required",
                    "match": False,
                    "tier": "tier_2_deepseek"
                })

            if not DEEPSEEK_API_KEY:
                return json.dumps({
                    "success": False,
                    "error": "DEEPSEEK_API_KEY not configured",
                    "match": False,
                    "tier": "tier_2_deepseek"
                })

            # Fetch image
            if "supabase" in document_url.lower():
                image_data = await _fetch_image_as_base64(document_url)
                if not image_data:
                    return json.dumps({
                        "success": False,
                        "error": "Failed to fetch image from URL",
                        "match": False,
                        "tier": "tier_2_deepseek"
                    })
            else:
                image_data = document_url

            system_prompt = """You are verifying a South African ID document.
Find and extract the ID number from this document, then compare it to the expected value.

RESPONSE FORMAT (valid JSON only):
{
    "extracted_id": "<the ID number found in the document>",
    "match": true/false,
    "match_details": "<explanation of match or discrepancy>",
    "confidence": <0-100>
}

South African ID numbers are 13 digits. Be precise in extraction."""

            payload = {
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"Find the ID number in this document and verify it matches: {expected_id_number}"
                            },
                            {"type": "image_url", "image_url": {"url": image_data}}
                        ]
                    }
                ],
                "max_tokens": 500,
                "temperature": 0.1
            }

            headers = {
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(
                    DEEPSEEK_API_URL,
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()

                result = response.json()
                content = result["choices"][0]["message"]["content"]

                # Parse JSON response
                if "```json" in content:
                    json_str = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    json_str = content.split("```")[1].split("```")[0].strip()
                else:
                    json_str = content.strip()

                validation = json.loads(json_str)

                return json.dumps({
                    "success": True,
                    "error": None,
                    "tier": "tier_2_deepseek",
                    "expected_id": expected_id_number,
                    **validation
                }, indent=2)

        except Exception as e:
            logger.error(f"DeepSeek ID validation failed: {str(e)}")
            return json.dumps({
                "success": False,
                "error": f"ID validation failed: {str(e)}",
                "match": False,
                "tier": "tier_2_deepseek"
            })

    return asyncio.run(async_validate())


# Utility function for tier routing (used by vision_tools.py)
async def analyze_document_tier2(
    document_url: str,
    document_type: str,
    additional_context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Internal async function for Tier 2 analysis.
    Called by vision_tools.py tiered routing logic.

    Returns dict (not JSON string) for easier integration.
    """
    try:
        # Fetch image if needed
        if "supabase" in document_url.lower():
            image_data = await _fetch_image_as_base64(document_url)
            if not image_data:
                return {
                    "success": False,
                    "error": f"Failed to fetch image from URL",
                    "analysis": None,
                    "tier": "tier_2_deepseek"
                }
        else:
            image_data = document_url

        return await _call_deepseek_vision_api(image_data, document_type, additional_context)

    except Exception as e:
        logger.error(f"Tier 2 analysis failed: {str(e)}")
        return {
            "success": False,
            "error": f"Tier 2 analysis failed: {str(e)}",
            "analysis": None,
            "tier": "tier_2_deepseek"
        }
