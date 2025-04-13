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
2. Set up test conditions with the mocks
3. Execute the function being tested
4. Assert the function behavior against expected outcomes

## Adding New Tests

When adding new functionality to the codebase, please add corresponding tests:

1. For simple functions, add tests to the appropriate existing test file
2. For complex new features, consider creating a new test file
3. Follow the established pattern of setup-execute-assert
4. Make sure to mock external dependencies appropriately

## Test Philosophy

The test suite focuses on:

- Function contract validation: ensuring functions handle inputs and produce expected outputs
- Error handling: verifying functions handle error conditions gracefully
- Edge cases: testing boundary conditions and special cases
- Isolation: using mocks to test units independently of external systems

## Database Testing

The unit tests mock the database connection to avoid actual database operations. For integration testing with the real database, consider adding tests to a separate integration test directory. 