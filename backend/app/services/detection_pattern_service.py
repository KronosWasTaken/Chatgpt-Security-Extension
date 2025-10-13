from __future__ import annotations

from typing import Dict, List, Optional, Tuple
import re
import time

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.shared import DetectionPattern


class DetectionPatternService:
    """
    Loads detection patterns from the database and exposes cached, ready-to-use structures.
    Falls back to empty collections until loaded. Call ensure_loaded(session) before use.
    """

    _loaded_at_epoch_s: Optional[float] = None
    _cache_ttl_seconds: int = 300

    _dangerous_patterns: List[str] = []
    _quick_patterns: List[str] = []
    _sensitive_file_regexes: List[re.Pattern] = []
    _malicious_extensions: List[str] = []

    @classmethod
    async def ensure_loaded(cls, session: AsyncSession) -> None:
        now = time.time()
        if cls._loaded_at_epoch_s and (now - cls._loaded_at_epoch_s) < cls._cache_ttl_seconds:
            return

        # Load all active patterns; optional scoping by framework could be added later
        result = await session.execute(
            select(DetectionPattern).where(DetectionPattern.is_active == True)
        )
        rows: List[DetectionPattern] = list(result.scalars().all())

        dangerous: List[str] = []
        quick: List[str] = []
        sensitive_regexes: List[re.Pattern] = []
        malicious_exts: List[str] = []

        for row in rows:
            ptype = (row.pattern_type or "").lower()
            pdata: Dict = row.pattern_data or {}

            if ptype == "dangerous_text":
                # Expect pattern_data: { phrases: ["ignore previous instructions", ...] }
                phrases = pdata.get("phrases") or []
                for phrase in phrases:
                    if isinstance(phrase, str) and phrase.strip():
                        dangerous.append(phrase.strip().lower())

            elif ptype == "quick_text":
                phrases = pdata.get("phrases") or []
                for phrase in phrases:
                    if isinstance(phrase, str) and phrase.strip():
                        quick.append(phrase.strip().lower())

            elif ptype == "sensitive_file_regex":
                # Expect pattern_data: { regex: "...", flags: "i" }
                rx = pdata.get("regex")
                flags_str = (pdata.get("flags") or "").lower()
                flags = 0
                if "i" in flags_str:
                    flags |= re.I
                if isinstance(rx, str) and rx:
                    try:
                        sensitive_regexes.append(re.compile(rx, flags))
                    except re.error:
                        continue

            elif ptype == "malicious_extension":
                # Expect pattern_data: { extensions: [".exe", ".bat", ...] }
                exts = pdata.get("extensions") or []
                for ext in exts:
                    if isinstance(ext, str) and ext.startswith("."):
                        malicious_exts.append(ext.lower())

        # Commit to cache
        cls._dangerous_patterns = list(dict.fromkeys(dangerous))
        cls._quick_patterns = list(dict.fromkeys(quick))
        cls._sensitive_file_regexes = sensitive_regexes
        cls._malicious_extensions = list(dict.fromkeys(malicious_exts))
        cls._loaded_at_epoch_s = now

    @classmethod
    def get_dangerous_patterns(cls) -> List[str]:
        return cls._dangerous_patterns

    @classmethod
    def get_quick_patterns(cls) -> List[str]:
        return cls._quick_patterns

    @classmethod
    def get_sensitive_file_regexes(cls) -> List[re.Pattern]:
        return cls._sensitive_file_regexes

    @classmethod
    def get_malicious_extensions(cls) -> List[str]:
        return cls._malicious_extensions


