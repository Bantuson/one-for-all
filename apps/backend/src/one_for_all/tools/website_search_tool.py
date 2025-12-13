from langchain_community.tools import WebsiteSearchTool
from crewai.tools import tool

# This tool internally handles HTTP; no need to wrap async here.
website_search_tool = WebsiteSearchTool()
