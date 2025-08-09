import httpx

from app.infrastructure.logging import get_service_logger


# Set up domain-specific logger
logger = get_service_logger()


def log_http_response(response: httpx.Response) -> None:
    logger.info("Status: %s", response.status_code)
    logger.info("Content-type: %s", response.headers.get('content-type'))
    logger.info("Body: %s", response.text)
