#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import subprocess
import sys
from typing import List


def run(command: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, shell=True, capture_output=True, text=True)


def get_staged_python_files() -> List[str]:
    diff = run("git diff --cached --name-only --diff-filter=ACMR")
    if diff.returncode != 0:
        return []
    files = [line.strip() for line in (diff.stdout or "").splitlines() if line.strip()]
    # Only backend python files under app/ and top-level scripts
    allowed_prefixes = ("app/", "scripts/")
    result: List[str] = []
    for f in files:
        lower = f.lower()
        if not lower.endswith(".py"):
            continue
        if lower.startswith("app/frontend/"):
            continue
        if lower.startswith(allowed_prefixes) or lower.endswith(".py") and ("/" not in lower):
            result.append(f)
    return result


def main() -> int:
    files = get_staged_python_files()
    if not files:
        return 0

    # Run mypy; prefer ephemeral env via uvx with pydantic available
    # Use forward slashes for cross-platform compatibility
    normalized_files = [f.replace("\\", "/") for f in files]
    quoted = " ".join(f'"{p}"' for p in normalized_files)
    use_uvx = run("uvx --version").returncode == 0
    if use_uvx:
        cmd = f"uvx --from mypy --with pydantic mypy {quoted}"
    else:
        cmd = f"python -m mypy {quoted}"
    proc = run(cmd)
    if proc.returncode != 0:
        sys.stderr.write(proc.stdout)
        sys.stderr.write(proc.stderr)
        return proc.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


