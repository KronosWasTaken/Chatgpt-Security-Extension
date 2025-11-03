import os


from typing import List, Optional

from pydantic import Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    

    APP_NAME: str = "AI Compliance Platform"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False
    

    DATABASE_URL: str = Field(..., description="PostgreSQL database URL")
    DATABASE_URL_ASYNC: str = Field(..., description="Async PostgreSQL database URL")
    
    

    JWT_SECRET_KEY: str = Field(..., description="JWT secret key")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    

    AUTH0_DOMAIN: Optional[str] = None
    AUTH0_CLIENT_ID: Optional[str] = None
    AUTH0_CLIENT_SECRET: Optional[str] = None
    AUTH0_AUDIENCE: Optional[str] = None
    

    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    AWS_KMS_KEY_ID: Optional[str] = None
    

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,chrome-extension://*,moz-extension://*"
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:5173,chrome-extension://*,moz-extension://*",
        description="Comma-separated list of CORS origins"
    )
    ALLOWED_CREDENTIALS: bool = True
    

    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_BURST: int = 200
    

    SECRET_KEY: str = Field(..., description="Application secret key")
    ENCRYPTION_KEY: str = Field(..., description="Encryption key for sensitive data")
    
    # Monitoring
    PROMETHEUS_ENABLED: bool = True
    PROMETHEUS_PORT: int = 9090
    
    # AI / LLM integrations
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash"
    
    # VirusTotal
    VT_API_KEY: Optional[str] = None
    VT_API_BASE: str = "https://www.virustotal.com/api/v3"
    
    # File Upload Security
    MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024  # 10 MB default
    # Note: Sensitive file extensions (pfx, p12, pem, key) are allowed but will be flagged as threats
    ALLOWED_EXTS: str = "pdf,jpg,jpeg,png,txt,md,zip,json,log,csv,pfx,p12,pem,key,crt,cer,jks"
    ALLOWED_MIME: str = "application/pdf,image/jpeg,image/png,text/plain,text/markdown,application/zip,application/json,text/csv,text/x-log,application/x-pkcs12,application/x-x509-ca-cert"
    
    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True
    

    WEBHOOK_SECRET: Optional[str] = None
    SLACK_WEBHOOK_URL: Optional[str] = None
    

    AUDIT_RETENTION_DAYS: int = 2555  # 7 years for SOC2
    ENCRYPTION_AT_REST: bool = True
    BACKUP_ENABLED: bool = True
    BACKUP_SCHEDULE: str = "0 2 * * *"  # Daily at 2 AM
    
    @property
    def allowed_origins_list(self) -> List[str]:

        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    @validator("ENCRYPTION_KEY")
    def validate_encryption_key(cls, v):

        if len(v) != 32:
            raise ValueError("Encryption key must be exactly 32 characters")
        return v
    
    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        env_file_encoding="utf-8"
        case_sensitive = True



settings = Settings()
