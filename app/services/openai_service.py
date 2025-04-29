import logging
import asyncio
import json
import ssl
import certifi
import httpx
import inspect
from app.config import config, load_config
from openai import OpenAI
from app.utils import parse_unix_timestamp
from app.utils.service_utils import get_connection
from app.decorators.safety import retry_decorator
from app.services.tool_schemas import TOOL_DEFINITIONS, FUNCTION_MAPPING

# Always reload config to ensure we have the latest values
load_config()
OPENAI_API_KEY = config["OPENAI_API_KEY"]

ssl_context = ssl.create_default_context()
ssl_context.load_verify_locations(certifi.where())

http_client = httpx.Client(verify=ssl_context)
client = OpenAI(api_key=OPENAI_API_KEY, http_client=http_client)

# Use the new Responses API (o3 model)
MODEL = "o3"
# Define available functions as tools for Responses API from central definitions
FUNCTION_DEFINITIONS = [
    {
        "type": "function",
        "name": t["name"],
        "description": t["description"],
        "parameters": t["schema"],
        "strict": False
    }
    for t in TOOL_DEFINITIONS
]

if config.get("SYSTEM_PROMPT"):
    SYSTEM_PROMPT_TEXT = config.get("SYSTEM_PROMPT")

    
logging.getLogger("openai").setLevel(logging.DEBUG)

def run_responses(wa_id, input_chat):
    """Call the Responses API, handle function calls, and return final message, response id, and timestamp."""
    # Get vector store ID if configured
    
    # Set up base kwargs with function tools
    kwargs = {
        "model": MODEL,
        "input": input_chat,
        "instructions": SYSTEM_PROMPT_TEXT,
        "text": {"format": {"type": "text"}},
        "reasoning": {"effort": "high", "summary": "auto"},
        "tools": FUNCTION_DEFINITIONS,
        "store": True
    }
    
    # vec_id = config.get("VEC_STORE_ID")
    # # Add vector store and file_search tool if configured
    # if vec_id:
    #     # Add file_search tool with vector_store_ids
    #     kwargs["tools"] = FUNCTION_DEFINITIONS + [{
    #         "type": "file_search",
    #         "vector_store_ids": [vec_id]
    #     }]

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
            if func and 'wa_id' in inspect.signature(func).parameters:
                args['wa_id'] = wa_id
            
            # Handle async functions properly
            if func:
                if inspect.iscoroutinefunction(func):
                    # For async functions, run them in the event loop
                    result = asyncio.run(func(**args))
                else:
                    # For regular functions, call them directly
                    result = func(**args)
            else:
                result = {}
                
            input_items.append({"type":"function_call","call_id":fc.call_id,"name":fc.name,"arguments":fc.arguments})
            input_items.append({"type":"function_call_output","call_id":fc.call_id,"output":json.dumps(result)})
        # submit function call outputs
        kwargs = {
            "model": MODEL,
            "input": input_items,
            "tools": FUNCTION_DEFINITIONS,
            "store": True,
            "previous_response_id": response.id  # Link to previous response
        }
        response = client.responses.create(**kwargs)
    # extract assistant message
    msg_items = [item for item in response.output if item.type == "message" and getattr(item, "role", None) == "assistant"]
    text = None
    if msg_items:
        content = msg_items[-1].content
        text = "".join([c.text for c in content if c.type == "output_text"])
    return text, response.created_at

@retry_decorator
def run_openai(wa_id):
    """
    Run the OpenAI Responses API with existing conversation context.
    Returns (response_text, date_str, time_str).
    """
    # Get the last user message from conversation
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT* FROM conversation WHERE wa_id = ?",
        (wa_id,)
    )
    rows = cursor.fetchall()
    # Sort rows by the 'id' column (assuming it's the first column, index 0)
    rows.sort(key=lambda row: row[0])
    conn.close()
    # Adjust indices: role is now at index 2, message at index 3
    input_chat = [{"role": row[2] if row[2] in ["user", "assistant"] else "assistant", "content": row[3]} for row in rows]
    # Call the synchronous Responses API function
    try:
        new_message, created_at = run_responses(wa_id, input_chat)
    except Exception as e:
        logging.error(f"Error during run_responses: {e}", exc_info=True)
        return "", "", ""
    if new_message:
        logging.info(f"OpenAI runner produced message: {new_message[:50]}...")
        date_str, time_str = parse_unix_timestamp(created_at)
        return new_message, date_str, time_str
    logging.warning(f"OpenAI runner returned no message for wa_id={wa_id}")
    return "", "", ""