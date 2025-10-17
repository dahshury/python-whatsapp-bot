# To run this code you need to install the following dependencies:
# pip install google-genai zoneinfo

import asyncio
import datetime
import functools
import inspect
import json
import logging
from zoneinfo import ZoneInfo

from google import genai
from google.api_core.exceptions import (
    DeadlineExceeded,
    GoogleAPIError,
    InvalidArgument,
    NotFound,
    PermissionDenied,
    ResourceExhausted,
)
from google.genai import types

from app.config import config, load_config
from app.decorators import retry_decorator
from app.metrics import (
    FUNCTION_ERRORS,
    LLM_API_ERRORS,
    LLM_EMPTY_RESPONSES,
    LLM_RETRY_ATTEMPTS,
    LLM_TOOL_EXECUTION_ERRORS,
)
from app.services.tool_schemas import FUNCTION_MAPPING, TOOL_DEFINITIONS
from app.utils import append_message, parse_unix_timestamp, retrieve_messages

load_config()

# Get API key from environment or config
GEMINI_API_KEY = config.get("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-pro-preview-05-06"
TIMEZONE = config.get("TIMEZONE")
# Create system prompt
SYSTEM_PROMPT_TEXT = config.get("SYSTEM_PROMPT")

# Initialize the Gemini API client
client = genai.Client(api_key=GEMINI_API_KEY)
logging.getLogger("google.genai").setLevel(logging.DEBUG)


def map_gemini_error(e):
    """Map Google Gemini exceptions to standardized error types"""
    if isinstance(e, ResourceExhausted):
        # Check if it's likely a rate limit or context length
        error_msg = str(e).lower()
        if "quota" in error_msg or "rate" in error_msg:
            return "rate_limit"
        else:
            return "context_length"
    elif isinstance(e, PermissionDenied):
        return "authentication"
    elif isinstance(e, InvalidArgument):
        return "bad_request"
    elif isinstance(e, NotFound):
        return "provider_specific"
    elif isinstance(e, GoogleAPIError):
        # General Google API error
        return "server"
    elif isinstance(e, (TimeoutError, DeadlineExceeded)):
        return "timeout"
    else:
        # Network or unknown error
        error_msg = str(e).lower()
        if "network" in error_msg or "connection" in error_msg:
            return "network"
        return "unknown"


def _is_retryable_gemini_exception(e: Exception) -> bool:
    """Return True if the exception is considered retryable by our retry policy."""
    # Mark retries only for network/server/quota and timeouts
    return isinstance(
        e, (GoogleAPIError, ResourceExhausted, DeadlineExceeded, TimeoutError)
    )


# Create function declarations dynamically from assistant_functions
@functools.lru_cache(maxsize=1)
def create_function_declarations():
    declarations = []

    # Define schema type mapping for conversions
    type_mapping = {
        "boolean": genai.types.Type.BOOLEAN,
        "string": genai.types.Type.STRING,
        "integer": genai.types.Type.INTEGER,
        "number": genai.types.Type.NUMBER,
        "object": genai.types.Type.OBJECT,
        "array": genai.types.Type.ARRAY,
    }

    # Use central schemas
    schema_map = {t["name"]: t["schema"] for t in TOOL_DEFINITIONS}

    # Helper function to convert JSON schema to Gemini schema
    def convert_schema(json_schema):
        schema_type = json_schema.get("type", "string")
        schema_args = {
            "type": type_mapping.get(schema_type, genai.types.Type.STRING),
            "description": json_schema.get("description", ""),
        }

        # Add enum if present
        if "enum" in json_schema:
            schema_args["enum"] = json_schema["enum"]

        # Add default if present
        if "default" in json_schema:
            # No direct default in Gemini schema, mentioned in description
            schema_args["description"] += f" Default: {json_schema['default']}."

        return genai.types.Schema(**schema_args)

    # Helper function to convert property schemas
    def convert_properties(properties):
        converted = {}
        for prop_name, prop_schema in properties.items():
            converted[prop_name] = convert_schema(prop_schema)
        return converted

    # Create declarations for each function in assistant_functions with schema
    for func_name, func in FUNCTION_MAPPING.items():
        # Skip internal functions (starting with _)
        if func_name.startswith("_"):
            continue

        # Get function docstring
        docstring = func.__doc__ or f"Function {func_name}"
        description = docstring.split("\n")[0].strip()

        # Use central schema if available
        func_schema = schema_map.get(func_name)
        if func_schema:
            declaration_params = genai.types.Schema(
                type=genai.types.Type.OBJECT,
                properties={
                    k: genai.types.Schema(
                        type=genai.types.Type._from_json(v["type"]),
                        description=v.get("description", ""),
                    )
                    for k, v in func_schema.get("properties", {}).items()
                },
                required=func_schema.get("required", []),
            )
            declarations.append(
                types.FunctionDeclaration(
                    name=func_name,
                    description=description,
                    parameters=declaration_params,
                )
            )
            continue

        # Get parameter information
        sig = inspect.signature(func)
        params = sig.parameters

        # Prepare parameters schema
        parameters = {
            "type": genai.types.Type.OBJECT,
            "properties": {},
        }

        # Collect required parameters
        required_params = []

        # Process each parameter
        for param_name, param in params.items():
            # Skip 'wa_id' as it's handled by the service
            if param_name == "wa_id":
                continue

            # Default description
            param_desc = f"Parameter {param_name}"

            # Check if parameter has a default
            has_default = param.default != inspect.Parameter.empty

            # Infer type from default value
            param_type = "string"  # Default type
            if has_default:
                if isinstance(param.default, bool):
                    param_type = "boolean"
                elif isinstance(param.default, int):
                    param_type = "integer"
                elif isinstance(param.default, float):
                    param_type = "number"

            # If parameter is required (no default)
            if not has_default and param_name not in [
                "ar"
            ]:  # Exclude 'ar' from required
                required_params.append(param_name)

            # Add property to schema
            parameters["properties"][param_name] = genai.types.Schema(
                type=type_mapping.get(param_type, genai.types.Type.STRING),
                description=param_desc,
            )

        # Set required parameters if any
        if required_params:
            parameters["required"] = required_params

        # Create function declaration
        declarations.append(
            types.FunctionDeclaration(
                name=func_name,
                description=description,
                parameters=genai.types.Schema(**parameters),
            )
        )

    return declarations


@retry_decorator
def run_gemini(wa_id, model, system_prompt, max_tokens=None, timezone=None):
    """
    Run Gemini with the conversation history and handle tool calls.
    Returns the generated message along with date and time.
    Raises exceptions for error cases to enable retry functionality.

    Args:
        wa_id (str): WhatsApp ID of the user
        model (str): Gemini model to use.
        system_prompt (str): System prompt to use.
        max_tokens (int, optional): Maximum tokens for response.
        timezone (str, optional): Timezone for timestamps.
    """
    # Use timezone from parameters or fallback to UTC
    tz = timezone or "UTC"

    # Retrieve conversation history
    messages_history = retrieve_messages(wa_id)

    # Convert messages to Gemini format
    contents = []

    # Add system message as the first user message
    contents.append(
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=system_prompt),
            ],
        )
    )

    # Add model response to system message
    contents.append(
        types.Content(
            role="model",
            parts=[
                types.Part.from_text(
                    text="I'll assist you according to these instructions."
                ),
            ],
        )
    )

    # Process conversation history
    for message in messages_history:
        role = message.get("role")
        content = message.get("content", [])

        # Skip empty messages
        if not content:
            continue

        # Convert role from OpenAI format to Gemini format
        gemini_role = "user" if role == "user" else "model"

        # Process content based on type
        if isinstance(content, str):
            # Simple text message
            contents.append(
                types.Content(
                    role=gemini_role, parts=[types.Part.from_text(text=content)]
                )
            )
        elif isinstance(content, list):
            # Complex message with blocks
            parts = []

            # Extract text from content blocks
            for block in content:
                if isinstance(block, dict):
                    # Handle different block types
                    block_type = block.get("type", "")

                    if block_type == "text":
                        # Text block
                        parts.append(types.Part.from_text(text=block.get("text", "")))
                    elif block_type == "tool_use":
                        # Tool use block - add as text for now
                        tool_name = block.get("name", "")
                        tool_input = block.get("input", {})
                        parts.append(
                            types.Part.from_text(
                                text=f"[Tool use: {tool_name} with input {json.dumps(tool_input)}]"
                            )
                        )
                    elif block_type == "tool_result":
                        # Tool result block
                        tool_content = block.get("content", "")
                        parts.append(
                            types.Part.from_text(text=f"[Tool result: {tool_content}]")
                        )
                elif isinstance(block, str):
                    # Plain text in array
                    parts.append(types.Part.from_text(text=block))

            # Add the content with all parts
            if parts:
                contents.append(types.Content(role=gemini_role, parts=parts))

    try:
        # Create function declarations
        function_declarations = create_function_declarations()

        # Set up model parameters
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 64,
            "max_output_tokens": max_tokens if max_tokens else 4096,
        }

        # Make request to Gemini API
        logging.info(f"Making Gemini API request for {wa_id}")

        # Create the model with the specified model name
        model_instance = client.get_genai_model(model)

        # Generate content with function calling
        response = model_instance.generate_content(
            contents,
            generation_config=generation_config,
            tools=[types.Tool(function_declarations=function_declarations)],
        )

        # Process function calls if present with maximum iteration limit to prevent infinite loops
        max_iterations = 10
        iteration_count = 0

        while (
            hasattr(response, "candidates")
            and response.candidates
            and hasattr(response.candidates[0], "function_calls")
            and response.candidates[0].function_calls
            and iteration_count < max_iterations
        ):
            iteration_count += 1
            function_calls = response.candidates[0].function_calls
            logging.info(
                f"Gemini function call iteration {iteration_count}/{max_iterations}, processing {len(function_calls)} function calls"
            )

            # Process each function call
            for function_call in function_calls:
                function_name = function_call.name
                function_args = {}

                # Extract function arguments
                for arg_name, arg_value in function_call.args.items():
                    function_args[arg_name] = arg_value

                logging.info(
                    f"Function call: {function_name} with args: {function_args}"
                )
                # Persist tool call (arguments)
                try:
                    pretty_args = json.dumps(
                        function_args or {}, ensure_ascii=False, indent=2
                    )
                    from html import escape as _escape

                    html_args = (
                        f'<details class="details">'
                        f"<summary>Tool: {function_name}</summary>"
                        f'<div><pre><code class="language-json">{_escape(pretty_args)}</code></pre></div>'
                        f"</details>"
                    )
                    d, t = parse_unix_timestamp(
                        int(datetime.datetime.now(datetime.timezone.utc).timestamp())
                    )
                    append_message(wa_id, "tool", html_args, d, t)
                except Exception as _persist_args_err:
                    logging.error(
                        f"Persist tool args failed for {function_name}: {_persist_args_err}"
                    )

                # Execute the function if it exists
                if function_name in FUNCTION_MAPPING:
                    function = FUNCTION_MAPPING[function_name]
                    sig = inspect.signature(function)

                    # Add wa_id if the function expects it
                    if "wa_id" in sig.parameters and "wa_id" not in function_args:
                        function_args["wa_id"] = wa_id

                    try:
                        # Execute function (async or sync)
                        if inspect.iscoroutinefunction(function):
                            result = asyncio.run(function(**function_args))
                        else:
                            result = function(**function_args)

                        # Convert result to string if needed
                        if isinstance(result, (dict, list)):
                            result_str = json.dumps(result)
                        else:
                            result_str = str(result)

                        # Log result (truncated for large outputs)
                        logging.info(f"Function result: {result_str[:500]}...")

                    except Exception as e:
                        # Use both metrics for now during transition
                        FUNCTION_ERRORS.labels(function=function_name).inc()
                        LLM_TOOL_EXECUTION_ERRORS.labels(
                            tool_name=function_name, provider="gemini"
                        ).inc()
                        result_str = f"Error executing {function_name}: {str(e)}"
                        logging.error(result_str, exc_info=True)
                else:
                    result_str = f"Function {function_name} not found"
                    logging.error(result_str)
                    LLM_TOOL_EXECUTION_ERRORS.labels(
                        tool_name=function_name, provider="gemini"
                    ).inc()

                # Add function call and result to conversation
                contents.append(
                    types.Content(
                        role="model",
                        parts=[
                            types.Part.from_text(
                                text=f"I need to call {function_name}({json.dumps(function_args)})"
                            )
                        ],
                    )
                )

                contents.append(
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_text(
                                text=f"Result of {function_name}: {result_str}"
                            )
                        ],
                    )
                )
                # Persist tool result
                try:
                    from html import escape as _escape

                    pretty_out = (
                        result_str
                        if isinstance(result_str, str)
                        else json.dumps(result_str, ensure_ascii=False, indent=2)
                    )
                    html_out = (
                        f'<details class="details">'
                        f"<summary>Result: {function_name}</summary>"
                        f'<div><pre><code class="language-json">{_escape(pretty_out)}</code></pre></div>'
                        f"</details>"
                    )
                    d2, t2 = parse_unix_timestamp(
                        int(datetime.datetime.now(datetime.timezone.utc).timestamp())
                    )
                    append_message(wa_id, "tool", html_out, d2, t2)
                except Exception as _persist_out_err:
                    logging.error(
                        f"Persist tool result failed for {function_name}: {_persist_out_err}"
                    )

            # Generate follow-up response
            try:
                response = model_instance.generate_content(
                    contents,
                    generation_config=generation_config,
                    tools=[types.Tool(function_declarations=function_declarations)],
                )
            except Exception as e:
                logging.error(
                    f"Error generating Gemini follow-up response in iteration {iteration_count}: {e}"
                )
                break

        if iteration_count >= max_iterations:
            logging.warning(
                f"Gemini function call loop reached maximum iterations ({max_iterations}), breaking to prevent infinite loop"
            )
        else:
            logging.debug(
                f"Gemini function call loop completed after {iteration_count} iterations"
            )

        # Extract final text response
        if hasattr(response, "text"):
            final_response = response.text
        elif (
            hasattr(response, "candidates")
            and response.candidates
            and hasattr(response.candidates[0], "content")
        ):
            final_response = response.candidates[0].content.parts[0].text
        else:
            final_response = None

        if final_response:
            # Generate current timestamp in the specified timezone
            now = datetime.datetime.now(tz=ZoneInfo(tz))
            date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M:%S")

            logging.info(f"Generated message for {wa_id}: {final_response[:100]}...")
            return final_response, date_str, time_str
        else:
            logging.error("No text content in Gemini response")
            LLM_EMPTY_RESPONSES.labels(
                provider="gemini", response_type="no_text_content"
            ).inc()
            now = datetime.datetime.now(tz=ZoneInfo(tz))
            date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M:%S")
            return None, date_str, time_str

    except Exception as e:
        error_type = map_gemini_error(e)
        if error_type == "unknown":
            error_type = f"unknown::{type(e).__name__}"
        logging.error(
            f"GEMINI API ERROR for wa_id={wa_id}: {e} (type: {error_type})",
            exc_info=True,
        )
        LLM_API_ERRORS.labels(provider="gemini", error_type=error_type).inc()
        if _is_retryable_gemini_exception(e):
            LLM_RETRY_ATTEMPTS.labels(provider="gemini", error_type=error_type).inc()
        raise  # Re-raise for retry handling
