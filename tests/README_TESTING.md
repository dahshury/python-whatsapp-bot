# WhatsApp Reminder Testing Guide

This guide explains how to test the WhatsApp appointment reminder system in the Docker environment.

## Testing the Reminders System

We've created several tools to help diagnose and fix issues with the WhatsApp reminder system.

### Quick Test: Using the Shell Script

The easiest way to test is using the provided shell script:

```bash
./test_reminders_in_docker.sh 201017419800
```

This will:
1. Ensure Docker is running
2. Start the backend container if it's not already running
3. Run the test script inside the Docker container
4. Show detailed diagnostics about any issues

### Manual Testing Steps

If you prefer to run the tests manually, follow these steps:

1. Ensure Docker is running
2. Start the containers:
   ```bash
   docker-compose up -d
   ```
3. Run the test script in the backend container:
   ```bash
   docker-compose exec backend python -m app.scripts.docker_test_reminders 201017419800
   ```

## What the Tests Check

The test script performs several checks:

1. **Environment Verification**:
   - Confirms that WhatsApp API keys are correctly configured
   - Validates that the appointment_reminder template exists and is approved
   - Checks that the template supports Arabic language

2. **Direct API Test**:
   - Directly sends a test message using the WhatsApp API
   - Bypasses the database to test only API connectivity

3. **Full Flow Test**:
   - Creates a test reservation in the database
   - Triggers the scheduler's reminder job
   - Tests the entire reminder flow from database to WhatsApp API

## Troubleshooting Common Issues

### WhatsApp Template Issues

- **Missing Template**: Ensure the "appointment_reminder" template is created in the WhatsApp Business Manager.
- **Template Not Approved**: Check if the template is in "APPROVED" status in WhatsApp Business Manager.
- **Language Support**: Verify the template supports Arabic (ar) language.

### Database Issues

- **Table Doesn't Exist**: The test will automatically try to create the needed table.
- **Connection Problems**: Check Docker volume mapping in docker-compose.yml.

### API Connection Problems

- **Authentication Errors**: Verify the ACCESS_TOKEN is correct and not expired.
- **Rate Limiting**: WhatsApp API has sending limits that may be exceeded.

## Scheduler Lock Issues

If the scheduler isn't sending reminders automatically, it might be due to a stale lock.
The improved scheduler code now detects and clears stale locks automatically.

## Logs

To view detailed logs from the backend container:

```bash
docker-compose logs -f backend
``` 