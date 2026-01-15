"""
Vision Tools for Document Analysis

CrewAI tools that use GPT-4V (GPT-4 Vision) to analyze uploaded documents
for verification purposes. Supports South African document types including
ID documents, matric certificates, academic transcripts, and proof of residence.
"""

import os
import json
import base64
import asyncio
import httpx
from pathlib import Path
from typing import Literal, Optional
from crewai.tools import tool
from dotenv import load_dotenv

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

# OpenAI API configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

# Document type configurations with specific analysis requirements
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
            "Hologram or security features (if visible)",
            "Overall document condition",
            "Signs of tampering or alterations",
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
            "Total APS score calculable",
            "Department of Education stamp/seal",
            "Certificate number visible",
            "Overall document legibility",
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
            "Signature of registrar (if required)",
            "Overall document authenticity indicators",
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
            "Account number or reference (if applicable)",
            "Overall document authenticity",
        ],
        "required_elements": ["full_address", "resident_name", "document_date"],
    },
}

DocumentType = Literal["id_document", "matric_certificate", "academic_transcript", "proof_of_residence"]


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

            # Determine media type from content-type header
            content_type = response.headers.get("content-type", "image/jpeg")
            if "png" in content_type:
                media_type = "image/png"
            elif "gif" in content_type:
                media_type = "image/gif"
            elif "webp" in content_type:
                media_type = "image/webp"
            else:
                media_type = "image/jpeg"

            # Encode to base64
            base64_image = base64.b64encode(response.content).decode("utf-8")
            return f"data:{media_type};base64,{base64_image}"

    except Exception as e:
        return None


async def _call_gpt4v_api(
    image_data: str,
    document_type: DocumentType,
    additional_context: Optional[str] = None
) -> dict:
    """
    Call GPT-4V API to analyze a document image.

    Args:
        image_data: Base64-encoded image or image URL
        document_type: Type of document being analyzed
        additional_context: Optional additional context for analysis

    Returns:
        Dict with analysis results
    """
    if not OPENAI_API_KEY:
        return {
            "success": False,
            "error": "OPENAI_API_KEY not configured",
            "analysis": None
        }

    config = DOCUMENT_ANALYSIS_CONFIG.get(document_type)
    if not config:
        return {
            "success": False,
            "error": f"Unknown document type: {document_type}",
            "analysis": None
        }

    # Build the analysis prompt
    check_points_str = "\n".join(f"- {cp}" for cp in config["check_points"])
    required_elements_str = ", ".join(config["required_elements"])

    system_prompt = f"""You are an expert document verification specialist for South African educational institutions.
Your task is to analyze uploaded documents for authenticity, completeness, and quality.

You are analyzing a {config['description']}.

ANALYSIS REQUIREMENTS:
{check_points_str}

REQUIRED ELEMENTS THAT MUST BE PRESENT:
{required_elements_str}

RESPONSE FORMAT:
You MUST respond with a valid JSON object containing:
{{
    "document_type_detected": "<detected document type>",
    "clarity_score": <1-10 score for image clarity>,
    "completeness_score": <1-10 score for completeness>,
    "authenticity_indicators": {{
        "positive": ["<list of authenticity indicators found>"],
        "concerns": ["<list of any concerns>"]
    }},
    "required_elements_found": {{
        "<element>": {{
            "found": true/false,
            "value": "<extracted value if visible>" or null,
            "notes": "<any notes about this element>"
        }}
    }},
    "issues_found": [
        {{
            "severity": "critical" | "major" | "minor",
            "issue": "<description of the issue>",
            "recommendation": "<actionable recommendation>"
        }}
    ],
    "overall_assessment": "approved" | "flagged" | "rejected",
    "recommendation": "<summary recommendation for document>",
    "confidence": <0-100 confidence percentage>
}}

ASSESSMENT CRITERIA:
- "approved": Document is clear, complete, and appears authentic
- "flagged": Document has minor issues that need verification or clarification
- "rejected": Document is unreadable, incomplete, or shows signs of tampering

Be thorough but fair. Do not reject documents for minor quality issues if key information is still readable."""

    user_content = [
        {
            "type": "text",
            "text": f"Please analyze this {document_type.replace('_', ' ')} document for a South African university application."
        }
    ]

    if additional_context:
        user_content.append({
            "type": "text",
            "text": f"Additional context: {additional_context}"
        })

    # Add image - check if it's already a data URL or needs to be fetched
    if image_data.startswith("data:"):
        user_content.append({
            "type": "image_url",
            "image_url": {"url": image_data, "detail": "high"}
        })
    else:
        user_content.append({
            "type": "image_url",
            "image_url": {"url": image_data, "detail": "high"}
        })

    payload = {
        "model": "gpt-4o",  # GPT-4V model
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "max_tokens": 2000,
        "temperature": 0.1  # Low temperature for consistent analysis
    }

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OPENAI_API_URL,
                json=payload,
                headers=headers
            )
            response.raise_for_status()

            result = response.json()
            content = result["choices"][0]["message"]["content"]

            # Parse the JSON response
            # Try to extract JSON from the response (handle markdown code blocks)
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
                "raw_response": content
            }

    except httpx.HTTPStatusError as e:
        return {
            "success": False,
            "error": f"API request failed: {e.response.status_code} - {e.response.text}",
            "analysis": None
        }
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Failed to parse API response as JSON: {str(e)}",
            "analysis": None,
            "raw_response": content if 'content' in locals() else None
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "analysis": None
        }


@tool
def vision_analyze_document(document_url: str, document_type: str) -> str:
    """
    Analyze a document image using GPT-4V for verification.

    This tool sends a document image to GPT-4V (GPT-4 Vision) for detailed analysis.
    It checks for clarity, completeness, authenticity indicators, and extracts
    key information from the document.

    Args:
        document_url: URL of the document image (from Supabase storage or direct URL)
        document_type: Type of document being analyzed. Must be one of:
                      - "id_document" (SA ID book, smart ID card, or passport)
                      - "matric_certificate" (NSC certificate)
                      - "academic_transcript" (Academic records)
                      - "proof_of_residence" (Utility bill, bank statement)

    Returns:
        JSON string with analysis results including:
        - clarity_score: 1-10 rating of image quality
        - completeness_score: 1-10 rating of document completeness
        - authenticity_indicators: Positive indicators and concerns
        - required_elements_found: Status of each required element
        - issues_found: List of issues with severity and recommendations
        - overall_assessment: "approved", "flagged", or "rejected"
        - recommendation: Summary recommendation
        - confidence: 0-100 confidence percentage

    Example:
        result = vision_analyze_document(
            document_url="https://storage.supabase.co/v1/object/public/documents/id_123.jpg",
            document_type="id_document"
        )
    """

    async def async_analyze():
        try:
            # Validate document type
            valid_types = list(DOCUMENT_ANALYSIS_CONFIG.keys())
            if document_type not in valid_types:
                return json.dumps({
                    "success": False,
                    "error": f"Invalid document_type. Must be one of: {', '.join(valid_types)}",
                    "analysis": None
                })

            if not document_url:
                return json.dumps({
                    "success": False,
                    "error": "document_url is required",
                    "analysis": None
                })

            # Check if we need to fetch and convert to base64
            # For Supabase storage URLs, we may need to fetch first
            if "supabase" in document_url.lower():
                image_data = await _fetch_image_as_base64(document_url)
                if not image_data:
                    return json.dumps({
                        "success": False,
                        "error": f"Failed to fetch image from URL: {document_url}",
                        "analysis": None
                    })
            else:
                # Use URL directly for public images
                image_data = document_url

            # Call GPT-4V API
            result = await _call_gpt4v_api(image_data, document_type)

            return json.dumps(result, indent=2)

        except Exception as e:
            return json.dumps({
                "success": False,
                "error": f"Analysis failed: {str(e)}",
                "analysis": None
            })

    return asyncio.run(async_analyze())


@tool
def vision_extract_document_text(document_url: str) -> str:
    """
    Extract text content from a document image using GPT-4V.

    This tool uses GPT-4V's OCR capabilities to extract all visible text
    from a document image. Useful for verification and cross-referencing.

    Args:
        document_url: URL of the document image

    Returns:
        JSON string with extracted text and metadata:
        - success: True/False
        - extracted_text: All text found in the document
        - structured_data: Attempt to structure the text into key-value pairs
        - confidence: OCR confidence level

    Example:
        result = vision_extract_document_text(
            document_url="https://storage.supabase.co/v1/object/public/documents/cert_123.jpg"
        )
    """

    async def async_extract():
        try:
            if not document_url:
                return json.dumps({
                    "success": False,
                    "error": "document_url is required",
                    "extracted_text": None
                })

            if not OPENAI_API_KEY:
                return json.dumps({
                    "success": False,
                    "error": "OPENAI_API_KEY not configured",
                    "extracted_text": None
                })

            # Fetch image if from Supabase
            if "supabase" in document_url.lower():
                image_data = await _fetch_image_as_base64(document_url)
                if not image_data:
                    return json.dumps({
                        "success": False,
                        "error": f"Failed to fetch image from URL",
                        "extracted_text": None
                    })
            else:
                image_data = document_url

            system_prompt = """You are an expert OCR specialist. Extract ALL text visible in the document image.

RESPONSE FORMAT:
Return a valid JSON object:
{
    "extracted_text": "<all text found, preserving layout as much as possible>",
    "structured_data": {
        "<field_name>": "<value>",
        ...
    },
    "language": "<detected language>",
    "confidence": <0-100 confidence score>
}

For structured_data, try to identify key-value pairs like:
- Name, ID number, dates, addresses, scores, grades, etc.
- Use snake_case for field names

Be thorough - extract every piece of text you can identify."""

            payload = {
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Please extract all text from this document."},
                            {"type": "image_url", "image_url": {"url": image_data, "detail": "high"}}
                        ]
                    }
                ],
                "max_tokens": 3000,
                "temperature": 0.1
            }

            headers = {
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    OPENAI_API_URL,
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
                    **extracted
                }, indent=2)

        except Exception as e:
            return json.dumps({
                "success": False,
                "error": f"Text extraction failed: {str(e)}",
                "extracted_text": None
            })

    return asyncio.run(async_extract())


@tool
def vision_compare_documents(
    document1_url: str,
    document2_url: str,
    comparison_type: str
) -> str:
    """
    Compare two document images for consistency.

    This tool compares two documents to verify consistency of information
    (e.g., comparing ID document with matric certificate for name matching).

    Args:
        document1_url: URL of the first document image
        document2_url: URL of the second document image
        comparison_type: Type of comparison to perform:
                        - "identity": Compare names, ID numbers, dates of birth
                        - "academic": Compare student details across academic documents
                        - "general": General consistency check

    Returns:
        JSON string with comparison results:
        - matches: Fields that match between documents
        - discrepancies: Fields with differences
        - confidence: Overall confidence in comparison
        - recommendation: Suggested action based on comparison

    Example:
        result = vision_compare_documents(
            document1_url="https://storage.supabase.co/.../id.jpg",
            document2_url="https://storage.supabase.co/.../matric.jpg",
            comparison_type="identity"
        )
    """

    async def async_compare():
        try:
            if not document1_url or not document2_url:
                return json.dumps({
                    "success": False,
                    "error": "Both document URLs are required",
                    "comparison": None
                })

            if not OPENAI_API_KEY:
                return json.dumps({
                    "success": False,
                    "error": "OPENAI_API_KEY not configured",
                    "comparison": None
                })

            valid_comparison_types = ["identity", "academic", "general"]
            if comparison_type not in valid_comparison_types:
                return json.dumps({
                    "success": False,
                    "error": f"Invalid comparison_type. Must be one of: {', '.join(valid_comparison_types)}",
                    "comparison": None
                })

            # Fetch both images
            images = []
            for url in [document1_url, document2_url]:
                if "supabase" in url.lower():
                    img = await _fetch_image_as_base64(url)
                    if not img:
                        return json.dumps({
                            "success": False,
                            "error": f"Failed to fetch image from URL",
                            "comparison": None
                        })
                    images.append(img)
                else:
                    images.append(url)

            comparison_prompts = {
                "identity": """Compare these two documents for identity verification:
                - Full name (first name, middle names, surname)
                - ID number / passport number
                - Date of birth
                - Gender
                - Any photo if present

                Flag ANY discrepancy, even minor spelling differences.""",

                "academic": """Compare these academic documents for consistency:
                - Student name
                - Student number
                - Institution details
                - Academic records/grades
                - Dates and periods

                Check if records could belong to the same student.""",

                "general": """Perform a general consistency check:
                - Compare all visible names
                - Compare all visible dates
                - Compare all visible reference numbers
                - Note any information that appears in both

                Report any discrepancies found."""
            }

            system_prompt = f"""You are a document verification specialist comparing two documents.

{comparison_prompts[comparison_type]}

RESPONSE FORMAT:
Return a valid JSON object:
{{
    "matches": [
        {{
            "field": "<field name>",
            "document1_value": "<value from first document>",
            "document2_value": "<value from second document>",
            "match_confidence": <0-100>
        }}
    ],
    "discrepancies": [
        {{
            "field": "<field name>",
            "document1_value": "<value from first document>",
            "document2_value": "<value from second document>",
            "severity": "critical" | "major" | "minor",
            "notes": "<explanation>"
        }}
    ],
    "fields_not_compared": ["<fields missing from one or both documents>"],
    "overall_match_score": <0-100>,
    "recommendation": "consistent" | "needs_review" | "inconsistent",
    "summary": "<brief summary of comparison results>"
}}"""

            payload = {
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Please compare these two documents:"},
                            {"type": "text", "text": "Document 1:"},
                            {"type": "image_url", "image_url": {"url": images[0], "detail": "high"}},
                            {"type": "text", "text": "Document 2:"},
                            {"type": "image_url", "image_url": {"url": images[1], "detail": "high"}}
                        ]
                    }
                ],
                "max_tokens": 2500,
                "temperature": 0.1
            }

            headers = {
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(
                    OPENAI_API_URL,
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

                comparison = json.loads(json_str)

                return json.dumps({
                    "success": True,
                    "error": None,
                    "comparison": comparison
                }, indent=2)

        except Exception as e:
            return json.dumps({
                "success": False,
                "error": f"Comparison failed: {str(e)}",
                "comparison": None
            })

    return asyncio.run(async_compare())
