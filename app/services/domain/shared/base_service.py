import abc
import logging
from typing import Optional, Dict, Any
from app.config import config
from app.i18n import get_message
from app.utils import format_response
from app.metrics import FUNCTION_ERRORS


class BaseService(abc.ABC):
    """
    Abstract base class for all domain services.
    Implements common functionality and enforces clean architecture patterns.
    """
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        """
        Initialize base service with dependency injection.
        
        Args:
            logger: Optional logger instance for dependency injection
        """
        self.logger = logger or logging.getLogger(self.__class__.__name__)
        self.timezone = config.get("TIMEZONE", "UTC")
    
    def _handle_error(self, operation: str, error: Exception, ar: bool = False) -> Dict[str, Any]:
        """
        Centralized error handling with metrics and logging.
        
        Args:
            operation: Name of the operation that failed
            error: The exception that occurred
            ar: Whether to return Arabic error messages
            
        Returns:
            Formatted error response
        """
        FUNCTION_ERRORS.labels(function=operation).inc()
        
        # Log the full error with stack trace for debugging
        self.logger.error(f"{operation} failed: {error}", exc_info=True)
        
        # For development/debugging, include more specific error information
        import os
        if os.environ.get('ENVIRONMENT', '').lower() in ('development', 'dev', 'debug'):
            # In development, return more specific error information
            error_details = str(error) if str(error) else error.__class__.__name__
            return format_response(False, message=f"Operation '{operation}' failed: {error_details}")
        
        # In production, return generic message for security
        return format_response(False, message=get_message("system_error_try_later", ar))
    
    def _validate_wa_id(self, wa_id: str, ar: bool = False) -> Optional[Dict[str, Any]]:
        """
        Validate WhatsApp ID using existing validation logic.
        
        Args:
            wa_id: WhatsApp ID to validate
            ar: Whether to return Arabic error messages
            
        Returns:
            None if valid, error response dict if invalid
        """
        from app.utils import is_valid_number
        
        validation_result = is_valid_number(wa_id, ar)
        if validation_result is not True:
            return validation_result
        return None
    
    @abc.abstractmethod
    def get_service_name(self) -> str:
        """Return the service name for logging and metrics."""
        pass 