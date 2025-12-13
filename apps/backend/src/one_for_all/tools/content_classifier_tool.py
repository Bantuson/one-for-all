"""
Content Classifier Tool for CrewAI Scanner Agents

Classifies web page content to identify academic page types
(campus, faculty, department, course, etc.)
"""

from crewai.tools import tool
import re
import json
from typing import Dict, List, Tuple


# Patterns for different page types (pattern, weight)
PAGE_TYPE_PATTERNS: Dict[str, List[Tuple[str, float]]] = {
    "campus": [
        (r"\bcampus\b", 3.0),
        (r"\blocation\b.*\baddress\b", 1.5),
        (r"\bfacilities\b", 1.0),
        (r"campus\s+(?:map|tour|life)", 2.0),
        (r"\baccommodation\b|\bresidences?\b", 1.5),
    ],
    "faculty": [
        (r"faculty\s+of\s+\w+", 3.0),
        (r"school\s+of\s+\w+", 2.5),
        (r"college\s+of\s+\w+", 2.0),
        (r"\bdean\b|\bhead\s+of\s+faculty\b", 2.0),
        (r"\bdepartments?\b", 1.5),
        (r"our\s+programmes?|our\s+courses?", 1.0),
    ],
    "department": [
        (r"department\s+of\s+\w+", 3.0),
        (r"\bhead\s+of\s+department\b", 2.5),
        (r"\blecturers?\b|\bstaff\b", 1.0),
        (r"research\s+areas?", 1.5),
    ],
    "course": [
        (r"bachelor\s+of\s+\w+", 3.0),
        (r"master\s+of\s+\w+", 3.0),
        (r"\bdiploma\s+in\b", 3.0),
        (r"\bcourse\s+(?:code|outline|structure)\b", 2.5),
        (r"\baps\s+(?:score|requirement)\b", 2.5),
        (r"\badmission\s+requirements?\b", 2.0),
        (r"\bduration\b.*\byears?\b", 1.5),
        (r"\bcareer\s+(?:opportunities|paths?)\b", 1.5),
        (r"\bcurriculum\b|\bmodules?\b", 1.5),
        (r"nqf\s+level", 2.0),
    ],
    "program_list": [
        (r"programmes?\s+offered", 2.5),
        (r"courses?\s+offered", 2.5),
        (r"undergraduate\s+programmes?", 2.0),
        (r"postgraduate\s+programmes?", 2.0),
        (r"\bqualifications?\b", 1.5),
        (r"browse\s+(?:programmes?|courses?)", 2.0),
    ],
    "admission": [
        (r"\bhow\s+to\s+apply\b", 3.0),
        (r"\bapplication\s+(?:process|form|deadline)\b", 2.5),
        (r"\bentry\s+requirements?\b", 2.0),
        (r"\bmatric\b|\bnsc\b", 1.5),
        (r"\baps\b|\badmission\s+point", 2.0),
        (r"\bapply\s+(?:now|online)\b", 2.5),
    ],
}

# South African academic keywords
SA_ACADEMIC_KEYWORDS = [
    "nsc", "matric", "aps", "nqf", "saqa", "heqc",
    "undergraduate", "postgraduate", "honours", "master", "doctoral",
    "bachelor", "diploma", "certificate", "degree",
]


@tool
def content_classifier_tool(text: str, url: str = "", title: str = "") -> str:
    """
    Classify the type of academic web page based on its content.

    Args:
        text: The main text content of the page
        url: The page URL (helps with classification)
        title: The page title

    Returns:
        JSON string with classification results:
        {
            "page_type": "campus|faculty|department|course|program_list|admission|unknown",
            "confidence": 0.0-1.0,
            "scores": {"campus": 0.5, "faculty": 0.8, ...},
            "academic_keywords_found": ["aps", "nqf", ...],
            "suggested_extraction": "campus|faculty|course|none"
        }
    """
    try:
        combined_text = f"{title} {url} {text}".lower()

        # Calculate scores for each page type
        scores = {}
        for page_type, patterns in PAGE_TYPE_PATTERNS.items():
            score = 0.0
            for pattern, weight in patterns:
                matches = len(re.findall(pattern, combined_text, re.I))
                score += matches * weight
            scores[page_type] = score

        # Normalize scores
        max_score = max(scores.values()) if scores.values() else 1
        if max_score > 0:
            normalized_scores = {k: min(1.0, v / max_score) for k, v in scores.items()}
        else:
            normalized_scores = scores

        # Determine best match
        best_type = max(scores, key=scores.get) if scores else "unknown"
        best_score = normalized_scores.get(best_type, 0)

        # Check for SA academic keywords
        keywords_found = [
            kw for kw in SA_ACADEMIC_KEYWORDS
            if kw in combined_text
        ]

        # Calculate overall confidence
        confidence = best_score * 0.7  # Base confidence from pattern matching

        # Boost confidence if SA keywords found
        if keywords_found:
            confidence += 0.15

        # Boost confidence if URL contains relevant patterns
        url_lower = url.lower()
        url_patterns = {
            "campus": ["/campus", "/location"],
            "faculty": ["/faculty", "/school", "/college"],
            "department": ["/department", "/dept"],
            "course": ["/course", "/programme", "/program", "/qualification", "/degree"],
            "admission": ["/admission", "/apply", "/entry"],
        }
        for ptype, patterns in url_patterns.items():
            if any(p in url_lower for p in patterns):
                if ptype == best_type:
                    confidence += 0.15
                elif scores.get(ptype, 0) > 0:
                    # URL suggests different type than content
                    confidence -= 0.1

        confidence = max(0.1, min(1.0, confidence))

        # Determine if page type is too uncertain
        if best_score < 0.3:
            best_type = "unknown"
            confidence = max(0.1, confidence - 0.2)

        # Suggest what to extract based on page type
        extraction_map = {
            "campus": "campus",
            "faculty": "faculty",
            "department": "faculty",  # Treat as faculty for extraction
            "course": "course",
            "program_list": "course",  # May contain multiple courses
            "admission": "course",  # Often has course requirements
            "unknown": "none",
        }
        suggested_extraction = extraction_map.get(best_type, "none")

        result = {
            "page_type": best_type,
            "confidence": round(confidence, 2),
            "scores": {k: round(v, 2) for k, v in normalized_scores.items()},
            "academic_keywords_found": keywords_found[:20],
            "suggested_extraction": suggested_extraction,
            "is_academic_content": len(keywords_found) > 0 or best_score > 0.2,
        }

        return json.dumps(result, ensure_ascii=False)

    except Exception as e:
        return json.dumps({
            "error": str(e),
            "page_type": "unknown",
            "confidence": 0.0,
        })


@tool
def extract_academic_entities(text: str) -> str:
    """
    Extract named academic entities from text (universities, faculties, courses).

    Args:
        text: Text content to analyze

    Returns:
        JSON string with extracted entities
    """
    try:
        entities = {
            "universities": [],
            "faculties": [],
            "departments": [],
            "courses": [],
            "qualifications": [],
        }

        # University patterns
        uni_pattern = r"(?:University\s+of\s+[\w\s]+|[\w]+\s+University)"
        for match in re.findall(uni_pattern, text, re.I):
            clean = match.strip()
            if clean and clean not in entities["universities"]:
                entities["universities"].append(clean)

        # Faculty patterns
        faculty_pattern = r"(?:Faculty|School|College)\s+of\s+[\w\s&]+"
        for match in re.findall(faculty_pattern, text, re.I):
            clean = match.strip()
            if clean and clean not in entities["faculties"]:
                entities["faculties"].append(clean)

        # Department patterns
        dept_pattern = r"Department\s+of\s+[\w\s&]+"
        for match in re.findall(dept_pattern, text, re.I):
            clean = match.strip()
            if clean and clean not in entities["departments"]:
                entities["departments"].append(clean)

        # Qualification patterns
        qual_patterns = [
            r"Bachelor\s+of\s+[\w\s]+(?:\([^)]+\))?",
            r"Master\s+of\s+[\w\s]+(?:\([^)]+\))?",
            r"Doctor\s+of\s+[\w\s]+",
            r"Diploma\s+in\s+[\w\s]+",
            r"Certificate\s+in\s+[\w\s]+",
            r"B(?:Sc|A|Com|Eng|Ed|Admin|Soc\.?Sc)\s*(?:\([^)]+\)|in\s+[\w\s]+)?",
            r"M(?:Sc|A|Com|Eng|Ed|BA|Phil)\s*(?:\([^)]+\)|in\s+[\w\s]+)?",
            r"PhD|DPhil|LLD|LLB|MB\s*Ch?B",
        ]

        for pattern in qual_patterns:
            for match in re.findall(pattern, text, re.I):
                clean = match.strip()
                if clean and len(clean) > 3 and clean not in entities["qualifications"]:
                    entities["qualifications"].append(clean)

        # Limit results
        for key in entities:
            entities[key] = entities[key][:20]

        return json.dumps(entities, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"error": str(e)})
