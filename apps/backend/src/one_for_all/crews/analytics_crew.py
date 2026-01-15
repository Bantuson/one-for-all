"""
Analytics Crew

A specialized CrewAI crew for handling analytics queries and chart generation.
Converts natural language questions into SQL queries, executes them, and
generates Recharts-compatible visualizations.
"""

import json
import logging
from typing import Optional
from crewai import Agent, Crew, Process, Task

# Import analytics tools
from one_for_all.tools.analytics_queries import (
    generate_sql_query,
    execute_analytics_query,
    get_application_stats,
)
from one_for_all.tools.chart_config import (
    generate_bar_chart,
    generate_pie_chart,
    generate_line_chart,
    generate_area_chart,
    save_chart,
    get_saved_charts,
    toggle_chart_pin,
)

logger = logging.getLogger(__name__)


class AnalyticsCrew:
    """
    Analytics Crew for natural language analytics queries.

    This crew accepts natural language questions about application data
    and generates both SQL queries and Recharts visualizations.

    Workflow:
    1. Parse the natural language query
    2. Generate appropriate SQL query
    3. Execute the query
    4. Select appropriate chart type
    5. Generate chart configuration
    6. Optionally save the chart

    Example:
        crew = AnalyticsCrew(institution_id="123...")
        result = crew.run("Show acceptance rate by faculty")
    """

    def __init__(self, institution_id: str):
        """
        Initialize the Analytics Crew.

        Args:
            institution_id: UUID of the institution to scope analytics to
        """
        self.institution_id = institution_id
        self._agents = {}
        self._build_agents()

    def _build_agents(self):
        """Build the specialized analytics agents."""

        # SQL Generation Agent
        self._agents["sql_agent"] = Agent(
            role="Analytics SQL Specialist",
            goal=(
                "Convert natural language analytics questions into accurate, "
                "efficient SQL queries for the admissions database."
            ),
            backstory=(
                "You are an expert SQL developer specialized in analytics queries. "
                "You understand the admissions database schema deeply and can translate "
                "business questions into optimized SQL. You always ensure queries are "
                "properly scoped to the institution and use appropriate aggregations."
            ),
            llm="deepseek/deepseek-chat",
            memory=False,
            tools=[
                generate_sql_query,
                execute_analytics_query,
                get_application_stats,
            ],
            verbose=True,
        )

        # Visualization Agent
        self._agents["viz_agent"] = Agent(
            role="Data Visualization Specialist",
            goal=(
                "Create clear, informative Recharts visualizations that best "
                "represent the analytics data and insights."
            ),
            backstory=(
                "You are a data visualization expert who understands which chart types "
                "work best for different data patterns. You use bar charts for comparisons, "
                "pie charts for proportions, line charts for trends, and area charts for "
                "cumulative data. You apply appropriate colors using the traffic light "
                "theme for status-based data."
            ),
            llm="deepseek/deepseek-chat",
            memory=False,
            tools=[
                generate_bar_chart,
                generate_pie_chart,
                generate_line_chart,
                generate_area_chart,
                save_chart,
                get_saved_charts,
                toggle_chart_pin,
            ],
            verbose=True,
        )

    def _build_tasks(self, query: str, save_result: bool = False, pin_chart: bool = False) -> list:
        """
        Build tasks for the analytics workflow.

        Args:
            query: Natural language analytics question
            save_result: Whether to save the resulting chart
            pin_chart: Whether to pin the chart to the dashboard

        Returns:
            List of Task objects for the crew
        """
        tasks = []

        # Task 1: Generate and Execute SQL
        sql_task = Task(
            description=f"""
            Convert the following analytics question to SQL and execute it:

            QUESTION: "{query}"
            INSTITUTION_ID: {self.institution_id}

            Steps:
            1. Use generate_sql_query to convert the question to SQL
            2. Use execute_analytics_query to run the SQL
            3. Return the query results as JSON

            If the question is about basic statistics (total applications, status distribution),
            you may use get_application_stats instead of custom SQL.

            Your output MUST be a JSON object with:
            - "query": The SQL query that was executed (or "stats" if using get_application_stats)
            - "data": The query results as an array
            - "row_count": Number of rows returned
            """,
            expected_output="JSON with query, data array, and row_count",
            agent=self._agents["sql_agent"],
        )
        tasks.append(sql_task)

        # Task 2: Generate Visualization
        chart_instruction = ""
        if save_result:
            chart_instruction = f"""
            After generating the chart, save it using save_chart with:
            - institution_id: {self.institution_id}
            - is_pinned: {pin_chart}
            """

        viz_task = Task(
            description=f"""
            Create a Recharts visualization for the analytics results.

            ORIGINAL QUESTION: "{query}"

            Using the data from the previous task, determine the best chart type:
            - Bar Chart: For comparing categories (faculties, courses, campuses)
            - Pie Chart: For showing proportions (status distribution, acceptance rates)
            - Line Chart: For trends over time (monthly applications, yearly comparisons)
            - Area Chart: For cumulative or volume data over time

            Generate the appropriate chart configuration using the generate_*_chart tools.

            {chart_instruction}

            Your output MUST be a JSON object with:
            - "chart_config": The complete Recharts configuration
            - "chart_type": The type of chart generated (bar, pie, line, area)
            - "title": The chart title
            - "saved": true/false if the chart was saved
            - "chart_id": The saved chart ID (if saved)
            """,
            expected_output="JSON with chart_config, chart_type, title, saved status",
            agent=self._agents["viz_agent"],
            context=[sql_task],
        )
        tasks.append(viz_task)

        return tasks

    def run(self, query: str, save_result: bool = False, pin_chart: bool = False) -> dict:
        """
        Run an analytics query and generate visualization.

        Args:
            query: Natural language analytics question
            save_result: Whether to save the resulting chart to the database
            pin_chart: Whether to pin the chart to the dashboard

        Returns:
            Dictionary with:
            - success: Boolean indicating if the operation succeeded
            - query: The SQL query executed
            - data: The query results
            - chart_config: The Recharts configuration
            - chart_id: ID of saved chart (if saved)
            - error: Error message (if failed)

        Example:
            crew = AnalyticsCrew(institution_id="123...")
            result = crew.run("Show acceptance rate by faculty", save_result=True)
            print(result["chart_config"])
        """
        try:
            logger.info(f"Running analytics query: {query}")

            # Build tasks for this query
            tasks = self._build_tasks(query, save_result, pin_chart)

            # Create and run the crew
            crew = Crew(
                agents=list(self._agents.values()),
                tasks=tasks,
                process=Process.sequential,
                verbose=True,
            )

            # Execute the crew
            result = crew.kickoff()

            # Parse the result
            try:
                # The result should be from the final task (visualization)
                if hasattr(result, "raw"):
                    result_str = result.raw
                else:
                    result_str = str(result)

                # Try to parse as JSON
                parsed_result = json.loads(result_str)

                return {
                    "success": True,
                    "query": parsed_result.get("query", ""),
                    "data": parsed_result.get("data", []),
                    "chart_config": parsed_result.get("chart_config", {}),
                    "chart_type": parsed_result.get("chart_type", ""),
                    "title": parsed_result.get("title", ""),
                    "saved": parsed_result.get("saved", False),
                    "chart_id": parsed_result.get("chart_id"),
                }

            except json.JSONDecodeError:
                # If parsing fails, return the raw result
                logger.warning(f"Failed to parse crew result as JSON: {result_str[:200]}")
                return {
                    "success": True,
                    "raw_result": result_str,
                    "chart_config": {},
                    "error": "Result parsing failed",
                }

        except Exception as e:
            logger.error(f"Analytics crew error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }

    def get_quick_stats(self) -> dict:
        """
        Get quick application statistics without running the full crew.

        Returns common analytics metrics directly from the get_application_stats tool.

        Returns:
            Dictionary with statistics or error
        """
        try:
            result = get_application_stats._run(self.institution_id)

            if result.startswith("STATS_ERROR:"):
                return {"success": False, "error": result}

            return {
                "success": True,
                "stats": json.loads(result),
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }

    def get_pinned_charts(self) -> dict:
        """
        Get all pinned charts for the institution.

        Returns:
            Dictionary with charts array or error
        """
        try:
            result = get_saved_charts._run(self.institution_id, pinned_only=True)

            if result.startswith("GET_CHARTS_ERROR:"):
                return {"success": False, "error": result}

            return {
                "success": True,
                **json.loads(result),
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }


# Convenience function for running analytics queries
def run_analytics_query(
    query: str,
    institution_id: str,
    save_result: bool = False,
    pin_chart: bool = False,
) -> dict:
    """
    Convenience function to run an analytics query.

    Args:
        query: Natural language analytics question
        institution_id: UUID of the institution
        save_result: Whether to save the chart
        pin_chart: Whether to pin the chart

    Returns:
        Analytics result dictionary
    """
    crew = AnalyticsCrew(institution_id=institution_id)
    return crew.run(query, save_result=save_result, pin_chart=pin_chart)
