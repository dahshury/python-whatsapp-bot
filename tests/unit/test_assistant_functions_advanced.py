import unittest
from unittest import mock
import datetime
from zoneinfo import ZoneInfo
import sys
import os
from pathlib import Path

# Add the project root to the path so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.services.assistant_functions import (
    modify_reservation,
    delete_reservation,
    get_customer_reservations,
    search_available_appointments
)


class TestModifyReservation(unittest.TestCase):
    @mock.patch('app.services.assistant_functions.is_valid_number')
    @mock.patch('app.services.assistant_functions.get_customer_reservations')
    @mock.patch('app.services.assistant_functions.parse_date')
    @mock.patch('app.services.assistant_functions.normalize_time_format')
    @mock.patch('app.services.assistant_functions.get_available_time_slots')
    @mock.patch('app.services.assistant_functions.validate_reservation_type')
    @mock.patch('app.services.assistant_functions.get_connection')
    def test_modify_reservation_success(
        self, mock_get_connection, mock_validate_type, mock_get_slots,
        mock_normalize, mock_parse_date, mock_get_reservations, mock_is_valid
    ):
        # Setup
        mock_is_valid.return_value = True
        
        # Customer has 1 future reservation to modify
        mock_get_reservations.return_value = [{
            "date": "2023-05-15",
            "time_slot": "14:30",
            "customer_name": "Old Name",
            "type": 0,
            "is_future": True
        }]
        
        mock_parse_date.return_value = "2023-05-20"  # New date
        
        # Time slot normalization
        mock_normalize.side_effect = lambda time, to_24h: "16:00" if to_24h else "4:00 PM"
        
        # Available slots
        mock_get_slots.return_value = ["10:00 AM", "2:00 PM", "4:00 PM"]
        
        # Type validation
        mock_validate_type.return_value = (True, None, 1)  # Valid type is 1 (Follow-Up)
        
        # Database mocks
        mock_conn = mock.MagicMock()
        mock_cursor = mock.MagicMock()
        mock_cursor.fetchone.return_value = [0]  # No existing reservations at new time
        mock_conn.cursor.return_value = mock_cursor
        mock_get_connection.return_value = mock_conn
        
        # Execute
        result = modify_reservation(
            wa_id="1234567890",
            new_date="2023-05-20",
            new_time_slot="4:00 PM",
            new_name="New Name",
            new_type=1
        )
        
        # Assert
        self.assertTrue(result["success"])
        self.assertEqual(result["message"], "Reservation modified successfully.")
        
        # Verify database operations
        mock_cursor.execute.assert_called_with(
            "UPDATE reservations SET date = ?, time_slot = ?, type = ?, customer_name = ? WHERE wa_id = ? AND date >= ?",
            ["2023-05-20", "16:00", 1, "New Name", "1234567890", mock.ANY]
        )
    
    @mock.patch('app.services.assistant_functions.is_valid_number')
    @mock.patch('app.services.assistant_functions.get_customer_reservations')
    def test_modify_reservation_no_reservations(self, mock_get_reservations, mock_is_valid):
        # Setup
        mock_is_valid.return_value = True
        mock_get_reservations.return_value = []  # No reservations
        
        # Execute
        result = modify_reservation(
            wa_id="1234567890",
            new_date="2023-05-20"
        )
        
        # Assert
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "No upcoming reservations found to modify. Please reserve a new appointment.")
    
    @mock.patch('app.services.assistant_functions.is_valid_number')
    @mock.patch('app.services.assistant_functions.get_customer_reservations')
    def test_modify_reservation_multiple_reservations(self, mock_get_reservations, mock_is_valid):
        # Setup
        mock_is_valid.return_value = True
        
        # Multiple future reservations
        mock_get_reservations.return_value = [
            {
                "date": "2023-05-15",
                "time_slot": "14:30",
                "customer_name": "Customer Name",
                "type": 0,
                "is_future": True
            },
            {
                "date": "2023-05-20",
                "time_slot": "10:30",
                "customer_name": "Customer Name",
                "type": 1,
                "is_future": True
            }
        ]
        
        # Execute
        result = modify_reservation(
            wa_id="1234567890",
            new_date="2023-05-22"
        )
        
        # Assert
        self.assertFalse(result["success"])
        self.assertTrue("Multiple upcoming reservations found" in result["message"])


class TestDeleteReservation(unittest.TestCase):
    @mock.patch('app.services.assistant_functions.is_valid_number')
    @mock.patch('app.services.assistant_functions.get_customer_reservations')
    @mock.patch('app.services.assistant_functions.parse_date')
    @mock.patch('app.services.assistant_functions.normalize_time_format')
    @mock.patch('app.services.assistant_functions.get_connection')
    def test_delete_specific_reservation(
        self, mock_get_connection, mock_normalize, 
        mock_parse_date, mock_get_reservations, mock_is_valid
    ):
        # Setup
        mock_is_valid.return_value = True
        
        # One upcoming reservation
        mock_get_reservations.return_value = [{
            "date": "2023-05-15",
            "time_slot": "14:30",
            "customer_name": "Test User",
            "type": 0,
            "is_future": True
        }]
        
        mock_parse_date.return_value = "2023-05-15"
        mock_normalize.return_value = "14:30"
        
        # Database mocks
        mock_conn = mock.MagicMock()
        mock_cursor = mock.MagicMock()
        mock_cursor.rowcount = 1  # One row affected
        mock_conn.cursor.return_value = mock_cursor
        mock_get_connection.return_value = mock_conn
        
        # Execute
        result = delete_reservation(
            wa_id="1234567890",
            date_str="2023-05-15",
            time_slot="2:30 PM"
        )
        
        # Assert
        self.assertTrue(result["success"])
        self.assertEqual(result["message"], "Reservation removed.")
        
        # Verify database operations
        mock_cursor.execute.assert_called_with(
            "DELETE FROM reservations WHERE wa_id = ? AND date = ? AND time_slot = ?",
            ("1234567890", "2023-05-15", "14:30")
        )
    
    @mock.patch('app.services.assistant_functions.is_valid_number')
    @mock.patch('app.services.assistant_functions.get_customer_reservations')
    @mock.patch('app.services.assistant_functions.get_connection')
    def test_delete_all_reservations(
        self, mock_get_connection, mock_get_reservations, mock_is_valid
    ):
        # Setup
        mock_is_valid.return_value = True
        
        # Multiple reservations
        mock_get_reservations.return_value = [
            {
                "date": "2023-05-15",
                "time_slot": "14:30",
                "customer_name": "Test User",
                "type": 0,
                "is_future": True
            },
            {
                "date": "2023-05-20",
                "time_slot": "10:30",
                "customer_name": "Test User",
                "type": 1,
                "is_future": True
            }
        ]
        
        # Database mocks
        mock_conn = mock.MagicMock()
        mock_cursor = mock.MagicMock()
        mock_cursor.rowcount = 2  # Two rows affected
        mock_conn.cursor.return_value = mock_cursor
        mock_get_connection.return_value = mock_conn
        
        # Execute
        result = delete_reservation(wa_id="1234567890")  # No date or time specified
        
        # Assert
        self.assertTrue(result["success"])
        self.assertEqual(result["message"], "All reservations removed.")
        
        # Verify database operations
        mock_cursor.execute.assert_called_with(
            "DELETE FROM reservations WHERE wa_id = ?",
            ("1234567890",)
        )


class TestGetCustomerReservations(unittest.TestCase):
    @mock.patch('app.services.assistant_functions.is_valid_number')
    @mock.patch('app.services.assistant_functions.get_connection')
    @mock.patch('app.services.assistant_functions.datetime')
    def test_get_customer_reservations_with_future(
        self, mock_datetime, mock_get_connection, mock_is_valid
    ):
        # Setup
        mock_is_valid.return_value = True
        
        # Current date/time mocks
        mock_now = mock.MagicMock()
        mock_now.strftime.return_value = "2023-05-15"  # Current date
        mock_datetime.datetime.now.return_value = mock_now
        
        # Database mocks
        mock_conn = mock.MagicMock()
        mock_cursor = mock.MagicMock()
        
        # Set up mock rows with future and past reservations
        mock_cursor.fetchall.return_value = [
            {
                "date": "2023-05-10",  # Past
                "time_slot": "14:30",
                "customer_name": "Test User",
                "type": 0
            },
            {
                "date": "2023-05-15",  # Today
                "time_slot": "10:30",
                "customer_name": "Test User",
                "type": 1
            },
            {
                "date": "2023-05-20",  # Future
                "time_slot": "16:00",
                "customer_name": "Test User",
                "type": 0
            }
        ]
        
        # For today's reservations, we need to check the time
        # Set up a proper time object to use in datetime.combine
        mock_slot_datetime = mock.MagicMock()
        # This one should be "far" in the future
        mock_slot_datetime.__sub__.return_value.total_seconds.return_value = 7200
        mock_datetime.datetime.strptime.return_value.time.return_value = mock.MagicMock()
        mock_datetime.datetime.combine.return_value = mock_slot_datetime
        
        mock_conn.cursor.return_value = mock_cursor
        mock_get_connection.return_value = mock_conn
        
        # Execute
        result = get_customer_reservations(
            wa_id="1234567890",
            include_past=True
        )
        
        # Assert
        self.assertEqual(len(result), 3)
        
        # Check past reservation
        self.assertEqual(result[0]["date"], "2023-05-10")
        self.assertFalse(result[0]["is_future"])
        
        # Check today's reservation - should be future since we mocked the time delta
        self.assertEqual(result[1]["date"], "2023-05-15")
        self.assertTrue(result[1]["is_future"])
        
        # Check future reservation
        self.assertEqual(result[2]["date"], "2023-05-20")
        self.assertTrue(result[2]["is_future"])
    
    @mock.patch('app.services.assistant_functions.is_valid_number')
    @mock.patch('app.services.assistant_functions.get_connection')
    def test_get_customer_reservations_empty(self, mock_get_connection, mock_is_valid):
        # Setup
        mock_is_valid.return_value = True
        
        # Database mocks
        mock_conn = mock.MagicMock()
        mock_cursor = mock.MagicMock()
        mock_cursor.fetchall.return_value = []  # No reservations
        mock_conn.cursor.return_value = mock_cursor
        mock_get_connection.return_value = mock_conn
        
        # Execute
        result = get_customer_reservations(wa_id="1234567890")
        
        # Assert
        self.assertEqual(result, [])


class TestSearchAvailableAppointments(unittest.TestCase):
    @mock.patch('app.services.assistant_functions.datetime')
    @mock.patch('app.services.assistant_functions.parse_date')
    @mock.patch('app.services.assistant_functions.normalize_time_format')
    @mock.patch('app.services.assistant_functions.get_time_slots')
    @mock.patch('app.services.assistant_functions.is_vacation_period')
    @mock.patch('app.services.assistant_functions.get_connection')
    def test_search_with_specific_time(
        self, mock_get_connection, mock_is_vacation, mock_get_time_slots,
        mock_normalize_time, mock_parse_date, mock_datetime
    ):
        # Setup
        # Create a fixed datetime for testing
        test_date = datetime.datetime(2023, 5, 15, tzinfo=ZoneInfo("Asia/Riyadh"))
        mock_datetime.datetime.now.return_value = test_date
        
        # Normalize time format mocks
        mock_normalize_time.side_effect = lambda time, to_24h: "14:30" if to_24h else "2:30 PM"
        
        # Date parsing mocks
        mock_parse_date.return_value = "2023-05-15"
        
        # Not vacation period for test dates
        mock_is_vacation.return_value = (False, "")
        
        # Available time slots for each day
        mock_get_time_slots.return_value = {
            "10:00 AM": 0,
            "2:30 PM": 0,  # Exact match we're looking for
            "4:00 PM": 0
        }
        
        # Database mocks for reservation counts
        mock_conn = mock.MagicMock()
        mock_cursor = mock.MagicMock()
        # No existing reservations at the time slots we're checking
        mock_cursor.fetchone.return_value = {"count": 0}
        mock_conn.cursor.return_value = mock_cursor
        mock_get_connection.return_value = mock_conn
        
        # Execute
        result = search_available_appointments(
            start_date="2023-05-15",
            time_slot="2:30 PM",  # Looking for this specific time
            days_forward=3  # Only look 3 days ahead for simplicity
        )
        
        # Assert
        self.assertTrue(isinstance(result, list))
        self.assertTrue(len(result) > 0)
        
        # First result should be our exact match
        self.assertEqual(result[0]["date"], "2023-05-15")
        self.assertEqual(result[0]["time_slot"], "2:30 PM")
        self.assertTrue(result[0]["is_exact"])
    
    @mock.patch('app.services.assistant_functions.datetime')
    @mock.patch('app.services.assistant_functions.parse_date')
    @mock.patch('app.services.assistant_functions.get_time_slots')
    @mock.patch('app.services.assistant_functions.is_vacation_period')
    @mock.patch('app.services.assistant_functions.get_connection')
    def test_search_all_slots(
        self, mock_get_connection, mock_is_vacation, 
        mock_get_time_slots, mock_parse_date, mock_datetime
    ):
        # Setup
        # Create a fixed datetime for testing
        test_date = datetime.datetime(2023, 5, 15, tzinfo=ZoneInfo("Asia/Riyadh"))
        mock_datetime.datetime.now.return_value = test_date
        
        # Date parsing mocks
        mock_parse_date.return_value = "2023-05-15"
        
        # Not vacation period for test dates
        mock_is_vacation.return_value = (False, "")
        
        # Available time slots for each day
        mock_get_time_slots.return_value = {
            "10:00 AM": 0,
            "2:30 PM": 0,
            "4:00 PM": 0
        }
        
        # Database mocks for reservation counts
        mock_conn = mock.MagicMock()
        mock_cursor = mock.MagicMock()
        # No existing reservations at the time slots we're checking
        mock_cursor.fetchall.return_value = []
        mock_conn.cursor.return_value = mock_cursor
        mock_get_connection.return_value = mock_conn
        
        # Execute
        result = search_available_appointments(
            start_date="2023-05-15",
            time_slot=None,  # No specific time - should return all slots
            days_forward=1  # Only look 1 day ahead for simplicity
        )
        
        # Assert
        self.assertTrue(isinstance(result, list))
        self.assertTrue(len(result) > 0)
        
        # Each result should have a date and time_slots list
        self.assertTrue("date" in result[0])
        self.assertTrue("time_slots" in result[0])
        self.assertEqual(result[0]["date"], "2023-05-15")
        
        # Check that time slots are returned as dictionaries
        time_slots = result[0]["time_slots"]
        self.assertTrue(isinstance(time_slots, list))
        self.assertTrue(len(time_slots) > 0)
        self.assertTrue("time_slot" in time_slots[0])


if __name__ == "__main__":
    unittest.main() 