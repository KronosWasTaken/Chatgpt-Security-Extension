

import hashlib
import re
import time
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shared import DetectionPattern


class Detection:

    
    def __init__(
        self,
        type: str,
        pattern_name: str,
        matches: int,
        severity: str,
        framework: str,
        confidence: float,
    ):
        self.type = type
        self.pattern_name = pattern_name
        self.matches = matches
        self.severity = severity
        self.framework = framework
        self.confidence = confidence


class PromptAnalysis:

    
    def __init__(
        self,
        prompt_hash: str,
        detections: List[Detection],
        risk_score: float,
        enforcement_action: str,
        confidence_score: float,
        analyzed_at: str,
    ):
        self.prompt_hash = prompt_hash
        self.detections = detections
        self.risk_score = risk_score
        self.enforcement_action = enforcement_action
        self.confidence_score = confidence_score
        self.analyzed_at = analyzed_at


class PromptAnalyzer:

    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.patterns = self._load_detection_patterns()
    
    def _load_detection_patterns(self) -> List[Dict]:



        return [
            {
                "name": "SSN",
                "type": "regex",
                "pattern": r"\b\d{3}-?\d{2}-?\d{4}\b",
                "severity": "critical",
                "framework": "HIPAA",
                "confidence": 0.95,
            },
            {
                "name": "Phone",
                "type": "regex", 
                "pattern": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
                "severity": "medium",
                "framework": "HIPAA",
                "confidence": 0.85,
            },
            {
                "name": "Email",
                "type": "regex",
                "pattern": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
                "severity": "medium",
                "framework": "HIPAA",
                "confidence": 0.90,
            },
            {
                "name": "Credit Card",
                "type": "regex",
                "pattern": r"\b(?:\d{4}[-\s]?){3}\d{4}\b",
                "severity": "critical",
                "framework": "Financial",
                "confidence": 0.95,
            },
            {
                "name": "Bank Account",
                "type": "regex",
                "pattern": r"\b\d{8,17}\b",
                "severity": "high",
                "framework": "Financial",
                "confidence": 0.80,
            },
        ]
    
    async def analyze_prompt(
        self,
        prompt: str,
        user_id: str,
        client_id: Optional[str] = None,
        msp_id: Optional[str] = None,
    ) -> PromptAnalysis:

        

        prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()
        

        detections = self._run_detection_patterns(prompt)
        

        risk_score = self._calculate_risk_score(detections)
        

        enforcement_action = await self._determine_enforcement_action(
            detections, risk_score, client_id
        )
        

        confidence_score = self._calculate_confidence_score(detections)
        
        return PromptAnalysis(
            prompt_hash=prompt_hash,
            detections=detections,
            risk_score=risk_score,
            enforcement_action=enforcement_action,
            confidence_score=confidence_score,
            analyzed_at=datetime.utcnow().isoformat(),
        )
    
    def _run_detection_patterns(self, prompt: str) -> List[Detection]:

        detections = []
        
        for pattern in self.patterns:
            if pattern["type"] == "regex":
                matches = re.findall(pattern["pattern"], prompt, re.IGNORECASE)
                if matches:
                    detections.append(Detection(
                        type=pattern["type"],
                        pattern_name=pattern["name"],
                        matches=len(matches),
                        severity=pattern["severity"],
                        framework=pattern["framework"],
                        confidence=pattern["confidence"],
                    ))
        
        return detections
    
    def _calculate_risk_score(self, detections: List[Detection]) -> float:

        if not detections:
            return 0.0
        
        severity_weights = {
            "low": 0.1,
            "medium": 0.3,
            "high": 0.6,
            "critical": 1.0,
        }
        
        total_score = 0.0
        total_weight = 0.0
        
        for detection in detections:
            weight = severity_weights.get(detection.severity, 0.1)
            score = weight * detection.matches * detection.confidence
            total_score += score
            total_weight += weight * detection.matches
        
        if total_weight == 0:
            return 0.0
        
        return min(total_score / total_weight, 1.0)
    
    async def _determine_enforcement_action(
        self,
        detections: List[Detection],
        risk_score: float,
        client_id: Optional[str],
    ) -> str:

        

        critical_detections = [d for d in detections if d.severity == "critical"]
        if critical_detections:
            return "block"
        
        # Risk score-based enforcement
        if risk_score >= 0.7:
            return "block"
        elif risk_score >= 0.4:
            return "warn"
        else:
            return "audit_only"
    
    def _calculate_confidence_score(self, detections: List[Detection]) -> float:
        """Calculate overall confidence score."""
        if not detections:
            return 0.0
        
        total_confidence = sum(d.confidence for d in detections)
        return total_confidence / len(detections)
