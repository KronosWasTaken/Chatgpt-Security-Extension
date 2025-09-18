

import logging
from typing import Dict, Any

from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response

logger = logging.getLogger(__name__)


REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

ACTIVE_CONNECTIONS = Gauge(
    'active_connections',
    'Number of active connections'
)

PROMPT_ANALYSIS_COUNT = Counter(
    'prompt_analysis_total',
    'Total prompt analyses',
    ['client_id', 'enforcement_action', 'risk_level']
)

POLICY_VIOLATIONS = Counter(
    'policy_violations_total',
    'Total policy violations',
    ['client_id', 'violation_type', 'severity']
)

AUTHENTICATION_ATTEMPTS = Counter(
    'authentication_attempts_total',
    'Total authentication attempts',
    ['result', 'method']
)

DATABASE_QUERY_DURATION = Histogram(
    'database_query_duration_seconds',
    'Database query duration in seconds',
    ['operation', 'table']
)


def setup_monitoring() -> None:

    logger.info("Setting up monitoring and metrics collection")
    

    ACTIVE_CONNECTIONS.set(0)
    
    logger.info("Monitoring setup complete")


def record_request_metrics(request: Request, response: Response, duration: float) -> None:

    method = request.method
    endpoint = request.url.path
    status_code = str(response.status_code)
    
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
    REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)


def record_prompt_analysis(
    client_id: str,
    enforcement_action: str,
    risk_level: str,
) -> None:

    PROMPT_ANALYSIS_COUNT.labels(
        client_id=client_id,
        enforcement_action=enforcement_action,
        risk_level=risk_level,
    ).inc()


def record_policy_violation(
    client_id: str,
    violation_type: str,
    severity: str,
) -> None:

    POLICY_VIOLATIONS.labels(
        client_id=client_id,
        violation_type=violation_type,
        severity=severity,
    ).inc()


def record_authentication_attempt(result: str, method: str) -> None:

    AUTHENTICATION_ATTEMPTS.labels(result=result, method=method).inc()


def record_database_query(operation: str, table: str, duration: float) -> None:

    DATABASE_QUERY_DURATION.labels(operation=operation, table=table).observe(duration)


def get_metrics() -> str:

    return generate_latest()


def get_metrics_content_type() -> str:

    return CONTENT_TYPE_LATEST
