"""
Cassette Auditor - Automated Secret Detection for VCR Cassette Files.

This module provides comprehensive secret detection scanning for VCR cassette
files used in testing. It identifies potentially leaked credentials, API keys,
tokens, and other sensitive information that may have been accidentally recorded
during test execution.

Usage:
    # CLI usage
    python cassette_auditor.py --path /path/to/cassettes --fail-on-violation

    # Pytest integration
    from cassette_auditor import audit_cassette
    violations = audit_cassette(Path("test_cassette.yaml"))

    # Programmatic usage
    auditor = CassetteAuditor(Path("/path/to/cassettes"))
    violations = auditor.scan_directory()
    report = auditor.generate_report(violations)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Pattern

# Import unified secret patterns from centralized module
from .secret_patterns import SECRET_PATTERNS, scan_text_for_secrets


@dataclass
class SecurityViolation:
    """
    Represents a detected security violation in a cassette file.

    Attributes:
        file_path: Path to the file containing the violation.
        line_number: Line number where the violation was found (1-indexed).
        pattern_name: Name of the secret pattern that matched.
        matched_text: The matched text, truncated to 20 characters for safety.
        context: Surrounding text with sensitive parts redacted.
    """

    file_path: Path
    line_number: int
    pattern_name: str
    matched_text: str
    context: str

    def __post_init__(self) -> None:
        """Ensure matched_text is truncated for safety."""
        if len(self.matched_text) > 20:
            self.matched_text = self.matched_text[:20] + "..."

    def to_dict(self) -> dict:
        """Convert violation to dictionary with string path."""
        result = asdict(self)
        result["file_path"] = str(self.file_path)
        return result


class CassetteAuditor:
    """
    Auditor class for scanning VCR cassette files for leaked secrets.

    This class provides methods to scan individual files or entire directories
    for patterns that may indicate leaked credentials, API keys, or other
    sensitive information.

    Attributes:
        cassette_path: Base path for cassette files (file or directory).
        patterns: Dictionary of pattern names to compiled regex patterns.

    Example:
        >>> auditor = CassetteAuditor(Path("/path/to/cassettes"))
        >>> violations = auditor.scan_directory()
        >>> if violations:
        ...     print(auditor.generate_report(violations))
    """

    def __init__(
        self,
        cassette_path: Path,
        patterns: dict[str, Pattern[str]] | None = None,
    ) -> None:
        """
        Initialize the cassette auditor.

        Args:
            cassette_path: Path to scan (file or directory).
            patterns: Optional custom patterns dict. Defaults to SECRET_PATTERNS.
        """
        self.cassette_path = cassette_path
        self.patterns = patterns or SECRET_PATTERNS

    def _redact_sensitive(self, text: str, match: str) -> str:
        """
        Redact sensitive content in context string.

        Args:
            text: The original context text.
            match: The matched sensitive text to redact.

        Returns:
            Context string with sensitive parts replaced by [REDACTED].
        """
        # Replace the full match with redacted placeholder
        redacted = text.replace(match, "[REDACTED]")
        # Also redact any remaining long alphanumeric sequences that look like secrets
        redacted = re.sub(r"[A-Za-z0-9_-]{32,}", "[REDACTED]", redacted)
        return redacted

    def _get_context(self, line: str, match: re.Match[str], max_context: int = 50) -> str:
        """
        Extract context around a match with redaction.

        Args:
            line: The full line containing the match.
            match: The regex match object.
            max_context: Maximum characters of context on each side.

        Returns:
            Redacted context string.
        """
        start = max(0, match.start() - max_context)
        end = min(len(line), match.end() + max_context)
        context = line[start:end]

        # Add ellipsis if truncated
        if start > 0:
            context = "..." + context
        if end < len(line):
            context = context + "..."

        return self._redact_sensitive(context, match.group())

    def scan_file(self, file_path: Path) -> list[SecurityViolation]:
        """
        Scan a single file for security violations.

        Args:
            file_path: Path to the file to scan.

        Returns:
            List of SecurityViolation objects found in the file.

        Raises:
            FileNotFoundError: If the file does not exist.
            PermissionError: If the file cannot be read.
        """
        violations: list[SecurityViolation] = []

        try:
            content = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            # Try with latin-1 as fallback for binary-ish content
            content = file_path.read_text(encoding="latin-1")

        lines = content.splitlines()

        for line_num, line in enumerate(lines, start=1):
            for pattern_name, pattern in self.patterns.items():
                for match in pattern.finditer(line):
                    violation = SecurityViolation(
                        file_path=file_path,
                        line_number=line_num,
                        pattern_name=pattern_name,
                        matched_text=match.group(),
                        context=self._get_context(line, match),
                    )
                    violations.append(violation)

        return violations

    def scan_directory(self) -> dict[Path, list[SecurityViolation]]:
        """
        Scan all YAML files in the cassette directory for violations.

        Recursively scans the cassette_path directory for all .yaml and .yml
        files, checking each for secret patterns.

        Returns:
            Dictionary mapping file paths to lists of violations found.
            Only files with violations are included in the result.
        """
        violations_by_file: dict[Path, list[SecurityViolation]] = {}

        if self.cassette_path.is_file():
            file_violations = self.scan_file(self.cassette_path)
            if file_violations:
                violations_by_file[self.cassette_path] = file_violations
            return violations_by_file

        # Scan all YAML files in directory
        yaml_patterns = ["**/*.yaml", "**/*.yml"]

        for pattern in yaml_patterns:
            for yaml_file in self.cassette_path.glob(pattern):
                if yaml_file.is_file():
                    file_violations = self.scan_file(yaml_file)
                    if file_violations:
                        violations_by_file[yaml_file] = file_violations

        return violations_by_file

    def generate_report(
        self,
        violations: dict[Path, list[SecurityViolation]],
        output_format: str = "text",
    ) -> str:
        """
        Generate a human-readable or JSON report of violations.

        Args:
            violations: Dictionary of file paths to violation lists.
            output_format: Output format, either "text" or "json".

        Returns:
            Formatted report string.
        """
        if output_format == "json":
            return self._generate_json_report(violations)
        return self._generate_text_report(violations)

    def _generate_text_report(
        self,
        violations: dict[Path, list[SecurityViolation]],
    ) -> str:
        """Generate a text format report."""
        if not violations:
            return "No security violations detected."

        lines: list[str] = [
            "=" * 70,
            "CASSETTE SECURITY AUDIT REPORT",
            "=" * 70,
            "",
        ]

        total_violations = sum(len(v) for v in violations.values())
        lines.append(f"Total violations found: {total_violations}")
        lines.append(f"Files with violations: {len(violations)}")
        lines.append("")

        for file_path, file_violations in sorted(violations.items()):
            lines.append("-" * 70)
            lines.append(f"File: {file_path}")
            lines.append(f"Violations: {len(file_violations)}")
            lines.append("")

            for violation in file_violations:
                lines.append(f"  Line {violation.line_number}: [{violation.pattern_name}]")
                lines.append(f"    Matched: {violation.matched_text}")
                lines.append(f"    Context: {violation.context}")
                lines.append("")

        lines.append("=" * 70)
        lines.append("END OF REPORT")
        lines.append("=" * 70)

        return "\n".join(lines)

    def _generate_json_report(
        self,
        violations: dict[Path, list[SecurityViolation]],
    ) -> str:
        """Generate a JSON format report."""
        report_data = {
            "summary": {
                "total_violations": sum(len(v) for v in violations.values()),
                "files_with_violations": len(violations),
            },
            "violations": {
                str(file_path): [v.to_dict() for v in file_violations]
                for file_path, file_violations in violations.items()
            },
        }
        return json.dumps(report_data, indent=2)


def audit_cassette(file_path: Path) -> list[SecurityViolation]:
    """
    Pytest integration function for auditing a single cassette file.

    This function is designed to be called from conftest.py post-test hooks
    to automatically scan cassette files after they are created or modified.

    Args:
        file_path: Path to the cassette file to audit.

    Returns:
        List of SecurityViolation objects found in the file.

    Example:
        # In conftest.py
        @pytest.fixture(autouse=True)
        def audit_cassettes_after_test(request):
            yield
            cassette_path = get_cassette_path_from_request(request)
            if cassette_path.exists():
                violations = audit_cassette(cassette_path)
                if violations:
                    pytest.fail(f"Security violations found in cassette: {violations}")
    """
    auditor = CassetteAuditor(file_path)
    return auditor.scan_file(file_path)


def create_argument_parser() -> argparse.ArgumentParser:
    """
    Create and configure the argument parser for CLI usage.

    Returns:
        Configured ArgumentParser instance.
    """
    parser = argparse.ArgumentParser(
        prog="cassette_auditor",
        description="Scan VCR cassette files for leaked secrets and sensitive data.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Scan a single file
  python cassette_auditor.py --path cassettes/test_api.yaml

  # Scan a directory
  python cassette_auditor.py --path cassettes/

  # Scan and fail on violations (for CI)
  python cassette_auditor.py --path cassettes/ --fail-on-violation

  # Output as JSON
  python cassette_auditor.py --path cassettes/ --output json
        """,
    )

    parser.add_argument(
        "--path",
        type=Path,
        required=True,
        help="Path to scan (file or directory)",
    )

    parser.add_argument(
        "--fail-on-violation",
        action="store_true",
        default=False,
        help="Exit with code 1 if violations are found",
    )

    parser.add_argument(
        "--output",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)",
    )

    return parser


def main() -> int:
    """
    Main entry point for CLI usage.

    Parses command line arguments, scans the specified path for violations,
    and outputs a report. Returns appropriate exit code based on results.

    Returns:
        Exit code: 0 if no violations or --fail-on-violation not set,
                   1 if violations found and --fail-on-violation is set.
    """
    parser = create_argument_parser()
    args = parser.parse_args()

    # Validate path exists
    if not args.path.exists():
        print(f"Error: Path does not exist: {args.path}", file=sys.stderr)
        return 1

    # Create auditor and scan
    auditor = CassetteAuditor(args.path)

    if args.path.is_file():
        violations = {args.path: auditor.scan_file(args.path)}
        # Remove empty results
        violations = {k: v for k, v in violations.items() if v}
    else:
        violations = auditor.scan_directory()

    # Generate and print report
    report = auditor.generate_report(violations, output_format=args.output)
    print(report)

    # Determine exit code
    if violations and args.fail_on_violation:
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
