"""
Scanner Crew for AI Website Analysis

This crew analyzes scraped HTML content from institution websites
and extracts structured academic data (campuses, faculties, courses).

Uses DeepSeek v3.2 via LiteLLM for all agent LLMs.
"""

import os
import yaml
from pathlib import Path
from typing import List, Dict, Any, Optional
import json

from crewai import Agent, Task, Crew, Process, LLM
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import custom tools
from .tools.html_parser_tool import html_parser_tool
from .tools.content_classifier_tool import content_classifier_tool, extract_academic_entities
from .tools.data_normalizer_tool import data_normalizer_tool

# Import observability
from .observability import (
    setup_observability,
    trace_span,
    log_scan_start,
    log_page_analysis,
    log_extraction_result,
    log_scan_complete,
)

# ============================================================================
# DeepSeek LLM Configuration
# ============================================================================

def get_deepseek_llm() -> LLM:
    """
    Configure DeepSeek v3.2 LLM via LiteLLM.

    DeepSeek is OpenAI-compatible, so we use the litellm provider format.
    """
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY environment variable is required")

    return LLM(
        model="deepseek/deepseek-chat",  # DeepSeek v3.2
        api_key=api_key,
        base_url="https://api.deepseek.com/v1",
        temperature=0.1,  # Low temp for structured extraction
        max_tokens=2048,  # Reduced for faster structured extraction
    )


# Singleton instance for reuse
_deepseek_llm: Optional[LLM] = None

def get_llm() -> LLM:
    """Get or create the DeepSeek LLM instance."""
    global _deepseek_llm
    if _deepseek_llm is None:
        _deepseek_llm = get_deepseek_llm()
    return _deepseek_llm


class ScannerCrew:
    """
    Crew for analyzing scraped web pages and extracting academic data.

    This is a simplified crew that processes pre-scraped HTML content,
    unlike the main OneForAllCrew which handles the full application workflow.

    Uses DeepSeek v3.2 for all agent LLMs with Phoenix observability.
    """

    def __init__(self, enable_observability: bool = True):
        """
        Initialize the scanner crew.

        Args:
            enable_observability: If True, initialize Phoenix tracing
        """
        self.config_dir = Path(__file__).parent / "config"
        self.agents_config = self._load_config("scanner_agents.yaml")
        self.tasks_config = self._load_config("scanner_tasks.yaml")

        # Initialize observability
        if enable_observability:
            setup_observability()

    def _load_config(self, filename: str) -> dict:
        """Load YAML configuration file."""
        config_path = self.config_dir / filename
        if config_path.exists():
            with open(config_path, "r") as f:
                return yaml.safe_load(f) or {}
        return {}

    def _create_agent(self, name: str) -> Agent:
        """Create an agent from config with DeepSeek LLM."""
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
            llm=get_llm(),  # Use DeepSeek v3.2
            verbose=True,
            allow_delegation=False,
        )

    def _preprocess_html(self, html: str) -> Dict[str, Any]:
        """
        Pre-process HTML to extract only relevant content.

        Reduces 50KB of raw HTML to ~3KB of structured data.
        """
        from bs4 import BeautifulSoup
        import re

        try:
            soup = BeautifulSoup(html, "html.parser")

            # Remove script, style, nav, footer elements
            for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
                element.decompose()

            result = {}

            # Extract title
            title_tag = soup.find("title")
            result["title"] = title_tag.get_text(strip=True) if title_tag else ""

            # Extract meta description
            meta_desc = soup.find("meta", {"name": "description"})
            result["description"] = meta_desc.get("content", "") if meta_desc else ""

            # Extract headings (h1-h3 only, limit to 20)
            headings = []
            for tag in ["h1", "h2", "h3"]:
                for heading in soup.find_all(tag)[:10]:
                    text = heading.get_text(strip=True)
                    if text and len(text) < 200:
                        headings.append(f"{tag}: {text}")
            result["headings"] = headings[:20]

            # Extract main text content (limit to 2000 chars)
            text = soup.get_text(separator=" ", strip=True)
            text = re.sub(r"\s+", " ", text)
            result["text_summary"] = text[:2000]

            # Extract academic-related links (limit to 30)
            links = []
            academic_patterns = r"faculty|school|department|course|programme|program|degree|campus|admission"
            for a in soup.find_all("a", href=True)[:100]:
                href = a.get("href", "")
                link_text = a.get_text(strip=True)
                combined = f"{href} {link_text}".lower()
                if re.search(academic_patterns, combined):
                    links.append(f"{link_text} -> {href}")
            result["academic_links"] = links[:30]

            return result

        except Exception as e:
            return {"error": str(e), "text_summary": html[:1000]}

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
        # Pre-process HTML to reduce token count (50KB -> ~3KB)
        parsed = self._preprocess_html(html)

        # Format as compact string for LLM
        parsed_content = f"""
Title: {parsed.get('title', 'Unknown')}
Description: {parsed.get('description', '')[:200]}

Headings:
{chr(10).join(parsed.get('headings', [])[:15])}

Academic Links:
{chr(10).join(parsed.get('academic_links', [])[:20])}

Content Summary:
{parsed.get('text_summary', '')[:1500]}
"""

        # Create single agent for combined analysis
        content_analyzer = self._create_agent("content_analyzer_agent")

        # Combined analysis + extraction task (single LLM call)
        analyze_extract_task = Task(
            description=f"""
            Analyze this academic webpage and extract structured data.

            URL: {url}
            Institution ID: {institution_id}

            PRE-PROCESSED PAGE CONTENT:
            {parsed_content}

            INSTRUCTIONS:
            1. Determine page type: campus, faculty, course, or homepage
            2. Extract relevant academic entities based on type:
               - Campus: name, code, location, address
               - Faculty/School: name, code, description, departments
               - Course/Program: name, code, description, duration, requirements
            3. Assign confidence score (0.0-1.0) based on data quality

            Return a single JSON object with the extracted data.
            """,
            expected_output="""
            JSON object:
            {
                "page_type": "campus|faculty|course|homepage|unknown",
                "confidence": 0.0-1.0,
                "campus": {"name": "...", "code": "...", "location": "..."} or null,
                "faculty": {"name": "...", "code": "...", "description": "..."} or null,
                "course": {"name": "...", "code": "...", "description": "...", "duration": "..."} or null,
                "source_url": "..."
            }
            """,
            agent=content_analyzer,
        )

        # Create and run crew with single task
        crew = Crew(
            agents=[content_analyzer],
            tasks=[analyze_extract_task],
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
        website_url: str = "",
    ) -> Dict[str, Any]:
        """
        Analyze multiple pages and combine results.

        Args:
            pages: List of {"url": "...", "html": "..."} dicts
            institution_id: The institution ID
            website_url: The base website URL (for logging)

        Returns:
            Combined results with campuses, faculties, and courses
        """
        import time
        start_time = time.time()

        # Log scan start
        log_scan_start(institution_id, website_url or "unknown")

        results = {
            "institution_id": institution_id,
            "campuses": [],
            "faculties": [],
            "courses": [],
            "errors": [],
        }

        with trace_span("analyze_pages", {
            "institution_id": institution_id,
            "page_count": len(pages),
        }):
            for page in pages:
                url = page.get("url", "")
                html = page.get("html", "")

                if not html:
                    continue

                try:
                    with trace_span("analyze_single_page", {"url": url}):
                        page_result = self.analyze_page(html, url, institution_id)

                    # Log page analysis result
                    log_page_analysis(
                        url,
                        page_result.get("page_type", "unknown"),
                        page_result.get("confidence", 0.0),
                    )

                    if page_result.get("campus"):
                        results["campuses"].append(page_result["campus"])
                        log_extraction_result(
                            "campus",
                            page_result["campus"].get("name", "Unknown"),
                            url,
                            page_result["campus"].get("confidence", 0.0),
                        )

                    if page_result.get("faculty"):
                        results["faculties"].append(page_result["faculty"])
                        log_extraction_result(
                            "faculty",
                            page_result["faculty"].get("name", "Unknown"),
                            url,
                            page_result["faculty"].get("confidence", 0.0),
                        )

                    if page_result.get("course"):
                        results["courses"].append(page_result["course"])
                        log_extraction_result(
                            "course",
                            page_result["course"].get("name", "Unknown"),
                            url,
                            page_result["course"].get("confidence", 0.0),
                        )

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

        # Log scan completion
        duration_ms = int((time.time() - start_time) * 1000)
        campus_count = len(results.get("campuses", []))
        faculty_count = sum(
            len(c.get("faculties", []))
            for c in results.get("campuses", [])
        )
        course_count = sum(
            len(f.get("courses", []))
            for c in results.get("campuses", [])
            for f in c.get("faculties", [])
        )

        log_scan_complete(
            institution_id,
            campus_count,
            faculty_count,
            course_count,
            duration_ms,
        )

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
    website_url: str = "",
) -> Dict[str, Any]:
    """
    Entry point for analyzing scraped pages.

    This function is called from the Next.js API routes via HTTP.

    Args:
        pages: List of scraped pages with url and html
        institution_id: The institution ID
        website_url: The base website URL for logging

    Returns:
        Structured results ready for database insertion
    """
    crew = ScannerCrew()
    return crew.analyze_pages(pages, institution_id, website_url)


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
            website_url=data.get("website_url", ""),
        )

        print(json.dumps(result, indent=2))
    else:
        print("Usage: echo '{pages: [...], institution_id: \"...\"}' | python scanner_crew.py")
