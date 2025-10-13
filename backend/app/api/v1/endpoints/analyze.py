from typing import Optional, List

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.prompt_analysis_service import PromptAnalysisService
from app.services.pattern_service import contains_pattern, DANGEROUS_PATTERNS, QUICK_PATTERNS


router = APIRouter()


class PromptAnalysisRequest(BaseModel):
    text: str
    clientId: Optional[str] = None
    mspId: Optional[str] = None


class PromptAnalysisResponse(BaseModel):
    isThreats: bool
    threats: List[str]
    riskLevel: str
    summary: str
    quickPattern: Optional[str] = None
    dangerousPattern: Optional[str] = None


@router.post("/prompt", response_model=PromptAnalysisResponse)
async def analyze_prompt(req: PromptAnalysisRequest) -> PromptAnalysisResponse:
    # First, quick local pattern detection similar to extension fallback
    quick = contains_pattern(req.text, QUICK_PATTERNS)
    danger = contains_pattern(req.text, DANGEROUS_PATTERNS)

    llm_result = await PromptAnalysisService.analyze_prompt(req.text)

    return PromptAnalysisResponse(
        isThreats=bool(llm_result.get("isThreats", False)),
        threats=llm_result.get("threats", []) or [],
        riskLevel=llm_result.get("riskLevel", "safe"),
        summary=str(llm_result.get("summary", "")),
        quickPattern=quick,
        dangerousPattern=danger,
    )



