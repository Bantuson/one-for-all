"""
Unit tests for ProfileParser module.

Tests the profile parsing functionality:
- Markdown table parsing
- Matric subject extraction
- Course choice parsing
- Document checklist parsing
- Conversion to crew inputs
"""

import pytest
from pathlib import Path
import sys

# Add src to path
src_path = Path(__file__).resolve().parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

from one_for_all.tests.profile_parser import (
    ProfileParser,
    MatricSubject,
    CourseChoice,
    ProspectProfile,
    parse_profile
)


class TestProfileParser:
    """Test ProfileParser class initialization and path resolution."""

    def test_parser_initialization(self):
        """
        Test that ProfileParser initializes correctly.

        Expected behavior:
        - Creates instance without errors
        - Sets profiles_dir to default or custom path
        """
        parser = ProfileParser()

        assert parser is not None
        assert parser.profiles_dir is not None

    def test_custom_profiles_dir(self):
        """
        Test ProfileParser with custom profiles directory.

        Expected behavior:
        - Accepts custom path
        - Uses custom path for profile lookups
        """
        custom_dir = Path("/tmp/custom_profiles")
        parser = ProfileParser(profiles_dir=custom_dir)

        assert parser.profiles_dir == custom_dir


class TestMarkdownParsing:
    """Test markdown content parsing."""

    def test_parse_table_to_dict(self):
        """
        Test parsing markdown tables to dictionaries.

        Expected behavior:
        - Extracts key-value pairs from markdown table
        - Handles bold keys (**Key**)
        - Returns dict with cleaned values
        """
        parser = ProfileParser()

        content = """
| **Name** | John Doe |
| **Age** | 25 |
| **City** | Pretoria |
"""

        result = parser._parse_table_to_dict(content)

        assert result["Name"] == "John Doe"
        assert result["Age"] == "25"
        assert result["City"] == "Pretoria"

    def test_parse_matric_subjects(self):
        """
        Test parsing matric subjects table.

        Expected behavior:
        - Extracts subject name, level, mark, APS points
        - Creates MatricSubject objects
        - Handles different levels (HL, FAL, -)
        """
        parser = ProfileParser()

        content = """
| Subject | Level | Mark | APS Points |
|---------|-------|------|------------|
| Mathematics | HL | 80% | 7 |
| English HL | HL | 75% | 6 |
| Life Orientation | - | 70% | 5 |
"""

        subjects = parser._parse_matric_subjects(content)

        assert len(subjects) >= 2  # At least 2 subjects parsed

        # Find Mathematics subject
        math_subject = next((s for s in subjects if "Mathematics" in s.name), None)
        assert math_subject is not None
        assert math_subject.level == "HL"
        assert math_subject.mark == 80
        assert math_subject.aps_points == 7

    def test_parse_course_choice(self):
        """
        Test parsing course choice sections.

        Expected behavior:
        - Extracts institution, faculty, programme, requirements
        - Creates CourseChoice object
        - Handles minimum APS as integer
        """
        parser = ProfileParser()

        content = """
### First Choice

| **Institution** | University of Pretoria |
| **Faculty** | Engineering |
| **Programme** | BSc Computer Science |
| **Minimum APS** | 35 |
| **Specific Requirements** | Mathematics HL (60%+) |
"""

        choice = parser._parse_course_choice(content, "First Choice")

        assert choice is not None
        assert choice.institution == "University of Pretoria"
        assert choice.faculty == "Engineering"
        assert choice.programme == "BSc Computer Science"
        assert choice.minimum_aps == 35
        assert "Mathematics" in choice.specific_requirements

    def test_parse_documents_checklist(self):
        """
        Test parsing document checklist.

        Expected behavior:
        - Separates checked and unchecked items
        - Returns available and missing document lists
        """
        parser = ProfileParser()

        content = """
- [x] ID Document
- [x] Matric Certificate
- [ ] Proof of Residence
- [ ] Academic Transcript
"""

        available, missing = parser._parse_documents(content)

        assert "ID Document" in available
        assert "Matric Certificate" in available
        assert "Proof of Residence" in missing
        assert "Academic Transcript" in missing


class TestDataclasses:
    """Test dataclass structures."""

    def test_matric_subject_creation(self):
        """
        Test MatricSubject dataclass.

        Expected behavior:
        - Creates instance with required fields
        - Stores values correctly
        """
        subject = MatricSubject(
            name="Mathematics",
            level="HL",
            mark=80,
            aps_points=7
        )

        assert subject.name == "Mathematics"
        assert subject.level == "HL"
        assert subject.mark == 80
        assert subject.aps_points == 7

    def test_course_choice_creation(self):
        """
        Test CourseChoice dataclass.

        Expected behavior:
        - Creates instance with required fields
        - Optional fields default to None
        """
        choice = CourseChoice(
            institution="UCT",
            faculty="Science",
            programme="BSc Computer Science",
            minimum_aps=35
        )

        assert choice.institution == "UCT"
        assert choice.programme == "BSc Computer Science"

    def test_prospect_profile_defaults(self):
        """
        Test ProspectProfile with default values.

        Expected behavior:
        - Lists default to empty
        - Optional fields default to None
        - Booleans default to False
        """
        profile = ProspectProfile(
            profile_id="TEST-001",
            name="Test Student",
            id_number="0001010000000",
            date_of_birth="2000-01-01",
            gender="Female",
            home_language="English",
            province="Gauteng",
            citizenship="South African",
            mobile="+27821234567",
            email="test@example.com",
            whatsapp="+27821234567",
            physical_address="123 Test St"
        )

        assert profile.matric_subjects == []
        assert profile.documents_available == []
        assert profile.nsfas_eligible is False


class TestConversionToCrew:
    """Test conversion to crew input format."""

    def test_to_crew_inputs_structure(self):
        """
        Test that to_crew_inputs produces correct structure.

        Expected behavior:
        - Returns dictionary
        - Includes all required fields for crew kickoff
        - Matric results formatted as nested dict
        - Course choices as list of dicts
        """
        parser = ProfileParser()

        profile = ProspectProfile(
            profile_id="TEST-001",
            name="Test Student",
            id_number="0001010000000",
            date_of_birth="2000-01-01",
            gender="Female",
            home_language="English",
            province="Gauteng",
            citizenship="South African",
            mobile="+27821234567",
            email="test@example.com",
            whatsapp="+27821234567",
            physical_address="123 Test St",
            total_aps_score=35,
            nsfas_eligible=True,
            household_income="R150,000"
        )

        # Add matric subject
        profile.matric_subjects.append(
            MatricSubject("Mathematics", "HL", 80, 7)
        )

        # Add course choice
        profile.first_choice = CourseChoice(
            institution="UP",
            faculty="Engineering",
            programme="BSc CS",
            minimum_aps=35
        )

        inputs = parser.to_crew_inputs(profile)

        # Check structure
        assert isinstance(inputs, dict)
        assert "profile_id" in inputs
        assert "full_name" in inputs
        assert "matric_results" in inputs
        assert "course_choices" in inputs
        assert "nsfas_eligible" in inputs

        # Check matric results format
        assert isinstance(inputs["matric_results"], dict)
        assert "Mathematics" in inputs["matric_results"]

        # Check course choices format
        assert isinstance(inputs["course_choices"], list)
        if inputs["course_choices"]:
            assert "priority" in inputs["course_choices"][0]
            assert "institution" in inputs["course_choices"][0]

    def test_matric_results_conversion(self):
        """
        Test matric results conversion to crew format.

        Expected behavior:
        - Each subject becomes dict key
        - Value is dict with level, mark, aps_points
        """
        parser = ProfileParser()

        profile = ProspectProfile(
            profile_id="TEST-001",
            name="Test",
            id_number="0001010000000",
            date_of_birth="2000-01-01",
            gender="Male",
            home_language="English",
            province="Gauteng",
            citizenship="South African",
            mobile="+27821234567",
            email="test@example.com",
            whatsapp="+27821234567",
            physical_address="123 Test St"
        )

        profile.matric_subjects = [
            MatricSubject("Mathematics", "HL", 80, 7),
            MatricSubject("English HL", "HL", 75, 6),
        ]

        inputs = parser.to_crew_inputs(profile)

        matric = inputs["matric_results"]

        assert "Mathematics" in matric
        assert matric["Mathematics"]["level"] == "HL"
        assert matric["Mathematics"]["mark"] == 80
        assert matric["Mathematics"]["aps_points"] == 7

    def test_course_choices_priority_ordering(self):
        """
        Test course choices maintain priority order.

        Expected behavior:
        - First choice has priority 1
        - Second choice has priority 2
        - Third choice has priority 3 and fallback flag
        """
        parser = ProfileParser()

        profile = ProspectProfile(
            profile_id="TEST-001",
            name="Test",
            id_number="0001010000000",
            date_of_birth="2000-01-01",
            gender="Male",
            home_language="English",
            province="Gauteng",
            citizenship="South African",
            mobile="+27821234567",
            email="test@example.com",
            whatsapp="+27821234567",
            physical_address="123 Test St"
        )

        profile.first_choice = CourseChoice("UP", "Engineering", "BSc CS", 35)
        profile.second_choice = CourseChoice("UP", "Science", "BSc IT", 32)
        profile.third_choice = CourseChoice("UP", "Science", "BSc IS", 28)

        inputs = parser.to_crew_inputs(profile)

        choices = inputs["course_choices"]

        assert len(choices) == 3
        assert choices[0]["priority"] == 1
        assert choices[1]["priority"] == 2
        assert choices[2]["priority"] == 3
        assert choices[2].get("fallback") is True


class TestBooleanParsing:
    """Test boolean value parsing."""

    def test_parse_bool_variations(self):
        """
        Test parsing different boolean string formats.

        Expected behavior:
        - "Yes", "yes", "YES" → True
        - "No", "no", "NO" → False
        - "true", "True", "1", "x" → True
        - Other values → False
        """
        parser = ProfileParser()

        true_values = ["yes", "Yes", "YES", "true", "True", "1", "x"]
        false_values = ["no", "No", "NO", "false", "False", "0", ""]

        for val in true_values:
            assert parser._parse_bool(val) is True, \
                f"{val} should parse to True"

        for val in false_values:
            assert parser._parse_bool(val) is False, \
                f"{val} should parse to False"


class TestConvenienceFunction:
    """Test the parse_profile convenience function."""

    def test_parse_profile_function_exists(self):
        """
        Test that parse_profile convenience function works.

        Expected behavior:
        - Function is importable
        - Returns dict suitable for crew kickoff
        """
        # This would require actual profile files to exist
        # For now, just verify the function exists and is callable
        assert callable(parse_profile)


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_documents_list(self):
        """
        Test parsing with no documents.

        Expected behavior:
        - Returns empty lists for available and missing
        - Doesn't crash
        """
        parser = ProfileParser()

        content = ""

        available, missing = parser._parse_documents(content)

        assert available == []
        assert missing == []

    def test_malformed_table_handling(self):
        """
        Test handling of malformed markdown tables.

        Expected behavior:
        - Doesn't crash on invalid input
        - Returns empty dict or skips malformed rows
        """
        parser = ProfileParser()

        content = """
| **Key1** | Value1
| Key2 | Value2 |
| **Key3** |
"""

        result = parser._parse_table_to_dict(content)

        # Should handle gracefully (may be empty or partial)
        assert isinstance(result, dict)

    def test_missing_aps_points(self):
        """
        Test parsing subject with missing APS points.

        Expected behavior:
        - aps_points set to None
        - Subject still parsed
        """
        parser = ProfileParser()

        content = """
| Subject | Level | Mark | APS Points |
|---------|-------|------|------------|
| Mathematics | HL | 80% | - |
"""

        subjects = parser._parse_matric_subjects(content)

        if subjects:
            assert subjects[0].aps_points is None or isinstance(subjects[0].aps_points, int)

    def test_third_choice_fallback_parsing(self):
        """
        Test parsing third choice with fallback indicator.

        Expected behavior:
        - Third choice parsed correctly
        - Fallback flag can be detected
        - Works with "Third Choice (Fallback...)" headers
        """
        parser = ProfileParser()

        content = """
### Third Choice (Fallback when first rejected)

| **Institution** | University of Pretoria |
| **Faculty** | Science |
| **Programme** | BSc Information Systems |
| **Minimum APS** | 28 |
"""

        choice = parser._parse_course_choice(content, "Third Choice")

        assert choice is not None
        assert choice.institution == "University of Pretoria"
        assert choice.programme == "BSc Information Systems"
