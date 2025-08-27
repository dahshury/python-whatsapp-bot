# WhatsApp Bot Tests

This directory contains test cases for the WhatsApp Bot application.

## Test Structure

- `unit/`: Contains unit tests for individual functions and components
  - `test_assistant_functions.py`: Tests for basic assistant functions like send_business_location, get_current_datetime, etc.
  - `test_assistant_functions_advanced.py`: Tests for more complex functions like modify_reservation, search_available_appointments, etc.

## Running Tests

You can run all tests using the test runner script:

```bash
python tests/run_tests.py
```

Or run individual test files:

```bash
python -m unittest tests/unit/test_assistant_functions.py
```

## Test Coverage

The tests use Python's unittest framework with mock objects to isolate the units being tested from their dependencies. Each test file follows this pattern:

1. Mock external dependencies (database, datetime, etc.)
1. Set up test conditions with the mocks
1. Execute the function being tested
1. Assert the function behavior against expected outcomes

## Adding New Tests

When adding new functionality to the codebase, please add corresponding tests:

1. For simple functions, add tests to the appropriate existing test file
1. For complex new features, consider creating a new test file
1. Follow the established pattern of setup-execute-assert
1. Make sure to mock external dependencies appropriately

## Test Philosophy

The test suite focuses on:

- Function contract validation: ensuring functions handle inputs and produce expected outputs
- Error handling: verifying functions handle error conditions gracefully
- Edge cases: testing boundary conditions and special cases
- Isolation: using mocks to test units independently of external systems

## Database Testing

The unit tests mock the database connection to avoid actual database operations. For integration testing with the real database, consider adding tests to a separate integration test directory.

## WhatsApp Reminder Tests

To test the WhatsApp reminder functionality, use the `test_reminder_system.py` test:

### Running in Docker (Recommended)

First, make sure your Docker containers are running:

```bash
docker-compose up -d
```

Then, run the test in the backend container:

```bash
# Run the full test suite (mocks database and tests send_reminders_job)
docker-compose exec backend python -m tests.test_reminder_system

# Or test sending a reminder to a specific phone number
docker-compose exec backend python -m tests.test_reminder_system 201017419800
```

### Running Locally

You can also run the test directly if your environment is configured properly:

```bash
# Run the full test suite
python -m tests.test_reminder_system

# Or test sending a reminder to a specific phone number 
python -m tests.test_reminder_system 201017419800
```

### What's Being Tested

1. The test verifies that the `send_reminders_job` function properly:

   - Retrieves reservations for tomorrow
   - Sends WhatsApp template messages to each user
   - Logs the messages in the conversation history

1. When testing a specific phone number, it:

   - Validates WhatsApp API credentials
   - Sends a direct reminder template to the specified number
   - Reports success or failure with detailed error messages

This approach tests the actual scheduler code without modifying the database.
