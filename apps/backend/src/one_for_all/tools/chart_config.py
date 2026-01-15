"""
Chart Configuration Tools

CrewAI tools for generating Recharts-compatible chart configurations
and saving charts to the database.
"""

import asyncio
import json
from datetime import datetime
from typing import Optional
from crewai.tools import tool
from .supabase_client import supabase


# Traffic light colors from the dashboard theme
THEME_COLORS = {
    "traffic_green": "#22c55e",  # Green - success, accepted
    "traffic_yellow": "#facc15",  # Yellow - warning, pending
    "traffic_red": "#ef4444",  # Red - error, rejected
    "primary": "#3b82f6",  # Blue - primary accent
    "secondary": "#8b5cf6",  # Purple - secondary accent
    "tertiary": "#06b6d4",  # Cyan - tertiary accent
    "quaternary": "#f97316",  # Orange - quaternary accent
    "muted": "#6b7280",  # Gray - neutral
}

# Default color palettes for different chart types
DEFAULT_PALETTES = {
    "status": [
        THEME_COLORS["traffic_green"],  # accepted
        THEME_COLORS["traffic_yellow"],  # pending
        THEME_COLORS["traffic_red"],  # rejected
        THEME_COLORS["muted"],  # other
    ],
    "categorical": [
        THEME_COLORS["primary"],
        THEME_COLORS["secondary"],
        THEME_COLORS["tertiary"],
        THEME_COLORS["quaternary"],
        THEME_COLORS["traffic_green"],
        THEME_COLORS["traffic_yellow"],
        THEME_COLORS["traffic_red"],
        THEME_COLORS["muted"],
    ],
    "sequential": [
        "#dbeafe",  # blue-100
        "#93c5fd",  # blue-300
        "#3b82f6",  # blue-500
        "#1d4ed8",  # blue-700
        "#1e3a8a",  # blue-900
    ],
}


def _parse_data(data_str: str) -> list:
    """Parse data string to list of dicts."""
    if isinstance(data_str, list):
        return data_str

    try:
        parsed = json.loads(data_str)
        if isinstance(parsed, dict) and "data" in parsed:
            return parsed["data"]
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        return []


def _detect_status_data(data: list) -> bool:
    """Detect if data contains status-related values."""
    status_keywords = ["accepted", "rejected", "pending", "waitlisted", "submitted", "draft"]
    for item in data:
        name = str(item.get("name", "")).lower()
        if any(keyword in name for keyword in status_keywords):
            return True
    return False


def _assign_colors(data: list, is_status: bool = False) -> list:
    """Assign colors to data points based on type."""
    palette = DEFAULT_PALETTES["status"] if is_status else DEFAULT_PALETTES["categorical"]

    status_color_map = {
        "accepted": THEME_COLORS["traffic_green"],
        "approved": THEME_COLORS["traffic_green"],
        "success": THEME_COLORS["traffic_green"],
        "pending": THEME_COLORS["traffic_yellow"],
        "waitlisted": THEME_COLORS["traffic_yellow"],
        "under_review": THEME_COLORS["traffic_yellow"],
        "reviewing": THEME_COLORS["traffic_yellow"],
        "rejected": THEME_COLORS["traffic_red"],
        "error": THEME_COLORS["traffic_red"],
        "withdrawn": THEME_COLORS["muted"],
        "draft": THEME_COLORS["muted"],
    }

    for i, item in enumerate(data):
        name = str(item.get("name", "")).lower()

        if is_status:
            # Try to match status-based color
            item["fill"] = status_color_map.get(name, palette[i % len(palette)])
        else:
            item["fill"] = palette[i % len(palette)]

    return data


@tool
def generate_bar_chart(data: str, title: str, x_key: str = "name", y_key: str = "value") -> str:
    """
    Generate a Recharts BarChart configuration.

    Creates a JSON configuration compatible with Recharts BarChart component.
    Automatically assigns colors based on data content (status-aware coloring).

    Args:
        data: JSON string of data array with objects containing at minimum
              a name/label field and a value field.
              Example: '[{"name": "Faculty A", "value": 150}, {"name": "Faculty B", "value": 120}]'
        title: Chart title to display
        x_key: Key in data objects for X-axis labels (default: "name")
        y_key: Key in data objects for Y-axis values (default: "value")

    Returns:
        Success: JSON string with Recharts-compatible chart configuration:
                 {"type": "bar", "title": "...", "data": [...], "xKey": "...", "yKey": "...", "colors": [...]}
        Error: String starting with "CHART_ERROR:" followed by error details

    Example:
        result = generate_bar_chart(
            data='[{"name": "Faculty A", "value": 150}]',
            title="Applications by Faculty"
        )
    """
    try:
        if not data:
            return "CHART_ERROR: data is required"

        if not title:
            return "CHART_ERROR: title is required"

        parsed_data = _parse_data(data)

        if not parsed_data:
            return "CHART_ERROR: data must be a non-empty array"

        is_status = _detect_status_data(parsed_data)
        colored_data = _assign_colors(parsed_data.copy(), is_status)

        chart_config = {
            "type": "bar",
            "title": title,
            "data": colored_data,
            "xKey": x_key,
            "yKey": y_key,
            "colors": DEFAULT_PALETTES["status"] if is_status else DEFAULT_PALETTES["categorical"],
        }

        return json.dumps(chart_config)

    except Exception as e:
        return f"CHART_ERROR: Unexpected error - {str(e)}"


@tool
def generate_pie_chart(data: str, title: str) -> str:
    """
    Generate a Recharts PieChart configuration.

    Creates a JSON configuration compatible with Recharts PieChart component.
    Automatically assigns colors based on data content (status-aware coloring).

    Args:
        data: JSON string of data array with objects containing name and value fields.
              Example: '[{"name": "Accepted", "value": 45}, {"name": "Pending", "value": 30}]'
        title: Chart title to display

    Returns:
        Success: JSON string with Recharts-compatible chart configuration:
                 {"type": "pie", "title": "...", "data": [...], "colors": [...]}
        Error: String starting with "CHART_ERROR:" followed by error details

    Example:
        result = generate_pie_chart(
            data='[{"name": "Accepted", "value": 45}, {"name": "Pending", "value": 30}]',
            title="Application Status Distribution"
        )
    """
    try:
        if not data:
            return "CHART_ERROR: data is required"

        if not title:
            return "CHART_ERROR: title is required"

        parsed_data = _parse_data(data)

        if not parsed_data:
            return "CHART_ERROR: data must be a non-empty array"

        is_status = _detect_status_data(parsed_data)
        colored_data = _assign_colors(parsed_data.copy(), is_status)

        chart_config = {
            "type": "pie",
            "title": title,
            "data": colored_data,
            "colors": DEFAULT_PALETTES["status"] if is_status else DEFAULT_PALETTES["categorical"],
        }

        return json.dumps(chart_config)

    except Exception as e:
        return f"CHART_ERROR: Unexpected error - {str(e)}"


@tool
def generate_line_chart(data: str, title: str, x_key: str = "name", y_key: str = "value") -> str:
    """
    Generate a Recharts LineChart configuration.

    Creates a JSON configuration compatible with Recharts LineChart component.
    Best suited for time-series or trend data.

    Args:
        data: JSON string of data array with objects containing x and y values.
              Example: '[{"name": "Jan", "value": 100}, {"name": "Feb", "value": 150}]'
        title: Chart title to display
        x_key: Key in data objects for X-axis values (default: "name")
        y_key: Key in data objects for Y-axis values (default: "value")

    Returns:
        Success: JSON string with Recharts-compatible chart configuration:
                 {"type": "line", "title": "...", "data": [...], "xKey": "...", "yKey": "...", "colors": [...]}
        Error: String starting with "CHART_ERROR:" followed by error details

    Example:
        result = generate_line_chart(
            data='[{"name": "2024-01", "value": 100}, {"name": "2024-02", "value": 150}]',
            title="Applications Over Time"
        )
    """
    try:
        if not data:
            return "CHART_ERROR: data is required"

        if not title:
            return "CHART_ERROR: title is required"

        parsed_data = _parse_data(data)

        if not parsed_data:
            return "CHART_ERROR: data must be a non-empty array"

        chart_config = {
            "type": "line",
            "title": title,
            "data": parsed_data,
            "xKey": x_key,
            "yKey": y_key,
            "colors": [THEME_COLORS["primary"]],  # Single color for line chart
        }

        return json.dumps(chart_config)

    except Exception as e:
        return f"CHART_ERROR: Unexpected error - {str(e)}"


@tool
def generate_area_chart(data: str, title: str, x_key: str = "name", y_key: str = "value") -> str:
    """
    Generate a Recharts AreaChart configuration.

    Creates a JSON configuration compatible with Recharts AreaChart component.
    Best suited for showing volume or cumulative data over time.

    Args:
        data: JSON string of data array with objects containing x and y values.
              Example: '[{"name": "Jan", "value": 100}, {"name": "Feb", "value": 150}]'
        title: Chart title to display
        x_key: Key in data objects for X-axis values (default: "name")
        y_key: Key in data objects for Y-axis values (default: "value")

    Returns:
        Success: JSON string with Recharts-compatible chart configuration:
                 {"type": "area", "title": "...", "data": [...], "xKey": "...", "yKey": "...", "colors": [...]}
        Error: String starting with "CHART_ERROR:" followed by error details

    Example:
        result = generate_area_chart(
            data='[{"name": "2024-01", "value": 100}, {"name": "2024-02", "value": 150}]',
            title="Cumulative Applications"
        )
    """
    try:
        if not data:
            return "CHART_ERROR: data is required"

        if not title:
            return "CHART_ERROR: title is required"

        parsed_data = _parse_data(data)

        if not parsed_data:
            return "CHART_ERROR: data must be a non-empty array"

        chart_config = {
            "type": "area",
            "title": title,
            "data": parsed_data,
            "xKey": x_key,
            "yKey": y_key,
            "colors": [THEME_COLORS["primary"]],  # Single color for area chart
            "gradient": True,  # Enable gradient fill
        }

        return json.dumps(chart_config)

    except Exception as e:
        return f"CHART_ERROR: Unexpected error - {str(e)}"


@tool
def save_chart(
    institution_id: str,
    chart_config: str,
    title: str,
    description: str = "",
    created_by: str = "system",
    is_pinned: bool = False,
) -> str:
    """
    Save a chart configuration to the database.

    Persists the chart configuration to the saved_charts table for later retrieval.
    Charts can be pinned to appear on the analytics dashboard.

    Args:
        institution_id: UUID of the institution this chart belongs to
        chart_config: JSON string of the chart configuration (from generate_* tools)
        title: Display title for the saved chart
        description: Optional description of what the chart shows
        created_by: UUID of the user/agent creating the chart (default: "system")
        is_pinned: Whether to pin the chart to the dashboard (default: False)

    Returns:
        Success: JSON string with {"chart_id": "...", "message": "Chart saved successfully"}
        Error: String starting with "SAVE_ERROR:" followed by error details

    Example:
        result = save_chart(
            institution_id="123e4567-e89b-12d3-a456-426614174000",
            chart_config='{"type": "bar", "title": "...", "data": [...]}',
            title="Applications by Faculty",
            is_pinned=True
        )
    """

    async def async_save():
        try:
            if not institution_id:
                return "SAVE_ERROR: institution_id is required"

            if not chart_config:
                return "SAVE_ERROR: chart_config is required"

            if not title:
                return "SAVE_ERROR: title is required"

            # Parse and validate chart config
            try:
                config_dict = json.loads(chart_config) if isinstance(chart_config, str) else chart_config
            except json.JSONDecodeError:
                return "SAVE_ERROR: chart_config must be valid JSON"

            # Validate required fields in config
            if "type" not in config_dict:
                return "SAVE_ERROR: chart_config must include 'type' field"

            if "data" not in config_dict:
                return "SAVE_ERROR: chart_config must include 'data' field"

            # Insert into database
            insert_payload = {
                "institution_id": institution_id,
                "chart_config": config_dict,
                "title": title,
                "description": description or "",
                "is_pinned": is_pinned,
                "created_by": created_by,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            }

            result = (
                await supabase.table("saved_charts")
                .insert(insert_payload)
                .execute()
            )

            if hasattr(result, "error") and result.error:
                return f"SAVE_ERROR: Database error - {result.error}"

            if not result.data or len(result.data) == 0:
                return "SAVE_ERROR: Failed to save chart - no data returned"

            chart_id = result.data[0].get("id")

            return json.dumps({
                "chart_id": chart_id,
                "message": f"Chart '{title}' saved successfully",
                "is_pinned": is_pinned,
            })

        except Exception as e:
            return f"SAVE_ERROR: Unexpected error - {str(e)}"

    return asyncio.run(async_save())


@tool
def get_saved_charts(institution_id: str, pinned_only: bool = False) -> str:
    """
    Retrieve saved charts for an institution.

    Fetches all saved chart configurations from the database for the given institution.
    Can optionally filter to only return pinned charts.

    Args:
        institution_id: UUID of the institution
        pinned_only: If True, only return pinned charts (default: False)

    Returns:
        Success: JSON string with {"charts": [...], "total": N}
        Error: String starting with "GET_CHARTS_ERROR:" followed by error details

    Example:
        result = get_saved_charts(
            institution_id="123e4567-e89b-12d3-a456-426614174000",
            pinned_only=True
        )
    """

    async def async_get_charts():
        try:
            if not institution_id:
                return "GET_CHARTS_ERROR: institution_id is required"

            query = (
                supabase.table("saved_charts")
                .select("*")
                .eq("institution_id", institution_id)
                .order("created_at", desc=True)
            )

            if pinned_only:
                query = query.eq("is_pinned", True)

            result = await query.execute()

            if hasattr(result, "error") and result.error:
                return f"GET_CHARTS_ERROR: Database error - {result.error}"

            charts = result.data or []

            return json.dumps({
                "charts": charts,
                "total": len(charts),
            })

        except Exception as e:
            return f"GET_CHARTS_ERROR: Unexpected error - {str(e)}"

    return asyncio.run(async_get_charts())


@tool
def toggle_chart_pin(chart_id: str, is_pinned: bool) -> str:
    """
    Toggle the pinned status of a saved chart.

    Updates whether a chart appears on the main analytics dashboard.

    Args:
        chart_id: UUID of the chart to update
        is_pinned: New pinned status

    Returns:
        Success: JSON string with {"chart_id": "...", "is_pinned": true/false, "message": "..."}
        Error: String starting with "PIN_ERROR:" followed by error details

    Example:
        result = toggle_chart_pin(
            chart_id="123e4567-e89b-12d3-a456-426614174000",
            is_pinned=True
        )
    """

    async def async_toggle_pin():
        try:
            if not chart_id:
                return "PIN_ERROR: chart_id is required"

            result = (
                await supabase.table("saved_charts")
                .update({
                    "is_pinned": is_pinned,
                    "updated_at": datetime.now().isoformat(),
                })
                .eq("id", chart_id)
                .execute()
            )

            if hasattr(result, "error") and result.error:
                return f"PIN_ERROR: Database error - {result.error}"

            return json.dumps({
                "chart_id": chart_id,
                "is_pinned": is_pinned,
                "message": f"Chart {'pinned' if is_pinned else 'unpinned'} successfully",
            })

        except Exception as e:
            return f"PIN_ERROR: Unexpected error - {str(e)}"

    return asyncio.run(async_toggle_pin())
