from typing import Optional,List,Dict,Any
import re
import json
from app.services.detection_pattern_service import DetectionPatternService
from app.services.gemini_client import GeminiClient

# Default built-in patterns (fallback if DB not populated)
DANGEROUS_PATTERNS: List[str] = [
    'ignore previous instructions',
    'ignore all previous instructions',
    'ignore your previous instructions',
    'disregard previous instructions',
    'forget previous instructions',
    'from now on',
    'you are now',
    'act as',
    'pretend to be',
    'roleplay as',
    'role play as',
    'jailbreak',
    'dan mode',
    'developer mode',
    'ignore safety',
    'bypass restrictions',
    'override instructions',
    'ignore instructions',
    'new instructions',
    'forget your role',
    'change your role',
    'ignore everything',
    'disregard everything',
    'system prompt',
    'override system',
    'bypass system',
    'ignore system',
    'disable safety',
    'no restrictions',
    'unlimited mode',
    'unrestricted mode',
    'uncensored mode',
]

QUICK_PATTERNS: List[str] = [
    'ignore previous instructions',
    'ignore all previous',
    'from now on',
    'you are now',
    'jailbreak',
    'dan mode',
    'ignore safety',
    'bypass restrictions',
]

SENSITIVE_FILE_PATTERNS: List[re.Pattern] = [
    # Certificate and key files
    re.compile(r"\.key$", re.I),
    re.compile(r"\.pem$", re.I),
    re.compile(r"\.crt$", re.I),
    re.compile(r"\.cer$", re.I),
    re.compile(r"\.p12$", re.I),
    re.compile(r"\.pfx$", re.I),
    re.compile(r"\.jks$", re.I),
    re.compile(r"\.keystore$", re.I),
    
    # Configuration files
    re.compile(r"config\.json$", re.I),
    re.compile(r"config\.yaml$", re.I),
    re.compile(r"config\.yml$", re.I),
    re.compile(r"config\.ini$", re.I),
    re.compile(r"config\.toml$", re.I),
    re.compile(r"secrets?\.json$", re.I),
    re.compile(r"secrets?\.yaml$", re.I),
    re.compile(r"secrets?\.yml$", re.I),
    re.compile(r"auth\.json$", re.I),
    
    # Specific credential files (more specific patterns)
    re.compile(r"password\.txt$", re.I),
    re.compile(r"password\.json$", re.I),
    re.compile(r"password\.yaml$", re.I),
    re.compile(r"passwords?\.txt$", re.I),
    re.compile(r"credentials?\.txt$", re.I),
    re.compile(r"credentials?\.json$", re.I),
    re.compile(r"credentials?\.yaml$", re.I),
    re.compile(r"token\.txt$", re.I),
    re.compile(r"token\.json$", re.I),
    re.compile(r"api[_-]?key\.txt$", re.I),
    re.compile(r"api[_-]?key\.json$", re.I),
    re.compile(r"service[_-]?account\.json$", re.I),
    
    # Cloud provider configs
    re.compile(r"aws[_-]?config$", re.I),
    re.compile(r"aws[_-]?credentials$", re.I),
    re.compile(r"\.aws/", re.I),
    re.compile(r"gcloud[_-]?config$", re.I),
    re.compile(r"azure[_-]?config$", re.I),
    re.compile(r"kubeconfig$", re.I),
    re.compile(r"\.kube/config$", re.I),
    
    # SSH keys
    re.compile(r"id_rsa$", re.I),
    re.compile(r"id_ecdsa$", re.I),
    re.compile(r"id_ed25519$", re.I),
    re.compile(r"ssh_host_", re.I),
    re.compile(r"known_hosts$", re.I),
    re.compile(r"authorized_keys$", re.I),
    
    # Database files
    re.compile(r"database\.yml$", re.I),
    re.compile(r"database\.json$", re.I),
    re.compile(r"db\.conf$", re.I),
    re.compile(r"dump\.sql$", re.I),
    re.compile(r"\.htpasswd$", re.I),
    
    # Application configs
    re.compile(r"wp-config\.php$", re.I),
    re.compile(r"settings\.py$", re.I),
    re.compile(r"local_settings\.py$", re.I),
]

MALICIOUS_EXTENSIONS = {
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr',
    '.vbs', '.js', '.jar', '.ps1', '.sh', '.deb',
    '.rpm', '.dmg', '.pkg', '.msi', '.app'
}

# PII Detection Patterns
PII_PATTERNS = {
    'ssn': re.compile(r'\b\d{3}-?\d{2}-?\d{4}\b'),
    'credit_card': re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'),
    'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
    'phone': re.compile(r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b'),
    'ip_address': re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'),
    'mac_address': re.compile(r'\b(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\b'),
    'jwt_token': re.compile(r'\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b'),
    # More specific API key patterns
    'api_key_sk': re.compile(r'\bsk-[A-Za-z0-9]{20,}\b'),  # OpenAI style
    'api_key_ak': re.compile(r'\bak-[A-Za-z0-9]{20,}\b'),  # Anthropic style
    'api_key_gcp': re.compile(r'\b[A-Za-z0-9]{24,}\b'),    # Google Cloud style (more specific)
    'base64_long': re.compile(r'\b[A-Za-z0-9+/]{40,}={0,2}\b'),  # Only very long base64
}


def _get_dangerous_patterns() -> List[str]:
    db_patterns = DetectionPatternService.get_dangerous_patterns()
    return db_patterns if db_patterns else DANGEROUS_PATTERNS


def _get_quick_patterns() -> List[str]:
    db_patterns = DetectionPatternService.get_quick_patterns()
    return db_patterns if db_patterns else QUICK_PATTERNS


def _get_sensitive_file_regexes() -> List[re.Pattern]:
    db_regexes = DetectionPatternService.get_sensitive_file_regexes()
    return db_regexes if db_regexes else SENSITIVE_FILE_PATTERNS


def _get_malicious_extensions() -> List[str]:
    db_exts = DetectionPatternService.get_malicious_extensions()
    return db_exts if db_exts else list(MALICIOUS_EXTENSIONS)


def contains_pattern(text: Optional[str], patterns: List[str]) -> Optional[str]:
    if not text:
        return None
    lower = text.lower()
    for p in patterns:
        if p in lower:
            return p
    return None

def all_matches(text: Optional[str], patterns: List[str]) -> List[str]:
    if not text:
        return []
    lower = text.lower()
    return [p for p in patterns if p in lower]


def is_sensitive_file(filename: Optional[str]) -> bool:
    if not filename:
        return False
    lower = filename.lower()
    if lower == '.env' or lower.endswith('.env') or '.env.' in lower:
        return True
    regexes = _get_sensitive_file_regexes()
    return any(rx.search(lower) for rx in regexes)


def is_malicious_file(filename: Optional[str]) -> bool:
    if not filename:
        return False
    lower = filename.lower()
    extensions = _get_malicious_extensions()
    return any(lower.endswith(ext) for ext in extensions)


def analyze_file_content(content: str, filename: Optional[str] = None) -> Dict[str, Any]:
    """
    Analyze file content for security patterns and sensitive information.
    
    Args:
        content: The text content of the file
        filename: Optional filename for additional context
        
    Returns:
        Dictionary containing analysis results
    """
    if not content:
        return {
            'is_sensitive': False,
            'is_malicious': False,
            'dangerous_patterns': [],
            'pii_detected': [],
            'risk_score': 0,
            'recommendations': []
        }
    
    # Check for dangerous patterns (DB-backed with fallback)
    dangerous_patterns = all_matches(content, _get_dangerous_patterns())
    
    # Check for PII
    pii_detected = detect_pii(content)
    
    # Check filename if provided
    is_sensitive_file_flag = is_sensitive_file(filename) if filename else False
    is_malicious_file_flag = is_malicious_file(filename) if filename else False
    
    # Calculate risk score (0-100)
    risk_score = 0
    if dangerous_patterns:
        risk_score += len(dangerous_patterns) * 10
    if pii_detected:
        risk_score += len(pii_detected) * 15
    if is_sensitive_file_flag:
        risk_score += 25
    if is_malicious_file_flag:
        risk_score += 50
    
    risk_score = min(risk_score, 100)
    
    # Generate recommendations
    recommendations = []
    if dangerous_patterns:
        recommendations.append("File contains potentially dangerous prompt injection patterns")
    if pii_detected:
        recommendations.append("File contains personally identifiable information (PII)")
    if is_sensitive_file_flag:
        recommendations.append("File appears to contain sensitive configuration or credentials")
    if is_malicious_file_flag:
        recommendations.append("File has a potentially malicious extension")
    
    return {
        'is_sensitive': is_sensitive_file_flag or bool(pii_detected),
        'is_malicious': is_malicious_file_flag,
        'dangerous_patterns': dangerous_patterns,
        'pii_detected': pii_detected,
        'risk_score': risk_score,
        'recommendations': recommendations,
        'filename_analysis': {
            'is_sensitive_file': is_sensitive_file_flag,
            'is_malicious_file': is_malicious_file_flag
        }
    }


def detect_pii(content: str) -> List[Dict[str, Any]]:
    """
    Detect personally identifiable information (PII) in text content.
    
    Args:
        content: The text content to analyze
        
    Returns:
        List of detected PII items with their types and positions
    """
    if not content:
        return []
    
    pii_items: List[Dict[str, Any]] = []

    # Regex-based detection (fast and local)
    for pii_type, pattern in PII_PATTERNS.items():
        matches = pattern.finditer(content)
        for match in matches:
            pii_items.append({
                'type': pii_type,
                'value': match.group(),
                'start': match.start(),
                'end': match.end(),
                'confidence': 0.8
            })

    # Optional Gemini-based detection (semantic and broader)
    # Only run if an API key is configured
    if GeminiClient.is_available():
        prompt = (
            "You are a security analyst. Extract PII (SSN, credit card, email, phone, IP, MAC, JWT/API keys).\n"
            "Return ONLY JSON array of objects with fields: type, value, confidence (0-1). No extra text.\n\n"
            f"Text:\n{content[:4000]}"
        )
        try:
            resp_text = GeminiClient.generate_text(model='gemini-2.5-flash-lite', contents=[prompt])
            if resp_text:
                parsed = json.loads(resp_text)
                if isinstance(parsed, list):
                    for item in parsed:
                        t = (item or {}).get('type')
                        v = (item or {}).get('value')
                        conf = (item or {}).get('confidence', 0.7)
                        if t and v:
                            pii_items.append({
                                'type': str(t),
                                'value': str(v),
                                'start': None,
                                'end': None,
                                'confidence': float(conf)
                            })
        except Exception:
            # On any parsing/call error, skip Gemini results silently
            pass

    # Deduplicate by (type,value)
    seen: set = set()
    deduped: List[Dict[str, Any]] = []
    for item in pii_items:
        key = (item.get('type'), item.get('value'))
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    return deduped
    