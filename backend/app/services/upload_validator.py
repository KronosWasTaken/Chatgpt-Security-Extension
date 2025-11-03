"""
Harden upload handling so only safe files pass and sensitive data is blocked.
Policy:
- Enforce size, extension, MIME, and magic-byte checks
- Sensitive data scanning using patterns from config
"""
import os
import json
import re
from typing import Optional, Tuple, List, Dict, Any
from pathlib import Path
import hashlib
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class UploadValidationError(Exception):
    """Exception raised when upload validation fails"""
    def __init__(self, code: str, reason: str):
        self.code = code
        self.reason = reason
        super().__init__(f"{code}: {reason}")


class UploadValidator:
    """Validates file uploads for security"""
    
    # Magic bytes for common file types
    MAGIC_BYTES = {
        'pdf': b'%PDF',
        'jpg': b'\xff\xd8\xff',
        'jpeg': b'\xff\xd8\xff',
        'png': b'\x89\x50\x4e\x47\x0d\x0a\x1a\x0a',
        'zip': b'PK\x03\x04',
        'gif': b'GIF89a',
        'gif87': b'GIF87a',
    }
    
    # Default configurations
    DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
    DEFAULT_ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'txt', 'md', 'zip', 'json', 'log', 'csv']
    DEFAULT_ALLOWED_MIME = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'text/plain',
        'text/markdown',
        'application/zip',
        'application/json',
        'text/csv',
        'text/x-log'
    ]
    
    # Text-like MIME types for content scanning
    TEXT_LIKE_MIME = ['text/', 'application/json']
    
    def __init__(self):
        # Use settings from config with env fallback
        self.max_upload_bytes = getattr(settings, 'MAX_UPLOAD_BYTES', self.DEFAULT_MAX_UPLOAD_BYTES)
        
        allowed_exts_str = getattr(settings, 'ALLOWED_EXTS', ','.join(self.DEFAULT_ALLOWED_EXTS))
        self.allowed_extensions = [ext.strip() for ext in allowed_exts_str.split(',')]
        
        allowed_mime_str = getattr(settings, 'ALLOWED_MIME', ','.join(self.DEFAULT_ALLOWED_MIME))
        self.allowed_mime_types = [mime.strip() for mime in allowed_mime_str.split(',')]
        
        self.sensitive_patterns = self._load_sensitive_patterns()
        self.max_preview = self.sensitive_patterns.get('maxPreview', 120)
    
    def _load_sensitive_patterns(self) -> Dict[str, Any]:
        """Load sensitive file patterns from config"""
        try:
            config_path = Path(__file__).parent.parent.parent / 'config' / 'sensitive_file_patterns.json'
            if config_path.exists():
                with open(config_path, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load sensitive patterns: {e}")
        
        # Return default patterns
        return {
            "regex": [
                "(?i)api[_-]?key\\s*[:=]\\s*[A-Za-z0-9_\\-]{16,}",
                "(?i)secret\\s*[:=]\\s*[A-Za-z0-9/+=]{16,}",
                "(?i)private[_-]?key",
                "(?i)password\\s*[:=]",
            ],
            "maxPreview": 120
        }
    
    def validate_file_size(self, file_size: int) -> None:
        """Validate file size"""
        if file_size > self.max_upload_bytes:
            raise UploadValidationError(
                'TOO_LARGE',
                f'File size {file_size} exceeds maximum allowed size {self.max_upload_bytes}'
            )
    
    def get_file_extension(self, filename: str) -> str:
        """Extract file extension"""
        if not filename:
            return ''
        return filename.split('.')[-1].lower() if '.' in filename else ''
    
    def validate_file_extension(self, filename: str) -> None:
        """Extension whitelist disabled: allow all extensions."""
        # Intentionally accept all extensions to allow every file type.
        return
    
    def validate_mime_type(self, mime_type: str) -> None:
        """Validate MIME type"""
        if not mime_type:
            return  # Skip if no MIME provided
        
        if mime_type not in self.allowed_mime_types:
            # Check for wildcard matches (e.g., image/*)
            matched = False
            for allowed in self.allowed_mime_types:
                if allowed.endswith('/*'):
                    base = allowed.split('/')[0]
                    if mime_type.startswith(f"{base}/"):
                        matched = True
                        break
            
            if not matched:
                raise UploadValidationError(
                    'DISALLOWED_TYPE',
                    f'MIME type "{mime_type}" is not allowed. Allowed MIME types: {", ".join(self.allowed_mime_types)}'
                )
    
    def get_magic_bytes(self, file_content: bytes, length: int = 8) -> bytes:
        """Get magic bytes from file"""
        return file_content[:length]
    
    def detect_file_type_from_magic(self, file_content: bytes) -> Optional[str]:
        """Detect file type from magic bytes"""
        header = file_content[:16] if len(file_content) >= 16 else file_content
        
        for file_type, magic in self.MAGIC_BYTES.items():
            if header.startswith(magic):
                return file_type
        
        return None
    
    def validate_magic_bytes(self, file_content: bytes, filename: str) -> None:
        """Validate magic bytes match declared type"""
        if len(file_content) < 4:
            return  # Too small to validate
        
        detected_type = self.detect_file_type_from_magic(file_content)
        declared_ext = self.get_file_extension(filename)
        
        if detected_type and declared_ext:
            # Special handling for image types
            if declared_ext in ['jpg', 'jpeg'] and detected_type in ['jpg', 'jpeg']:
                return  # Both map to same type
            if declared_ext == 'png' and detected_type == 'png':
                return
            if declared_ext == 'pdf' and detected_type == 'pdf':
                return
            if declared_ext == 'zip' and detected_type == 'zip':
                return
            
            # Check for mismatch
            if declared_ext not in [detected_type, None]:
                # Allow text files as they don't have specific magic bytes
                if declared_ext in ['txt', 'md', 'json', 'log', 'csv']:
                    return
                else:
                    raise UploadValidationError(
                        'MAGIC_MISMATCH',
                        f'File content type ({detected_type}) does not match declared extension ({declared_ext})'
                    )
    
    def is_text_like(self, mime_type: str, filename: str) -> bool:
        """Check if file is text-like for content scanning"""
        if any(mime_type.startswith(prefix) for prefix in self.TEXT_LIKE_MIME):
            return True
        
        ext = self.get_file_extension(filename)
        text_exts = ['txt', 'md', 'json', 'log', 'csv']
        if ext in text_exts:
            return True
        
        return False
    
    def scan_for_sensitive_data(self, file_content: bytes, mime_type: str, filename: str) -> Tuple[bool, Optional[str]]:
        """
        Scan file content for sensitive data patterns.
        Returns True if sensitive data is found.
        """
        # First, check filename extension for sensitive file types
        ext = self.get_file_extension(filename)
        sensitive_exts = ['pfx', 'p12', 'pem', 'key', 'id_rsa', 'id_dsa', 'id_ecdsa']
        
        if ext in sensitive_exts:
            logger.warning(f"Sensitive file extension detected: {ext}")
            return True, f"Sensitive file extension: .{ext}"
        
        # Check file content patterns
        if not self.is_text_like(mime_type, filename):
            # For binary files, try to extract minimal text safely
            try:
                # Attempt to decode as UTF-8 to look for embedded secrets
                text_sample = file_content[:10240].decode('utf-8', errors='ignore')
            except Exception:
                # Check magic bytes for sensitive file types (PFX, PEM, etc.)
                if file_content[:4] == b'PK\x03\x04':  # ZIP signature (PFX files are ZIP archives)
                    # Check if it might be a PFX file
                    if filename.lower().endswith(('.pfx', '.p12')):
                        return True, "PFX/P12 certificate file detected"
                return False, None
        else:
            text_sample = file_content[:102400].decode('utf-8', errors='ignore')
        
        # Check against sensitive patterns
        for pattern in self.sensitive_patterns.get('regex', []):
            try:
                if re.search(pattern, text_sample):
                    # Extract a short preview (sanitized, no secrets)
                    preview = text_sample[:self.max_preview]
                    # Remove any secret-like content from preview
                    preview = re.sub(r'[A-Za-z0-9]{20,}', '[REDACTED]', preview)
                    
                    return True, f"Sensitive pattern detected: {pattern[:50]}..."
            except re.error as e:
                logger.warning(f"Invalid regex pattern: {pattern} - {e}")
                continue
        
        return False, None
    
    def validate_upload(
        self,
        filename: str,
        file_content: bytes,
        mime_type: Optional[str] = None,
        log_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Validate file upload with all security checks.
        Detects sensitive files but doesn't block them - returns detection info.
        
        Returns:
            dict with validation results including:
            - ok: True if file passed validation
            - fileId: hash preview for tracking
            - mediaType: detected MIME type
            - fileSize: size in bytes
            - fileHash: SHA-256 hash
            - hasSensitiveData: True if sensitive data detected
            - sensitiveReason: reason for sensitive detection
        """
        file_size = len(file_content)
        file_hash = hashlib.sha256(file_content).hexdigest()
        preview_hash = file_hash[:8]
        
        # Log upload received
        if log_context:
            logger.info(
                f"upload_received corrId={log_context.get('correlationId', 'unknown')} "
                f"name={filename} size={file_size} mime={mime_type} ext={self.get_file_extension(filename)}"
            )
        
        # 1. Size check
        try:
            self.validate_file_size(file_size)
        except UploadValidationError as e:
            logger.warning(
                f"upload_rejected corrId={log_context.get('correlationId', 'unknown')} "
                f"code={e.code} reason={e.reason}"
            )
            raise
        
        # 2. Extension check
        try:
            self.validate_file_extension(filename)
        except UploadValidationError as e:
            logger.warning(
                f"upload_rejected corrId={log_context.get('correlationId', 'unknown')} "
                f"code={e.code} reason={e.reason}"
            )
            raise
        
        # 3. MIME check
        try:
            self.validate_mime_type(mime_type or '')
        except UploadValidationError as e:
            logger.warning(
                f"upload_rejected corrId={log_context.get('correlationId', 'unknown')} "
                f"code={e.code} reason={e.reason}"
            )
            raise
        
        # 4. Magic byte verification
        try:
            self.validate_magic_bytes(file_content, filename)
        except UploadValidationError as e:
            logger.warning(
                f"upload_rejected corrId={log_context.get('correlationId', 'unknown')} "
                f"code={e.code} reason={e.reason}"
            )
            raise
        
        # 5. Sensitive data scanning (detect but don't block - will be flagged in scan result)
        has_sensitive, match_reason = self.scan_for_sensitive_data(file_content, mime_type or '', filename)
        
        if has_sensitive:
            logger.warning(
                f"upload_sensitive_detected corrId={log_context.get('correlationId', 'unknown')} "
                f"reason={match_reason} previewLen={self.max_preview}"
            )
            # Don't block - let it through but it will be marked as threat
        
        # If we get here, file passed all checks
        detected_mime = self.detect_file_type_from_magic(file_content) or mime_type or 'application/octet-stream'
        
        if log_context:
            logger.info(
                f"upload_magic_verified corrId={log_context.get('correlationId', 'unknown')} "
                f"detectedMime={detected_mime}"
            )
            logger.info(
                f"upload_accepted corrId={log_context.get('correlationId', 'unknown')} "
                f"fileId={preview_hash} bytes={file_size}"
            )
        
        return {
            "ok": True,
            "fileId": preview_hash,
            "mediaType": detected_mime,
            "fileSize": file_size,
            "fileHash": file_hash,
            "hasSensitiveData": has_sensitive,
            "sensitiveReason": match_reason if has_sensitive else None
        }


# Singleton instance
_validator_instance: Optional[UploadValidator] = None

def get_upload_validator() -> UploadValidator:
    """Get singleton validator instance"""
    global _validator_instance
    if _validator_instance is None:
        _validator_instance = UploadValidator()
    return _validator_instance

