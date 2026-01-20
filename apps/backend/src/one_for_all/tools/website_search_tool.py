"""
Website Search Tool

CrewAI tool for searching and scraping university websites for course information.

SECURITY: This tool implements SSRF protection to prevent access to internal
services, cloud metadata endpoints, and other sensitive resources. Only
allowlisted university domains are permitted.
"""

import asyncio
import aiohttp
import logging
from crewai.tools import tool

from one_for_all.utils.ssrf_protection import validate_website_url

logger = logging.getLogger(__name__)


@tool
def website_search_tool(url: str, query: str = "") -> str:
    """
    Search and scrape a university website for course information.

    Args:
        url: The URL of the university page to scrape
        query: Optional search query to filter content

    Returns:
        Extracted text content from the webpage or error message
    """
    async def async_fetch():
        try:
            # SSRF Protection - validate URL before fetching
            validation = validate_website_url(url)
            if not validation:
                logger.warning(f"SSRF blocked URL: {url} - {validation.reason}")
                return f"ERROR: URL blocked for security reasons - {validation.reason}"

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=30) as resp:
                    if resp.status != 200:
                        return f"ERROR: Failed to fetch {url} - Status {resp.status}"

                    html = await resp.text()

                    # Basic HTML text extraction
                    import re
                    # Remove script and style elements
                    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
                    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
                    # Remove HTML tags
                    text = re.sub(r'<[^>]+>', ' ', html)
                    # Clean up whitespace
                    text = re.sub(r'\s+', ' ', text).strip()

                    # Truncate if too long
                    if len(text) > 5000:
                        text = text[:5000] + "... [truncated]"

                    if query:
                        # Filter to paragraphs containing the query
                        sentences = text.split('.')
                        relevant = [s for s in sentences if query.lower() in s.lower()]
                        if relevant:
                            text = '. '.join(relevant[:10])

                    return f"Content from {url}:\n{text}"

        except asyncio.TimeoutError:
            return f"ERROR: Timeout fetching {url}"
        except Exception as e:
            return f"ERROR: Failed to fetch {url} - {str(e)}"

    return asyncio.run(async_fetch())
