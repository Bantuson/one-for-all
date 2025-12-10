"""
Data Normalizer Tool for CrewAI Scanner Agents

Normalizes and validates extracted academic data to ensure consistency
and database compatibility.
"""

from crewai_tools import tool
import re
import json
import uuid
from typing import Dict, Any, List, Optional, Tuple


@tool
def data_normalizer_tool(data: str, data_type: str = "auto") -> str:
    """
    Normalize and validate extracted academic data.

    Args:
        data: JSON string with extracted data
        data_type: Type of data to normalize - "campus", "faculty", "course", or "auto"

    Returns:
        JSON string with normalized data and validation results
    """
    try:
        parsed_data = json.loads(data) if isinstance(data, str) else data

        if data_type == "auto":
            # Detect data type based on fields
            if "faculties" in parsed_data or "campus" in str(parsed_data).lower():
                data_type = "campus"
            elif "courses" in parsed_data or "faculty" in str(parsed_data).lower():
                data_type = "faculty"
            elif "requirements" in parsed_data or "duration" in parsed_data:
                data_type = "course"
            else:
                data_type = "unknown"

        validators = {
            "campus": normalize_campus,
            "faculty": normalize_faculty,
            "course": normalize_course,
        }

        validator = validators.get(data_type)
        if validator:
            normalized, errors = validator(parsed_data)
            return json.dumps({
                "normalized": normalized,
                "validation_errors": errors,
                "data_type": data_type,
                "is_valid": len(errors) == 0,
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "error": f"Unknown data type: {data_type}",
                "data_type": data_type,
                "is_valid": False,
            })

    except json.JSONDecodeError as e:
        return json.dumps({
            "error": f"Invalid JSON input: {str(e)}",
            "is_valid": False,
        })
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "is_valid": False,
        })


def normalize_campus(data: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """Normalize campus data."""
    errors = []
    normalized = {
        "id": data.get("id") or f"campus_{uuid.uuid4().hex[:12]}",
        "name": "",
        "code": "",
        "location": None,
        "address": None,
        "faculties": [],
        "confidence": 0.5,
        "source_url": data.get("source_url", data.get("sourceUrl", "")),
    }

    # Name
    name = data.get("name", "").strip()
    if not name:
        errors.append("Campus name is required")
    elif len(name) < 3:
        errors.append("Campus name too short (min 3 characters)")
    elif len(name) > 200:
        name = name[:200]
    normalized["name"] = to_title_case(name)

    # Ensure "Campus" suffix
    if normalized["name"] and "campus" not in normalized["name"].lower():
        normalized["name"] = f"{normalized['name']} Campus"

    # Code
    code = data.get("code", "").strip().upper()
    if not code and name:
        code = generate_code(name, max_length=6)
    if len(code) > 15:
        code = code[:15]
    normalized["code"] = re.sub(r"[^A-Z0-9]", "", code) or "CAMP"

    # Location
    location = data.get("location", "").strip()
    if location:
        normalized["location"] = location[:200]

    # Address
    address = data.get("address")
    if address and isinstance(address, dict):
        normalized["address"] = {
            "street": str(address.get("street", "")).strip()[:200],
            "city": str(address.get("city", "")).strip()[:100],
            "province": str(address.get("province", "")).strip()[:100],
            "postalCode": str(address.get("postal_code", address.get("postalCode", ""))).strip()[:10],
        }
        # Remove empty address
        if not any(normalized["address"].values()):
            normalized["address"] = None

    # Confidence
    confidence = data.get("confidence", 0.5)
    normalized["confidence"] = max(0.1, min(1.0, float(confidence)))

    # Faculties (will be normalized separately)
    faculties = data.get("faculties", [])
    if isinstance(faculties, list):
        normalized["faculties"] = faculties

    return normalized, errors


def normalize_faculty(data: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """Normalize faculty data."""
    errors = []
    normalized = {
        "id": data.get("id") or f"faculty_{uuid.uuid4().hex[:12]}",
        "name": "",
        "code": "",
        "description": None,
        "courses": [],
        "confidence": 0.5,
        "source_url": data.get("source_url", data.get("sourceUrl", "")),
    }

    # Name
    name = data.get("name", "").strip()
    if not name:
        errors.append("Faculty name is required")
    elif len(name) < 5:
        errors.append("Faculty name too short (min 5 characters)")
    elif len(name) > 200:
        name = name[:200]

    # Normalize faculty name format
    normalized["name"] = normalize_faculty_name(name)

    # Code
    code = data.get("code", "").strip().upper()
    if not code and name:
        code = generate_code(name, max_length=6)
    if len(code) > 15:
        code = code[:15]
    normalized["code"] = re.sub(r"[^A-Z0-9]", "", code) or "FAC"

    # Description
    description = data.get("description", "").strip()
    if description:
        normalized["description"] = description[:2000]

    # Confidence
    confidence = data.get("confidence", 0.5)
    normalized["confidence"] = max(0.1, min(1.0, float(confidence)))

    # Courses (will be normalized separately)
    courses = data.get("courses", [])
    if isinstance(courses, list):
        normalized["courses"] = courses

    return normalized, errors


def normalize_course(data: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """Normalize course data."""
    errors = []
    normalized = {
        "id": data.get("id") or f"course_{uuid.uuid4().hex[:12]}",
        "name": "",
        "code": "",
        "description": None,
        "requirements": None,
        "duration_years": None,
        "status": "active",
        "confidence": 0.5,
        "source_url": data.get("source_url", data.get("sourceUrl", "")),
    }

    # Name
    name = data.get("name", "").strip()
    if not name:
        errors.append("Course name is required")
    elif len(name) < 5:
        errors.append("Course name too short (min 5 characters)")
    elif len(name) > 300:
        name = name[:300]
    normalized["name"] = to_title_case(name)

    # Code
    code = data.get("code", "").strip().upper()
    if not code and name:
        code = generate_course_code(name)
    if len(code) > 20:
        code = code[:20]
    normalized["code"] = re.sub(r"[^A-Z0-9-]", "", code) or "COURSE"

    # Description
    description = data.get("description", "").strip()
    if description:
        normalized["description"] = description[:5000]

    # Duration
    duration = data.get("duration_years", data.get("durationYears"))
    if duration:
        try:
            duration = int(duration)
            if 1 <= duration <= 8:
                normalized["duration_years"] = duration
            else:
                errors.append(f"Invalid duration: {duration} (should be 1-8 years)")
        except (ValueError, TypeError):
            pass

    # Requirements
    requirements = data.get("requirements")
    if requirements:
        normalized["requirements"] = normalize_requirements(requirements)

    # Confidence
    confidence = data.get("confidence", 0.5)
    normalized["confidence"] = max(0.1, min(1.0, float(confidence)))

    return normalized, errors


def normalize_requirements(req: Any) -> Dict[str, Any]:
    """Normalize course requirements."""
    if isinstance(req, str):
        return {"text": req[:2000]}

    if not isinstance(req, dict):
        return {}

    normalized = {}

    # APS score
    aps = req.get("minimum_aps", req.get("minimumAps"))
    if aps:
        try:
            aps = int(aps)
            if 15 <= aps <= 45:
                normalized["minimum_aps"] = aps
        except (ValueError, TypeError):
            pass

    # Required subjects
    subjects = req.get("required_subjects", req.get("requiredSubjects", []))
    if subjects:
        if isinstance(subjects, str):
            subjects = [s.strip() for s in subjects.split(",")]
        normalized["required_subjects"] = [
            s.strip()[:50] for s in subjects if s and isinstance(s, str)
        ][:10]

    # Minimum subject levels
    levels = req.get("minimum_subject_levels", req.get("minimumSubjectLevels", {}))
    if levels and isinstance(levels, dict):
        normalized["minimum_subject_levels"] = {
            str(k)[:50]: max(1, min(7, int(v)))
            for k, v in levels.items()
            if isinstance(v, (int, float, str)) and str(v).isdigit()
        }

    # Additional requirements text
    text = req.get("text", req.get("additional", ""))
    if text:
        normalized["text"] = str(text)[:2000]

    return normalized


# ============================================================================
# Helper Functions
# ============================================================================

def to_title_case(text: str) -> str:
    """Convert text to title case, handling special cases."""
    if not text:
        return ""

    # Words to keep lowercase (unless at start)
    lowercase_words = {"of", "the", "and", "in", "for", "to", "a", "an", "on", "at"}

    # Words to keep uppercase
    uppercase_words = {"IT", "AI", "SA", "UK", "US", "BSc", "BA", "BCom", "MSc", "MA", "PhD"}

    words = text.split()
    result = []

    for i, word in enumerate(words):
        word_upper = word.upper()
        if word_upper in uppercase_words:
            result.append(word_upper)
        elif i == 0 or word.lower() not in lowercase_words:
            result.append(word.capitalize())
        else:
            result.append(word.lower())

    return " ".join(result)


def generate_code(name: str, max_length: int = 10) -> str:
    """Generate a code from a name."""
    if not name:
        return ""

    # Remove common prefixes
    name = re.sub(r"^(faculty|school|college|department)\s+(of\s+)?", "", name, flags=re.I)

    # Take first letter of each significant word
    words = re.findall(r"\b[a-zA-Z]+", name)
    code = "".join(word[0].upper() for word in words if len(word) > 2)

    return code[:max_length] or name[:max_length].upper()


def generate_course_code(name: str) -> str:
    """Generate a course code from a course name."""
    if not name:
        return ""

    # Common qualification prefixes
    prefix_map = {
        "bachelor of science": "BSC",
        "bachelor of arts": "BA",
        "bachelor of commerce": "BCOM",
        "bachelor of engineering": "BENG",
        "bachelor of education": "BED",
        "master of science": "MSC",
        "master of arts": "MA",
        "master of business": "MBA",
        "doctor of philosophy": "PHD",
        "diploma in": "DIP",
        "certificate in": "CERT",
    }

    name_lower = name.lower()
    prefix = ""

    for pattern, code in prefix_map.items():
        if pattern in name_lower:
            prefix = code
            name_lower = name_lower.replace(pattern, "")
            break

    # Generate suffix from remaining words
    remaining_words = re.findall(r"\b[a-zA-Z]+", name_lower)
    suffix = "".join(word[0].upper() for word in remaining_words if len(word) > 2)[:6]

    if prefix and suffix:
        return f"{prefix}-{suffix}"
    elif prefix:
        return prefix
    else:
        return suffix or "COURSE"


def normalize_faculty_name(name: str) -> str:
    """Normalize faculty name to consistent format."""
    if not name:
        return ""

    name = name.strip()

    # Check if already has proper prefix
    proper_prefixes = ["Faculty of", "School of", "College of"]
    for prefix in proper_prefixes:
        if name.lower().startswith(prefix.lower()):
            # Just title case it
            return to_title_case(name)

    # Add "Faculty of" if no prefix
    if not any(name.lower().startswith(p.lower()) for p in proper_prefixes):
        name = f"Faculty of {name}"

    return to_title_case(name)
