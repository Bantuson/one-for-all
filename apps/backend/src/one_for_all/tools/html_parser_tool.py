"""
HTML Parser Tool for CrewAI Scanner Agents

Parses HTML content and extracts structured information for academic content analysis.
"""

from crewai.tools import tool
from bs4 import BeautifulSoup
import re
import json
from typing import Optional


@tool
def html_parser_tool(html: str, extract_type: str = "all") -> str:
    """
    Parse HTML content and extract structured information.

    Args:
        html: Raw HTML content to parse
        extract_type: What to extract - "all", "text", "links", "headings", "tables"

    Returns:
        JSON string with extracted data
    """
    try:
        soup = BeautifulSoup(html, "html.parser")

        # Remove script and style elements
        for element in soup(["script", "style", "nav", "footer", "header"]):
            element.decompose()

        result = {}

        if extract_type in ["all", "text"]:
            # Extract main text content
            text = soup.get_text(separator=" ", strip=True)
            # Clean up excessive whitespace
            text = re.sub(r"\s+", " ", text)
            result["text"] = text[:10000]  # Limit to 10k chars

        if extract_type in ["all", "headings"]:
            # Extract headings
            headings = []
            for tag in ["h1", "h2", "h3", "h4"]:
                for heading in soup.find_all(tag):
                    text = heading.get_text(strip=True)
                    if text and len(text) < 500:
                        headings.append({"level": tag, "text": text})
            result["headings"] = headings[:50]  # Limit to 50 headings

        if extract_type in ["all", "links"]:
            # Extract internal links
            links = []
            for a in soup.find_all("a", href=True):
                href = a.get("href", "")
                text = a.get_text(strip=True)

                # Skip empty or external links
                if not href or href.startswith("javascript:") or href.startswith("mailto:"):
                    continue

                # Classify link based on URL patterns
                link_type = classify_link(href, text)

                if text and len(text) < 300:
                    links.append({
                        "href": href,
                        "text": text,
                        "type": link_type,
                    })
            result["links"] = links[:100]  # Limit to 100 links

        if extract_type in ["all", "tables"]:
            # Extract tables (often contain program/course info)
            tables = []
            for table in soup.find_all("table"):
                rows = []
                for tr in table.find_all("tr"):
                    cells = [
                        td.get_text(strip=True)
                        for td in tr.find_all(["td", "th"])
                    ]
                    if cells:
                        rows.append(cells)
                if rows:
                    tables.append(rows[:50])  # Limit rows per table
            result["tables"] = tables[:10]  # Limit to 10 tables

        # Extract meta information
        result["title"] = ""
        title_tag = soup.find("title")
        if title_tag:
            result["title"] = title_tag.get_text(strip=True)

        meta_desc = soup.find("meta", {"name": "description"})
        if meta_desc:
            result["description"] = meta_desc.get("content", "")

        # Extract breadcrumbs if present
        breadcrumbs = extract_breadcrumbs(soup)
        if breadcrumbs:
            result["breadcrumbs"] = breadcrumbs

        return json.dumps(result, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"error": str(e)})


def classify_link(href: str, text: str) -> str:
    """Classify a link based on its URL and text."""
    href_lower = href.lower()
    text_lower = text.lower()
    combined = f"{href_lower} {text_lower}"

    patterns = [
        (r"campus", "campus"),
        (r"facult", "faculty"),
        (r"school", "faculty"),
        (r"department|dept", "department"),
        (r"course|module", "course"),
        (r"programme|program|qualification", "program"),
        (r"degree|bachelor|master|diploma", "program"),
        (r"admission|apply|entry", "admission"),
        (r"undergraduate|postgraduate", "program_level"),
    ]

    for pattern, link_type in patterns:
        if re.search(pattern, combined):
            return link_type

    return "unknown"


def extract_breadcrumbs(soup: BeautifulSoup) -> list:
    """Extract breadcrumb navigation if present."""
    breadcrumbs = []

    # Try common breadcrumb patterns
    nav = soup.find("nav", {"aria-label": re.compile(r"breadcrumb", re.I)})
    if not nav:
        nav = soup.find(class_=re.compile(r"breadcrumb", re.I))

    if nav:
        for a in nav.find_all("a"):
            text = a.get_text(strip=True)
            if text and len(text) < 100:
                breadcrumbs.append(text)

    return breadcrumbs
