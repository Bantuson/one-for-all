"""
Pydantic schemas for AI Scanner structured output.

These schemas define the expected output format from CrewAI agents
to ensure consistent, validated data extraction from university websites.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator


class RequirementsOutput(BaseModel):
    """Admission requirements for a course."""

    minimum_aps: Optional[int] = Field(
        None,
        ge=0,
        le=50,
        description="Minimum APS (Admission Point Score) required",
    )
    required_subjects: Optional[List[str]] = Field(
        None,
        description="List of required subjects with minimum levels (e.g., 'Mathematics Level 5')",
    )
    minimum_subject_levels: Optional[dict] = Field(
        None,
        description="Mapping of subject names to minimum required levels",
    )
    additional_requirements: Optional[List[str]] = Field(
        None,
        description="Additional entry requirements or notes",
    )
    text: Optional[str] = Field(
        None,
        max_length=2000,
        description="Full text of requirements section for reference",
    )


class CourseOutput(BaseModel):
    """Structured output for a course/programme."""

    name: str = Field(
        ...,
        min_length=3,
        max_length=200,
        description="Full name of the course or qualification",
    )
    code: str = Field(
        ...,
        min_length=2,
        max_length=20,
        description="Course code (e.g., 'BENG-CIV', 'BSC-CS')",
    )
    description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Brief description of the course",
    )
    requirements: Optional[RequirementsOutput] = Field(
        None,
        description="Admission requirements for this course",
    )
    duration_years: Optional[int] = Field(
        None,
        ge=1,
        le=8,
        description="Duration of the programme in years",
    )
    nqf_level: Optional[int] = Field(
        None,
        ge=1,
        le=10,
        description="NQF (National Qualifications Framework) level",
    )
    source_url: str = Field(
        ...,
        description="URL where this course information was found",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="AI confidence score for this extraction (0-1)",
    )

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        """Normalize course code to uppercase without spaces."""
        return v.upper().replace(" ", "-")


class FacultyOutput(BaseModel):
    """Structured output for a faculty/school/department."""

    name: str = Field(
        ...,
        min_length=5,
        max_length=150,
        description="Full name of the faculty or school",
    )
    code: str = Field(
        ...,
        min_length=2,
        max_length=15,
        description="Faculty code (e.g., 'FOEAT', 'FONS')",
    )
    description: Optional[str] = Field(
        None,
        max_length=500,
        description="Brief description of the faculty",
    )
    courses: List[CourseOutput] = Field(
        default_factory=list,
        description="Courses offered by this faculty",
    )
    source_url: str = Field(
        ...,
        description="URL where this faculty information was found",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="AI confidence score for this extraction (0-1)",
    )

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        """Normalize faculty code to uppercase."""
        return v.upper()


class AddressOutput(BaseModel):
    """Physical address structure."""

    street: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "South Africa"


class CampusOutput(BaseModel):
    """Structured output for a campus location."""

    name: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="Name of the campus",
    )
    code: str = Field(
        ...,
        min_length=2,
        max_length=10,
        description="Campus code (e.g., 'MAIN', 'CBD')",
    )
    location: Optional[str] = Field(
        None,
        max_length=200,
        description="Location description (city, province)",
    )
    address: Optional[AddressOutput] = Field(
        None,
        description="Full physical address",
    )
    faculties: List[FacultyOutput] = Field(
        default_factory=list,
        description="Faculties located at this campus",
    )
    source_url: str = Field(
        ...,
        description="URL where this campus information was found",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="AI confidence score for this extraction (0-1)",
    )

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        """Normalize campus code to uppercase."""
        return v.upper()


class ScanResultOutput(BaseModel):
    """Complete scan result output schema."""

    institution_id: str = Field(
        ...,
        description="UUID of the institution being scanned",
    )
    website_url: str = Field(
        ...,
        description="Base URL of the scanned website",
    )
    campuses: List[CampusOutput] = Field(
        default_factory=list,
        description="List of campuses found",
    )
    total_pages_scraped: int = Field(
        ...,
        ge=0,
        description="Number of pages successfully scraped",
    )
    total_time_ms: int = Field(
        ...,
        ge=0,
        description="Total time taken for the scan in milliseconds",
    )
    theme: Literal["light", "dark"] = Field(
        "light",
        description="UI theme to use when rendering results",
    )
    scanned_at: str = Field(
        ...,
        description="ISO 8601 timestamp of when the scan completed",
    )

    def get_summary(self) -> dict:
        """Return a summary of the scan results."""
        faculty_count = sum(len(c.faculties) for c in self.campuses)
        course_count = sum(
            len(f.courses) for c in self.campuses for f in c.faculties
        )
        return {
            "campuses": len(self.campuses),
            "faculties": faculty_count,
            "courses": course_count,
            "pages_scraped": self.total_pages_scraped,
            "time_seconds": self.total_time_ms / 1000,
        }

    def to_dashboard_format(self) -> dict:
        """Convert to format expected by dashboard frontend."""
        return {
            "institutionId": self.institution_id,
            "websiteUrl": self.website_url,
            "scannedAt": self.scanned_at,
            "totalPagesScraped": self.total_pages_scraped,
            "totalTimeMs": self.total_time_ms,
            "campuses": [
                {
                    "id": f"campus_{i}",
                    "name": c.name,
                    "code": c.code,
                    "location": c.location,
                    "sourceUrl": c.source_url,
                    "confidence": c.confidence,
                    "faculties": [
                        {
                            "id": f"faculty_{i}_{j}",
                            "name": f.name,
                            "code": f.code,
                            "description": f.description,
                            "sourceUrl": f.source_url,
                            "confidence": f.confidence,
                            "courses": [
                                {
                                    "id": f"course_{i}_{j}_{k}",
                                    "name": course.name,
                                    "code": course.code,
                                    "description": course.description,
                                    "requirements": course.requirements.model_dump()
                                    if course.requirements
                                    else None,
                                    "durationYears": course.duration_years,
                                    "sourceUrl": course.source_url,
                                    "confidence": course.confidence,
                                }
                                for k, course in enumerate(f.courses)
                            ],
                        }
                        for j, f in enumerate(c.faculties)
                    ],
                }
                for i, c in enumerate(self.campuses)
            ],
        }


# Example usage for agent prompts
EXAMPLE_OUTPUT = """
{
  "institution_id": "123e4567-e89b-12d3-a456-426614174000",
  "website_url": "https://www.university.ac.za",
  "campuses": [
    {
      "name": "Main Campus",
      "code": "MAIN",
      "location": "Pretoria, Gauteng",
      "source_url": "https://www.university.ac.za/campuses/main",
      "confidence": 0.95,
      "faculties": [
        {
          "name": "Faculty of Engineering",
          "code": "FOENG",
          "description": "Leading engineering education",
          "source_url": "https://www.university.ac.za/engineering",
          "confidence": 0.92,
          "courses": [
            {
              "name": "Bachelor of Engineering in Civil Engineering",
              "code": "BENG-CIV",
              "description": "4-year engineering degree",
              "requirements": {
                "minimum_aps": 34,
                "required_subjects": ["Mathematics Level 6", "Physical Science Level 5"]
              },
              "duration_years": 4,
              "source_url": "https://www.university.ac.za/engineering/civil",
              "confidence": 0.88
            }
          ]
        }
      ]
    }
  ],
  "total_pages_scraped": 15,
  "total_time_ms": 45000,
  "theme": "light",
  "scanned_at": "2024-12-11T12:00:00Z"
}
"""
