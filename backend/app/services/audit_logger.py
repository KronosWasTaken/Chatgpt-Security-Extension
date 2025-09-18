

import logging
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.prompt_analyzer import PromptAnalysis

logger = logging.getLogger(__name__)


class AuditLogger:

    
    @staticmethod
    async def log_prompt_analysis(
        db: AsyncSession,
        analysis: PromptAnalysis,
        request_data: Dict[str, Any],
    ) -> None:

        
        try:


            
            logger.info(
                f"Audit Log - Prompt Analysis: "
                f"hash={analysis.prompt_hash}, "
                f"risk_score={analysis.risk_score}, "
                f"action={analysis.enforcement_action}, "
                f"detections={len(analysis.detections)}"
            )
            













            
        except Exception as e:
            logger.error(f"Failed to log audit entry: {e}")
    
    @staticmethod
    async def log_policy_violation(
        db: AsyncSession,
        user_id: str,
        client_id: str,
        policy_id: str,
        violation_type: str,
        description: str,
        severity: str,
    ) -> None:

        
        try:
            logger.warning(
                f"Policy Violation - User: {user_id}, "
                f"Client: {client_id}, "
                f"Policy: {policy_id}, "
                f"Type: {violation_type}, "
                f"Severity: {severity}"
            )
            
        except Exception as e:
            logger.error(f"Failed to log policy violation: {e}")
    
    @staticmethod
    async def log_authentication_attempt(
        db: AsyncSession,
        email: str,
        success: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:

        
        try:
            logger.info(
                f"Authentication Attempt - Email: {email}, "
                f"Success: {success}, "
                f"IP: {ip_address}"
            )
            
        except Exception as e:
            logger.error(f"Failed to log authentication attempt: {e}")
    
    @staticmethod
    async def log_authorization_failure(
        db: AsyncSession,
        user_id: str,
        resource: str,
        action: str,
        required_permissions: list,
    ) -> None:

        
        try:
            logger.warning(
                f"Authorization Failure - User: {user_id}, "
                f"Resource: {resource}, "
                f"Action: {action}, "
                f"Required: {required_permissions}"
            )
            
        except Exception as e:
            logger.error(f"Failed to log authorization failure: {e}")
