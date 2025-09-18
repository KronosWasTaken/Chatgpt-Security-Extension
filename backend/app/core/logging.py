

import logging
import sys
from typing import Any, Dict

import structlog
from structlog.stdlib import LoggerFactory

from app.core.config import settings


def setup_logging() -> None:

    

    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    

    logging.basicConfig(
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        level=getattr(logging, settings.LOG_LEVEL.upper()),
        stream=sys.stdout,
    )
    

    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(name: str) -> structlog.BoundLogger:

    return structlog.get_logger(name)


class AuditLogger:

    
    def __init__(self, name: str = "audit"):
        self.logger = get_logger(name)
    
    def log_authentication(
        self,
        user_id: str,
        email: str,
        success: bool,
        ip_address: str = None,
        **kwargs: Any,
    ) -> None:

        self.logger.info(
            "authentication_event",
            user_id=user_id,
            email=email,
            success=success,
            ip_address=ip_address,
            **kwargs,
        )
    
    def log_authorization(
        self,
        user_id: str,
        resource: str,
        action: str,
        success: bool,
        **kwargs: Any,
    ) -> None:

        self.logger.info(
            "authorization_event",
            user_id=user_id,
            resource=resource,
            action=action,
            success=success,
            **kwargs,
        )
    
    def log_prompt_analysis(
        self,
        user_id: str,
        client_id: str,
        prompt_hash: str,
        risk_score: float,
        enforcement_action: str,
        **kwargs: Any,
    ) -> None:

        self.logger.info(
            "prompt_analysis_event",
            user_id=user_id,
            client_id=client_id,
            prompt_hash=prompt_hash,
            risk_score=risk_score,
            enforcement_action=enforcement_action,
            **kwargs,
        )
    
    def log_policy_violation(
        self,
        user_id: str,
        client_id: str,
        policy_id: str,
        violation_type: str,
        severity: str,
        **kwargs: Any,
    ) -> None:

        self.logger.warning(
            "policy_violation_event",
            user_id=user_id,
            client_id=client_id,
            policy_id=policy_id,
            violation_type=violation_type,
            severity=severity,
            **kwargs,
        )
    
    def log_data_access(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        action: str,
        **kwargs: Any,
    ) -> None:

        self.logger.info(
            "data_access_event",
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            **kwargs,
        )
