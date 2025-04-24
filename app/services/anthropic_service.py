import logging
import asyncio
import json
import ssl
import certifi
import httpx
import inspect
from app.config import config
from anthropic import Anthropic, AsyncAnthropic
from app.utils import retrieve_messages
from app.decorators import retry_decorator
from app.services import assistant_functions
import datetime
from zoneinfo import ZoneInfo
from app.services.tool_schemas import TOOL_DEFINITIONS, FUNCTION_MAPPING

ANTHROPIC_API_KEY = config.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-3-7-sonnet-20250219"
# Create cached system prompt structure
SYSTEM_PROMPT_TEXT = config.get("SYSTEM_PROMPT", "You are a helpful assistant.")
SYSTEM_PROMPT = [
    {
        "type": "text",
        "text": SYSTEM_PROMPT_TEXT,
        "cache_control": {"type": "ephemeral"}
    }
]
# Setup SSL context for secure connections
ssl_context = ssl.create_default_context()
ssl_context.load_verify_locations(certifi.where())

# Configure HTTP client with SSL context
http_client = httpx.Client(verify=ssl_context)

# Create Anthropic client
client = Anthropic(api_key=ANTHROPIC_API_KEY, http_client=http_client)

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

@retry_decorator
def run_claude(wa_id, name):
    """
    Run Claude with the conversation history and handle tool calls.
    Returns the generated message along with date and time.
    Raises exceptions for error cases to enable retry functionality.
    """
    claude_messages = retrieve_messages(wa_id)
    
    try:
        # Make request to Claude API
        logging.info(f"Making Claude API request for {name} (wa_id: {wa_id})")
        response = client.beta.messages.create(
            model=CLAUDE_MODEL,
            system=SYSTEM_PROMPT,
            messages=claude_messages,
            tools=tools,
            max_tokens=4096,
            temperature=1,
            stream=False,
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
                break
                
            tool_name = tool_use_block.name
            tool_input = tool_use_block.input
            tool_use_id = tool_use_block.id
            
            logging.info(f"Tool used: {tool_name}")
            logging.info(f"Tool input: {json.dumps(tool_input)}")
            
            # Process the tool call
            if tool_name in FUNCTION_MAPPING:
                function = FUNCTION_MAPPING[tool_name]
                sig = inspect.signature(function)
                
                # If the function takes a 'wa_id' parameter, add it
                if 'wa_id' in sig.parameters and not tool_input.get('wa_id', ""):
                    tool_input['wa_id'] = wa_id
                
                try:
                    output = function(**tool_input)
                    # Log the tool output
                    if isinstance(output, (dict, list)):
                        logging.info(f"Tool output for {tool_name}: {json.dumps(output)[:500]}...")
                    else:
                        logging.info(f"Tool output for {tool_name}: {str(output)[:500]}...")
                    
                    # Add the assistant's response to conversation history
                    claude_messages.append({
                        "role": "assistant", 
                        "content": response.content
                    })
                    
                    # Add tool result to conversation
                    claude_messages.append({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": json.dumps(output) if isinstance(output, (dict, list)) else str(output)
                        }]
                    })
                    
                    # Send follow-up with tool outputs
                    response = client.beta.messages.create(
                        model=CLAUDE_MODEL,
                        system=SYSTEM_PROMPT,
                        messages=claude_messages,
                        tools=tools,
                        max_tokens=4096,
                        temperature=1,
                        stream=False,
                        betas=["token-efficient-tools-2025-02-19"]
                    )
                    
                    # Log the new stop reason
                    logging.info(f"Follow-up response stop reason: {response.stop_reason}")
                    
                except Exception as e:
                    logging.error(f"Error executing function {tool_name}: {e}")
                    
                    # Return error message to the assistant
                    claude_messages.append({
                        "role": "assistant", 
                        "content": response.content
                    })
                    
                    claude_messages.append({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": f"Error: {str(e)}"
                        }]
                    })
                    
                    # Continue the conversation despite the error
                    response = client.beta.messages.create(
                        model=CLAUDE_MODEL,
                        system=SYSTEM_PROMPT,
                        messages=claude_messages,
                        tools=tools,
                        max_tokens=4096,
                        temperature=1,
                        stream=False,
                        betas=["token-efficient-tools-2025-02-19"]
                    )
            else:
                logging.error(f"Function '{tool_name}' not implemented.")
                # Tell the assistant this tool isn't available
                claude_messages.append({
                    "role": "assistant", 
                    "content": response.content
                })
                
                claude_messages.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": f"Error: Tool '{tool_name}' is not implemented"
                    }]
                })
                
                response = client.beta.messages.create(
                    model=CLAUDE_MODEL,
                    system=SYSTEM_PROMPT,
                    messages=claude_messages,
                    tools=tools,
                    max_tokens=4096,
                    temperature=1,
                    stream=False,
                    betas=["token-efficient-tools-2025-02-19"]
                )
        
        # Get final text response
        final_response = next(
            (block.text for block in response.content if hasattr(block, "text")),
            None,
        )
        
        if final_response:
            # Generate current timestamp
            now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
            date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M:%S")
            
            logging.info(f"Generated message for {name}: {final_response[:100]}...")
            return final_response, date_str, time_str
        else:
            logging.error("No text content in Claude response")
            raise RuntimeError("No text content in Claude response")
            
    except Exception as e:
        logging.error(f"Error in Claude API call: {e}. Retrying...")
        raise  # Re-raise the exception for retry handling