from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from app.services.tool_schemas import FUNCTION_MAPPING, TOOL_DEFINITIONS


@dataclass(frozen=True)
class ToolRegistry:
    """
    Immutable registry that bundles tool schemas with their executable functions.
    """

    name: str
    definitions: Sequence[dict[str, Any]]
    functions: Mapping[str, Callable[..., dict[str, Any]]]


DEFAULT_TOOL_REGISTRY = ToolRegistry(
    name="default",
    definitions=tuple(TOOL_DEFINITIONS),
    functions=FUNCTION_MAPPING,
)

