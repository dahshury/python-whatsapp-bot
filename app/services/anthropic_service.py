import logging
import asyncio
import json
import inspect
from app.config import config, load_config
from anthropic import Anthropic, AnthropicError, APITimeoutError, APIConnectionError, BadRequestError, RateLimitError, AuthenticationError
from app.utils.http_client import sync_client
from app.utils import retrieve_messages
from app.decorators import retry_decorator
import datetime
from zoneinfo import ZoneInfo
from app.services.tool_schemas import TOOL_DEFINITIONS, FUNCTION_MAPPING
from app.metrics import LLM_API_ERRORS, LLM_RETRY_ATTEMPTS, LLM_TOOL_EXECUTION_ERRORS, LLM_EMPTY_RESPONSES, LLM_ERROR_TYPES

ANTHROPIC_API_KEY = config.get("ANTHROPIC_API_KEY")
# Default values - will be overridden by parameters passed from llm_service.py
CLAUDE_MODEL = "claude-3-7-sonnet-20250219"
TIMEZONE = config.get("TIMEZONE")
# Add extended thinking parameters for Claude
THINKING_BUDGET_TOKENS = 2048
THINKING = {
    "type": "enabled",
    "budget_tokens": THINKING_BUDGET_TOKENS
}
# Create cached system prompt structure
if config.get("SYSTEM_PROMPT"):
    SYSTEM_PROMPT_TEXT = config.get("SYSTEM_PROMPT")
else:
    load_config()
    SYSTEM_PROMPT_TEXT = config.get("SYSTEM_PROMPT")
    
SYSTEM_PROMPT = [
    {
        "type": "text",
        "text": SYSTEM_PROMPT_TEXT,
        "cache_control": {"type": "ephemeral"}
    }
]

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

@retry_decorator
def run_claude(wa_id, model, system_prompt=None, max_tokens=None, thinking=None, stream=False, enable_thinking=True, timezone=None):
    """
    Run Claude with the conversation history and handle tool calls.
    Returns the generated message along with date and time.
    Raises exceptions for error cases to enable retry functionality.
    
    Args:
        wa_id (str): WhatsApp ID of the user
        model (str): Claude model to use.
        system_prompt (str, optional): System prompt to use.
        max_tokens (int, optional): Maximum tokens for response.
        thinking (dict, optional): Extended thinking configuration.
        stream (bool, optional): Whether to stream responses.
        enable_thinking (bool): Whether to enable extended thinking.
        timezone (str, optional): Timezone for timestamps.
    """
    # Configure thinking based on enable_thinking parameter
    api_thinking = None
    if enable_thinking and thinking:
        api_thinking = thinking
    
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
                "text": "",
                "cache_control": {"type": "ephemeral"}
            }
        ]
    
    # Use timezone from parameters or fallback to UTC
    tz = timezone or "UTC"
    
    input_chat = retrieve_messages(wa_id)
    
    try:
        # Make request to Claude API
        logging.info(f"Making Claude API request for {wa_id}")
        response = client.beta.messages.create(
            model=model,
            system=system_prompt_obj,
            messages=input_chat,
            tools=tools,
            max_tokens=max_tokens,
            thinking=api_thinking,
            stream=stream,
            betas=["token-efficient-tools-2025-02-19"]
        )
        
        # Log the stop reason
        logging.info(f"Initial response stop reason: {response.stop_reason}")
        
        # Process tool calls if present - in a loop to handle multiple consecutive tool calls
        while response.stop_reason == "tool_use":            
            # Find the tool use block in the content
            tool_use_block = next((block for block in response.content if block.type == "tool_use"), None)
            
            if not tool_use_block:
                logging.error("Tool use indicated but no tool_use block found in content")
                LLM_API_ERRORS.labels(provider="anthropic", error_type="invalid_response").inc()
                break
                
            tool_name = tool_use_block.name
            tool_input = tool_use_block.input
            tool_use_id = tool_use_block.id
            
            logging.info(f"Tool used: {tool_name}")
            logging.info(f"Tool input: {json.dumps(tool_input)}")
            
            # Extract thinking blocks - this is critical for Claude 3.7 extended thinking
            thinking_blocks = [block for block in response.content 
                              if block.type in ["thinking", "redacted_thinking"]]
            
            # Process the tool call
            if tool_name in FUNCTION_MAPPING:
                function = FUNCTION_MAPPING[tool_name]
                sig = inspect.signature(function)
                
                # If the function takes a 'wa_id' parameter, add it
                if 'wa_id' in sig.parameters and not tool_input.get('wa_id', ""):
                    tool_input['wa_id'] = wa_id
                
                try:
                    if inspect.iscoroutinefunction(function):
                        # For async functions, run them in the event loop
                        output = asyncio.run(function(**tool_input))
                    else:
                        # For regular functions, call them directly
                        output = function(**tool_input)
                    # Log the tool output
                    if isinstance(output, (dict, list)):
                        logging.info(f"Tool output for {tool_name}: {json.dumps(output)[:500]}...")
                    else:
                        logging.info(f"Tool output for {tool_name}: {str(output)[:500]}...")
                    
                    # Store assistant message with thinking blocks followed by tool_use block
                    # This order is critical per the documentation
                    assistant_blocks = thinking_blocks + [tool_use_block]
                    
                    input_chat.append({
                        "role": "assistant",
                        "content": assistant_blocks
                    })
                    
                    # Add tool result to conversation
                    input_chat.append({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": json.dumps(output) if isinstance(output, (dict, list)) else str(output)
                        }]
                    })
                    
                    # For continued conversation after tool use, we must disable thinking
                    # to avoid the "must start with thinking block" error on follow-up
                    # This is because Claude doesn't produce new thinking blocks during tool result processing
                    temp_thinking = None
                    if response.stop_reason == "tool_use":
                        # Only use thinking for the first request, disable for follow-ups
                        temp_thinking = api_thinking
                        api_thinking = None
                    
                    # Send follow-up with tool outputs
                    response = client.beta.messages.create(
                        model=model,
                        system=system_prompt_obj,
                        messages=input_chat,
                        tools=tools,
                        max_tokens=max_tokens,
                        thinking=api_thinking,  # May be None during tool chain
                        stream=stream,
                        betas=["token-efficient-tools-2025-02-19"]
                    )
                    
                    # Restore thinking setting for future requests
                    api_thinking = temp_thinking
                    
                    # Log the new stop reason
                    logging.info(f"Follow-up response stop reason: {response.stop_reason}")
                    
                except Exception as e:
                    logging.error(f"Error executing function {tool_name}: {e}")
                    # Track tool-specific execution errors with provider
                    LLM_TOOL_EXECUTION_ERRORS.labels(tool_name=tool_name, provider="anthropic").inc()
                    
                    # Store assistant message with thinking and tool use
                    assistant_blocks = thinking_blocks + [tool_use_block]
                    
                    input_chat.append({
                        "role": "assistant",
                        "content": assistant_blocks
                    })
                    
                    input_chat.append({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": f"Error: {str(e)}"
                        }]
                    })
                    
                    # Temporarily disable thinking for tool result processing
                    temp_thinking = api_thinking
                    api_thinking = None
                    
                    # Continue the conversation despite the error
                    response = client.beta.messages.create(
                        model=model,
                        system=system_prompt_obj,
                        messages=input_chat,
                        tools=tools,
                        max_tokens=max_tokens,
                        thinking=api_thinking,
                        stream=stream,
                        betas=["token-efficient-tools-2025-02-19"]
                    )
                    
                    # Restore thinking setting
                    api_thinking = temp_thinking
            else:
                logging.error(f"Function '{tool_name}' not implemented.")
                # Track as tool execution error with provider
                LLM_TOOL_EXECUTION_ERRORS.labels(tool_name=tool_name, provider="anthropic").inc()
                
                # Store assistant message with thinking and tool use
                assistant_blocks = thinking_blocks + [tool_use_block]
                
                input_chat.append({
                    "role": "assistant",
                    "content": assistant_blocks
                })
                
                input_chat.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": f"Error: Tool '{tool_name}' is not implemented"
                    }]
                })
                
                # Temporarily disable thinking for tool result processing
                temp_thinking = api_thinking
                api_thinking = None
                
                response = client.beta.messages.create(
                    model=model,
                    system=system_prompt_obj,
                    messages=input_chat,
                    tools=tools,
                    max_tokens=max_tokens,
                    thinking=api_thinking,
                    stream=stream,
                    betas=["token-efficient-tools-2025-02-19"]
                )
                
                # Restore thinking setting
                api_thinking = temp_thinking
        
        # Get final text response
        final_response = next(
            (block.text for block in response.content if hasattr(block, "text")),
            None,
        )
        
        if final_response:
            # Generate current timestamp
            now = datetime.datetime.now(tz=ZoneInfo(tz))
            date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M:%S")
            
            logging.info(f"Generated message for {wa_id}: {final_response[:100]}...")
            return final_response, date_str, time_str
        else:
            # No text content; return None instead of empty string
            logging.error("No text content in Claude response; returning None without retry")
            LLM_EMPTY_RESPONSES.labels(provider="anthropic", response_type="no_text_content").inc()
            now = datetime.datetime.now(tz=ZoneInfo(tz))
            date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M:%S")
            return None, date_str, time_str
            
    except Exception as e:
        error_type = map_anthropic_error(e)
        logging.error(f"======================================================")
        logging.error(f"CLAUDE API ERROR for wa_id={wa_id}: {e} (type: {error_type})")
        logging.error(f"This error will trigger the retry mechanism")
        logging.error(f"======================================================")
        LLM_API_ERRORS.labels(provider="anthropic", error_type=error_type).inc()
        LLM_RETRY_ATTEMPTS.labels(provider="anthropic", error_type=error_type).inc()
        raise  # Re-raise the exception for retry handling