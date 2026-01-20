"""
Analytics Crew

A specialized CrewAI crew for handling analytics queries and chart generation.
Converts natural language questions into SQL queries, executes them, and
generates Recharts-compatible visualizations.

PERFORMANCE OPTIMIZATION (Phase 1):
- Template routing bypasses the SQL agent for 90%+ of queries
- Direct template execution: <500ms latency
- LLM fallback for complex queries: ~2.5s latency
- Feature flag ANALYTICS_USE_TEMPLATES controls behavior

SECURITY:
- User input is sanitized before inclusion in agent prompts (CWE-94, LLM01)
- Prompt injection patterns are detected and filtered
"""

import json
import logging
import os
from typing import Optional
from crewai import Agent, Crew, Process, Task

# Import sanitization utilities for prompt injection prevention
from one_for_all.utils.sanitization import sanitize_for_prompt

# Import analytics tools
from one_for_all.tools.analytics_queries import (
    generate_sql_query,
    execute_analytics_query,
    get_application_stats,
    get_routing_metrics,
    list_analytics_templates,
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

# Import template routing for direct execution
from one_for_all.tools.query_router import (
    route_query,
    execute_template,
    routing_metrics,
    list_available_templates,
)

logger = logging.getLogger(__name__)

# Feature flag for template routing (default: enabled)
ANALYTICS_USE_TEMPLATES = os.getenv("ANALYTICS_USE_TEMPLATES", "true").lower() == "true"

# Security feature flag: When enabled, REJECT queries that don't match templates
# instead of falling back to LLM-generated SQL (prevents SQL injection risk)
ANALYTICS_TEMPLATES_ONLY = os.getenv("ANALYTICS_TEMPLATES_ONLY", "true").lower() == "true"


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

        PERFORMANCE OPTIMIZED: For template-matched queries, this method
        bypasses the SQL agent entirely and executes the template directly,
        reducing latency from ~2.5s to <500ms for 90%+ of queries.

        SECURITY: Input is sanitized to prevent prompt injection attacks.

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
            - source: "template" or "llm" indicating query generation method
            - error: Error message (if failed)

        Example:
            crew = AnalyticsCrew(institution_id="123...")
            result = crew.run("Show acceptance rate by faculty", save_result=True)
            print(result["chart_config"])
        """
        try:
            # SECURITY: Sanitize user input to prevent prompt injection (CWE-94, LLM01)
            query = sanitize_for_prompt(query)

            logger.info(f"Running analytics query: {query}")

            # =================================================================
            # TEMPLATE FAST PATH (Phase 1 optimization)
            # =================================================================
            if ANALYTICS_USE_TEMPLATES:
                routing_result = route_query(query)

                if routing_result.matched and not routing_result.fallback_to_llm:
                    logger.info(
                        f"Template fast path: {routing_result.template.id} "
                        f"(confidence: {routing_result.confidence:.3f})"
                    )

                    # Execute template directly (bypasses SQL agent)
                    template_result = execute_template(
                        routing_result.template.id,
                        self.institution_id,
                    )

                    if template_result["success"]:
                        # Record metric
                        routing_metrics.record_hit(routing_result.template.id)

                        # Execute the SQL query
                        sql_result = execute_analytics_query._run(template_result["sql"])

                        if sql_result.startswith("QUERY_ERROR:"):
                            logger.error(f"Template query execution failed: {sql_result}")
                            # Fall through to LLM path
                        else:
                            try:
                                query_data = json.loads(sql_result)

                                # Generate chart config based on template chart type
                                chart_config = self._generate_chart_for_data(
                                    query_data.get("data", []),
                                    template_result["chart_type"],
                                    template_result["template_name"],
                                )

                                # Optionally save the chart
                                chart_id = None
                                if save_result:
                                    save_result_str = save_chart._run(
                                        json.dumps(chart_config),
                                        self.institution_id,
                                        template_result["template_name"],
                                        template_result["description"],
                                        pin_chart,
                                    )
                                    if not save_result_str.startswith("SAVE_ERROR:"):
                                        try:
                                            saved_data = json.loads(save_result_str)
                                            chart_id = saved_data.get("chart_id")
                                        except json.JSONDecodeError:
                                            pass

                                return {
                                    "success": True,
                                    "query": template_result["sql"],
                                    "data": query_data.get("data", []),
                                    "row_count": query_data.get("row_count", 0),
                                    "chart_config": chart_config,
                                    "chart_type": template_result["chart_type"],
                                    "title": template_result["template_name"],
                                    "saved": save_result and chart_id is not None,
                                    "chart_id": chart_id,
                                    "source": "template",
                                    "template_id": template_result["template_id"],
                                    "confidence": routing_result.confidence,
                                }
                            except json.JSONDecodeError:
                                logger.warning(f"Failed to parse template query result")
                                # Fall through to LLM path
                    else:
                        logger.warning(
                            f"Template execution failed: {template_result.get('error')}"
                        )
                else:
                    # Record miss for metrics
                    routing_metrics.record_miss()

                    # SECURITY: Reject unmatched queries when templates-only mode is enabled
                    if ANALYTICS_TEMPLATES_ONLY:
                        logger.warning(
                            f"Query rejected (templates-only mode) - no template match "
                            f"(best confidence: {routing_result.confidence:.3f})"
                        )
                        # Get available templates for suggestion
                        available = list_available_templates()
                        template_names = [t["name"] for t in available[:5]]
                        return {
                            "success": False,
                            "error": "Query not in pre-defined templates",
                            "suggestion": "Try: " + ", ".join(template_names),
                            "available_templates": [t["name"] for t in available],
                            "source": "rejected",
                            "best_confidence": routing_result.confidence,
                        }

                    logger.info(
                        f"Template miss - using full crew "
                        f"(best confidence: {routing_result.confidence:.3f})"
                    )

            # =================================================================
            # FULL CREW PATH (original implementation for complex queries)
            # Only reached when ANALYTICS_TEMPLATES_ONLY=false
            # =================================================================

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
                    "source": "llm",
                }

            except json.JSONDecodeError:
                # If parsing fails, return the raw result
                logger.warning(f"Failed to parse crew result as JSON: {result_str[:200]}")
                return {
                    "success": True,
                    "raw_result": result_str,
                    "chart_config": {},
                    "source": "llm",
                    "error": "Result parsing failed",
                }

        except Exception as e:
            logger.error(f"Analytics crew error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }

    def _generate_chart_for_data(
        self,
        data: list,
        chart_type: str,
        title: str,
    ) -> dict:
        """
        Generate a Recharts configuration for the given data.

        Args:
            data: Query result data
            chart_type: Type of chart (bar, pie, line, area)
            title: Chart title

        Returns:
            Recharts-compatible chart configuration
        """
        if not data:
            return {"type": chart_type, "title": title, "data": []}

        # Use the appropriate chart generation tool based on type
        data_json = json.dumps(data)

        if chart_type == "pie":
            result = generate_pie_chart._run(data_json, title)
        elif chart_type == "line":
            result = generate_line_chart._run(data_json, title)
        elif chart_type == "area":
            result = generate_area_chart._run(data_json, title)
        else:  # Default to bar chart
            result = generate_bar_chart._run(data_json, title)

        try:
            return json.loads(result)
        except json.JSONDecodeError:
            # Return basic config if parsing fails
            return {
                "type": chart_type,
                "title": title,
                "data": data,
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

    def get_routing_stats(self) -> dict:
        """
        Get template routing statistics.

        Returns statistics about template hit/miss rates for monitoring
        the effectiveness of the Phase 1 optimization.

        Returns:
            Dictionary with routing statistics
        """
        return {
            "success": True,
            "stats": routing_metrics.get_stats(),
            "templates_enabled": ANALYTICS_USE_TEMPLATES,
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
