from langchain_community.tools import WebsiteSearchTool
from crewai_tools import tool

# This tool internally handles HTTP; no need to wrap async here.
website_search_tool = WebsiteSearchTool()
