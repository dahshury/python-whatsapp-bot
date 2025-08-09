#!/usr/bin/env python3
"""
Linting and formatting script using Ruff.
"""

import subprocess
import sys
from pathlib import Path


def run_command(cmd: list[str], description: str) -> bool:
    """Run a command and return whether it succeeded."""
    print(f"\n🔍 {description}...")
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        if e.stdout:
            print(e.stdout)
        if e.stderr:
            print(e.stderr)
        return False
    else:
        if result.stdout:
            print(result.stdout)
        return True


def main():
    """Main function to run linting and formatting."""
    # Change to project root directory
    project_root = Path(__file__).parent.parent
    print(f"🏠 Project root: {project_root}")

    # Parse arguments
    fix = "--fix" in sys.argv
    check_only = "--check" in sys.argv

    print("\n🔧 Running Ruff...")

    if check_only:
        print("📋 Running checks only (no fixes)")

        # Check linting
        success = run_command(["ruff", "check", "."], "Checking code with Ruff")

        # Check formatting
        success &= run_command(
            ["ruff", "format", "--check", "."], "Checking code formatting"
        )

    else:
        if fix:
            print("🔧 Running linting with auto-fix")
            success = run_command(
                ["ruff", "check", "--fix", "."], "Linting and fixing code"
            )
        else:
            print("📋 Running linting (no fixes)")
            success = run_command(["ruff", "check", "."], "Linting code")

        # Always format when not in check-only mode
        if not check_only:
            success &= run_command(["ruff", "format", "."], "Formatting code")

    if success:
        print("\n✅ All checks passed!")
        sys.exit(0)
    else:
        print("\n❌ Some checks failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
