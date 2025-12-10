"""
Scanner Crew for AI Website Analysis

This crew analyzes scraped HTML content from institution websites
and extracts structured academic data (campuses, faculties, courses).
"""

import os
import yaml
from pathlib import Path
from typing import List, Dict, Any, Optional
import json

from crewai import Agent, Task, Crew, Process
from crewai_tools import tool

# Import custom tools
from .tools.html_parser_tool import html_parser_tool
from .tools.content_classifier_tool import content_classifier_tool, extract_academic_entities
from .tools.data_normalizer_tool import data_normalizer_tool


class ScannerCrew:
    """
    Crew for analyzing scraped web pages and extracting academic data.

    This is a simplified crew that processes pre-scraped HTML content,
    unlike the main OneForAllCrew which handles the full application workflow.
    """

    def __init__(self):
        self.config_dir = Path(__file__).parent / "config"
        self.agents_config = self._load_config("scanner_agents.yaml")
        self.tasks_config = self._load_config("scanner_tasks.yaml")

    def _load_config(self, filename: str) -> dict:
        """Load YAML configuration file."""
        config_path = self.config_dir / filename
        if config_path.exists():
            with open(config_path, "r") as f:
                return yaml.safe_load(f) or {}
        return {}

    def _create_agent(self, name: str) -> Agent:
        """Create an agent from config."""
        config = self.agents_config.get(name, {})

        # Map tool names to actual tools
        tool_mapping = {
            "html_parser_tool": html_parser_tool,
            "content_classifier_tool": content_classifier_tool,
            "data_normalizer_tool": data_normalizer_tool,
            "extract_academic_entities": extract_academic_entities,
        }

        tools = [
            tool_mapping[t]
            for t in config.get("tools", [])
            if t in tool_mapping
        ]

        return Agent(
            role=config.get("role", name),
            goal=config.get("goal", ""),
            backstory=config.get("backstory", ""),
            tools=tools,
            verbose=True,
            allow_delegation=False,
        )

    def analyze_page(
        self,
        html: str,
        url: str,
        institution_id: str,
    ) -> Dict[str, Any]:
        """
        Analyze a single page and extract academic data.

        Args:
            html: The raw HTML content
            url: The page URL
            institution_id: The institution ID for context

        Returns:
            Dictionary with extracted data (campus, faculty, course, or none)
        """
        # Create agents
        content_analyzer = self._create_agent("content_analyzer_agent")
        data_structurer = self._create_agent("data_structurer_agent")

        # First, classify the page and extract basic content
        classification_task = Task(
            description=f"""
            Analyze the HTML content from {url} and determine:
            1. What type of academic page is this (campus, faculty, course, etc.)?
            2. What are the main headings and structure?
            3. What academic entities can be extracted?

            Use the html_parser_tool to parse the HTML and content_classifier_tool
            to determine the page type.

            HTML content (first 50000 chars):
            {html[:50000]}
            """,
            expected_output="""
            JSON with page classification and key extracted information:
            {
                "page_type": "campus|faculty|course|unknown",
                "confidence": 0.0-1.0,
                "main_title": "...",
                "key_sections": [...],
                "suggested_extraction": "campus|faculty|course|none"
            }
            """,
            agent=content_analyzer,
        )

        # Based on classification, extract specific data
        extraction_task = Task(
            description=f"""
            Based on the page classification, extract the relevant academic data.

            URL: {url}
            Institution ID: {institution_id}

            If the page is a campus page, extract:
            - Campus name, code, location, address
            - List of faculties mentioned

            If the page is a faculty page, extract:
            - Faculty name, code, description
            - List of courses/programs mentioned

            If the page is a course/program page, extract:
            - Course name, code, description
            - Duration, requirements (APS, subjects)
            - Career information

            Use the data_normalizer_tool to validate and normalize the extracted data.

            Return the normalized data ready for database insertion.
            """,
            expected_output="""
            JSON with extracted and normalized data:
            {
                "page_type": "...",
                "campus": {normalized campus data or null},
                "faculty": {normalized faculty data or null},
                "course": {normalized course data or null},
                "confidence": 0.0-1.0,
                "source_url": "..."
            }
            """,
            agent=data_structurer,
            context=[classification_task],
        )

        # Create and run crew
        crew = Crew(
            agents=[content_analyzer, data_structurer],
            tasks=[classification_task, extraction_task],
            process=Process.sequential,
            verbose=True,
        )

        try:
            result = crew.kickoff()

            # Parse the result
            if hasattr(result, "raw"):
                result_text = result.raw
            else:
                result_text = str(result)

            # Try to extract JSON from result
            extracted_data = self._parse_json_from_result(result_text)
            extracted_data["source_url"] = url

            return extracted_data

        except Exception as e:
            return {
                "error": str(e),
                "page_type": "error",
                "source_url": url,
            }

    def analyze_pages(
        self,
        pages: List[Dict[str, str]],
        institution_id: str,
    ) -> Dict[str, Any]:
        """
        Analyze multiple pages and combine results.

        Args:
            pages: List of {"url": "...", "html": "..."} dicts
            institution_id: The institution ID

        Returns:
            Combined results with campuses, faculties, and courses
        """
        results = {
            "institution_id": institution_id,
            "campuses": [],
            "faculties": [],
            "courses": [],
            "errors": [],
        }

        for page in pages:
            url = page.get("url", "")
            html = page.get("html", "")

            if not html:
                continue

            try:
                page_result = self.analyze_page(html, url, institution_id)

                if page_result.get("campus"):
                    results["campuses"].append(page_result["campus"])

                if page_result.get("faculty"):
                    results["faculties"].append(page_result["faculty"])

                if page_result.get("course"):
                    results["courses"].append(page_result["course"])

                if page_result.get("error"):
                    results["errors"].append({
                        "url": url,
                        "error": page_result["error"],
                    })

            except Exception as e:
                results["errors"].append({
                    "url": url,
                    "error": str(e),
                })

        # Deduplicate and structure results
        results = self._structure_results(results)

        return results

    def _parse_json_from_result(self, result_text: str) -> Dict[str, Any]:
        """Extract JSON from crew result text."""
        # Try to find JSON in the result
        import re

        # Look for JSON block
        json_match = re.search(r"\{[\s\S]*\}", result_text)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        # Return empty result if no JSON found
        return {
            "page_type": "unknown",
            "raw_output": result_text[:1000],
        }

    def _structure_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Structure and deduplicate results into hierarchy."""
        # Create main campus if none found
        if not results["campuses"] and (results["faculties"] or results["courses"]):
            results["campuses"] = [{
                "id": f"campus_main_{results['institution_id'][:8]}",
                "name": "Main Campus",
                "code": "MAIN",
                "location": None,
                "confidence": 0.5,
                "source_url": "",
                "faculties": [],
            }]

        # Assign faculties to campuses
        if results["campuses"]:
            main_campus = results["campuses"][0]
            main_campus["faculties"] = results["faculties"]

            # Assign courses to faculties
            for faculty in main_campus["faculties"]:
                if not faculty.get("courses"):
                    faculty["courses"] = []

            # If we have courses but no faculties, create a general faculty
            if results["courses"] and not main_campus["faculties"]:
                main_campus["faculties"] = [{
                    "id": f"faculty_general_{results['institution_id'][:8]}",
                    "name": "General Programs",
                    "code": "GEN",
                    "description": "Programs extracted from website",
                    "confidence": 0.3,
                    "source_url": "",
                    "courses": results["courses"],
                }]
            elif results["courses"] and main_campus["faculties"]:
                # Add courses to first faculty if not already assigned
                main_campus["faculties"][0]["courses"] = results["courses"]

        # Clean up intermediate lists
        del results["faculties"]
        del results["courses"]

        return results


# ============================================================================
# HTTP API for Dashboard Integration
# ============================================================================

def analyze_scraped_pages(
    pages: List[Dict[str, str]],
    institution_id: str,
) -> Dict[str, Any]:
    """
    Entry point for analyzing scraped pages.

    This function is called from the Next.js API routes via HTTP.

    Args:
        pages: List of scraped pages with url and html
        institution_id: The institution ID

    Returns:
        Structured results ready for database insertion
    """
    crew = ScannerCrew()
    return crew.analyze_pages(pages, institution_id)


if __name__ == "__main__":
    # Test with sample data
    import sys

    if len(sys.argv) > 1:
        # Read input from stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data)

        result = analyze_scraped_pages(
            pages=data.get("pages", []),
            institution_id=data.get("institution_id", "test"),
        )

        print(json.dumps(result, indent=2))
    else:
        print("Usage: echo '{pages: [...], institution_id: \"...\"}' | python scanner_crew.py")
