from functools import wraps

from app.infrastructure.logging import get_service_logger
from app.metrics import (
    CANCELLATION_FAILURES,
    CANCELLATION_REQUESTS,
    CANCELLATION_SUCCESSES,
    MODIFY_FAILURES,
    MODIFY_REQUESTS,
    MODIFY_SUCCESSES,
    RESERVATION_FAILURES,
    RESERVATION_REQUESTS,
    RESERVATION_SUCCESSES,
)


# Set up domain-specific logger
logger = get_service_logger()


# Decorators for domain-specific instrumentation


def instrument_reservation(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        RESERVATION_REQUESTS.inc()
        try:
            result = func(*args, **kwargs)
        except (ValueError, KeyError, TypeError, OSError):
            # This captures only technical errors (exceptions)
            RESERVATION_FAILURES.inc()
            logger.exception("Exception in %s", func.__name__)
            raise  # Re-raise the exception
        else:
            if isinstance(result, dict) and result.get("success"):
                RESERVATION_SUCCESSES.inc()
            # Only increment failures on exceptions, not business logic failures
            return result

    return wrapper


def instrument_cancellation(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        CANCELLATION_REQUESTS.inc()
        try:
            result = func(*args, **kwargs)
        except (ValueError, KeyError, TypeError, OSError):
            # This captures only technical errors (exceptions)
            CANCELLATION_FAILURES.inc()
            logger.exception("Exception in %s", func.__name__)
            raise  # Re-raise the exception
        else:
            if isinstance(result, dict) and result.get("success"):
                CANCELLATION_SUCCESSES.inc()
            # Only increment failures on exceptions, not business logic failures
            return result

    return wrapper


def instrument_modification(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        MODIFY_REQUESTS.inc()
        try:
            result = func(*args, **kwargs)
        except (ValueError, KeyError, TypeError, OSError):
            # This captures only technical errors (exceptions)
            MODIFY_FAILURES.inc()
            logger.exception("Exception in %s", func.__name__)
            raise  # Re-raise the exception
        else:
            if isinstance(result, dict) and result.get("success"):
                MODIFY_SUCCESSES.inc()
            # Only increment failures on exceptions, not business logic failures
            return result

    return wrapper
