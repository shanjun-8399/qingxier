from __future__ import annotations

from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class CaseMeta:
    case_id: str
    title: str
    expected: str
    category: str


def case(case_id: str, title: str, expected: str, category: str) -> Callable:
    """Attach report metadata to a unittest test method."""
    def decorator(func: Callable) -> Callable:
        func.case_meta = CaseMeta(case_id, title, expected, category)  # type: ignore[attr-defined]
        return func
    return decorator
