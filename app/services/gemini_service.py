import logging
import json
import inspect
import os
import datetime
from zoneinfo import ZoneInfo

from app.config import config
from app.utils import retrieve_messages
from app.decorators import retry_decorator
from google import genai
from google.genai import types
from app.services.tool_schemas import TOOL_DEFINITIONS, FUNCTION_MAPPING

# Get API key from environment or config
GEMINI_API_KEY = config.get("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.5-pro-preview-03-25"

# Create system prompt 
SYSTEM_PROMPT_TEXT = config.get("SYSTEM_PROMPT", "You are a helpful assistant.")

# Initialize the Gemini API client
client = genai.Client(api_key=GEMINI_API_KEY)

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
        if func_name.startswith('_'):
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
                    k: genai.types.Schema(type=genai.types.Type._from_json(v["type"]), description=v.get("description", ""))
                    for k, v in func_schema.get("properties", {}).items()
                },
                required=func_schema.get("required", [])
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
            if param_name == 'wa_id':
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
            if not has_default and param_name not in ['ar']:  # Exclude 'ar' from required
                required_params.append(param_name)
                
            # Add property to schema
            parameters["properties"][param_name] = genai.types.Schema(
                type=type_mapping.get(param_type, genai.types.Type.STRING),
                description=param_desc
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
def run_gemini(wa_id, name):
    """
    Run Gemini with the conversation history and handle tool calls.
    Returns the generated message along with date and time.
    Raises exceptions for error cases to enable retry functionality.
    """
    # Retrieve conversation history
    messages_history = retrieve_messages(wa_id)
    
    # Convert messages to Gemini format
    contents = []
    
    # Add system message as the first user message
    contents.append(
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=SYSTEM_PROMPT_TEXT),
            ],
        )
    )
    
    # Add model response to system message
    contents.append(
        types.Content(
            role="model",
            parts=[
                types.Part.from_text(text="I'll help you as the automated manager for Dr. Amal Said's clinic."),
            ],
        )
    )
    
    # Process conversation history
    for message in messages_history:
        role = "user" if message["role"] == "user" else "model"
        
        # Handle normal text content
        if isinstance(message.get("content"), str):
            contents.append(
                types.Content(
                    role=role,
                    parts=[
                        types.Part.from_text(text=message["content"]),
                    ],
                )
            )
        
        # Handle tool results or more complex content structures
        elif isinstance(message.get("content"), list):
            parts = []
            
            for content_item in message["content"]:
                if isinstance(content_item, dict) and content_item.get("type") == "tool_result":
                    # This is a tool result, we need to create appropriate content
                    tool_result = content_item.get("content", "")
                    parts.append(types.Part.from_text(
                        text=f"Tool result: {tool_result}"
                    ))
                elif isinstance(content_item, dict) and content_item.get("type") == "text":
                    # Regular text content
                    parts.append(types.Part.from_text(text=content_item.get("text", "")))
                else:
                    # Handle other types or fallback
                    parts.append(types.Part.from_text(text=str(content_item)))
            
            if parts:
                contents.append(
                    types.Content(
                        role=role,
                        parts=parts,
                    )
                )
    
    # Create function tools
    tools = [
        types.Tool(
            function_declarations=create_function_declarations()
        )
    ]
    
    # Prepare generate content config with tools
    generate_content_config = types.GenerateContentConfig(
        tools=tools,
        response_mime_type="text/plain",
        system_instruction=[
            types.Part.from_text(text=SYSTEM_PROMPT_TEXT),
        ],
    )
    
    try:
        # Make request to Gemini API
        logging.info(f"Making Gemini API request for {name} (wa_id: {wa_id})")
        
        response_text = ""
        tool_calls_in_progress = True
        
        while tool_calls_in_progress:
            # Generate content with Gemini
            response_stream = client.models.generate_content_stream(
                model=GEMINI_MODEL,
                contents=contents,
                config=generate_content_config,
            )
            
            # Reset for this iteration
            current_response_text = ""
            has_function_calls = False
            function_calls = []
            
            # Process the streaming response
            for chunk in response_stream:
                if chunk.text:
                    current_response_text += chunk.text
                
                if chunk.function_calls:
                    has_function_calls = True
                    function_calls.extend(chunk.function_calls)
            
            # If there are no function calls, we're done
            if not has_function_calls:
                response_text = current_response_text
                tool_calls_in_progress = False
                continue
            
            # Process function calls
            for function_call in function_calls:
                function_name = function_call.name
                function_args = function_call.args
                
                logging.info(f"Tool used: {function_name}")
                logging.info(f"Tool input: {json.dumps(function_args)}")
                
                # Process the tool call
                if function_name in FUNCTION_MAPPING:
                    function = FUNCTION_MAPPING[function_name]
                    sig = inspect.signature(function)
                    
                    # If the function takes a 'wa_id' parameter, add it
                    if 'wa_id' in sig.parameters and not function_args.get('wa_id', ""):
                        function_args['wa_id'] = wa_id
                    
                    try:
                        # Invoke the function
                        output = function(**function_args)
                        
                        # Log the tool output
                        if isinstance(output, (dict, list)):
                            logging.info(f"Tool output for {function_name}: {json.dumps(output)[:500]}...")
                        else:
                            logging.info(f"Tool output for {function_name}: {str(output)[:500]}...")
                        
                        # Add model's response with tool call to conversation
                        contents.append(
                            types.Content(
                                role="model",
                                parts=[
                                    types.Part.from_text(text=current_response_text),
                                ],
                            )
                        )
                        
                        # Add tool result to conversation
                        contents.append(
                            types.Content(
                                role="user",
                                parts=[
                                    types.Part.from_text(text=f"Tool result for {function_name}: {json.dumps(output) if isinstance(output, (dict, list)) else str(output)}"),
                                ],
                            )
                        )
                        
                    except Exception as e:
                        logging.error(f"Error executing function {function_name}: {e}")
                        
                        # Add model's response with tool call to conversation
                        contents.append(
                            types.Content(
                                role="model",
                                parts=[
                                    types.Part.from_text(text=current_response_text),
                                ],
                            )
                        )
                        
                        # Add error result to conversation
                        contents.append(
                            types.Content(
                                role="user",
                                parts=[
                                    types.Part.from_text(text=f"Error executing {function_name}: {str(e)}"),
                                ],
                            )
                        )
                else:
                    logging.error(f"Function '{function_name}' not implemented.")
                    
                    # Add model's response with tool call to conversation
                    contents.append(
                        types.Content(
                            role="model",
                            parts=[
                                types.Part.from_text(text=current_response_text),
                            ],
                        )
                    )
                    
                    # Add error result to conversation
                    contents.append(
                        types.Content(
                            role="user",
                            parts=[
                                types.Part.from_text(text=f"Error: Tool '{function_name}' is not implemented"),
                            ],
                        )
                    )
        
        # Generate current timestamp
        now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M:%S")
        
        logging.info(f"Generated message for {name}: {response_text[:100]}...")
        return response_text, date_str, time_str
    
    except Exception as e:
        logging.error(f"Error in Gemini API call: {e}. Retrying...")
        raise  # Re-raise the exception for retry handling 