#!/usr/bin/env python3
"""Detect Arabic string literals that are not defined in i18n common.json."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from collections.abc import Iterable
from os import walk
from pathlib import Path

ARABIC_CHAR_RE = re.compile(r"[\u0600-\u06FF]")
STRING_LITERAL_RE = re.compile(r"(['\"])(?:(?=(\\?))\2.)*?\1|`(?:(?=(\\?))\3.)*?`")


IGNORED_DIR_NAMES = {
    "node_modules",
    ".next",
    "public",
    "dist",
    "build",
}

ALLOWED_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx"}

# Test file patterns to exclude (files containing demo/test data)
TEST_FILE_PATTERNS = [
    "__tests__",
    ".test.",
    ".spec.",
]


def is_test_file(file_path: Path) -> bool:
    """Check if a file is a test file that should be excluded."""
    path_str = file_path.as_posix()
    return any(pattern in path_str for pattern in TEST_FILE_PATTERNS)


def iter_source_files(root: Path) -> Iterable[Path]:
    root = root.resolve()
    for dirpath, dirnames, filenames in walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIR_NAMES]
        for filename in filenames:
            suffix = Path(filename).suffix.lower()
            if suffix in ALLOWED_EXTENSIONS:
                file_path = Path(dirpath) / filename
                # Skip test files that contain demo names
                if not is_test_file(file_path):
                    yield file_path


def load_translation_values(common_json: Path) -> dict[str, list[str]]:
    if not common_json.exists():
        raise FileNotFoundError(f"Translation file not found: {common_json}")

    with common_json.open("r", encoding="utf-8") as fh:
        data = json.load(fh)

    values: dict[str, list[str]] = defaultdict(list)

    def _flatten(prefix: str, node: object) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                new_prefix = f"{prefix}.{key}" if prefix else key
                _flatten(new_prefix, value)
        elif isinstance(node, list):
            for idx, item in enumerate(node):
                new_prefix = f"{prefix}[{idx}]"
                _flatten(new_prefix, item)
        elif isinstance(node, str):
            values[node].append(prefix)
        else:
            return

    _flatten("", data)
    return values


def normalize_literal(literal: str) -> str:
    quote = literal[0]
    text = literal[1:-1]
    if quote == "`" and "${" in text:
        raise ValueError("template literal with interpolation")
    return text.strip()


def collect_arabic_literals(file_path: Path) -> list[tuple[int, str]]:
    literals: list[tuple[int, str]] = []
    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        content = file_path.read_text(encoding="utf-8", errors="ignore")

    for match in STRING_LITERAL_RE.finditer(content):
        literal = match.group(0)
        try:
            value = normalize_literal(literal)
        except ValueError:
            continue
        if not value:
            continue
        if ARABIC_CHAR_RE.search(value):
            line = content.count("\n", 0, match.start()) + 1
            literals.append((line, value))

    return literals


def find_violations(
    root: Path, translation_file: Path
) -> tuple[
    dict[str, list[tuple[Path, int]]],
    dict[str, list[tuple[Path, int, list[str]]]],
]:
    value_to_keys = load_translation_values(translation_file)
    occurrences: dict[str, list[tuple[Path, int]]] = defaultdict(list)

    for source in iter_source_files(root):
        for line_no, literal in collect_arabic_literals(source):
            occurrences[literal].append((source, line_no))

    missing: dict[str, list[tuple[Path, int]]] = {}
    present: dict[str, list[tuple[Path, int, list[str]]]] = {}

    for literal, refs in occurrences.items():
        keys = value_to_keys.get(literal, [])
        if keys:
            present[literal] = [(path, line, keys) for path, line in refs]
        else:
            missing[literal] = refs

    return present, missing


def format_report(
    present: dict[str, list[tuple[Path, int, list[str]]]],
    missing: dict[str, list[tuple[Path, int]]],
) -> str:
    lines: list[str] = []
    total = len(present) + len(missing)
    lines.append(f"Total unique Arabic literals: {total}")
    lines.append(f"Already mapped to translation keys: {len(present)}")
    lines.append(f"Missing translation entries: {len(missing)}")

    for literal in sorted(missing):
        lines.append("---")
        lines.append(literal)
        for path, line in sorted(missing[literal]):
            rel = path.as_posix()
            lines.append(f"  {rel}:{line}")

    return "\n".join(lines)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Find Arabic literals that are missing from i18n common.json",
    )
    parser.add_argument(
        "--root",
        default="app/frontend",
        help="Root directory to scan (default: app/frontend)",
    )
    parser.add_argument(
        "--translation",
        default="app/frontend/public/locales/ar/common.json",
        help="Path to the Arabic common.json translation file",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit JSON output instead of a human-readable report",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    root = Path(args.root).resolve()
    translation_file = Path(args.translation).resolve()

    present, missing = find_violations(root, translation_file)

    # Ensure UTF-8 encoding for output
    if sys.stdout.encoding != "utf-8":
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        else:
            # Fallback for older Python versions
            import io

            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

    if args.json:
        payload = {
            "total_unique": len(present) + len(missing),
            "mapped": {
                literal: [
                    {
                        "path": str(path),
                        "line": line,
                        "keys": keys,
                    }
                    for path, line, keys in refs
                ]
                for literal, refs in present.items()
            },
            "missing": {
                literal: [
                    {
                        "path": str(path),
                        "line": line,
                    }
                    for path, line in refs
                ]
                for literal, refs in missing.items()
            },
        }
        json.dump(payload, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    else:
        report = format_report(present, missing)
        print(report)

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
