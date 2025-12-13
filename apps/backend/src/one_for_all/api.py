"""
FastAPI server for Scanner Crew API.

Exposes the CrewAI scanner agents via HTTP with CORS support
for integration with the Next.js dashboard.

Run with:
    uvicorn src.one_for_all.api:app --reload --host 0.0.0.0 --port 8000
"""

import os
import logging
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from .scanner_crew import analyze_scraped_pages
from .observability import setup_observability, get_phoenix_url

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize observability (Phoenix tracing)
logger.info("Initializing Phoenix observability...")
setup_observability()

app = FastAPI(
    title="OneForAll Scanner API",
    description="AI-powered academic website scanner using CrewAI agents",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration - allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


# ============================================================================
# Request/Response Models
# ============================================================================

class ScrapedPage(BaseModel):
    """A single scraped page from the website."""
    url: str
    html: str


class ScanRequest(BaseModel):
    """Request to analyze scraped pages."""
    institution_id: str
    website_url: str
    pages: List[ScrapedPage]


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    phoenix_url: str | None
    deepseek_configured: bool


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.

    Returns status and Phoenix UI URL if available.
    """
    deepseek_key = os.getenv("DEEPSEEK_API_KEY")
    return HealthResponse(
        status="healthy",
        phoenix_url=get_phoenix_url(),
        deepseek_configured=bool(deepseek_key and len(deepseek_key) > 10),
    )


@app.post("/api/v1/analyze")
async def analyze_pages(request: ScanRequest) -> Dict[str, Any]:
    """
    Analyze scraped pages and extract academic data.

    Uses CrewAI agents with DeepSeek LLM to:
    1. Classify page types (campus, faculty, course)
    2. Extract structured data from each page
    3. Build hierarchical institution structure

    Args:
        request: ScanRequest with institution_id, website_url, and pages

    Returns:
        Structured results with campuses, faculties, courses, and errors
    """
    logger.info(f"Received scan request for {request.website_url}")
    logger.info(f"Processing {len(request.pages)} pages for institution {request.institution_id}")

    try:
        # Convert Pydantic models to dicts for scanner_crew
        pages = [{"url": p.url, "html": p.html} for p in request.pages]

        # Run CrewAI analysis
        results = analyze_scraped_pages(
            pages=pages,
            institution_id=request.institution_id,
            website_url=request.website_url,
        )

        logger.info(f"Analysis complete: {len(results.get('campuses', []))} campuses found")
        return results

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "OneForAll Scanner API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "src.one_for_all.api:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )
