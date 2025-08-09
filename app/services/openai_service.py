import asyncio
import inspect
import json
from typing import Tuple

from openai import (
    APIConnectionError,
    APIError,
    AuthenticationError,
    BadRequestError,
    OpenAI,
    RateLimitError,
)

from app.config import config
from app.decorators.safety import retry_decorator
from app.infrastructure.logging import get_service_logger
from app.metrics import (
    FUNCTION_ERRORS,
    LLM_API_ERRORS,
    LLM_EMPTY_RESPONSES,
    LLM_RETRY_ATTEMPTS,
    LLM_TOOL_EXECUTION_ERRORS,
)
from app.services.tool_schemas import FUNCTION_MAPPING, TOOL_DEFINITIONS
from app.utils import parse_unix_timestamp
from app.utils.http_client import sync_client
from app.utils.service_utils import retrieve_messages


# Set up domain-specific logger
logger = get_service_logger()


# API key is still needed at module level for client initialization
OPENAI_API_KEY = config["OPENAI_API_KEY"]
client = OpenAI(api_key=OPENAI_API_KEY, http_client=sync_client)

# Define available functions as tools for Responses API from central definitions
FUNCTION_DEFINITIONS = [
    {
        "type": "function",
        "name": t["name"],
        "description": t["description"],
        "parameters": t["schema"],
        "strict": False,
    }
    for t in TOOL_DEFINITIONS
]

# OpenAI debug logging is controlled by main config


def map_openai_error(e) -> str:
    """Map OpenAI exceptions to standardized error types"""
    if isinstance(e, RateLimitError):
        return "rate_limit"
    elif isinstance(e, AuthenticationError):
        return "authentication"
    elif isinstance(e, APIConnectionError):
        return "network"
    elif isinstance(e, BadRequestError):
        # Check if it's likely a context length issue
        error_msg = str(e).lower()
        if (
            "token" in error_msg
            or "context" in error_msg
            or "content too long" in error_msg
        ):
            return "context_length"
        else:
            return "bad_request"
    elif isinstance(e, APIError):
        return "server"
    elif isinstance(e, TimeoutError):
        return "timeout"
    else:
        return "unknown"


def run_responses(
    wa_id,
    input_chat,
    model,
    system_prompt,
    reasoning_effort="high",
    reasoning_summary="auto",
    text_format="text",
    store=True,
):
    """Call the Responses API, handle function calls, and return final message, response id, and timestamp.

    Args:
        wa_id (str): WhatsApp ID of the user
        input_chat (list): List of conversation messages
        model (str): OpenAI model to use.
        system_prompt (str): System prompt to use.
        max_tokens (int, optional): Maximum tokens for response. Not directly used by Responses API.
        reasoning_effort (str): Reasoning effort level ("high", "medium", "low").
        reasoning_summary (str): Reasoning summary mode ("auto", "none").
        text_format (str): Text format type.
        store (bool): Whether to store the response in OpenAI's system.
    """
    # Set up base kwargs with function tools
    kwargs = {
        "model": model,
        "input": input_chat,
        "instructions": system_prompt,
        "text": {"format": {"type": text_format}},
        "reasoning": {"effort": reasoning_effort, "summary": reasoning_summary},
        "tools": FUNCTION_DEFINITIONS,
        "store": store,
    }



    # Log request payload
    response = client.responses.create(**kwargs)
    # handle any function calls
    while True:
        fc_items = [item for item in response.output if item.type == "function_call"]
        if not fc_items:
            break
        input_items = []
        for fc in fc_items:
            args = json.loads(getattr(fc, "arguments", "{}"))
            func = FUNCTION_MAPPING.get(fc.name)

            # Log function call name and arguments
            logger.info("Tool call: %s with arguments: %s", fc.name, args)

            if func and "wa_id" in inspect.signature(func).parameters:
                args["wa_id"] = wa_id

            # Handle async functions properly
            if func:
                try:
                    if inspect.iscoroutinefunction(func):
                        # For async functions, run them in the event loop
                        result = asyncio.run(func(**args))
                    else:
                        # For regular functions, call them directly
                        result = func(**args)
                except (ValueError, KeyError, TypeError, OSError):
                    # Use both metrics for now during transition
                    FUNCTION_ERRORS.labels(function=fc.name).inc()
                    LLM_TOOL_EXECUTION_ERRORS.labels(
                        tool_name=fc.name, provider="openai"
                    ).inc()
                    error_msg = f"Error executing {fc.name}"
                    logger.error(error_msg, exc_info=True)
                    result = {"error": error_msg}
            else:
                result = {}
                LLM_TOOL_EXECUTION_ERRORS.labels(
                    tool_name=fc.name, provider="openai"
                ).inc()

            input_items.append(
                {
                    "type": "function_call",
                    "call_id": fc.call_id,
                    "name": fc.name,
                    "arguments": fc.arguments,
                }
            )
            input_items.append(
                {
                    "type": "function_call_output",
                    "call_id": fc.call_id,
                    "output": json.dumps(result),
                }
            )
        # submit function call outputs
        kwargs = {
            "model": model,
            "input": input_items,
            "tools": FUNCTION_DEFINITIONS,
            "store": store,
            "previous_response_id": response.id,  # Link to previous response
        }
        response = client.responses.create(**kwargs)
    # extract assistant message
    msg_items = [
        item
        for item in response.output
        if item.type == "message" and getattr(item, "role", None) == "assistant"
    ]
    text = None
    if msg_items:
        content = msg_items[-1].content
        text = "".join([c.text for c in content if c.type == "output_text"])
    return text, response.created_at


@retry_decorator
async def run_openai(
    wa_id,
    model,
    system_prompt,
    reasoning_effort="high",
    reasoning_summary="auto",
    text_format="text",
    store=True,
    timezone=None,
) -> Tuple[str, str, str]:
    """
    Run the OpenAI Responses API with existing conversation context.
    Returns (response_text, date_str, time_str).

    Args:
        wa_id (str): WhatsApp ID of the user
        model (str): OpenAI model to use.
        system_prompt (str): System prompt to use.
        max_tokens (int, optional): Maximum tokens for response. Not directly used by Responses API.
        reasoning_effort (str): Reasoning effort level ("high", "medium", "low").
        reasoning_summary (str): Reasoning summary mode ("auto", "none").
        text_format (str): Text format type.
        store (bool): Whether to store the response in OpenAI's system.
        timezone (str, optional): Timezone for timestamps.
    """
    # Use timezone from parameters or fallback to UTC
    tz = timezone or "UTC"

    # Retrieve message history using centralized service
    input_chat = await retrieve_messages(wa_id)
    # Call the synchronous Responses API function
    try:
        new_message, created_at = run_responses(
            wa_id,
            input_chat,
            model,
            system_prompt,
            reasoning_effort,
            reasoning_summary,
            text_format,
            store,
        )
    except Exception as e:
        error_type = map_openai_error(e)
        logger.error(
            "OpenAI API ERROR for wa_id=%s: %s (type: %s)",
            wa_id, e, error_type,
            exc_info=True,
        )
        LLM_API_ERRORS.labels(provider="openai", error_type=error_type).inc()
        LLM_RETRY_ATTEMPTS.labels(provider="openai", error_type=error_type).inc()
        return "", "", ""

    if new_message:
        logger.info("OpenAI runner produced message: %s...", new_message[:50])
        date_str, time_str = parse_unix_timestamp(created_at, timezone=tz)
        return new_message, date_str, time_str

    logger.warning("OpenAI runner returned no message for wa_id=%s", wa_id)
    LLM_EMPTY_RESPONSES.labels(provider="openai", response_type="empty_content").inc()
    return "", "", ""
