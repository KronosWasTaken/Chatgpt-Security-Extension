import logging
import os
from logging.handlers import RotatingFileHandler


_LOGGERS_CONFIGURED = False


def configure_logging():
    """Configure root and app loggers with console + rotating file handlers.

    - Writes to logs/app.log with rotation
    - ISO timestamps and levels
    - Avoid duplicate handlers across reloads
    - Disables propagation for app loggers to prevent double printing
    """
    global _LOGGERS_CONFIGURED
    if _LOGGERS_CONFIGURED:
        return

    log_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, log_level_name, logging.INFO)

    # Ensure logs directory exists
    log_dir = os.path.join(os.getcwd(), "logs")
    try:
        os.makedirs(log_dir, exist_ok=True)
    except Exception:
        # Fallback to current directory if creation fails
        log_dir = os.getcwd()

    log_file_path = os.path.join(log_dir, "app.log")

    # Create formatter with ISO 8601 timestamps
    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)s %(name)s - %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)

    # Rotating file handler (5 MB each, keep 5 backups)
    file_handler = RotatingFileHandler(
        log_file_path, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)

    # Root logger setup
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    # Remove pre-existing handlers to avoid duplicates on reload
    for h in list(root_logger.handlers):
        root_logger.removeHandler(h)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # Key app loggers - prevent propagation to avoid duplicates in some servers
    for name in [
        "structured",
        "access",
        "app",
        "app.api.analyze",
        "app.api.scan",
    ]:
        logger = logging.getLogger(name)
        logger.setLevel(level)
        logger.propagate = True  # allow root to output; do not add separate handlers here

    _LOGGERS_CONFIGURED = True


