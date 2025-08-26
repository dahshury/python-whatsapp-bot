"""
Assistant Functions - Complete Domain Service Implementation

This module provides the complete refactored assistant functions using
Domain-Driven Design architecture with specialized domain services.

All functions maintain backward compatibility while using clean architecture.
"""

import logging
from typing import Dict, Any, Optional

# Domain Services
from .domain.shared.datetime_service import DateTimeService
from .domain.customer.customer_service import CustomerService
from .domain.notification.whatsapp_service import WhatsAppService
from .domain.reservation.reservation_service import ReservationService
from .domain.reservation.availability_service import AvailabilityService

# Utility imports
from app.utils import format_response


class AssistantFunctionService:
    """
    Main service class that orchestrates all domain services.
    
    This class follows the Facade pattern to provide a unified interface
    while delegating to specialized domain services with dependency injection.
    """
    
    def __init__(self):
        """Initialize the service with all domain services."""
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Initialize domain services with dependency injection
        self.datetime_service = DateTimeService(logger=self.logger)
        self.customer_service = CustomerService(logger=self.logger)
        self.whatsapp_service = WhatsAppService(logger=self.logger)
        self.reservation_service = ReservationService(
            customer_service=self.customer_service,
            logger=self.logger
        )
        self.availability_service = AvailabilityService(
            reservation_repository=self.reservation_service.reservation_repository,
            logger=self.logger
        )
    
    # DateTime operations
    
    def get_current_datetime(self) -> Dict[str, Any]:
        """Get current date and time information."""
        return self.datetime_service.get_current_datetime()
    
    # Customer operations
    
    def modify_id(self, old_wa_id: str, new_wa_id: str, ar: bool = False) -> Dict[str, Any]:
        """Modify customer WhatsApp ID."""
        return self.customer_service.modify_customer_wa_id(old_wa_id, new_wa_id, ar)
    
    # Notification operations
    
    def send_business_location(self, wa_id: str) -> Dict[str, Any]:
        """Send business location via WhatsApp."""
        return self.whatsapp_service.send_business_location(wa_id)
    
    # Reservation operations
    
    def get_customer_reservations(self, wa_id: str, include_past: bool = False) -> Dict[str, Any]:
        """Get customer reservations."""
        return self.reservation_service.get_customer_reservations(wa_id, include_past)
    
    def reserve_time_slot(self, wa_id: str, customer_name: str, date_str: str, 
                         time_slot: str, reservation_type: int, hijri: bool = False,
                         max_reservations: int = 5, ar: bool = False) -> Dict[str, Any]:
        """Reserve a time slot for a customer."""
        return self.reservation_service.reserve_time_slot(
            wa_id, customer_name, date_str, time_slot, reservation_type,
            hijri, max_reservations, ar
        )
    
    def modify_reservation(self, wa_id: str, new_date: Optional[str] = None, 
                          new_time_slot: Optional[str] = None, new_name: Optional[str] = None,
                          new_type: Optional[int] = None, max_reservations: int = 5,
                          approximate: bool = False, hijri: bool = False, ar: bool = False,
                          reservation_id_to_modify: Optional[int] = None) -> Dict[str, Any]:
        """Modify an existing reservation."""
        return self.reservation_service.modify_reservation(
            wa_id, new_date, new_time_slot, new_name, new_type,
            max_reservations, approximate, hijri, ar, reservation_id_to_modify
        )
    
    def cancel_reservation(self, wa_id: str, date_str: Optional[str] = None,
                          hijri: bool = False, ar: bool = False,
                          reservation_id_to_cancel: Optional[int] = None) -> Dict[str, Any]:
        """Cancel a customer reservation."""
        return self.reservation_service.cancel_reservation(wa_id, date_str, hijri, ar, reservation_id_to_cancel)
    
    # Availability operations
    
    def get_available_time_slots(self, date_str: str, max_reservations: int = 5,
                                hijri: bool = False) -> Dict[str, Any]:
        """Get available time slots for a date."""
        return self.availability_service.get_available_time_slots(date_str, max_reservations, hijri)
    
    def search_available_appointments(self, start_date: Optional[str] = None,
                                    time_slot: Optional[str] = None, days_forward: int = 3,
                                    days_backward: int = 0, max_reservations: int = 5,
                                    hijri: bool = False) -> Dict[str, Any]:
        """Search for available appointment slots."""
        return self.availability_service.search_available_appointments(
            start_date, time_slot, days_forward, days_backward, max_reservations, hijri
        )
    
    # Utility operations
    
    def think(self, thought: str) -> Dict[str, Any]:
        """AI thinking function for structured reasoning."""
        self.logger.debug(f"Thinking: {thought}")
        return format_response(True, data={"thought": thought})

    # --- New Undo-specific methods exposed through AssistantFunctionService ---
    def undo_cancel_reservation(self, reservation_id: int, ar: bool = False, max_reservations: int = 5) -> Dict[str, Any]:
        """Undo a reservation cancellation (reinstate it)."""
        return self.reservation_service.undo_cancel_reservation_by_id(reservation_id, ar, max_reservations)

    def undo_reserve_time_slot(self, reservation_id: int, ar: bool = False) -> Dict[str, Any]:
        """Undo a time slot reservation (cancel it)."""
        return self.reservation_service.undo_reserve_time_slot_by_id(reservation_id, ar)


# Global service instance
_service = AssistantFunctionService()

# Public function interface (maintains complete backward compatibility)

def send_business_location(wa_id: str) -> Dict[str, Any]:
    """
    Sends the business WhatsApp location message using the WhatsApp API.
    
    Parameters:
        wa_id (str): WhatsApp ID to send the location to
        
    Returns:
        dict: Result of the operation with success status and message
    """
    return _service.send_business_location(wa_id)


def get_current_datetime() -> Dict[str, Any]:
    """
    Get the current date and time in both Hijri and Gregorian calendars.
    Includes vacation information when a vacation is approaching within 1 month or currently active.
    
    Returns:
        dict: A dictionary containing current datetime information in both calendars.
              When vacation info is applicable, also includes:
              - vacation_info: {status: "current"/"upcoming", message: str, ...}
              - vacation_start_gregorian/hijri: (for upcoming vacations)
              - vacation_end_gregorian/hijri: (for current/upcoming vacations)
    """
    return _service.get_current_datetime()


def modify_id(old_wa_id: str, new_wa_id: str, ar: bool = False) -> Dict[str, Any]:
    """
    Modify the WhatsApp ID (wa_id) for a customer in all related database tables.
    
    Parameters:
        old_wa_id (str): The current WhatsApp ID to be replaced
        new_wa_id (str): The new WhatsApp ID to replace with
        ar (bool, optional): If True, returns error messages in Arabic
        
    Returns:
        dict: Result of the modification operation with success status and message
    """
    return _service.modify_id(old_wa_id, new_wa_id, ar)


def modify_reservation(wa_id: str, new_date: Optional[str] = None, 
                      new_time_slot: Optional[str] = None, new_name: Optional[str] = None,
                      new_type: Optional[int] = None, max_reservations: int = 5,
                      approximate: bool = False, hijri: bool = False, ar: bool = False,
                      reservation_id_to_modify: Optional[int] = None) -> Dict[str, Any]:
    """
    Modify the reservation for an existing customer.

    Parameters:
        wa_id (str): WhatsApp ID of the customer whose reservation should be modified
        new_date (str, optional): New date for the reservation in ISO format (YYYY-MM-DD)
        new_time_slot (str, optional): New time slot (either 12-hour or 24-hour format)
        new_name (str, optional): New customer name
        new_type (int, optional): Reservation type (0 for Check-Up, 1 for Follow-Up)
        max_reservations (int, optional): Maximum allowed reservations per time slot (used if new slot chosen)
        approximate (bool, optional): If True, reserves the nearest available slot if requested is unavailable
        hijri (bool): Flag indicating if the provided date is in Hijri format
        ar (bool): If True, returns error messages in Arabic
        reservation_id_to_modify (int, optional): Specific ID of the reservation to modify.
        
    Returns:
        dict: Result of the modification operation with success status, message, reservation_id, and original_data.
    """
    return _service.modify_reservation(
        wa_id, new_date, new_time_slot, new_name, new_type,
        max_reservations, approximate, hijri, ar, reservation_id_to_modify
    )


def get_customer_reservations(wa_id: str, include_past: bool = False) -> Dict[str, Any]:
    """
    Get the list of all reservations for the given WhatsApp ID.

    Parameters:
        wa_id (str): WhatsApp ID of the customer to retrieve reservations for
        include_past (bool, optional): If True, includes past reservations in the result

    Returns:
        dict: Result with list of reservation dictionaries or error information
    """
    return _service.get_customer_reservations(wa_id, include_past)


def reserve_time_slot(wa_id: str, customer_name: str, date_str: str, 
                     time_slot: str, reservation_type: int, hijri: bool = False,
                     max_reservations: int = 5, ar: bool = False) -> Dict[str, Any]:
    """
    Reserve a time slot for a customer.
    
    Parameters:
        wa_id (str): WhatsApp ID of the customer
        customer_name (str): Customer's name
        date_str (str): Date string (in either Hijri or Gregorian format)
        time_slot (str): Desired time slot (in either 12-hour or 24-hour format)
        reservation_type (int): Type of reservation (0 for Check-Up, 1 for Follow-Up)
        hijri (bool, optional): If True, treats the input date as Hijri
        max_reservations (int, optional): Maximum allowed reservations per time slot
        ar (bool, optional): If True, returns error messages in Arabic
    
    Returns:
        dict: Result of the reservation operation with success status and details
    """
    return _service.reserve_time_slot(
        wa_id, customer_name, date_str, time_slot, reservation_type,
        hijri, max_reservations, ar
    )


def cancel_reservation(wa_id: str, date_str: Optional[str] = None,
                      hijri: bool = False, ar: bool = False,
                      reservation_id_to_cancel: Optional[int] = None) -> Dict[str, Any]:
    """
    Cancel a reservation or all reservations for a customer using soft deletion.
    
    Parameters:
        wa_id (str): WhatsApp ID of the customer whose reservation(s) should be cancelled
        date_str (str, optional): Date of the reservation in Hijri or Gregorian format (used if ID not provided)
        hijri (bool, optional): Flag indicating if the provided date is in Hijri format
        ar (bool, optional): If True, returns messages in Arabic
        reservation_id_to_cancel (int, optional): Specific ID of the reservation to cancel.
        
    Returns:
        dict: Result of the cancellation operation with success status, message and cancelled_ids.
    """
    return _service.cancel_reservation(wa_id, date_str, hijri, ar, reservation_id_to_cancel)


def get_available_time_slots(date_str: str, max_reservations: int = 5, hijri: bool = False) -> Dict[str, Any]:
    """
    Get the available time slots for a given date.
    
    Parameters:
        date_str (str): Date string to get available time slots for
        max_reservations (int, optional): Maximum number of active reservations allowed per time slot
        hijri (bool, optional): Flag indicating if the provided date string is in Hijri format (for parsing only)
        
    Returns:
        dict: Result with both Hijri and Gregorian dates plus available time slots. 
              Format: {"success": bool, "data": {"gregorian_date": str, "hijri_date": str, "time_slots": [str]}}
    """
    return _service.get_available_time_slots(date_str, max_reservations, hijri)


def search_available_appointments(start_date: Optional[str] = None,
                                time_slot: Optional[str] = None, days_forward: int = 3,
                                days_backward: int = 0, max_reservations: int = 5,
                                hijri: bool = False) -> Dict[str, Any]:
    """
    Search for available appointment slots across a range of dates.
    
    Parameters:
        start_date (str or datetime.date, optional): The date to start searching from
        time_slot (str, optional): The time slot to search for (12-hour or 24-hour format)
        days_forward (int, optional): Number of days to search ahead
        days_backward (int, optional): Number of days to search in the past
        max_reservations (int, optional): Maximum allowed reservations per time slot
        hijri (bool, optional): If True, treats input start_date as Hijri format (for parsing only)
    
    Returns:
        dict: Result with available appointments and vacation information when applicable.
              Format: {
                  "success": bool,
                  "data": {
                      "appointments": [...], 
                      "vacation_info": {...} (if vacation approaching/current),
                      "vacation_start_gregorian": str (if upcoming),
                      "vacation_start_hijri": str (if upcoming),
                      "vacation_end_gregorian": str (if current/upcoming),
                      "vacation_end_hijri": str (if current/upcoming)
                  }
              }
    """
    return _service.search_available_appointments(
        start_date, time_slot, days_forward, days_backward, max_reservations, hijri
    )


def undo_cancel_reservation(reservation_id: int, ar: bool = False, max_reservations: int = 5) -> Dict[str, Any]:
    """
    Reinstates a previously cancelled reservation by its ID.

    Parameters:
        reservation_id (int): The ID of the reservation to reinstate.
        ar (bool, optional): If True, returns messages in Arabic.
        max_reservations (int, optional): Capacity limit per slot to enforce on reinstate.

    Returns:
        dict: Result of the reinstatement operation.
    """
    return _service.undo_cancel_reservation(reservation_id, ar, max_reservations)


def undo_reserve_time_slot(reservation_id: int, ar: bool = False) -> Dict[str, Any]:
    """
    Cancels a newly created reservation by its ID (undo for reserve).

    Parameters:
        reservation_id (int): The ID of the reservation to cancel.
        ar (bool, optional): If True, returns messages in Arabic.

    Returns:
        dict: Result of the cancellation operation.
    """
    return _service.undo_reserve_time_slot(reservation_id, ar)


def think(thought: str) -> Dict[str, Any]:
    """
    A tool for Claude to use for structured thinking during complex tasks.
    
    Parameters:
        thought (str): The thought content from Claude
        
    Returns:
        dict: A success response containing the thought
    """
    return _service.think(thought) 