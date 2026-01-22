"""
Database access auditing for service role operations.

This module provides audit logging for Supabase operations that use the
service role key, which bypasses Row-Level Security (RLS). All high-risk
database operations should be decorated with the audit logger to ensure
traceability and support future migration to scoped tokens.

Security Context:
- SUPABASE_SERVICE_ROLE_KEY bypasses all RLS policies
- Current implementation uses this key globally for all operations
- This audit logging is Phase 1 of mitigation (see SERVICE_ROLE_AUDIT.md)

Usage:
    from one_for_all.utils.db_audit import audit_service_role_access

    @audit_service_role_access(table="user_accounts", operation="insert")
    @tool
    def store_user(user_data: dict) -> str:
        # ... database operation
        pass

Note: This decorator is designed to work with CrewAI's @tool decorator.
When applied to a BaseTool instance (after @tool is applied), it wraps
the tool's _run method to add audit logging while preserving the BaseTool type.
"""

import logging
import os
from functools import wraps
from typing import Callable, Any, Optional, Union
from datetime import datetime, timezone

# Import BaseTool for type checking (lazy import to avoid circular deps)
try:
    from crewai.tools import BaseTool
    HAS_CREWAI = True
except ImportError:
    HAS_CREWAI = False
    BaseTool = None

# Configure dedicated security audit logger
audit_logger = logging.getLogger("security.db_access")

# Set up handler if not already configured
if not audit_logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
    )
    audit_logger.addHandler(handler)
    audit_logger.setLevel(logging.WARNING)

# Environment flag to control audit logging verbosity
# Set AUDIT_LOG_LEVEL=DEBUG for detailed logging during development
AUDIT_LOG_LEVEL = os.getenv("AUDIT_LOG_LEVEL", "WARNING").upper()
audit_logger.setLevel(getattr(logging, AUDIT_LOG_LEVEL, logging.WARNING))


def _extract_tenant_context(args: tuple, kwargs: dict) -> dict:
    """
    Extract tenant context from function arguments.

    Attempts to find institution_id, user_id, or applicant_id from
    kwargs or from dict arguments in args.

    Returns:
        Dict with extracted context fields
    """
    context = {
        "institution_id": "unknown",
        "user_id": "unknown",
        "applicant_id": "unknown",
    }

    # Check kwargs first
    for key in context.keys():
        if key in kwargs:
            context[key] = str(kwargs[key])

    # Check dict arguments in args
    for arg in args:
        if isinstance(arg, dict):
            for key in context.keys():
                if key in arg and context[key] == "unknown":
                    context[key] = str(arg[key])

    return context


def audit_service_role_access(table: str, operation: str):
    """
    Decorator to log service role database access.

    This decorator logs all database operations that use the service role key,
    which bypasses RLS. It extracts tenant context where possible and logs:
    - Table being accessed
    - Operation type (select, insert, update, delete, rpc)
    - Institution ID (if available)
    - User/Applicant ID (if available)
    - Function name and timestamp

    This decorator is compatible with CrewAI's @tool decorator. When applied
    to a BaseTool instance (i.e., when @tool is applied first), it wraps the
    tool's internal _run method while preserving the BaseTool type that
    CrewAI agents expect.

    Args:
        table: Name of the database table being accessed
        operation: Type of operation (select, insert, update, delete, rpc)

    Returns:
        Decorated function/tool with audit logging

    Example:
        @audit_service_role_access(table="applications", operation="insert")
        @tool
        def store_application(app_data: dict) -> str:
            # Database operation here
            pass
    """
    def _create_audit_wrapper(func: Callable, func_name: str, func_module: str) -> Callable:
        """Create an audit logging wrapper for a function."""
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Extract context from arguments
            context = _extract_tenant_context(args, kwargs)

            # Build audit log entry
            audit_entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event": "SERVICE_ROLE_ACCESS",
                "table": table,
                "operation": operation,
                "function": func_name,
                "module": func_module,
                "institution_id": context["institution_id"],
                "user_id": context["user_id"],
                "applicant_id": context["applicant_id"],
            }

            # Log the access - WARNING level to ensure visibility
            audit_logger.warning(
                f"SERVICE_ROLE_ACCESS: table={table} op={operation} "
                f"institution={context['institution_id']} "
                f"user={context['user_id']} "
                f"applicant={context['applicant_id']} "
                f"func={func_name}"
            )

            # In DEBUG mode, log full context
            if audit_logger.isEnabledFor(logging.DEBUG):
                audit_logger.debug(f"Full audit context: {audit_entry}")

            # Execute the wrapped function
            return func(*args, **kwargs)

        return wrapper

    def decorator(func_or_tool: Union[Callable, Any]) -> Union[Callable, Any]:
        # Check if this is a CrewAI BaseTool instance
        if HAS_CREWAI and BaseTool is not None and isinstance(func_or_tool, BaseTool):
            # It's a BaseTool - wrap its _run method while preserving the tool
            tool_instance = func_or_tool
            original_run = tool_instance._run
            func_name = getattr(tool_instance, 'name', 'unknown_tool')
            func_module = getattr(tool_instance, '__module__', 'unknown_module')

            # Create wrapped _run method
            wrapped_run = _create_audit_wrapper(original_run, func_name, func_module)

            # Replace the _run method on the tool instance
            tool_instance._run = wrapped_run

            # Return the tool instance (preserving BaseTool type)
            return tool_instance

        # It's a regular function - wrap it normally
        func = func_or_tool
        func_name = getattr(func, '__name__', 'unknown')
        func_module = getattr(func, '__module__', 'unknown')
        return _create_audit_wrapper(func, func_name, func_module)

    return decorator


def audit_service_role_access_async(table: str, operation: str):
    """
    Async version of the audit decorator for async database operations.

    Args:
        table: Name of the database table being accessed
        operation: Type of operation (select, insert, update, delete, rpc)

    Returns:
        Decorated async function with audit logging
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Extract context from arguments
            context = _extract_tenant_context(args, kwargs)

            # Log the access
            audit_logger.warning(
                f"SERVICE_ROLE_ACCESS: table={table} op={operation} "
                f"institution={context['institution_id']} "
                f"user={context['user_id']} "
                f"applicant={context['applicant_id']} "
                f"func={func.__name__}"
            )

            # Execute the wrapped async function
            return await func(*args, **kwargs)

        return wrapper
    return decorator


def log_service_role_init(module_name: str):
    """
    Log that a module is initializing with service role access.

    Call this at module load time in files that create service role clients.

    Args:
        module_name: Name of the module being initialized
    """
    audit_logger.warning(
        f"SECURITY_NOTICE: Module '{module_name}' initialized with "
        f"SUPABASE_SERVICE_ROLE_KEY - bypasses all RLS policies. "
        f"See docs/SERVICE_ROLE_AUDIT.md for migration plan."
    )


class ServiceRoleAccessMetrics:
    """
    Simple in-memory metrics for service role access patterns.

    This class tracks access patterns to help identify:
    - Most frequently accessed tables
    - Operations that may benefit from scoped tokens
    - Cross-tenant access patterns

    Note: In production, these metrics should be exported to a proper
    monitoring system (Prometheus, Datadog, etc.)
    """

    def __init__(self):
        self._access_counts: dict = {}
        self._table_operations: dict = {}

    def record_access(
        self,
        table: str,
        operation: str,
        institution_id: Optional[str] = None
    ):
        """Record a service role access event."""
        key = f"{table}:{operation}"
        self._access_counts[key] = self._access_counts.get(key, 0) + 1

        if table not in self._table_operations:
            self._table_operations[table] = set()
        self._table_operations[table].add(operation)

    def get_stats(self) -> dict:
        """Get current access statistics."""
        return {
            "access_counts": dict(self._access_counts),
            "table_operations": {
                table: list(ops)
                for table, ops in self._table_operations.items()
            },
            "total_accesses": sum(self._access_counts.values()),
        }

    def reset(self):
        """Reset all metrics (useful for testing)."""
        self._access_counts.clear()
        self._table_operations.clear()


# Global metrics instance
service_role_metrics = ServiceRoleAccessMetrics()
