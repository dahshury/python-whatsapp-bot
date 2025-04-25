from app.metrics import (
    RESERVATION_REQUESTS, RESERVATION_SUCCESSES, RESERVATION_FAILURES,
    CANCELLATION_REQUESTS, CANCELLATION_SUCCESSES, CANCELLATION_FAILURES,
    MODIFY_REQUESTS, MODIFY_SUCCESSES, MODIFY_FAILURES,
)
from functools import wraps

# Decorators for domain-specific instrumentation

def instrument_reservation(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        RESERVATION_REQUESTS.inc()
        result = func(*args, **kwargs)
        if isinstance(result, dict) and result.get("success"):
            RESERVATION_SUCCESSES.inc()
        else:
            RESERVATION_FAILURES.inc()
        return result
    return wrapper


def instrument_cancellation(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        CANCELLATION_REQUESTS.inc()
        result = func(*args, **kwargs)
        if isinstance(result, dict) and result.get("success"):
            CANCELLATION_SUCCESSES.inc()
        else:
            CANCELLATION_FAILURES.inc()
        return result
    return wrapper


def instrument_modification(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        MODIFY_REQUESTS.inc()
        result = func(*args, **kwargs)
        if isinstance(result, dict) and result.get("success"):
            MODIFY_SUCCESSES.inc()
        else:
            MODIFY_FAILURES.inc()
        return result
    return wrapper 