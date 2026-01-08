#!/usr/bin/env python3
"""Debug script to identify where imports hang."""
import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Set test mode before any imports
os.environ["ONEFORALL_TEST_MODE"] = "true"

print("Step 1: Import test_config...")
from one_for_all.config.test_config import TEST_MODE, log_test_mode_warning
print(f"  ✓ TEST_MODE = {TEST_MODE}")

print("\nStep 2: Import crewai...")
from crewai import Crew, Process, Agent, Task
print("  ✓ crewai imported")

print("\nStep 3: Import individual tools...")

tools_to_test = [
    ("sendgrid_otp_sender", "one_for_all.tools.sendgrid_otp_sender"),
    ("sms_otp_sender", "one_for_all.tools.sms_otp_sender"),
    ("whatsapp_handler", "one_for_all.tools.whatsapp_handler"),
    ("student_number_tool", "one_for_all.tools.student_number_tool"),
    ("otp_verification", "one_for_all.tools.otp_verification"),
]

for name, module in tools_to_test:
    print(f"  Importing {name}...", end=" ")
    try:
        __import__(module)
        print("✓")
    except Exception as e:
        print(f"✗ ERROR: {e}")
        break

print("\nStep 4: Import all tools from __init__.py...")
from one_for_all import tools
print("  ✓ tools imported")

print("\nStep 5: Import crew module...")
from one_for_all.crew import OneForAllCrew
print("  ✓ crew imported")

print("\nAll imports successful!")
