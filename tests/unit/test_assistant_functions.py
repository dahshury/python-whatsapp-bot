import unittest
from unittest import mock
import datetime
import sys
from pathlib import Path

# Add the project root to the path so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.services.assistant_functions import (
    send_business_location,
    get_current_datetime,
    modify_id,
    reserve_time_slot,
    cancel_reservation,
    get_available_time_slots
)


class TestSendBusinessLocation(unittest.TestCase):
    @mock.patch('app.services.assistant_functions.is_valid_number')
    @mock.patch('app.services.assistant_functions.send_whatsapp_location')
    @mock.patch('app.services.assistant_functions.config', {
        "BUSINESS_LATITUDE": "1.234",
        "BUSINESS_LONGITUDE": "5.678",
        "BUSINESS_NAME": "Test Business",
        "BUSINESS_ADDRESS": "123 Test St"
    })
    def test_send_business_location_success(self, mock_send_location, mock_is_valid):
        # Setup
        mock_is_valid.return_value = True
        mock_send_location.return_value = {"status": "success"}
        wa_id = "1234567890"
        
        # Execute
        result = send_business_location(wa_id)
        
        # Assert
        self.assertTrue(result["success"])
        self.assertEqual(result["message"], "Location sent.")
        mock_is_valid.assert_called_once_with(wa_id)
        mock_send_location.assert_called_once_with(
            wa_id, 
            "1.234", 
            "5.678", 
            "Test Business", 
            "123 Test St"
        )
    
    @mock.patch('app.services.assistant_functions.is_valid_number')
    @mock.patch('app.services.assistant_functions.send_whatsapp_location')
    def test_send_business_location_error(self, mock_send_location, mock_is_valid):
        # Setup
        mock_is_valid.return_value = True
        mock_send_location.return_value = {"status": "error"}
        wa_id = "1234567890"
        
        # Execute
        result = send_business_location(wa_id)
        
        # Assert
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "System error occurred. try again later.")
    
    @mock.patch('app.services.assistant_functions.is_valid_number')
    def test_send_business_location_invalid_number(self, mock_is_valid):
        # Setup
        mock_is_valid.return_value = {"success": False, "message": "Invalid number"}
        wa_id = "invalid"
        
        # Execute
        result = send_business_location(wa_id)
        
        # Assert
        self.assertEqual(result, {"success": False, "message": "Invalid number"})
        mock_is_valid.assert_called_once_with(wa_id)


class TestGetCurrentDatetime(unittest.TestCase):
    @mock.patch('app.services.assistant_functions.datetime')
    @mock.patch('app.services.assistant_functions.convert')
    def test_get_current_datetime(self, mock_convert, mock_datetime):
        # Setup
        mock_now = mock.MagicMock()
        mock_now.year = 2023
        mock_now.month = 5
        mock_now.day = 15
        mock_now.strftime.side_effect = lambda fmt: "2023-05-15" if fmt == "%Y-%m-%d" else "10:30 AM"
        
        mock_datetime.datetime.now.return_value = mock_now
        
        mock_hijri = mock.MagicMock()
        mock_hijri.year = 1444
        mock_hijri.month = 10
        mock_hijri.day = 25
        
        mock_convert.Gregorian.return_value.to_hijri.return_value = mock_hijri
        
        # Execute
        result = get_current_datetime()
        
        # Assert
        self.assertEqual(result["gregorian_date"], "2023-05-15")
        self.assertEqual(result["makkah_time"], "10:30 AM")
        self.assertEqual(result["hijri_date"], "1444-10-25")
        self.assertFalse(result["is_ramadan"])  # Month 10 is not Ramadan (9)


class TestModifyId(unittest.TestCase):
    @mock.patch('app.services.assistant_functions.is_valid_number')
    @mock.patch('app.services.assistant_functions.get_connection')
    def test_modify_id_success(self, mock_get_connection, mock_is_valid):
        # Setup
        mock_is_valid.return_value = True
        
        mock_conn = mock.MagicMock()
        mock_cursor = mock.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_get_connection.return_value = mock_conn
        
        old_wa_id = "1234567890"
        new_wa_id = "0987654321"
        
        # Execute
        result = modify_id(old_wa_id, new_wa_id)
        
        # Assert
        self.assertTrue(result["success"])
        self.assertEqual(result["message"], "wa_id modified successfully.")
        
        # Verify all tables were updated
        mock_cursor.execute.assert_any_call(
            "UPDATE threads SET wa_id = ? WHERE wa_id = ?", 
            (new_wa_id, old_wa_id)
        )
        mock_cursor.execute.assert_any_call(
            "UPDATE conversation SET wa_id = ? WHERE wa_id = ?", 
            (new_wa_id, old_wa_id)
        )
        mock_cursor.execute.assert_any_call(
            "UPDATE reservations SET wa_id = ? WHERE wa_id = ?", 
            (new_wa_id, old_wa_id)
        )
        mock_cursor.execute.assert_any_call(
            "UPDATE cancelled_reservations SET wa_id = ? WHERE wa_id = ?", 
            (new_wa_id, old_wa_id)
        )
        
        mock_conn.commit.assert_called_once()
        mock_conn.close.assert_called_once()
    
    @mock.patch('app.services.assistant_functions.is_valid_number')
    def test_modify_id_same_ids(self, mock_is_valid):
        # Setup
        mock_is_valid.return_value = True
        wa_id = "1234567890"
        
        # Execute
        result = modify_id(wa_id, wa_id)
        
        # Assert
        self.assertTrue(result["success"])
        self.assertEqual(result["message"], "The new wa_id is the same as the old wa_id.")
    
    @mock.patch('app.services.assistant_functions.is_valid_number')
    def test_modify_id_invalid_number(self, mock_is_valid):
        # Setup
        mock_is_valid.return_value = {"success": False, "message": "Invalid number"}
        old_wa_id = "1234567890"
        new_wa_id = "invalid"
        
        # Execute
        result = modify_id(old_wa_id, new_wa_id)
        
        # Assert
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "Invalid number")


class TestReserveTimeSlot(unittest.TestCase):
    @mock.patch('app.services.assistant_functions.is_valid_number')
    @mock.patch('app.services.assistant_functions.parse_date')
    @mock.patch('app.services.assistant_functions.normalize_time_format')
    @mock.patch('app.services.assistant_functions.datetime')
    @mock.patch('app.services.assistant_functions.get_available_time_slots')
    @mock.patch('app.services.assistant_functions.get_customer_reservations')
    @mock.patch('app.services.assistant_functions.get_connection')
    @mock.patch('app.services.assistant_functions.make_thread')
    @mock.patch('app.services.assistant_functions.convert')
    def test_reserve_time_slot_success_new_reservation(
        self, mock_convert, mock_make_thread, mock_get_connection, 
        mock_get_reservations, mock_get_slots, mock_datetime, 
        mock_normalize_time, mock_parse_date, mock_is_valid
    ):
        # Setup
        mock_is_valid.return_value = True
        mock_parse_date.return_value = "2023-05-15"  # Parsed Gregorian date
        
        # Time normalization mocks
        mock_normalize_time.side_effect = lambda time, to_24h: "14:30" if to_24h else "2:30 PM"
        
        # Datetime mocks
        mock_now = mock.MagicMock()
        mock_now.date.return_value = datetime.date(2023, 5, 1)  # Earlier than reservation date
        mock_datetime.datetime.now.return_value = mock_now
        mock_datetime.datetime.strptime.return_value.replace.return_value = datetime.datetime(2023, 5, 15, 14, 30)
        
        # Slots and reservations mocks
        mock_get_slots.return_value = ["10:30 AM", "2:30 PM", "4:00 PM"]
        mock_get_reservations.return_value = []  # No existing reservations
        
        # Database mocks
        mock_conn = mock.MagicMock()
        mock_cursor = mock.MagicMock()
        mock_cursor.fetchone.return_value = [0]  # No existing reservations for this slot
        mock_conn.cursor.return_value = mock_cursor
        mock_get_connection.return_value = mock_conn
        
        # Hijri conversion mock
        mock_hijri = mock.MagicMock()
        mock_hijri.year = 1444
        mock_hijri.month = 10
        mock_hijri.day = 25
        mock_convert.Gregorian.return_value.to_hijri.return_value = mock_hijri
        
        # Execute
        result = reserve_time_slot(
            wa_id="1234567890",
            customer_name="Test User",
            date_str="2023-05-15",
            time_slot="2:30 PM",
            reservation_type=0
        )
        
        # Assert
        self.assertTrue(result["success"])
        self.assertEqual(result["gregorian_date"], "2023-05-15")
        self.assertEqual(result["hijri_date"], "1444-10-25")
        self.assertEqual(result["time_slot"], "2:30 PM")
        self.assertEqual(result["type"], 0)
        
        # Verify database operations
        mock_make_thread.assert_called_once_with("1234567890")
        mock_cursor.execute.assert_called_with(
            "INSERT INTO reservations (wa_id, customer_name, date, time_slot, type) VALUES (?, ?, ?, ?, ?)",
            ("1234567890", "Test User", "2023-05-15", "14:30", 0)
        )
    
    @mock.patch('app.services.assistant_functions.is_valid_number')
    def test_reserve_time_slot_invalid_number(self, mock_is_valid):
        # Setup
        mock_is_valid.return_value = {"success": False, "message": "Invalid number"}
        
        # Execute
        result = reserve_time_slot(
            wa_id="invalid",
            customer_name="Test User",
            date_str="2023-05-15",
            time_slot="2:30 PM",
            reservation_type=0
        )
        
        # Assert
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "Invalid number")


class TestGetAvailableTimeSlots(unittest.TestCase):
    @mock.patch('app.services.assistant_functions.datetime')
    @mock.patch('app.services.assistant_functions.parse_date')
    @mock.patch('app.services.assistant_functions.is_vacation_period')
    @mock.patch('app.services.assistant_functions.get_time_slots')
    @mock.patch('app.services.assistant_functions.get_connection')
    def test_get_available_time_slots_success(
        self, mock_get_connection, mock_get_time_slots, 
        mock_is_vacation, mock_parse_date, mock_datetime
    ):
        # Setup
        mock_parse_date.return_value = "2023-05-15"
        
        # Date mocks
        mock_now = mock.MagicMock()
        mock_now.date.return_value = datetime.date(2023, 5, 1)  # Earlier than appointment date
        mock_datetime.datetime.now.return_value = mock_now
        mock_datetime.datetime.strptime.return_value.date.return_value = datetime.date(2023, 5, 15)
        
        # Not vacation period
        mock_is_vacation.return_value = (False, "")
        
        # Available time slots
        mock_get_time_slots.return_value = {
            "10:00 AM": 0,
            "11:00 AM": 0,
            "2:00 PM": 0
        }
        
        # Database mocks
        mock_conn = mock.MagicMock()
        mock_cursor = mock.MagicMock()
        mock_cursor.fetchall.return_value = [
            {"time_slot": "10:00", "count": 3},  # 3 reservations for 10:00
            {"time_slot": "14:00", "count": 4}   # 4 reservations for 2:00 PM
        ]
        mock_conn.cursor.return_value = mock_cursor
        mock_get_connection.return_value = mock_conn
        
        # Execute
        result = get_available_time_slots("2023-05-15", max_reservations=5)
        
        # Assert - should return slots with fewer than max_reservations
        self.assertEqual(len(result), 3)
        self.assertIn("10:00 AM", result)
        self.assertIn("11:00 AM", result)
        self.assertIn("2:00 PM", result)
    
    @mock.patch('app.services.assistant_functions.datetime')
    @mock.patch('app.services.assistant_functions.parse_date')
    @mock.patch('app.services.assistant_functions.is_vacation_period')
    def test_get_available_time_slots_vacation_period(
        self, mock_is_vacation, mock_parse_date, mock_datetime
    ):
        # Setup
        mock_parse_date.return_value = "2023-05-15"
        
        # Date mocks
        mock_now = mock.MagicMock()
        mock_now.date.return_value = datetime.date(2023, 5, 1)
        mock_datetime.datetime.now.return_value = mock_now
        mock_datetime.datetime.strptime.return_value.date.return_value = datetime.date(2023, 5, 15)
        
        # Vacation period
        mock_is_vacation.return_value = (True, "Closed for vacation")
        
        # Execute
        result = get_available_time_slots("2023-05-15")
        
        # Assert
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "Closed for vacation")


class TestCancelReservation(unittest.TestCase):
    @mock.patch('app.services.assistant_functions.is_valid_number')
    @mock.patch('app.services.assistant_functions.get_customer_reservations')
    @mock.patch('app.services.assistant_functions.parse_date')
    @mock.patch('app.services.assistant_functions.get_connection')
    def test_cancel_reservation_specific_date(
        self, mock_get_connection, mock_parse_date, 
        mock_get_reservations, mock_is_valid
    ):
        # Setup
        mock_is_valid.return_value = True
        mock_parse_date.return_value = "2023-05-15"
        
        # Mock reservations
        mock_get_reservations.return_value = [
            {
                "wa_id": "1234567890",
                "date": "2023-05-15", 
                "time_slot": "14:30", 
                "customer_name": "Test User", 
                "type": 0,
                "is_future": True
            }
        ]
        
        # Database mocks
        mock_conn = mock.MagicMock()
        mock_cursor = mock.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_get_connection.return_value = mock_conn
        
        # Execute
        result = cancel_reservation("1234567890", date_str="2023-05-15")
        
        # Assert
        self.assertTrue(result["success"])
        self.assertEqual(result["message"], "Reservation cancelled.")
        
        # Verify database operations
        mock_cursor.executemany.assert_called_once()
        mock_cursor.execute.assert_called_once_with(
            "DELETE FROM reservations WHERE wa_id = ? AND date = ?",
            ("1234567890", "2023-05-15")
        )
    
    @mock.patch('app.services.assistant_functions.is_valid_number')
    @mock.patch('app.services.assistant_functions.get_customer_reservations')
    def test_cancel_reservation_no_reservations(self, mock_get_reservations, mock_is_valid):
        # Setup
        mock_is_valid.return_value = True
        mock_get_reservations.return_value = []  # No reservations
        
        # Execute
        result = cancel_reservation("1234567890")
        
        # Assert
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "No reservations found for the customer.")


if __name__ == "__main__":
    unittest.main() 