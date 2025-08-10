#!/usr/bin/env python3
"""
Comprehensive WhatsApp Reminder System Test

This script tests the WhatsApp reminder functionality by:
1. Testing direct template sending to a specific number
2. Testing the scheduler's reminder job with a mock database

Usage within Docker container:
    docker-compose exec backend python -m tests.test_reminder_system [wa_id]

Default wa_id: 201017419800
"""

import asyncio
import sys
import os
import datetime
import unittest
from unittest.mock import patch
from zoneinfo import ZoneInfo

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.config import configure_logging, config
from app.scheduler import send_reminders_job
from app.utils.whatsapp_utils import send_whatsapp_template

# Configure logging
configure_logging()

class MockReservation:
    """Mock reservation object for testing"""
    def __init__(self, wa_id, time_slot="11:00 AM", customer_name="Test Customer"):
        self.time_slot = time_slot
        self.wa_id = wa_id
        self.customer_name = customer_name
        tomorrow = datetime.datetime.now(ZoneInfo(config.get("TIMEZONE", "UTC"))) + datetime.timedelta(days=1)
        self.date = tomorrow.strftime("%Y-%m-%d")
        
    def __getitem__(self, key):
        """Support dictionary-like access for compatibility with the scheduler code"""
        return getattr(self, key)
        
    def get(self, key, default=None):
        """Support get() method for compatibility with the scheduler code"""
        return getattr(self, key, default)
        
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "wa_id": self.wa_id,
            "time_slot": self.time_slot,
            "customer_name": self.customer_name,
            "date": self.date,
            "type": 0
        }

class ReminderSystemTests(unittest.TestCase):
    """Test cases for the WhatsApp reminder system"""
    
    @patch('app.scheduler.get_tomorrow_reservations')
    @patch('app.scheduler.append_message')
    async def test_send_reminders_with_mock_data(self, mock_append, mock_get_reservations):
        """Test the reminder system with mocked data"""
        # Set up the test data
        test_wa_id = "201017419800"
        reservation = MockReservation(test_wa_id)
        
        # Mock get_tomorrow_reservations to return our test data
        mock_get_reservations.return_value = {
            "success": True,
            "data": [reservation.to_dict()]
        }
        
        # Run the reminder job
        await send_reminders_job()
        
        # Verify append_message was called (message logged in conversation history)
        self.assertTrue(mock_append.called)
        
        # Return the reservation for checking in other tests
        return reservation

async def test_whatsapp_templates(wa_id="201017419800"):
    """Test WhatsApp template availability and API connection (non-unittest style)"""
    print(f"\n{'='*50}\nTesting WhatsApp Templates for {wa_id}\n{'='*50}")
    
    # Verify essential config
    for key in ['ACCESS_TOKEN', 'PHONE_NUMBER_ID', 'VERSION']:
        value = config.get(key)
        status = "✅" if value else "❌"
        print(f"{status} {key}: {value or 'Not set'}")
    
    if not config.get('ACCESS_TOKEN') or not config.get('PHONE_NUMBER_ID'):
        print("❌ Missing required WhatsApp API credentials")
        return False
    
    # Send a test template
    time_slot = "11:00 AM"
    components = [
        {"type": "body", "parameters": [{"type": "text", "text": time_slot}]}
    ]
    
    print(f"\nSending test template to {wa_id}...")
    try:
        response = await send_whatsapp_template(
            wa_id,
            "appointment_reminder",
            "ar",
            components
        )
        print(f"✅ Template sent successfully: {response}")
        return True
    except Exception as e:
        import traceback
        print(f"❌ Failed to send template: {e}")
        print(traceback.format_exc())
        return False

async def run_tests(specific_wa_id=None):
    """Run all tests"""
    print(f"\n{'='*50}\nWhatsApp Reminder System Test\n{'='*50}")
    print(f"Docker environment: {'Yes' if os.path.exists('/.dockerenv') else 'No'}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Timezone setting: {config.get('TIMEZONE', 'Not set')}")
    
    # If we have a specific number to test, just test direct sending
    if specific_wa_id:
        print(f"Testing direct template send to: {specific_wa_id}")
        await test_whatsapp_templates(specific_wa_id)
    else:
        # Otherwise run the full test suite
        # Create a test suite with our test case
        loader = unittest.TestLoader()
        loader.loadTestsFromTestCase(ReminderSystemTests)
        
        # Run the tests
        unittest.TextTestRunner()
        
        # We need to run the async test in the event loop
        async def run_test_case():
            test_case = ReminderSystemTests('test_send_reminders_with_mock_data')
            reservation = await test_case.test_send_reminders_with_mock_data()
            print(f"\n✅ Test completed for reservation: {reservation.to_dict()}")
            
            # Also test direct API sending to ensure everything's working
            await test_whatsapp_templates()
        
        await run_test_case()
    
    print(f"\n{'='*50}\nTests completed\n{'='*50}")

if __name__ == "__main__":
    # Get specific wa_id if provided as command line argument
    specific_wa_id = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Run the tests
    asyncio.run(run_tests(specific_wa_id)) 