

from typing import Any, Dict, Optional


class AIComplianceException(Exception):

    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = 500,
    ):
        self.message = message
        self.details = details or {}
        self.status_code = status_code
        super().__init__(self.message)


class AuthenticationError(AIComplianceException):

    
    def __init__(self, message: str = "Authentication failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, 401)


class AuthorizationError(AIComplianceException):

    
    def __init__(self, message: str = "Insufficient permissions", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, 403)


class ValidationError(AIComplianceException):

    
    def __init__(self, message: str = "Validation error", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, 422)


class NotFoundError(AIComplianceException):

    
    def __init__(self, message: str = "Resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, 404)


class ConflictError(AIComplianceException):

    
    def __init__(self, message: str = "Resource conflict", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, 409)


class RateLimitError(AIComplianceException):

    
    def __init__(self, message: str = "Rate limit exceeded", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, 429)


class DatabaseError(AIComplianceException):

    
    def __init__(self, message: str = "Database error", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, 500)


class ExternalServiceError(AIComplianceException):

    
    def __init__(self, message: str = "External service error", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, 502)


class ComplianceViolationError(AIComplianceException):

    
    def __init__(self, message: str = "Compliance violation", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, 400)
