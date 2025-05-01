import os
import sys
import unittest
import asyncio
from unittest.mock import patch, MagicMock
import datetime
from zoneinfo import ZoneInfo

# Add the parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.scheduler import send_reminders_job
from app.config import configure_logging

# Configure logging
configure_logging()

class TestReminders(unittest.TestCase):
    """Test cases for the reminders functionality"""
    
    @patch('app.scheduler.get_tomorrow_reservations')
    @patch('app.scheduler.send_whatsapp_template')
    @patch('app.scheduler.append_message')
    async def test_send_reminder_to_specific_number(self, mock_append_message, mock_send_template, mock_get_reservations):
        """Test sending reminder to a specific wa_id"""
        # Setup the test data
        test_wa_id = "201017419800"
        test_time_slot = "11:00 AM"
        
        # Mock the database response
        mock_reservation = {
            'wa_id': test_wa_id,
            'time_slot': test_time_slot,
            'customer_name': 'Test Customer',
            'date': (datetime.datetime.now() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        }
        mock_get_reservations.return_value = {
            'success': True,
            'data': [mock_reservation]
        }
        
        # Mock the template response
        mock_send_template.return_value = {
            'status': 'success',
            'message': 'Template sent successfully'
        }
        
        # Call the function to be tested
        await send_reminders_job()
        
        # Assertions
        mock_get_reservations.assert_called_once()
        mock_send_template.assert_called_once()
        
        # Verify the send_whatsapp_template was called with correct parameters
        template_call_args = mock_send_template.call_args
        self.assertEqual(template_call_args[0][0], test_wa_id)
        self.assertEqual(template_call_args[0][1], "appointment_reminder")
        self.assertEqual(template_call_args[0][2], "ar")
        
        # Check that the message was appended to the conversation
        self.assertTrue(mock_append_message.called)
        
        # Print details for manual verification
        print(f"✅ Test completed: Reminder would be sent to {test_wa_id}")
        print(f"Template parameters: {template_call_args[0][3]}")


# Function to run the async test
def run_async_test(test_func):
    loop = asyncio.get_event_loop()
    loop.run_until_complete(test_func)


if __name__ == "__main__":
    # Create a test suite
    suite = unittest.TestSuite()
    
    # Create a test instance
    test = TestReminders('test_send_reminder_to_specific_number')
    
    # Add the test to the suite
    suite.addTest(test)
    
    # Create a runner
    runner = unittest.TextTestRunner()
    
    # Use our helper to run the async test
    run_async_test(test.test_send_reminder_to_specific_number())
    
    print("✅ All tests completed!") 