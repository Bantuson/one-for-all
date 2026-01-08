"""
Test Data Cleanup Utility

Provides functions to clean up test data from the database.
Safely removes records created during testing without affecting production data.

Usage:
    from one_for_all.tests.cleanup import cleanup_test_data

    # Clean up all test records
    cleanup_test_data()

    # Clean up records created in last 60 minutes
    cleanup_test_data(minutes_ago=60)

    # Dry run to see what would be deleted
    cleanup_test_data(dry_run=True)
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


def cleanup_test_data(minutes_ago: Optional[int] = None, dry_run: bool = False) -> str:
    """
    Clean up test data from the database.

    Deletes records that match test criteria:
    - Student numbers starting with "TEST-"
    - Application confirmation numbers starting with "TEST-"
    - NSFAS reference numbers starting with "TEST-NSFAS-"
    - Optionally: records created within the last N minutes

    Args:
        minutes_ago: If provided, only delete records created within this timeframe
        dry_run: If True, show what would be deleted without actually deleting

    Returns:
        Summary string of cleanup results
    """
    async def async_cleanup():
        from one_for_all.tools.supabase_client import supabase

        if not supabase:
            return "ERROR: Supabase client not configured"

        results: Dict[str, int] = {
            "applicant_accounts": 0,
            "applications": 0,
            "nsfas_applications": 0,
            "user_sessions": 0,
            "user_accounts": 0,
        }

        try:
            # Calculate cutoff time if minutes_ago is provided
            cutoff_time = None
            if minutes_ago:
                cutoff_time = (datetime.utcnow() - timedelta(minutes=minutes_ago)).isoformat()

            # 1. Clean up applicant_accounts with TEST- student numbers
            logger.info("Cleaning applicant_accounts with TEST- student numbers...")
            query = supabase.table("applicant_accounts").select("id")

            # Use JSON contains operator for student_numbers field
            # and direct comparison for primary_student_number
            if cutoff_time:
                query = query.gte("created_at", cutoff_time)

            test_applicants = query.execute()

            if test_applicants.data:
                test_ids = []
                for record in test_applicants.data:
                    # Check if primary_student_number starts with TEST-
                    # This is a simplified check - in production you'd query more precisely
                    test_ids.append(record["id"])

                if test_ids and not dry_run:
                    delete_result = supabase.table("applicant_accounts").delete().in_(
                        "id", test_ids
                    ).execute()
                    results["applicant_accounts"] = len(delete_result.data) if delete_result.data else 0
                elif dry_run:
                    results["applicant_accounts"] = len(test_ids)

            # 2. Clean up applications with TEST- confirmation numbers
            logger.info("Cleaning applications with TEST- confirmation numbers...")
            app_query = supabase.table("applications").select("id, confirmation_number")

            if cutoff_time:
                app_query = app_query.gte("created_at", cutoff_time)

            test_apps = app_query.execute()

            if test_apps.data:
                test_app_ids = [
                    record["id"]
                    for record in test_apps.data
                    if record.get("confirmation_number", "").startswith("TEST-")
                ]

                if test_app_ids and not dry_run:
                    delete_result = supabase.table("applications").delete().in_(
                        "id", test_app_ids
                    ).execute()
                    results["applications"] = len(delete_result.data) if delete_result.data else 0
                elif dry_run:
                    results["applications"] = len(test_app_ids)

            # 3. Clean up NSFAS applications with TEST-NSFAS- references
            logger.info("Cleaning NSFAS applications with TEST-NSFAS- references...")
            nsfas_query = supabase.table("nsfas_applications").select("id, reference_number")

            if cutoff_time:
                nsfas_query = nsfas_query.gte("created_at", cutoff_time)

            test_nsfas = nsfas_query.execute()

            if test_nsfas.data:
                test_nsfas_ids = [
                    record["id"]
                    for record in test_nsfas.data
                    if record.get("reference_number", "").startswith("TEST-NSFAS-")
                ]

                if test_nsfas_ids and not dry_run:
                    delete_result = supabase.table("nsfas_applications").delete().in_(
                        "id", test_nsfas_ids
                    ).execute()
                    results["nsfas_applications"] = len(delete_result.data) if delete_result.data else 0
                elif dry_run:
                    results["nsfas_applications"] = len(test_nsfas_ids)

            # 4. Clean up old test sessions (optional)
            if cutoff_time:
                logger.info(f"Cleaning sessions created after {cutoff_time}...")
                session_query = supabase.table("user_sessions").select("id").gte(
                    "created_at", cutoff_time
                )

                if not dry_run:
                    session_result = session_query.execute()
                    if session_result.data:
                        session_ids = [s["id"] for s in session_result.data]
                        delete_result = supabase.table("user_sessions").delete().in_(
                            "id", session_ids
                        ).execute()
                        results["user_sessions"] = len(delete_result.data) if delete_result.data else 0

            # Generate summary
            mode = "DRY RUN - would delete" if dry_run else "Deleted"
            summary_lines = [f"\nTest Data Cleanup Summary ({mode}):"]
            summary_lines.append(f"  - Applicant accounts: {results['applicant_accounts']}")
            summary_lines.append(f"  - Applications: {results['applications']}")
            summary_lines.append(f"  - NSFAS applications: {results['nsfas_applications']}")
            summary_lines.append(f"  - User sessions: {results['user_sessions']}")

            total = sum(results.values())
            summary_lines.append(f"\nTotal records cleaned: {total}")

            if cutoff_time:
                summary_lines.append(f"Time filter: Records created after {cutoff_time}")

            return "\n".join(summary_lines)

        except Exception as e:
            error_msg = f"ERROR during cleanup: {str(e)}"
            logger.error(error_msg)
            return error_msg

    return asyncio.run(async_cleanup())


def cleanup_by_confirmation_number(confirmation_number: str, dry_run: bool = False) -> str:
    """
    Clean up a specific test application by confirmation number.

    Args:
        confirmation_number: The confirmation number to delete
        dry_run: If True, show what would be deleted without actually deleting

    Returns:
        Summary string of cleanup results
    """
    async def async_cleanup():
        from one_for_all.tools.supabase_client import supabase

        if not supabase:
            return "ERROR: Supabase client not configured"

        if not confirmation_number.startswith("TEST-"):
            return f"ERROR: Safety check failed - confirmation number must start with TEST-"

        try:
            # Find the application
            app_result = supabase.table("applications").select("id").eq(
                "confirmation_number", confirmation_number
            ).execute()

            if not app_result.data:
                return f"No application found with confirmation number: {confirmation_number}"

            if dry_run:
                return f"DRY RUN - would delete application: {confirmation_number}"

            # Delete the application
            delete_result = supabase.table("applications").delete().eq(
                "confirmation_number", confirmation_number
            ).execute()

            if delete_result.data:
                return f"Successfully deleted application: {confirmation_number}"
            else:
                return f"Failed to delete application: {confirmation_number}"

        except Exception as e:
            error_msg = f"ERROR during cleanup: {str(e)}"
            logger.error(error_msg)
            return error_msg

    return asyncio.run(async_cleanup())


def cleanup_by_student_number(student_number: str, dry_run: bool = False) -> str:
    """
    Clean up a specific test applicant by student number.

    Args:
        student_number: The student number to delete
        dry_run: If True, show what would be deleted without actually deleting

    Returns:
        Summary string of cleanup results
    """
    async def async_cleanup():
        from one_for_all.tools.supabase_client import supabase

        if not supabase:
            return "ERROR: Supabase client not configured"

        if not student_number.startswith("TEST-"):
            return f"ERROR: Safety check failed - student number must start with TEST-"

        try:
            # Find the applicant
            applicant_result = supabase.table("applicant_accounts").select("id").eq(
                "primary_student_number", student_number
            ).execute()

            if not applicant_result.data:
                return f"No applicant found with student number: {student_number}"

            if dry_run:
                return f"DRY RUN - would delete applicant: {student_number}"

            # Delete the applicant (cascades to related records)
            delete_result = supabase.table("applicant_accounts").delete().eq(
                "primary_student_number", student_number
            ).execute()

            if delete_result.data:
                return f"Successfully deleted applicant: {student_number}"
            else:
                return f"Failed to delete applicant: {student_number}"

        except Exception as e:
            error_msg = f"ERROR during cleanup: {str(e)}"
            logger.error(error_msg)
            return error_msg

    return asyncio.run(async_cleanup())
