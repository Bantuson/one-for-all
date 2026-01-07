"""
Profile Parser Module

Parses markdown prospect profile files and extracts structured data
suitable for CrewAI crew kickoff inputs.

Usage:
    from one_for_all.tests.profile_parser import ProfileParser

    parser = ProfileParser()
    inputs = parser.parse_profile("/path/to/profile_001.md")
"""

import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class MatricSubject:
    """Represents a single matric subject result."""
    name: str
    level: str  # HL, FAL, or -
    mark: int
    aps_points: Optional[int] = None


@dataclass
class CourseChoice:
    """Represents a course choice (first or second)."""
    institution: str
    faculty: str
    programme: str
    minimum_aps: Optional[int] = None
    specific_requirements: Optional[str] = None


@dataclass
class ProspectProfile:
    """Complete parsed prospect profile."""
    # Metadata
    profile_id: str

    # Basic Information
    name: str
    id_number: str
    date_of_birth: str
    gender: str
    home_language: str
    province: str
    citizenship: str

    # Contact Details
    mobile: str
    email: str
    whatsapp: str
    physical_address: str

    # Academic Profile
    matric_subjects: List[MatricSubject] = field(default_factory=list)
    total_aps_score: Optional[int] = None
    academic_highlights: List[str] = field(default_factory=list)

    # Application Preferences
    first_choice: Optional[CourseChoice] = None
    second_choice: Optional[CourseChoice] = None

    # Financial Information
    nsfas_eligible: bool = False
    household_income: Optional[str] = None
    sassa_grant_recipient: bool = False
    disability_grant: bool = False
    parent_guardian_employment: Optional[str] = None

    # Documents Available (checked items from markdown)
    documents_available: List[str] = field(default_factory=list)
    documents_missing: List[str] = field(default_factory=list)

    # Testing Metadata
    expected_behaviors: Dict[str, str] = field(default_factory=dict)
    edge_cases: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


class ProfileParser:
    """
    Parses markdown prospect profile files into structured data.

    The parser handles the specific markdown table format used in
    the prospect profile templates.
    """

    # Project root for locating profile directories
    PROJECT_ROOT = Path(__file__).resolve().parents[5]
    PROFILES_DIR = PROJECT_ROOT / ".docs" / "application_agents_testing" / "prospect_profiles"

    def __init__(self, profiles_dir: Optional[Path] = None):
        """
        Initialize the profile parser.

        Args:
            profiles_dir: Optional custom profiles directory path
        """
        self.profiles_dir = profiles_dir or self.PROFILES_DIR

    def find_profile_path(self, profile_id: str) -> Path:
        """
        Find the full path to a profile file.

        Args:
            profile_id: Profile identifier (e.g., "profile_001", "exp_001")

        Returns:
            Full path to the profile markdown file

        Raises:
            FileNotFoundError: If profile cannot be located
        """
        # Normalize profile_id
        if profile_id.startswith("exp_"):
            # Convert experiment ID to profile ID
            num = profile_id.split("_")[1]
            profile_id = f"profile_{num}"

        # Extract number to determine undergrad vs postgrad
        num = int(profile_id.split("_")[1])

        if num <= 10:
            subdir = "undergrad"
        else:
            subdir = "postgrad"

        profile_path = self.profiles_dir / subdir / f"{profile_id}.md"

        if not profile_path.exists():
            # Try searching in all subdirectories
            for subdir in ["undergrad", "postgrad"]:
                candidate = self.profiles_dir / subdir / f"{profile_id}.md"
                if candidate.exists():
                    return candidate
            raise FileNotFoundError(
                f"Profile '{profile_id}' not found in {self.profiles_dir}"
            )

        return profile_path

    def parse_profile(self, profile_path_or_id: str) -> ProspectProfile:
        """
        Parse a prospect profile markdown file.

        Args:
            profile_path_or_id: Either a full path or profile ID

        Returns:
            Parsed ProspectProfile dataclass
        """
        # Determine if it's a path or ID
        if Path(profile_path_or_id).exists():
            profile_path = Path(profile_path_or_id)
        else:
            profile_path = self.find_profile_path(profile_path_or_id)

        content = profile_path.read_text(encoding="utf-8")

        return self._parse_content(content)

    def _parse_content(self, content: str) -> ProspectProfile:
        """Parse the markdown content into a ProspectProfile."""

        # Extract sections
        sections = self._split_sections(content)

        # Parse Basic Information
        basic_info = self._parse_table_to_dict(
            sections.get("Basic Information", "")
        )

        # Parse Contact Details
        contact = self._parse_table_to_dict(
            sections.get("Contact Details", "")
        )

        # Parse Matric Results
        matric_subjects = self._parse_matric_subjects(
            sections.get("Academic Profile", "")
        )

        # Extract APS Score
        aps_match = re.search(
            r"\*\*Total APS Score\*\*:\s*(\d+)",
            sections.get("Academic Profile", "")
        )
        total_aps = int(aps_match.group(1)) if aps_match else None

        # Parse Academic Highlights
        highlights = self._parse_list_items(
            sections.get("Academic Profile", ""),
            "Academic Highlights"
        )

        # Parse Application Preferences
        first_choice = self._parse_course_choice(
            sections.get("Application Preferences", ""),
            "First Choice"
        )
        second_choice = self._parse_course_choice(
            sections.get("Application Preferences", ""),
            "Second Choice"
        )

        # Parse Financial Information
        financial = self._parse_table_to_dict(
            sections.get("Financial Information", "")
        )

        # Parse Documents Available
        docs_available, docs_missing = self._parse_documents(
            sections.get("Documents Available", "")
        )

        # Parse Testing Scenarios
        expected_behaviors = self._parse_expected_behaviors(
            sections.get("Testing Scenarios", "")
        )
        edge_cases = self._parse_list_items(
            sections.get("Testing Scenarios", ""),
            "Edge Cases to Test"
        )

        # Parse Notes
        notes = self._parse_notes(sections.get("Notes", ""))

        return ProspectProfile(
            profile_id=basic_info.get("Profile ID", "unknown"),
            name=basic_info.get("Name", ""),
            id_number=basic_info.get("ID Number", ""),
            date_of_birth=basic_info.get("Date of Birth", ""),
            gender=basic_info.get("Gender", ""),
            home_language=basic_info.get("Home Language", ""),
            province=basic_info.get("Province", ""),
            citizenship=basic_info.get("Citizenship", ""),
            mobile=contact.get("Mobile", ""),
            email=contact.get("Email", ""),
            whatsapp=contact.get("WhatsApp", ""),
            physical_address=contact.get("Physical Address", ""),
            matric_subjects=matric_subjects,
            total_aps_score=total_aps,
            academic_highlights=highlights,
            first_choice=first_choice,
            second_choice=second_choice,
            nsfas_eligible=self._parse_bool(financial.get("NSFAS Eligible", "No")),
            household_income=financial.get("Household Income"),
            sassa_grant_recipient=self._parse_bool(
                financial.get("SASSA Grant Recipient", "No")
            ),
            disability_grant=self._parse_bool(
                financial.get("Disability Grant", "No")
            ),
            parent_guardian_employment=financial.get("Parent/Guardian Employment"),
            documents_available=docs_available,
            documents_missing=docs_missing,
            expected_behaviors=expected_behaviors,
            edge_cases=edge_cases,
            notes=notes,
        )

    def _split_sections(self, content: str) -> Dict[str, str]:
        """Split markdown content into sections by ## headers."""
        sections = {}
        current_section = "Header"
        current_content = []

        for line in content.split("\n"):
            if line.startswith("## "):
                if current_content:
                    sections[current_section] = "\n".join(current_content)
                current_section = line[3:].strip()
                current_content = []
            else:
                current_content.append(line)

        # Don't forget the last section
        if current_content:
            sections[current_section] = "\n".join(current_content)

        return sections

    def _parse_table_to_dict(self, content: str) -> Dict[str, str]:
        """Parse a markdown table into a dictionary."""
        result = {}

        # Match table rows: | **Key** | Value |
        pattern = r"\|\s*\*\*([^*]+)\*\*\s*\|\s*([^|]+)\s*\|"

        for match in re.finditer(pattern, content):
            key = match.group(1).strip()
            value = match.group(2).strip()
            result[key] = value

        return result

    def _parse_matric_subjects(self, content: str) -> List[MatricSubject]:
        """Parse matric subjects from the Academic Profile section."""
        subjects = []

        # Find the Matric Results table
        # Pattern: | Subject | Level | Mark | APS Points |
        pattern = r"\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*(\d+)%\s*\|\s*([^|]*)\s*\|"

        for match in re.finditer(pattern, content):
            name = match.group(1).strip()
            level = match.group(2).strip()
            mark = int(match.group(3))
            aps_str = match.group(4).strip()

            # Skip header row
            if name.lower() == "subject":
                continue

            aps_points = int(aps_str) if aps_str and aps_str != "-" else None

            subjects.append(MatricSubject(
                name=name,
                level=level,
                mark=mark,
                aps_points=aps_points
            ))

        return subjects

    def _parse_course_choice(
        self,
        content: str,
        choice_type: str
    ) -> Optional[CourseChoice]:
        """Parse a course choice section."""

        # Find the specific choice section
        pattern = rf"### {choice_type}\s*\n(.*?)(?=###|\Z)"
        match = re.search(pattern, content, re.DOTALL)

        if not match:
            return None

        section = match.group(1)
        data = self._parse_table_to_dict(section)

        if not data:
            return None

        min_aps = data.get("Minimum APS")

        return CourseChoice(
            institution=data.get("Institution", ""),
            faculty=data.get("Faculty", ""),
            programme=data.get("Programme", ""),
            minimum_aps=int(min_aps) if min_aps else None,
            specific_requirements=data.get("Specific Requirements"),
        )

    def _parse_documents(self, content: str) -> tuple[List[str], List[str]]:
        """Parse documents checklist into available and missing lists."""
        available = []
        missing = []

        # Match checklist items: - [x] or - [ ]
        for match in re.finditer(r"-\s*\[([ x])\]\s*(.+)", content):
            checked = match.group(1) == "x"
            doc_name = match.group(2).strip()

            if checked:
                available.append(doc_name)
            else:
                missing.append(doc_name)

        return available, missing

    def _parse_expected_behaviors(self, content: str) -> Dict[str, str]:
        """Parse expected agent behaviors from Testing Scenarios."""
        behaviors = {}

        # Find the Expected Agent Behaviors section
        pattern = r"### Expected Agent Behaviors\s*\n(.*?)(?=###|\Z)"
        match = re.search(pattern, content, re.DOTALL)

        if not match:
            return behaviors

        section = match.group(1)

        # Parse numbered list: 1. **agent_name**: behavior
        for match in re.finditer(
            r"\d+\.\s*\*\*([^*]+)\*\*:\s*(.+)",
            section
        ):
            agent = match.group(1).strip()
            behavior = match.group(2).strip()
            behaviors[agent] = behavior

        return behaviors

    def _parse_list_items(
        self,
        content: str,
        header: str
    ) -> List[str]:
        """Parse list items under a specific header."""
        items = []

        # Find section
        pattern = rf"### {header}\s*\n(.*?)(?=###|\Z)"
        match = re.search(pattern, content, re.DOTALL)

        if not match:
            # Try with different header levels
            pattern = rf"#+\s*{header}\s*\n(.*?)(?=#+|\Z)"
            match = re.search(pattern, content, re.DOTALL)

        if not match:
            return items

        section = match.group(1)

        # Parse list items: - item or * item or numbered
        for match in re.finditer(r"[-*]\s+(.+)|^\d+\.\s+(.+)", section, re.MULTILINE):
            item = match.group(1) or match.group(2)
            if item:
                items.append(item.strip())

        return items

    def _parse_notes(self, content: str) -> List[str]:
        """Parse notes section into a list."""
        notes = []

        for match in re.finditer(r"[-*]\s+(.+)", content):
            notes.append(match.group(1).strip())

        return notes

    def _parse_bool(self, value: str) -> bool:
        """Parse a boolean value from text."""
        return value.lower() in ("yes", "true", "1", "x")

    def to_crew_inputs(self, profile: ProspectProfile) -> Dict[str, Any]:
        """
        Convert a ProspectProfile to crew kickoff inputs.

        Returns a dictionary suitable for `crew.kickoff(inputs=...)`.
        """
        # Build matric results dict
        matric_results = {}
        for subject in profile.matric_subjects:
            matric_results[subject.name] = {
                "level": subject.level,
                "mark": subject.mark,
                "aps_points": subject.aps_points,
            }

        # Build course choices list
        course_choices = []
        if profile.first_choice:
            course_choices.append({
                "priority": 1,
                "institution": profile.first_choice.institution,
                "faculty": profile.first_choice.faculty,
                "programme": profile.first_choice.programme,
                "minimum_aps": profile.first_choice.minimum_aps,
                "requirements": profile.first_choice.specific_requirements,
            })
        if profile.second_choice:
            course_choices.append({
                "priority": 2,
                "institution": profile.second_choice.institution,
                "faculty": profile.second_choice.faculty,
                "programme": profile.second_choice.programme,
                "minimum_aps": profile.second_choice.minimum_aps,
                "requirements": profile.second_choice.specific_requirements,
            })

        return {
            # Identity
            "profile_id": profile.profile_id,
            "full_name": profile.name,
            "id_number": profile.id_number,
            "date_of_birth": profile.date_of_birth,
            "gender": profile.gender,
            "home_language": profile.home_language,
            "province": profile.province,
            "citizenship": profile.citizenship,

            # Contact
            "mobile_number": profile.mobile,
            "email": profile.email,
            "whatsapp_number": profile.whatsapp,
            "physical_address": profile.physical_address,

            # Academic
            "matric_results": matric_results,
            "total_aps_score": profile.total_aps_score,
            "academic_highlights": profile.academic_highlights,

            # Course Selection
            "course_choices": course_choices,
            "primary_institution": (
                profile.first_choice.institution if profile.first_choice else None
            ),

            # Financial
            "nsfas_eligible": profile.nsfas_eligible,
            "household_income": profile.household_income,
            "sassa_recipient": profile.sassa_grant_recipient,
            "disability_grant": profile.disability_grant,
            "guardian_employment": profile.parent_guardian_employment,

            # Documents
            "documents_available": profile.documents_available,
            "documents_missing": profile.documents_missing,
        }


def parse_profile(profile_id: str) -> Dict[str, Any]:
    """
    Convenience function to parse a profile and return crew inputs.

    Args:
        profile_id: Profile identifier (e.g., "profile_001")

    Returns:
        Dictionary suitable for crew.kickoff(inputs=...)
    """
    parser = ProfileParser()
    profile = parser.parse_profile(profile_id)
    return parser.to_crew_inputs(profile)


if __name__ == "__main__":
    # Test the parser
    import json

    parser = ProfileParser()
    profile = parser.parse_profile("profile_001")

    print(f"Parsed profile: {profile.profile_id}")
    print(f"Name: {profile.name}")
    print(f"APS Score: {profile.total_aps_score}")
    print(f"First Choice: {profile.first_choice}")
    print(f"NSFAS Eligible: {profile.nsfas_eligible}")

    # Convert to crew inputs
    inputs = parser.to_crew_inputs(profile)
    print("\nCrew Inputs:")
    print(json.dumps(inputs, indent=2, default=str))
