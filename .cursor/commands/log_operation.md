# Comprehensive Logging Addition Prompt for Operation Tracing

## Objective

Your task is to add comprehensive, expressive logging throughout the critical execution path of a specific operation to enable complete traceability and debugging of an issue. The logs must be **flat** (no nested structures), **expressive** (self-contained with all context), and **auto-expanded** (formatted for easy reading without expansion/collapse).

## Input Information

You will receive:

1. **Issue Description**: A detailed description of the problem or unexpected behavior
1. **Operation Entry Point**: The specific operation, function, API endpoint, or user action that triggers the issue (e.g., "webhook_post endpoint", "process_message function", "send_whatsapp_message")

## Task Breakdown

### Phase 1: Operation Path Tracing and Analysis

1. **Identify the Entry Point**

   - Locate the exact entry point in the codebase (file, class, function/method)
   - Understand the input parameters, request structure, and initial state
   - Document the entry point location: `file:line:function_name`

1. **Trace the Complete Execution Flow**

   - Use semantic search and code analysis to follow the execution path step-by-step
   - Identify ALL functions, methods, and code blocks called during execution
   - Follow both synchronous and asynchronous execution paths
   - Include:
     - Function calls and their returns
     - Conditional branches (if/else, switch/case)
     - Loops and iterations
     - Error handling paths (try/except, catch blocks)
     - Database queries and transactions
     - External API calls (HTTP requests, WebSocket messages)
     - Service layer interactions
     - Middleware execution
     - Background tasks and async operations
     - Queue processing (if applicable)

1. **Identify Critical Locations**
   For each step in the execution path, mark locations as "CRITICAL" if they:

   - Transform or modify data state
   - Make decisions that affect control flow
   - Interact with external systems (APIs, databases, queues)
   - Handle errors or exceptions
   - Validate inputs or enforce business rules
   - Store or retrieve persistent data
   - Perform calculations or data processing
   - Modify configuration or environment state
   - Create side effects (sending messages, triggering events)

### Phase 2: Logging Implementation

For each **CRITICAL** location identified, add comprehensive logging following these specifications:

#### Log Format Standard

Use **flat, structured logging** with key-value pairs. Format logs as a single line with all context visible:

**Python Backend:**

```python
import logging

logger = logging.getLogger(__name__)

# Format: OPERATION_NAME | STEP | KEY1=VALUE1 | KEY2=VALUE2 | KEY3=VALUE3 | ...
logger.info(
    f"OPERATION_NAME | STEP_NAME | "
    f"entry_point={entry_point} | "
    f"function={function_name} | "
    f"file={file_path} | "
    f"line={line_number} | "
    f"input_param1={value1} | "
    f"input_param2={value2} | "
    f"state_before={state_description} | "
    f"decision_point={condition_result} | "
    f"result={output_value} | "
    f"duration_ms={duration} | "
    f"error={error_message if error else 'none'}"
)
```

**TypeScript/JavaScript Frontend:**

```typescript
import { logger } from "@/shared/libs/logger";

// Format: OPERATION_NAME | STEP | KEY1=VALUE1 | KEY2=VALUE2 | KEY3=VALUE3 | ...
logger.info(
  `OPERATION_NAME | STEP_NAME | ` +
    `entry_point=${entryPoint} | ` +
    `function=${functionName} | ` +
    `file=${filePath} | ` +
    `line=${lineNumber} | ` +
    `input_param1=${JSON.stringify(value1)} | ` +
    `input_param2=${JSON.stringify(value2)} | ` +
    `state_before=${JSON.stringify(stateDescription)} | ` +
    `decision_point=${conditionResult} | ` +
    `result=${JSON.stringify(outputValue)} | ` +
    `duration_ms=${duration} | ` +
    `error=${errorMessage || "none"}`
);
```

#### Required Log Points

1. **Entry Point Log** (start of operation)

   - Operation name
   - Entry point location (file, function, line)
   - All input parameters (sanitize sensitive data)
   - Request metadata (user_id, session_id, request_id, timestamp)
   - Initial state

1. **Pre-Execution Logs** (before critical operations)

   - Function name and location
   - Input parameters received
   - Pre-conditions checked
   - State before execution

1. **Decision Point Logs** (branches, conditions, validations)

   - Condition being evaluated
   - Condition result (true/false, value checked)
   - Which branch was taken
   - Reasoning if applicable

1. **Data Transformation Logs** (data modifications)

   - Data before transformation
   - Transformation applied
   - Data after transformation
   - Fields changed (specific field names)

1. **External Call Logs** (APIs, databases, queues)

   - System being called (API name, DB table, queue name)
   - Request payload (sanitized)
   - Response received (status, data summary)
   - Duration/timing
   - Error details if failed

1. **State Change Logs** (mutations, updates)

   - Entity/object being modified
   - Field name and old value → new value
   - Who/what triggered the change
   - State after change

1. **Error/Exception Logs** (error handling)

   - Exception type and message
   - Full stack trace (if backend)
   - Context when error occurred
   - Recovery action taken (if any)
   - Error code or category

1. **Exit Point Logs** (end of operation)

   - Final result/return value
   - Success/failure status
   - Total duration
   - Summary of steps taken
   - Output data summary

#### Log Level Guidelines

- **DEBUG**: Detailed tracing, intermediate calculations, verbose state dumps
- **INFO**: Normal flow, successful operations, state transitions, decisions
- **WARNING**: Recoverable issues, fallbacks, validation failures, retries
- **ERROR**: Exceptions, failures, unexpected states, critical errors

Use **INFO** level for critical path logging unless the operation failed (use ERROR) or encountered a recoverable issue (use WARNING).

#### Data Sanitization Rules

When logging sensitive data:

- **Passwords, tokens, API keys**: Replace with `[REDACTED]` or `[MASKED]`
- **Long strings**: Truncate to first 200 characters, append `... (truncated, length=N)`
- **Large objects/arrays**: Log summary with `count`, `keys`, `type` instead of full content
- **Binary data**: Log `type=binary, size=N bytes` instead of content
- **Personal data**: Consider masking based on privacy requirements

**Example sanitization:**

```python
# Before sanitization
logger.info(f"token={api_token} | user_data={large_dict}")

# After sanitization
logger.info(
    f"token=[REDACTED] | "
    f"user_data=dict(keys={list(large_dict.keys())}, count={len(large_dict)}, type=dict)"
)
```

#### Context Preservation

Every log must include:

- **Operation identifier**: A unique identifier for this operation instance (request_id, correlation_id, trace_id)
- **Step sequence**: Step number or name showing order in execution flow
- **Call stack context**: Function call chain leading to this point
- **Timing information**: Timestamp and/or duration since operation start
- **State snapshot**: Relevant state at this point in execution

#### Flat Structure Requirements

**DO:**

- Use pipe-separated (`|`) key-value pairs on a single line
- Use explicit field names: `key=value` format
- Include all necessary context in each log line
- Make each log line self-contained and searchable

**DON'T:**

- Use nested JSON objects in log messages
- Use multi-line logs that require expansion
- Use cryptic abbreviations without explanation
- Split context across multiple log lines unnecessarily

**Example of GOOD flat logging:**

```
2025-01-15 10:23:45 - app.services.conversation - INFO - OPERATION=process_message | STEP=validate_input | request_id=abc123 | entry_point=webhook_post | function=validate_message | file=app/views.py | line=234 | wa_id=1234567890 | message_type=text | message_text=Hello | timestamp=2025-01-15T10:23:45Z | validation_result=valid | duration_ms=2
```

**Example of BAD nested logging:**

```
{
  "operation": "process_message",
  "step": "validate_input",
  "data": {
    "request": {
      "wa_id": "1234567890",
      "message": {
        "type": "text",
        "text": "Hello"
      }
    }
  }
}
```

### Phase 3: Implementation Steps

1. **Create/Update Logging Utilities** (if needed)

   - Ensure logging configuration supports structured, flat logs
   - Add helper functions for consistent log formatting if beneficial
   - Ensure log levels are appropriately configured

1. **Add Logs Systematically**

   - Start from the entry point
   - Follow execution flow chronologically
   - Add logs at each critical location identified
   - Ensure logs connect (use same operation identifier throughout)
   - Test that logs appear in correct order

1. **Add Operation Tracking**

   - Generate unique operation identifier at entry point
   - Pass operation identifier through call chain (via parameters, context, or thread-local storage)
   - Include operation identifier in every log statement

1. **Add Timing Information**

   - Record start time at entry point
   - Calculate elapsed time at each critical point
   - Log duration for external calls and significant operations

1. **Verify Completeness**

   - Ensure all branches of conditionals are logged
   - Ensure all error paths have appropriate error logs
   - Ensure external calls have both request and response logs
   - Ensure state changes are captured

### Phase 4: Validation and Testing

After adding logs:

1. **Code Review Checklist**

   - [ ] Every critical location has appropriate logging
   - [ ] Logs are flat and self-contained (no expansion needed)
   - [ ] Sensitive data is properly sanitized
   - [ ] Operation identifier is consistent throughout
   - [ ] Timing information is included where relevant
   - [ ] Error paths have comprehensive error logging
   - [ ] Log levels are appropriate (DEBUG/INFO/WARNING/ERROR)

1. **Log Output Verification**

   - Run the operation and verify logs appear
   - Check that logs are readable without expansion
   - Verify all context is present in each log line
   - Ensure logs can be traced from start to finish
   - Confirm operation identifier links all related logs

## Output Requirements

Provide:

1. **Modified Files List**

   - List all files modified with logging additions
   - Indicate approximate number of log statements added per file

1. **Execution Flow Summary**

   - High-level execution path diagram (text-based)
   - List of critical locations identified with file:line references
   - Brief description of what each critical location does

1. **Logging Strategy Document**

   - Explanation of logging approach taken
   - Description of operation identifier strategy
   - Log format used
   - Any helper functions or utilities created

1. **Example Log Output**

   - Show 3-5 example log lines as they would appear during operation execution
   - Include logs from different stages (entry, decision, external call, exit)

## Special Considerations

- **Async Operations**: Include async/await boundaries in logs, show task IDs for concurrent operations
- **Database Transactions**: Log transaction boundaries, rollbacks, commits
- **Queue/Worker Patterns**: Log queue submissions, worker pickups, processing start/end
- **Caching**: Log cache hits/misses with cache keys
- **Retries**: Log retry attempts with attempt numbers and backoff strategies
- **Parallel Processing**: Use operation identifier + thread/task ID to correlate parallel logs

## Success Criteria

The logging implementation is successful when:

1. ✅ Every critical location in the operation path has appropriate logging
1. ✅ Logs are flat, expressive, and self-contained (no expansion needed)
1. ✅ An operation can be fully traced from entry to exit using logs alone
1. ✅ Logs contain sufficient context to debug the specified issue
1. ✅ Logs are searchable and filterable by operation identifier
1. ✅ Sensitive data is properly sanitized
1. ✅ Timing information enables performance analysis
1. ✅ Error paths have comprehensive error logging with context

______________________________________________________________________

## Example Usage

**Input provided:**

- Issue: "Messages are not being sent to WhatsApp API, receiving 400 errors"
- Operation: "send_whatsapp_message function in app/utils/whatsapp_utils.py"

**Expected output:**

- Traced execution path from `send_whatsapp_message` through all called functions
- Logs added at critical points: payload construction, validation, API request formation, HTTP call, response handling, error processing
- Each log includes: operation_id, step name, input parameters, state, result, timing, errors
- Logs formatted as flat key-value pairs on single lines
- Operation identifier (`request_id` or `operation_id`) passed through entire call chain
