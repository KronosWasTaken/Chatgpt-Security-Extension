from typing import Any, List, Optional
import logging
import os
from google import genai
from google.genai import types as genai_types

from app.core.config import settings

class GeminiClient:
    _client: Any = None
    _logger = logging.getLogger(__name__)

    @classmethod
    def _resolve_api_key(cls) -> Optional[str]:
        key = settings.GEMINI_API_KEY
        if key:
            return key
        return None
    

    @classmethod
    def is_available(cls) -> bool:
        return bool(cls._resolve_api_key()) 

    @classmethod
    def get_client(cls) -> Optional[Any]:
        if not cls.is_available():
            return None
        if cls._client is None:
            api_key = cls._resolve_api_key()
            if not api_key:
                cls._logger.warning("Gemini API key not found in settings or env.")
                return None
            cls._client = genai.Client(api_key=api_key)  # type: ignore
        return cls._client

    @classmethod
    def generate_text(cls, model: str, contents: List[Any]) -> Optional[str]:
        client = cls.get_client()
        if client is None:
            cls._logger.warning("Gemini unavailable: missing API key or SDK")
            return None
        try:
            chosen_model = model or (getattr(settings, 'GEMINI_MODEL', None) or "gemini-2.0-flash")
            cls._logger.info("Gemini generate_text start model=%s", chosen_model)
            resp = client.models.generate_content(model=chosen_model, contents=contents)
            text = getattr(resp, 'text', None)
            out = text.strip() if text else None
            cls._logger.info("Gemini generate_text success len=%s", len(out) if out else 0)
            return out
        except Exception as e:
            # Retry with a fallback model before giving up
            try:
                cls._logger.warning("Gemini primary model failed (%s). Retrying with fallback.", str(e))
                resp = client.models.generate_content(model="gemini-2.0-flash", contents=contents)
                text = getattr(resp, 'text', None)
                out = text.strip() if text else None
                cls._logger.info("Gemini fallback success len=%s", len(out) if out else 0)
                return out
            except Exception as e2:
                cls._logger.error("Gemini call failed: %s", str(e2))
                return None

    @classmethod
    def self_test(cls) -> None:
        """Send a tiny probe to verify API reachability and log the outcome."""
        if not cls.is_available():
            cls._logger.warning("Gemini self-test skipped: unavailable")
            return
        try:
            text = cls.generate_text(model="gemini-2.0-flash", contents=["health check: respond 'ok'"])
            if text:
                cls._logger.info("Gemini self-test success: %s", text[:60])
            else:
                cls._logger.warning("Gemini self-test returned empty text")
        except Exception as e:
            cls._logger.error("Gemini self-test failed: %s", str(e))

    @classmethod
    def part_from_bytes(cls, data: bytes, mime_type: str) -> Any:
        if genai_types is None:
            raise RuntimeError("Gemini types unavailable")
        return genai_types.Part.from_bytes(data=data, mime_type=mime_type)


