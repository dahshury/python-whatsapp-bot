import asyncio
import contextlib
import html
import inspect
import json
import logging
import time

import httpx
from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    OpenAI,
    RateLimitError,
)

from app.config import config
from app.decorators.safety import retry_decorator
from app.metrics import (
    FUNCTION_ERRORS,
    LLM_API_ERRORS,
    LLM_API_ERRORS_DETAILED,
    LLM_EMPTY_RESPONSES,
    LLM_RETRY_ATTEMPTS,
    LLM_TOOL_EXECUTION_ERRORS,
)
from app.services.tool_schemas import FUNCTION_MAPPING, TOOL_DEFINITIONS
from app.utils import append_message, parse_unix_timestamp
from app.utils.http_client import sync_client
from app.utils.service_utils import retrieve_messages

# API key is still needed at module level for client initialization
OPENAI_API_KEY = config["OPENAI_API_KEY"]
VEC_STORE_ID = config["VEC_STORE_ID"]
client = OpenAI(api_key=OPENAI_API_KEY, http_client=sync_client)

# Define available functions as tools for Responses API from central definitions
FUNCTION_DEFINITIONS = [
    {"type": "function", "name": t["name"], "description": t["description"], "parameters": t["schema"], "strict": False}
    for t in TOOL_DEFINITIONS
]

# Control OpenAI SDK log verbosity via config (default WARNING)
_openai_log_level_name = str(config.get("OPENAI_LOG_LEVEL", "WARNING")).upper()
_openai_log_level = getattr(logging, _openai_log_level_name, logging.WARNING)
logging.getLogger("openai").setLevel(_openai_log_level)


def map_openai_error(e):
    """Map OpenAI exceptions to standardized error types"""
    if isinstance(e, APITimeoutError):
        return "timeout"
    elif isinstance(e, RateLimitError):
        return "rate_limit"
    elif isinstance(e, AuthenticationError):
        return "authentication"
    elif isinstance(e, APIConnectionError):
        return "network"
    elif isinstance(e, BadRequestError):
        # Check if it's likely a context length issue
        error_msg = str(e).lower()
        if "token" in error_msg or "context" in error_msg or "content too long" in error_msg:
            return "context_length"
        else:
            return "bad_request"
    elif isinstance(e, APIError):
        return "server"
    elif isinstance(e, TimeoutError):
        return "timeout"
    else:
        # Fallback heuristic mapping based on error message text
        try:
            error_msg = str(e).lower()
        except Exception:
            error_msg = ""
        if any(s in error_msg for s in ["timeout", "timed out", "deadline"]):
            return "timeout"
        if any(s in error_msg for s in ["quota", "rate", "limit", "too many requests"]):
            return "rate_limit"
        if any(s in error_msg for s in ["token", "context", "content too long", "length", "too long", "over limit"]):
            return "context_length"
        if any(s in error_msg for s in ["auth", "unauthorized", "forbidden", "invalid api key", "key"]):
            return "authentication"
        if any(
            s in error_msg
            for s in ["connect", "network", "dns", "reset by peer", "broken pipe", "unreachable", "connection"]
        ):
            return "network"
        if any(
            s in error_msg for s in ["5xx", "server", "internal server error", "service unavailable", "bad gateway"]
        ):
            return "server"
        return "unknown"


def _is_retryable_openai_exception(e: Exception) -> bool:
    """Return True if the exception is considered retryable by our retry policy."""
    retryable_types = (
        APIError,
        APIConnectionError,
        RateLimitError,
        APITimeoutError,
        httpx.ConnectError,
        httpx.ReadTimeout,
        httpx.HTTPError,
    )
    return isinstance(e, retryable_types)


def run_responses(
    wa_id,
    input_chat,
    model,
    system_prompt,
    max_tokens=None,
    reasoning_effort="high",
    reasoning_summary="auto",
    text_format="text",
    store=True,
    verbosity="low",
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
        "text": {"format": {"type": text_format}, "verbosity": verbosity},
        "reasoning": {"effort": reasoning_effort, "summary": reasoning_summary},
        "tools": FUNCTION_DEFINITIONS,
        "store": store,
    }

    vec_id = config.get("VEC_STORE_ID")
    # Add vector store and file_search tool if configured
    if vec_id:
        # Add file_search tool with vector_store_ids
        kwargs["tools"] = FUNCTION_DEFINITIONS + [{"type": "file_search", "vector_store_ids": [vec_id]}]

    # Log request payload
    try:
        response = client.responses.create(**kwargs)
    except Exception as e:
        # Emit detailed metric for initial call
        error_type = map_openai_error(e)
        exception_type = type(e).__name__
        if error_type == "unknown":
            error_type = f"unknown::{exception_type}"
        http_status = None
        try:
            http_status = getattr(getattr(e, "response", None), "status_code", None)
        except Exception:
            http_status = None
        LLM_API_ERRORS.labels(provider="openai", error_type=error_type).inc()
        with contextlib.suppress(Exception):
            LLM_API_ERRORS_DETAILED.labels(
                provider="openai",
                error_type=error_type,
                exception_type=str(exception_type),
                http_status=str(http_status or ""),
                function="run_responses_initial",
            ).inc()
        raise
    # handle any function calls with maximum iteration limit to prevent infinite loops
    max_iterations = 10
    iteration_count = 0

    while iteration_count < max_iterations:
        fc_items = [item for item in response.output if item.type == "function_call"]
        if not fc_items:
            logging.debug(f"OpenAI function call loop completed after {iteration_count} iterations")
            break

        iteration_count += 1
        logging.debug(
            f"OpenAI function call iteration {iteration_count}/{max_iterations}, processing {len(fc_items)} function calls"
        )

        input_items = []
        for fc in fc_items:
            args = json.loads(getattr(fc, "arguments", "{}"))
            func = FUNCTION_MAPPING.get(fc.name)

            # Log function call name and arguments
            logging.debug(f"Tool call: {fc.name} with arguments: {args}")
            # Persist tool call into conversation history for sidebar chat
            try:
                persist_args = dict(args) if isinstance(args, dict) else {}
                if func and "wa_id" in inspect.signature(func).parameters:
                    persist_args["wa_id"] = wa_id
                if isinstance(persist_args, dict) and len(persist_args) > 0:
                    pretty = json.dumps(persist_args, ensure_ascii=False, indent=2)
                    safe_json = html.escape(pretty)
                    message_html = (
                        f'<details class="details">'
                        f"<summary>Tool: {fc.name}</summary>"
                        f'<div><pre><code class="language-json">{safe_json}</code></pre></div>'
                        f"</details>"
                    )
                else:
                    message_html = f"Tool: {fc.name}"
                now_ts = int(time.time())
                date_str, time_str = parse_unix_timestamp(now_ts)
                append_message(wa_id, "tool", message_html, date_str, time_str)
            except Exception as persist_err:
                logging.error(f"Failed to persist tool call message for {fc.name}: {persist_err}")

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
                    # Persist tool result as a follow-up message
                    try:
                        result_str = (
                            json.dumps(result, ensure_ascii=False, indent=2)
                            if isinstance(result, dict | list)
                            else str(result)
                        )
                        safe_out = html.escape(result_str)
                        result_html = (
                            f'<details class="details">'
                            f"<summary>Result: {fc.name}</summary>"
                            f'<div><pre><code class="language-json">{safe_out}</code></pre></div>'
                            f"</details>"
                        )
                        now_ts2 = int(time.time())
                        d2, t2 = parse_unix_timestamp(now_ts2)
                        append_message(wa_id, "tool", result_html, d2, t2)
                    except Exception as persist_res_err:
                        logging.error(f"Failed to persist tool result for {fc.name}: {persist_res_err}")
                except Exception as e:
                    # Use both metrics for now during transition
                    FUNCTION_ERRORS.labels(function=fc.name).inc()
                    LLM_TOOL_EXECUTION_ERRORS.labels(tool_name=fc.name, provider="openai").inc()
                    error_msg = f"Error executing {fc.name}: {str(e)}"
                    logging.error(error_msg, exc_info=True)
                    result = {"error": error_msg}
            else:
                result = {}
                LLM_TOOL_EXECUTION_ERRORS.labels(tool_name=fc.name, provider="openai").inc()
                logging.warning(f"Function {fc.name} not found in FUNCTION_MAPPING")

            input_items.append(
                {"type": "function_call", "call_id": fc.call_id, "name": fc.name, "arguments": fc.arguments}
            )
            input_items.append({"type": "function_call_output", "call_id": fc.call_id, "output": json.dumps(result)})

        # submit function call outputs
        kwargs = {
            "model": model,
            "input": input_items,
            "tools": FUNCTION_DEFINITIONS,
            "store": store,
            "previous_response_id": response.id,  # Link to previous response
        }

        try:
            response = client.responses.create(**kwargs)
        except Exception as e:
            # Emit detailed metric for iterative call
            error_type = map_openai_error(e)
            exception_type = type(e).__name__
            if error_type == "unknown":
                error_type = f"unknown::{exception_type}"
            http_status = None
            try:
                http_status = getattr(getattr(e, "response", None), "status_code", None)
            except Exception:
                http_status = None
            LLM_API_ERRORS.labels(provider="openai", error_type=error_type).inc()
            with contextlib.suppress(Exception):
                LLM_API_ERRORS_DETAILED.labels(
                    provider="openai",
                    error_type=error_type,
                    exception_type=str(exception_type),
                    http_status=str(http_status or ""),
                    function="run_responses_iter",
                ).inc()
            logging.error(f"Error creating OpenAI response in iteration {iteration_count}: {e}")
            break

    if iteration_count >= max_iterations:
        logging.warning(
            f"OpenAI function call loop reached maximum iterations ({max_iterations}), breaking to prevent infinite loop"
        )
    # extract assistant message
    msg_items = [
        item for item in response.output if item.type == "message" and getattr(item, "role", None) == "assistant"
    ]
    text = None
    if msg_items:
        content = msg_items[-1].content
        text = "".join([c.text for c in content if c.type == "output_text"])
    return text, response.created_at


@retry_decorator
def run_openai(
    wa_id,
    model,
    system_prompt,
    max_tokens=None,
    reasoning_effort="high",
    reasoning_summary="auto",
    text_format="text",
    store=True,
    timezone=None,
    verbosity="low",
):
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

    # Retrieve message history using centralized service
    input_chat = retrieve_messages(wa_id)
    # Guard: OpenAI Responses API requires one of input/previous_response_id/prompt/conversation_id
    # Avoid 400 errors by short-circuiting when there is no input history yet
    if not input_chat:
        logging.warning(f"Skipping OpenAI call for wa_id={wa_id}: no conversation input available")
        LLM_EMPTY_RESPONSES.labels(provider="openai", response_type="missing_input").inc()
        return "", "", ""
    # Call the synchronous Responses API function
    try:
        new_message, created_at = run_responses(
            wa_id,
            input_chat,
            model,
            system_prompt,
            max_tokens,
            reasoning_effort,
            reasoning_summary,
            text_format,
            store,
            verbosity,
        )
    except Exception as e:
        error_type = map_openai_error(e)
        exception_type = type(e).__name__
        if error_type == "unknown":
            error_type = f"unknown::{exception_type}"
        # Try to extract HTTP status from SDK errors
        http_status = None
        try:
            http_status = getattr(getattr(e, "response", None), "status_code", None)
        except Exception:
            http_status = None
        logging.error(
            f"OpenAI API ERROR for wa_id={wa_id}: {e} (type: {error_type}, exception={exception_type}, status={http_status})",
            exc_info=True,
        )
        LLM_API_ERRORS.labels(provider="openai", error_type=error_type).inc()
        with contextlib.suppress(Exception):
            LLM_API_ERRORS_DETAILED.labels(
                provider="openai",
                error_type=error_type,
                exception_type=str(exception_type),
                http_status=str(http_status or ""),
                function="run_openai",
            ).inc()
        # Only mark retry attempt when the exception is retry-eligible
        if _is_retryable_openai_exception(e):
            LLM_RETRY_ATTEMPTS.labels(provider="openai", error_type=error_type).inc()
        # Re-raise so the retry mechanism can handle it properly
        raise

    if new_message:
        logging.info(f"OpenAI runner produced message: {new_message[:50]}...")
        date_str, time_str = parse_unix_timestamp(created_at)
        return new_message, date_str, time_str

    logging.warning(f"OpenAI runner returned no message for wa_id={wa_id}")
    LLM_EMPTY_RESPONSES.labels(provider="openai", response_type="empty_content").inc()
    return "", "", ""
