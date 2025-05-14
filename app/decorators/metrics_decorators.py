from app.metrics import (
    RESERVATION_REQUESTS, RESERVATION_SUCCESSES, RESERVATION_FAILURES,
    CANCELLATION_REQUESTS, CANCELLATION_SUCCESSES, CANCELLATION_FAILURES,
    MODIFY_REQUESTS, MODIFY_SUCCESSES, MODIFY_FAILURES,
)
from functools import wraps
import logging

# Decorators for domain-specific instrumentation

def instrument_reservation(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        RESERVATION_REQUESTS.inc()
        try:
            result = func(*args, **kwargs)
            if isinstance(result, dict) and result.get("success"):
                RESERVATION_SUCCESSES.inc()
            # Only increment failures on exceptions, not business logic failures
            return result
        except Exception as e:
            # This captures only technical errors (exceptions)
            RESERVATION_FAILURES.inc()
            logging.error(f"Exception in {func.__name__}: {str(e)}")
            raise  # Re-raise the exception
    return wrapper


def instrument_cancellation(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        CANCELLATION_REQUESTS.inc()
        try:
            result = func(*args, **kwargs)
            if isinstance(result, dict) and result.get("success"):
                CANCELLATION_SUCCESSES.inc()
            # Only increment failures on exceptions, not business logic failures
            return result
        except Exception as e:
            # This captures only technical errors (exceptions)
            CANCELLATION_FAILURES.inc()
            logging.error(f"Exception in {func.__name__}: {str(e)}")
            raise  # Re-raise the exception
    return wrapper


def instrument_modification(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        MODIFY_REQUESTS.inc()
        try:
            result = func(*args, **kwargs)
            if isinstance(result, dict) and result.get("success"):
                MODIFY_SUCCESSES.inc()
            # Only increment failures on exceptions, not business logic failures
            return result
        except Exception as e:
            # This captures only technical errors (exceptions)
            MODIFY_FAILURES.inc()
            logging.error(f"Exception in {func.__name__}: {str(e)}")
            raise  # Re-raise the exception
    return wrapper 