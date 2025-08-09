"""
Logging Infrastructure

This module provides structured logging capabilities for the application,
following domain-driven design principles.
"""

import logging
import sys
from pathlib import Path
from typing import Optional


class LoggerFactory:
    """Factory for creating domain-specific loggers."""

    _configured = False

    @classmethod
    def configure_logging(
        cls,
        level: str = "INFO",
        format_string: Optional[str] = None,
        log_file: Optional[Path] = None,
    ) -> None:
        """Configure the logging system."""
        if cls._configured:
            return

        if format_string is None:
            format_string = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, level.upper()))

        # Clear any existing handlers
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)

        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(getattr(logging, level.upper()))
        console_formatter = logging.Formatter(format_string)
        console_handler.setFormatter(console_formatter)
        root_logger.addHandler(console_handler)

        # File handler if specified
        if log_file:
            log_file.parent.mkdir(parents=True, exist_ok=True)
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(getattr(logging, level.upper()))
            file_formatter = logging.Formatter(format_string)
            file_handler.setFormatter(file_formatter)
            root_logger.addHandler(file_handler)

        cls._configured = True

    @classmethod
    def get_logger(cls, name: str) -> logging.Logger:
        """Get a logger for the specified module/domain."""
        if not cls._configured:
            cls.configure_logging()
        return logging.getLogger(name)


# Domain-specific logger factories
def get_migration_logger() -> logging.Logger:
    """Get logger for migration operations."""
    return LoggerFactory.get_logger("migration")


def get_vector_search_logger() -> logging.Logger:
    """Get logger for vector search operations."""
    return LoggerFactory.get_logger("vector_search")


def get_conversation_logger() -> logging.Logger:
    """Get logger for conversation domain."""
    return LoggerFactory.get_logger("conversation")


def get_reservation_logger() -> logging.Logger:
    """Get logger for reservation domain."""
    return LoggerFactory.get_logger("reservation")


def get_customer_logger() -> logging.Logger:
    """Get logger for customer domain."""
    return LoggerFactory.get_logger("customer")


def get_notification_logger() -> logging.Logger:
    """Get logger for notification services."""
    return LoggerFactory.get_logger("notification")


def get_application_logger() -> logging.Logger:
    """Get logger for application services."""
    return LoggerFactory.get_logger("application")


def get_infrastructure_logger() -> logging.Logger:
    """Get logger for infrastructure components."""
    return LoggerFactory.get_logger("infrastructure")


def get_web_logger() -> logging.Logger:
    """Get logger for web/API layer."""
    return LoggerFactory.get_logger("web")


def get_whatsapp_logger() -> logging.Logger:
    """Get logger for WhatsApp operations."""
    return LoggerFactory.get_logger("whatsapp")


def get_service_logger() -> logging.Logger:
    """Get logger for service operations."""
    return LoggerFactory.get_logger("service")


def get_database_logger() -> logging.Logger:
    """Get logger for database operations."""
    return LoggerFactory.get_logger("database")


# Initialize logging on module import
LoggerFactory.configure_logging()
