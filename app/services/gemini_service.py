# To run this code you need to install the following dependencies:
# pip install google-genai zoneinfo

import asyncio
import datetime
import inspect
import json
from typing import Tuple

from google import genai
from google.api_core.exceptions import (
    GoogleAPIError,
    InvalidArgument,
    NotFound,
    PermissionDenied,
    ResourceExhausted,
)
from google.genai import types
from zoneinfo import ZoneInfo

from app.config import config, load_config
from app.decorators import retry_decorator
from app.infrastructure.logging import get_service_logger
from app.metrics import (
    FUNCTION_ERRORS,
    LLM_API_ERRORS,
    LLM_EMPTY_RESPONSES,
    LLM_RETRY_ATTEMPTS,
    LLM_TOOL_EXECUTION_ERRORS,
)
from app.services.tool_schemas import FUNCTION_MAPPING, TOOL_DEFINITIONS
from app.utils.service_utils import retrieve_messages


# Set up domain-specific logger
logger = get_service_logger()


load_config()

# Get API key from environment or config
GEMINI_API_KEY = config.get("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-pro-preview-05-06"
TIMEZONE = config.get("TIMEZONE")
# Create system prompt
SYSTEM_PROMPT_TEXT = config.get("SYSTEM_PROMPT")

# Singleton pattern for Gemini client (avoid SSL issues at import time)
class GeminiClientManager:
    """Singleton manager for Gemini client instances"""
    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_client(self):
        """Get or create the Gemini client instance."""
        if self._client is None:
            self._client = genai.Client(api_key=GEMINI_API_KEY)
            # Google Genai debug logging is controlled by main config
        return self._client


def get_gemini_client():
    """Get or create the Gemini client instance."""
    manager = GeminiClientManager()
    return manager.get_client()


def map_gemini_error(e) -> str:
    """Map Google Gemini exceptions to standardized error types"""
    # Simple exception type mapping
    exception_mapping = {
        PermissionDenied: "authentication",
        InvalidArgument: "bad_request",
        NotFound: "provider_specific",
        GoogleAPIError: "server",
        TimeoutError: "timeout",
    }

    # Check simple mappings first
    for exception_type, error_code in exception_mapping.items():
        if isinstance(e, exception_type):
            return error_code

    # Handle ResourceExhausted with content analysis
    if isinstance(e, ResourceExhausted):
        error_msg = str(e).lower()
        return "rate_limit" if ("quota" in error_msg or "rate" in error_msg) else "context_length"

    # Handle unknown errors with content analysis
    error_msg = str(e).lower()
    return "network" if ("network" in error_msg or "connection" in error_msg) else "unknown"


# Create function declarations dynamically from assistant_functions
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
def run_gemini(wa_id, model, system_prompt, max_tokens=None, timezone=None) -> Tuple[str, str, str]:
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
        logger.info("Making Gemini API request for %s", wa_id)

        # Create the model with the specified model name
        client = get_gemini_client()  # Use lazy initialization
        model_instance = client.get_genai_model(model)

        # Generate content with function calling
        response = model_instance.generate_content(
            contents,
            generation_config=generation_config,
            tools=[types.Tool(function_declarations=function_declarations)],
        )

        # Process function calls if present
        while (
            hasattr(response, "candidates")
            and response.candidates
            and hasattr(response.candidates[0], "function_calls")
            and response.candidates[0].function_calls
        ):
            function_calls = response.candidates[0].function_calls

            # Process each function call
            for function_call in function_calls:
                function_name = function_call.name
                function_args = {}

                # Extract function arguments using dictionary comprehension for better performance
                function_args = dict(function_call.args.items())

                logger.info(
                    "Function call: %s with args: %s", function_name, function_args
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
                        logger.info("Function result: %s...", result_str[:500])

                    except (ValueError, KeyError, TypeError, OSError):
                        # Use both metrics for now during transition
                        FUNCTION_ERRORS.labels(function=function_name).inc()
                        LLM_TOOL_EXECUTION_ERRORS.labels(
                            tool_name=function_name, provider="gemini"
                        ).inc()
                        result_str = f"Error executing {function_name}"
                        logger.error(result_str, exc_info=True)
                else:
                    result_str = f"Function {function_name} not found"
                    logger.error(result_str)
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

            # Generate follow-up response
            response = model_instance.generate_content(
                contents,
                generation_config=generation_config,
                tools=[types.Tool(function_declarations=function_declarations)],
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

            logger.info("Generated message for %s: %s...", wa_id, final_response[:100])
            return final_response, date_str, time_str
        else:
            logger.error("No text content in Gemini response")
            LLM_EMPTY_RESPONSES.labels(
                provider="gemini", response_type="no_text_content"
            ).inc()
            now = datetime.datetime.now(tz=ZoneInfo(tz))
            date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M:%S")
            return None, date_str, time_str

    except Exception as e:
        error_type = map_gemini_error(e)
        logger.error(
            "GEMINI API ERROR for wa_id=%s: %s (type: %s)",
            wa_id, e, error_type,
            exc_info=True,
        )
        LLM_API_ERRORS.labels(provider="gemini", error_type=error_type).inc()
        LLM_RETRY_ATTEMPTS.labels(provider="gemini", error_type=error_type).inc()
        raise  # Re-raise for retry handling
