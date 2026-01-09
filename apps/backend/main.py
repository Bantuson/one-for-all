"""
Entry point for Render deployment.

This script adds the src directory to Python path so the app can be
imported without installing the package via pip install -e .
"""
import sys
from pathlib import Path

# Add src directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from one_for_all.api.app import app  # noqa: E402

# Export for uvicorn
__all__ = ["app"]
