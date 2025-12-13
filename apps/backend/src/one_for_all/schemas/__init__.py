"""
Pydantic schemas for structured outputs.
"""

from .scanner_output import (
    CourseOutput,
    FacultyOutput,
    CampusOutput,
    ScanResultOutput,
    RequirementsOutput,
)

__all__ = [
    "CourseOutput",
    "FacultyOutput",
    "CampusOutput",
    "ScanResultOutput",
    "RequirementsOutput",
]
