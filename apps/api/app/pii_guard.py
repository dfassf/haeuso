from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Final


@dataclass(frozen=True)
class PIIMaskResult:
    masked_text: str
    detected_types: list[str]
    replacements: int


PII_PATTERNS: Final[list[tuple[str, str, re.Pattern[str]]]] = [
    ("email", "[이메일]", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
    ("phone", "[휴대전화]", re.compile(r"(?<!\d)(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}(?!\d)")),
    ("rrn", "[주민번호]", re.compile(r"(?<!\d)\d{6}-?[1-4]\d{6}(?!\d)")),
    ("business_no", "[사업자번호]", re.compile(r"(?<!\d)\d{3}-\d{2}-\d{5}(?!\d)")),
    ("card_no", "[카드번호]", re.compile(r"(?<!\d)(?:\d{4}[-\s]?){3}\d{4}(?!\d)")),
]


def mask_pii(text: str) -> PIIMaskResult:
    masked = text
    detected_types: list[str] = []
    replacements = 0

    for pii_type, replacement, pattern in PII_PATTERNS:
        def _repl(_: re.Match[str]) -> str:
            nonlocal replacements
            replacements += 1
            if pii_type not in detected_types:
                detected_types.append(pii_type)
            return replacement

        masked = pattern.sub(_repl, masked)

    return PIIMaskResult(
        masked_text=masked,
        detected_types=detected_types,
        replacements=replacements,
    )
