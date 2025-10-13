from typing import Any, Dict, Optional
import httpx

from app.core.config import settings


class VirusTotalService:
    @staticmethod
    async def get_file_report(file_hash: str) -> Optional[Dict[str, Any]]:
        if not settings.VT_API_KEY:
            return None
        url = f"{settings.VT_API_BASE}/files/{file_hash}"
        headers = {"x-apikey": settings.VT_API_KEY}
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            return None

    @staticmethod
    async def upload_file_and_get_analysis_id(file_bytes: bytes, file_name: str) -> Optional[str]:
        if not settings.VT_API_KEY:
            return None
        url = f"{settings.VT_API_BASE}/files"
        headers = {"x-apikey": settings.VT_API_KEY}
        files = {"file": (file_name, file_bytes)}
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, headers=headers, files=files)
            if resp.status_code in (200, 201):
                data = resp.json()
                return (data.get("data") or {}).get("id")
            return None

    @staticmethod
    async def get_analysis(analysis_id: str) -> Optional[Dict[str, Any]]:
        if not settings.VT_API_KEY:
            return None
        url = f"{settings.VT_API_BASE}/analyses/{analysis_id}"
        headers = {"x-apikey": settings.VT_API_KEY}
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            return None

    @staticmethod
    def summarize_stats(stats: Dict[str, Any]) -> Dict[str, Any]:
        malicious = int(stats.get("malicious", 0) or 0)
        suspicious = int(stats.get("suspicious", 0) or 0)
        detection_count = malicious + suspicious
        total_engines = sum(int(v or 0) for v in stats.values())
        return {
            "detectionCount": detection_count,
            "totalEngines": total_engines,
            "isMalicious": detection_count > 0,
        }


