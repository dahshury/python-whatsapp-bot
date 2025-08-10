import datetime
from typing import Dict, Any, Optional
from zoneinfo import ZoneInfo
from hijri_converter import convert
from ..shared.base_service import BaseService
from ..customer.customer_service import CustomerService
from .reservation_repository import ReservationRepository
from .reservation_models import Reservation, ReservationType
from .availability_service import AvailabilityService
from app.utils import (
    format_response, fix_unicode_sequence, parse_date, 
    normalize_time_format, is_valid_date_time, validate_reservation_type
)
from app.i18n import get_message
from app.decorators.metrics_decorators import (
    instrument_reservation, instrument_cancellation, instrument_modification
)


class ReservationService(BaseService):
    """
    Domain service for reservation-related business operations.
    Encapsulates reservation business logic and coordinates with repositories.
    """
    
    def __init__(self, 
                 reservation_repository: Optional[ReservationRepository] = None,
                 customer_service: Optional[CustomerService] = None,
                 availability_service: Optional[AvailabilityService] = None,
                 **kwargs):
        """
        Initialize reservation service with dependency injection.
        
        Args:
            reservation_repository: Repository for reservation data access
            customer_service: Service for customer operations
            availability_service: Service for availability checking
        """
        super().__init__(**kwargs)
        self.reservation_repository = reservation_repository or ReservationRepository(self.timezone)
        self.customer_service = customer_service or CustomerService(**kwargs)
        self.availability_service = availability_service or AvailabilityService(
            reservation_repository=self.reservation_repository, **kwargs
        )
    
    def get_service_name(self) -> str:
        return "ReservationService"
    
    def get_customer_reservations(self, wa_id: str, include_past: bool = False) -> Dict[str, Any]:
        """
        Get all reservations for a customer.
        
        Args:
            wa_id: WhatsApp ID of the customer
            include_past: Whether to include past reservations
            
        Returns:
            List of reservations or error response
        """
        try:
            # Validate WhatsApp ID
            validation_error = self._validate_wa_id(wa_id)
            if validation_error:
                return validation_error
            
            # Get reservations from repository
            reservations = self.reservation_repository.find_by_wa_id(wa_id, include_past)
            
            # Convert to dict format for compatibility
            reservation_list = []
            now = datetime.datetime.now(tz=ZoneInfo(self.timezone))
            
            for reservation in reservations:
                reservation_dict = {
                    "date": reservation.date,
                    "time_slot": reservation.time_slot,
                    "customer_name": reservation.customer_name,
                    "type": reservation.type.value,
                    "status": reservation.status,
                    "is_future": reservation.is_future(now)
                }
                reservation_list.append(reservation_dict)
            
            return format_response(True, data=reservation_list)
            
        except Exception as e:
            return self._handle_error("get_customer_reservations", e)
    
    @instrument_reservation
    def reserve_time_slot(self, wa_id: str, customer_name: str, date_str: str, 
                         time_slot: str, reservation_type: int, hijri: bool = False,
                         max_reservations: int = 5, ar: bool = False) -> Dict[str, Any]:
        """
        Reserve a time slot for a customer.
        
        Args:
            wa_id: WhatsApp ID of the customer
            customer_name: Customer's name
            date_str: Date string (in either Hijri or Gregorian format)
            time_slot: Desired time slot (in either 12-hour or 24-hour format)
            reservation_type: Type of reservation (0 for Check-Up, 1 for Follow-Up)
            hijri: If True, treats the input date as Hijri
            max_reservations: Maximum allowed reservations per time slot
            ar: If True, returns error messages in Arabic
            
        Returns:
            Success response with reservation details or error response
        """
        try:
            # Validate WhatsApp ID
            validation_error = self._validate_wa_id(wa_id, ar)
            if validation_error:
                return validation_error
            
            # Validate inputs
            if not customer_name:
                return format_response(False, message=get_message("customer_name_required", ar))
            customer_name = fix_unicode_sequence(customer_name)
            
            # Validate reservation type
            is_valid, error_result, parsed_type = validate_reservation_type(reservation_type, ar)
            if not is_valid:
                return error_result
            reservation_type = parsed_type
            
            # Parse and validate date/time in a single step (ensures no past)
            valid, err_msg, parsed_date_str, parsed_time_str = is_valid_date_time(date_str, time_slot, hijri)
            if not valid:
                return format_response(False, message=err_msg)
            
            # Convert Gregorian to Hijri for output purposes
            hijri_date_obj = convert.Gregorian(*map(int, parsed_date_str.split('-'))).to_hijri()
            hijri_date_str = f"{hijri_date_obj.year}-{hijri_date_obj.month:02d}-{hijri_date_obj.day:02d}"
            
            # Get 12-hour format time for display and validation
            display_time_slot = normalize_time_format(parsed_time_str, to_24h=False)
            
            # Check availability for the requested slot
            result = self.availability_service.get_available_time_slots(parsed_date_str, max_reservations, hijri=False)
            if not result.get("success", False):
                return result
            
            # Extract the time slots array from the response data structure
            result_data = result.get("data", {})
            if isinstance(result_data, dict):
                available_slots = result_data.get("time_slots", [])
            else:
                available_slots = result_data if isinstance(result_data, list) else []
            
            if display_time_slot not in available_slots:
                slots_str = ', '.join(available_slots) if available_slots else "None available"
                return format_response(False, message=get_message("reservation_failed_slot", ar, 
                                                                 slot=display_time_slot, slots=slots_str))
            
            # Check for existing active reservations
            existing_reservations = self.reservation_repository.find_by_wa_id(wa_id)
            future_reservations = [res for res in existing_reservations if res.is_future(datetime.datetime.now(tz=ZoneInfo(self.timezone)))]
            
            if future_reservations:
                # Modify the existing active reservation
                return self.modify_reservation(
                    wa_id, 
                    new_date=parsed_date_str, 
                    new_time_slot=parsed_time_str, 
                    new_name=customer_name, 
                    new_type=reservation_type, 
                    hijri=False, 
                    ar=ar
                )
            
            # Ensure customer record exists
            self.customer_service.get_or_create_customer(wa_id, customer_name)
            
            # Check if there's a cancelled reservation for this exact slot that can be reinstated
            cancelled_reservation = self.reservation_repository.find_cancelled_reservation(wa_id, parsed_date_str, parsed_time_str)
            
            if cancelled_reservation:
                # Reinstate the cancelled reservation
                cancelled_reservation.activate()
                cancelled_reservation.type = ReservationType(reservation_type)
                
                success = self.reservation_repository.update(cancelled_reservation)
                if not success:
                    return self._handle_error("reserve_time_slot", Exception("Failed to reinstate reservation"), ar)
                
                return format_response(True, data={
                    "reservation_id": cancelled_reservation.id,
                    "gregorian_date": parsed_date_str,
                    "hijri_date": hijri_date_str,
                    "time_slot": display_time_slot,
                    "type": reservation_type
                }, message=get_message("reservation_successful", ar))
            
            # Check capacity one more time before creating new reservation
            active_reservations = self.reservation_repository.find_active_by_slot(parsed_date_str, parsed_time_str)
            if len(active_reservations) >= max_reservations:
                return format_response(False, message=get_message("slot_fully_booked", ar))
            
            # Create new reservation
            new_reservation = Reservation(
                wa_id=wa_id,
                date=parsed_date_str,
                time_slot=parsed_time_str,
                type=ReservationType(reservation_type),
                status='active'
            )
            
            reservation_id = self.reservation_repository.save(new_reservation)
            if not reservation_id:
                return self._handle_error("reserve_time_slot", Exception("Failed to save reservation"), ar)
            
            return format_response(True, data={
                "reservation_id": reservation_id,
                "gregorian_date": parsed_date_str,
                "hijri_date": hijri_date_str,
                "time_slot": display_time_slot,
                "type": reservation_type
            }, message=get_message("reservation_successful", ar))
            
        except Exception as e:
            return self._handle_error("reserve_time_slot", e, ar)
    
    @instrument_modification
    def modify_reservation(self, wa_id: str, new_date: Optional[str] = None, 
                          new_time_slot: Optional[str] = None, new_name: Optional[str] = None,
                          new_type: Optional[int] = None, max_reservations: int = 5,
                          approximate: bool = False, hijri: bool = False, ar: bool = False,
                          reservation_id_to_modify: Optional[int] = None) -> Dict[str, Any]:
        """
        Modify an existing reservation for a customer.
        
        Args:
            wa_id: WhatsApp ID of the customer whose reservation should be modified
            new_date: New date for the reservation in ISO format (YYYY-MM-DD)
            new_time_slot: New time slot (either 12-hour or 24-hour format)
            new_name: New customer name
            new_type: Reservation type (0 for Check-Up, 1 for Follow-Up)
            max_reservations: Maximum allowed reservations per time slot
            approximate: If True, reserves the nearest available slot if the requested slot is not available
            hijri: Flag indicating if the provided date is in Hijri format
            ar: If True, returns error messages in Arabic
            reservation_id_to_modify: Specific ID of the reservation to modify (optional)
            
        Returns:
            Success/failure response with message, reservation_id, and original_data for undo.
        """
        try:
            # Validate WhatsApp ID
            validation_error = self._validate_wa_id(wa_id, ar)
            if validation_error:
                return validation_error
            
            # Ensure there is something to modify
            if not any([new_date, new_time_slot, new_name, new_type is not None]):
                return format_response(False, message=get_message("no_new_details", ar))
            
            # Get current time
            now = datetime.datetime.now(tz=ZoneInfo(self.timezone))
            
            reservation_to_modify: Optional[Reservation] = None

            if reservation_id_to_modify:
                reservation_to_modify = self.reservation_repository.find_by_id(reservation_id_to_modify)
                if not reservation_to_modify:
                    return format_response(False, message=get_message("reservation_not_found_id", ar, id=reservation_id_to_modify))
                # Security check: Ensure the reservation belongs to the wa_id if both are provided
                if reservation_to_modify.wa_id != wa_id:
                    # This case should ideally not happen if API is structured well,
                    # but good for defense. The frontend should pass the correct wa_id for the reservation.
                    self.logger.warning(f"Attempt to modify reservation ID {reservation_id_to_modify} with mismatched wa_id {wa_id} (owner is {reservation_to_modify.wa_id})")
                    return format_response(False, message=get_message("reservation_not_found_id", ar, id=reservation_id_to_modify)) # Generic error for security
            else:
                # Get upcoming reservations for the customer
                reservations = self.reservation_repository.find_by_wa_id(wa_id, include_past=False)
                future_reservations = [res for res in reservations if res.is_future(now)]
                
                if not future_reservations:
                    return format_response(False, message=get_message("no_future_reservations", ar))
                
                # For simplicity, target the next upcoming reservation if no specific ID is given.
                # More complex logic might be needed if multiple future reservations exist.
                reservation_to_modify = sorted(future_reservations, key=lambda r: (r.date, r.time_slot))[0]

            if not reservation_to_modify: # Should be caught above, but as a safeguard
                 return format_response(False, message=get_message("reservation_not_found", ar))

            # Store original data for undo
            original_data = {
                "wa_id": reservation_to_modify.wa_id, # Should not change based on this function
                "date": reservation_to_modify.date,
                "time_slot": reservation_to_modify.time_slot,
                "type": reservation_to_modify.type.value,
                "customer_name": reservation_to_modify.customer_name, # Fetch from customer service if needed, or assume repository has it
                "status": reservation_to_modify.status # To revert to original status if it was e.g. cancelled
            }
            
            # Get customer details (original name)
            customer = self.customer_service.repository.find_by_wa_id(wa_id)
            if customer:
                original_data["customer_name"] = customer.customer_name
            else: # Should not happen if reservation exists
                self.logger.error(f"Customer not found for wa_id {wa_id} during modification of reservation {reservation_to_modify.id}")
                # Keep existing name from reservation object as fallback
                original_data["customer_name"] = reservation_to_modify.customer_name


            # --- Apply modifications ---
            changes_made = False
            
            # Update name if provided
            if new_name and new_name != original_data["customer_name"]:
                name_update_result = self.customer_service.update_customer_name(wa_id, new_name, ar)
                if not name_update_result.get("success"):
                    return name_update_result # Propagate error
                reservation_to_modify.customer_name = new_name # Update in-memory object
                changes_made = True
            
            # Update reservation type if provided
            if new_type is not None:
                is_valid_type, type_error_result, parsed_new_type = validate_reservation_type(new_type, ar)
                if not is_valid_type:
                    return type_error_result
                if parsed_new_type != reservation_to_modify.type.value:
                    reservation_to_modify.type = ReservationType(parsed_new_type)
                    changes_made = True
            
            # Handle date and time changes
            parsed_new_date_str = reservation_to_modify.date
            parsed_new_time_str = reservation_to_modify.time_slot
            
            if new_date or new_time_slot:
                # Use current date/time of reservation if only one part is provided for modification
                date_to_parse = new_date or reservation_to_modify.date
                time_to_parse = new_time_slot or reservation_to_modify.time_slot
                
                # Validate new date/time (allows past for modification context, but UI should prevent this for bad UX)
                # The is_valid_date_time check for past dates should be done carefully.
                # For modification, we might allow setting to a "past" slot if it's today but earlier, though this is tricky.
                # Assuming for now that the validation handles "reasonable" future modifications.
                valid_dt, err_msg_dt, temp_parsed_date, temp_parsed_time = is_valid_date_time(
                    date_to_parse, time_to_parse, hijri
                )
                if not valid_dt:
                    return format_response(False, message=err_msg_dt)
                
                parsed_new_date_str = temp_parsed_date
                parsed_new_time_str = temp_parsed_time

                # Check if date/time actually changed
                if parsed_new_date_str != reservation_to_modify.date or parsed_new_time_str != reservation_to_modify.time_slot:
                    changes_made = True

            if not changes_made and new_name is None and new_type is None: # If only date/time considered and they are same
                 return format_response(True, message=get_message("no_actual_change_made", ar), data={
                     "reservation_id": reservation_to_modify.id,
                     "original_data": original_data # Return original data even if no change, for consistency
                 })


            # If date or time slot has changed, check availability of the new slot
            if parsed_new_date_str != reservation_to_modify.date or parsed_new_time_str != reservation_to_modify.time_slot:
                # Check availability of the new slot (excluding the current reservation being modified)
                current_reservations_in_new_slot = self.reservation_repository.find_active_by_slot(parsed_new_date_str, parsed_new_time_str)
                # Filter out the reservation being modified if it happens to be in the same slot (e.g., only type change)
                count_other_reservations = len([
                    res for res in current_reservations_in_new_slot if res.id != reservation_to_modify.id
                ])

                if count_other_reservations >= max_reservations:
                    if approximate:
                        # Attempt to find nearest available slot (simplified example)
                        # This needs more robust implementation in AvailabilityService
                        return format_response(False, message=get_message("slot_unavailable_approx_not_impl", ar))
                    else:
                        return format_response(False, message=get_message("slot_fully_booked", ar))
                
                reservation_to_modify.date = parsed_new_date_str
                reservation_to_modify.time_slot = parsed_new_time_str

            # Persist changes
            # The reservation_to_modify object has all the updated fields now.
            update_success = self.reservation_repository.update(reservation_to_modify)
            
            if not update_success:
                return self._handle_error("modify_reservation", Exception("Failed to update reservation in DB"), ar)

            # Prepare response data
            hijri_date_obj_new = convert.Gregorian(*map(int, reservation_to_modify.date.split('-'))).to_hijri()
            hijri_date_str_new = f"{hijri_date_obj_new.year}-{hijri_date_obj_new.month:02d}-{hijri_date_obj_new.day:02d}"
            display_time_slot_new = normalize_time_format(reservation_to_modify.time_slot, to_24h=False)
            
            return format_response(True, data={
                "reservation_id": reservation_to_modify.id,
                "gregorian_date": reservation_to_modify.date,
                "hijri_date": hijri_date_str_new,
                "time_slot": display_time_slot_new,
                "type": reservation_to_modify.type.value,
                "customer_name": reservation_to_modify.customer_name, # current name
                "original_data": original_data, # Data before modification for undo
                "status": reservation_to_modify.status # current status
            }, message=get_message("reservation_modified_successfully", ar))
            
        except Exception as e:
            return self._handle_error("modify_reservation", e, ar)
    
    @instrument_cancellation
    def cancel_reservation(self, wa_id: str, date_str: Optional[str] = None,
                          hijri: bool = False, ar: bool = False, 
                          reservation_id_to_cancel: Optional[int] = None) -> Dict[str, Any]:
        """
        Cancel a reservation or all reservations for a customer using soft deletion.
        Can cancel a specific reservation by ID or by wa_id and date.
        Only operates on future reservations to prevent cancelling past appointments.
        
        Args:
            wa_id: WhatsApp ID of the customer
            date_str: Date of the reservation in Hijri or Gregorian format (used if reservation_id_to_cancel is None)
            hijri: Flag indicating if the provided date is in Hijri format
            ar: If True, returns messages in Arabic
            reservation_id_to_cancel: Specific ID of the reservation to cancel (optional)
            
        Returns:
            Result of the cancellation operation with success status, message, and cancelled_ids.
        """
        try:
            # Validate WhatsApp ID
            validation_error = self._validate_wa_id(wa_id, ar)
            if validation_error:
                return validation_error
            
            # Get current time for future checks
            now = datetime.datetime.now(tz=ZoneInfo(self.timezone))
            
            cancelled_ids = []
            cancelled_count = 0

            if reservation_id_to_cancel is not None:
                # Find the reservation to ensure it belongs to the wa_id (security/consistency check)
                reservation = self.reservation_repository.find_by_id(reservation_id_to_cancel)
                if not reservation:
                    return format_response(False, message=get_message("reservation_not_found_id", ar, id=reservation_id_to_cancel))
                if reservation.wa_id != wa_id:
                    self.logger.warning(f"Attempt to cancel reservation ID {reservation_id_to_cancel} with mismatched wa_id {wa_id} (owner is {reservation.wa_id})")
                    return format_response(False, message=get_message("reservation_not_found_id", ar, id=reservation_id_to_cancel)) # Generic error for security
                if reservation.status == 'cancelled':
                     return format_response(True, message=get_message("reservation_already_cancelled", ar), data={"cancelled_ids": [reservation_id_to_cancel]})

                # Check if reservation is in the future
                if not reservation.is_future(now):
                    return format_response(False, message=get_message("cannot_cancel_past_reservation", ar, id=reservation_id_to_cancel))

                success = self.reservation_repository.cancel_by_id(reservation_id_to_cancel)
                if success:
                    cancelled_ids.append(reservation_id_to_cancel)
                    cancelled_count = 1
                else:
                    # cancel_by_id returns False if already cancelled or not found, but we checked found.
                    # So this implies it was already cancelled, or an unexpected DB issue.
                    # Re-fetch to confirm status if needed, or assume prior check was enough.
                    return format_response(False, message=get_message("cancellation_failed_specific", ar, id=reservation_id_to_cancel))

            elif date_str: # Cancel specific reservation by date for the wa_id
                parsed_target_date_str = parse_date(date_str, hijri)
                if not parsed_target_date_str:
                    return format_response(False, message=get_message("invalid_date_format", ar))
                
                # Find active reservations for that date for the customer
                # We need to get IDs before they are cancelled.
                active_reservations_on_date = [
                    res for res in self.reservation_repository.find_by_wa_id(wa_id, include_past=True) # Get all to find by date
                    if res.date == parsed_target_date_str and res.status == 'active'
                ]

                if not active_reservations_on_date:
                    return format_response(False, message=get_message("no_reservation_on_date", ar, date=parsed_target_date_str))

                # Filter to only future reservations
                future_reservations_on_date = [
                    res for res in active_reservations_on_date 
                    if res.is_future(now)
                ]
                
                if not future_reservations_on_date:
                    return format_response(False, message=get_message("no_future_reservations_on_date", ar, date=parsed_target_date_str))

                for res in future_reservations_on_date:
                    if self.reservation_repository.cancel_by_id(res.id): # Use cancel_by_id for individual tracking
                        cancelled_ids.append(res.id)
                        cancelled_count += 1
                
                if cancelled_count == 0 and future_reservations_on_date: # Should not happen if logic is correct
                     return format_response(False, message=get_message("cancellation_failed_date", ar, date=parsed_target_date_str))


            else: # Cancel all active future reservations for the wa_id
                # Get IDs of all active future reservations before cancelling
                active_future_reservations = [
                    res for res in self.reservation_repository.find_by_wa_id(wa_id, include_past=False) # only active future ones
                    if res.status == 'active' # Redundant check, but safe
                ]
                
                if not active_future_reservations:
                    return format_response(False, message=get_message("no_future_reservations", ar))
                
                for res in active_future_reservations:
                    cancelled_ids.append(res.id) # Store IDs before batch operation (or rely on repo return)

                # The repository method cancel_by_wa_id (with date_str=None) handles this.
                # It returns the count of affected rows.
                cancelled_count = self.reservation_repository.cancel_by_wa_id(wa_id, date_str=None)
                # If cancelled_count is 0 and we had active_future_reservations, it's an issue.
                # If cancelled_ids were populated based on a prior fetch, use that.

            if cancelled_count > 0:
                return format_response(True, message=get_message("reservations_cancelled_successfully", ar, count=cancelled_count), data={"cancelled_ids": cancelled_ids})
            else:
                # This path could be hit if no reservations were found to cancel, or if cancellation failed for some reason
                # The messages like "no_future_reservations" or "no_reservation_on_date" should catch most cases.
                # If reservation_id_to_cancel was given and it failed, that's handled above.
                return format_response(False, message=get_message("no_reservations_to_cancel", ar))
            
        except Exception as e:
            return self._handle_error("cancel_reservation", e, ar)

    # --- New Undo Specific Service Methods ---

    def undo_cancel_reservation_by_id(self, reservation_id: int, ar: bool = False) -> Dict[str, Any]:
        """
        Reinstates a previously cancelled reservation by its ID. (Undo for cancellation)
        
        Args:
            reservation_id: The ID of the reservation to reinstate.
            ar: If True, returns messages in Arabic.
            
        Returns:
            Success/failure response with message and reservation_id.
        """
        try:
            reservation = self.reservation_repository.find_by_id(reservation_id)
            if not reservation:
                return format_response(False, message=get_message("reservation_not_found_id", ar, id=reservation_id))
            
            if reservation.status == 'active':
                return format_response(True, message=get_message("reservation_already_active", ar, id=reservation_id), data={"reservation_id": reservation_id})

            success = self.reservation_repository.reinstate_by_id(reservation_id)
            if success:
                # Fetch the reinstated reservation to return its details
                reinstated_reservation = self.reservation_repository.find_by_id(reservation_id)
                if reinstated_reservation:
                    hijri_date_obj = convert.Gregorian(*map(int, reinstated_reservation.date.split('-'))).to_hijri()
                    hijri_date_str = f"{hijri_date_obj.year}-{hijri_date_obj.month:02d}-{hijri_date_obj.day:02d}"
                    display_time_slot = normalize_time_format(reinstated_reservation.time_slot, to_24h=False)
                    
                    return format_response(True, message=get_message("reservation_reinstated", ar, id=reservation_id), data={
                        "reservation_id": reinstated_reservation.id,
                        "gregorian_date": reinstated_reservation.date,
                        "hijri_date": hijri_date_str,
                        "time_slot": display_time_slot,
                        "type": reinstated_reservation.type.value,
                        "customer_name": reinstated_reservation.customer_name,
                        "status": reinstated_reservation.status
                    })
                else: # Should not happen if reinstate_by_id was successful
                     return self._handle_error("undo_cancel_reservation_by_id", Exception("Failed to fetch reinstated reservation"), ar)
            else:
                # This means it was not in 'cancelled' state or db error
                return format_response(False, message=get_message("reservation_reinstate_failed", ar, id=reservation_id))
        except Exception as e:
            return self._handle_error("undo_cancel_reservation_by_id", e, ar)

    def undo_reserve_time_slot_by_id(self, reservation_id: int, ar: bool = False) -> Dict[str, Any]:
        """
        Cancels a newly created reservation by its ID. (Undo for reservation)
        This is essentially a targeted cancellation.
        
        Args:
            reservation_id: The ID of the reservation to cancel.
            ar: If True, returns messages in Arabic.
            
        Returns:
            Success/failure response with message and reservation_id.
        """
        try:
            reservation = self.reservation_repository.find_by_id(reservation_id)
            if not reservation:
                return format_response(False, message=get_message("reservation_not_found_id", ar, id=reservation_id))

            if reservation.status == 'cancelled':
                 return format_response(True, message=get_message("reservation_already_cancelled", ar), data={"cancelled_ids": [reservation_id]})

            success = self.reservation_repository.cancel_by_id(reservation_id)
            if success:
                return format_response(True, message=get_message("reservation_cancelled_for_undo", ar, id=reservation_id), data={"cancelled_ids": [reservation_id]})
            else:
                 # This implies it was not 'active' or a DB error.
                return format_response(False, message=get_message("cancellation_failed_specific", ar, id=reservation_id))
        except Exception as e:
            return self._handle_error("undo_reserve_time_slot_by_id", e, ar)
            
    # Helper methods (like _validate_wa_id, _handle_error, etc.) remain the same
    # ... 