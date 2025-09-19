import logging
import asyncio
import json
import inspect
from app.config import config
from anthropic import Anthropic, AnthropicError, APITimeoutError, APIConnectionError, BadRequestError, RateLimitError, AuthenticationError
from app.utils.http_client import sync_client
from app.utils import retrieve_messages
from app.decorators import retry_decorator
import datetime
from zoneinfo import ZoneInfo
from app.services.tool_schemas import TOOL_DEFINITIONS, FUNCTION_MAPPING
from app.metrics import LLM_API_ERRORS, LLM_RETRY_ATTEMPTS, LLM_TOOL_EXECUTION_ERRORS, LLM_EMPTY_RESPONSES
import httpx

ANTHROPIC_API_KEY = config.get("ANTHROPIC_API_KEY")

# Create Anthropic client
client = Anthropic(api_key=ANTHROPIC_API_KEY, http_client=sync_client)

# Build Anthropic-compatible tools list from central definitions
tools = [
    {
        "name": t["name"],
        "description": t["description"],
        "input_schema": t["schema"],
        **({"cache_control": t["cache_control"]} if t.get("cache_control") else {})
    }
    for t in TOOL_DEFINITIONS
]

def map_anthropic_error(e):
    """Map Anthropic exceptions to standardized error types"""
    if isinstance(e, RateLimitError):
        return "rate_limit"
    elif isinstance(e, AuthenticationError):
        return "authentication"
    elif isinstance(e, APITimeoutError):
        return "timeout"
    elif isinstance(e, APIConnectionError):
        return "network"
    elif isinstance(e, BadRequestError):
        # Check if it's likely a context length issue
        error_msg = str(e).lower()
        if "content length" in error_msg or "token limit" in error_msg or "context window" in error_msg:
            return "context_length"
        else:
            return "bad_request"
    elif isinstance(e, AnthropicError):
        # General Anthropic error
        return "provider_specific"
    else:
        # Unknown error
        return "unknown"


def _is_retryable_anthropic_exception(e: Exception) -> bool:
    """Return True if the exception is considered retryable by our retry policy."""
    retryable_types = (
        AnthropicError,
        APITimeoutError,
        APIConnectionError,
        RateLimitError,
        BadRequestError,  # sometimes used for transient content-length issues; tenacity also checks AnthropicError
        httpx.ConnectError,
        httpx.ReadTimeout,
        httpx.HTTPError,
    )
    return isinstance(e, retryable_types)

@retry_decorator
def run_claude(wa_id, model, system_prompt=None, max_tokens=None, thinking=None, stream=False, timezone=None):
    """
    Run Claude with the conversation history and handle tool calls.
    Returns the generated message along with date and time.
    Raises exceptions for error cases to enable retry functionality.
    
    Args:
        wa_id (str): WhatsApp ID of the user
        model (str): Claude model to use.
        system_prompt (str, optional): System prompt to use.
        max_tokens (int, optional): Maximum tokens for response.
        thinking (dict, optional): Extended thinking configuration dict or None to disable.
        stream (bool, optional): Whether to stream responses.
        timezone (str, optional): Timezone for timestamps.
    """
    # Create system prompt structure if custom prompt provided
    if system_prompt:
        system_prompt_obj = [
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"}
            }
        ]
    else:
        # Default empty system prompt
        system_prompt_obj = [
            {
                "type": "text",
                "text": "You are a helpful assistant that can answer questions and help with tasks.",
                "cache_control": {"type": "ephemeral"}
            }
        ]
    
    # Use timezone from parameters or fallback to UTC
    tz = timezone or "UTC"
    
    # Get conversation history
    input_chat = retrieve_messages(wa_id)
    
    # Prepare API request arguments, with optional thinking inclusion
    def prepare_request_args(enable_thinking=False):
        req_kwargs = {
            "model": model,
            "system": system_prompt_obj,
            "messages": input_chat,
            "tools": tools,
            "max_tokens": max_tokens,
            "stream": stream,
            "betas": ["token-efficient-tools-2025-02-19"]
        }
        # Always include thinking when configured for extended reasoning
        if thinking and enable_thinking:
            req_kwargs["thinking"] = thinking
        
        return req_kwargs

    try:
        # Initial request to Claude
        logging.info(f"Making initial Claude API request for {wa_id}")
        response = client.beta.messages.create(**prepare_request_args())
        logging.info(f"Initial response stop reason: {response.stop_reason}")
        
        # Extract ALL thinking and redacted_thinking blocks in their original order
        all_thinking_blocks = [
            block for block in response.content
            if block.type in ["thinking", "redacted_thinking"]
        ]
        # logging.info(f"All thinking blocks: {all_thinking_blocks}")
        
        # Process tool calls if present
        while response.stop_reason == "tool_use":
            # Find the tool use block
            tool_use_block = next((block for block in response.content if block.type == "tool_use"), None)
            
            if not tool_use_block:
                logging.error("Tool use indicated but no tool_use block found in content")
                LLM_API_ERRORS.labels(provider="anthropic", error_type="invalid_response").inc()
                break
                
            # Extract tool details
            tool_name = tool_use_block.name
            tool_input = tool_use_block.input
            tool_use_id = tool_use_block.id
            
            logging.info(f"Tool used: {tool_name}")
            if tool_input:
                logging.info(f"Tool input: {json.dumps(tool_input)}")
                            
            # Prepare the assistant's response content with correct ordering:
            # 1. All thinking blocks must come first if present
            # 2. Followed by the tool_use block
            assistant_content = []
            assistant_content.extend(all_thinking_blocks)  # Add all thinking blocks
            assistant_content.append(tool_use_block)
            
            # Execute tool if available
            if tool_name in FUNCTION_MAPPING:
                function = FUNCTION_MAPPING[tool_name]
                sig = inspect.signature(function)
                
                # If the function takes a 'wa_id' parameter, add it
                if 'wa_id' in sig.parameters and not tool_input.get('wa_id', ""):
                    tool_input['wa_id'] = wa_id
                
                try:
                    # Execute tool function (synchronous or asynchronous)
                    if inspect.iscoroutinefunction(function):
                        output = asyncio.run(function(**tool_input))
                    else:
                        output = function(**tool_input)
                    
                    # Log tool output
                    if isinstance(output, (dict, list)):
                        logging.info(f"Tool output for {tool_name}: {json.dumps(output)[:500]}...")
                    else:
                        logging.info(f"Tool output for {tool_name}: {str(output)[:500]}...")
                    
                    # Add the assistant message with thinking and tool use, exactly as received
                    input_chat.append({
                        "role": "assistant",
                        "content": assistant_content
                    })
                    
                    # Add tool result as user message
                    input_chat.append({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": json.dumps(output.get('message', output)) if isinstance(output, (dict, list)) else str(output)
                        }]
                    })
                    
                except Exception as e:
                    # Handle tool execution errors
                    logging.error(f"Error executing function {tool_name}: {e}")
                    LLM_TOOL_EXECUTION_ERRORS.labels(tool_name=tool_name, provider="anthropic").inc()
                    
                    # Add the assistant message with thinking and tool use
                    input_chat.append({
                        "role": "assistant",
                        "content": assistant_content
                    })
                    
                    # Add error result
                    input_chat.append({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": f"Error: {str(e)}"
                        }]
                    })
                    
            else:
                # Handle unimplemented tool
                logging.error(f"Function '{tool_name}' not implemented.")
                LLM_TOOL_EXECUTION_ERRORS.labels(tool_name=tool_name, provider="anthropic").inc()
                
                # Add the assistant message with thinking and tool use
                input_chat.append({
                    "role": "assistant",
                    "content": assistant_content
                })
                
                # Add error about unimplemented tool
                input_chat.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": f"Error: Tool '{tool_name}' is not implemented"
                    }]
                })
            
            # Follow-up request after tool result
            logging.info(f"Making follow-up Claude API request for {wa_id}")
            response = client.beta.messages.create(**prepare_request_args())
            logging.info(f"Follow-up response stop reason: {response.stop_reason}")
            
        # Extract final text response
        final_response = next(
            (block.text for block in response.content if hasattr(block, "text")),
            None,
        )
        
        # Format and return the response
        if final_response:
            now = datetime.datetime.now(tz=ZoneInfo(tz))
            date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M:%S")
            
            logging.info(f"Generated message for {wa_id}: {final_response[:100]}...")
            return final_response, date_str, time_str
        else:
            # No text content found in response
            logging.error("No text content in Claude response; returning None without retry")
            LLM_EMPTY_RESPONSES.labels(provider="anthropic", response_type="no_text_content").inc()
            now = datetime.datetime.now(tz=ZoneInfo(tz))
            date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M:%S")
            return None, date_str, time_str
            
    except Exception as e:
        # Handle and log API errors
        error_type = map_anthropic_error(e)
        if error_type == "unknown":
            error_type = f"unknown::{type(e).__name__}"
        logging.error("======================================================")
        logging.error(f"CLAUDE API ERROR for wa_id={wa_id}: {e} (type: {error_type})")
        logging.error("This error will trigger the retry mechanism")
        logging.error("======================================================")
        LLM_API_ERRORS.labels(provider="anthropic", error_type=error_type).inc()
        if _is_retryable_anthropic_exception(e):
            LLM_RETRY_ATTEMPTS.labels(provider="anthropic", error_type=error_type).inc()
        raise  # Re-raise for retry