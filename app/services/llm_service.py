# app/services/llm_service.py
import abc
import logging
from app.config import config, get
from app.services.anthropic_service import run_claude
from app.services.gemini_service import run_gemini
from app.services.openai_service import run_openai


class BaseLLMService(abc.ABC):
    """
    Abstract base class for LLM services. Subclasses must implement the `run` method.
    
    Centralizes all default values for all LLM services.
    """
    def __init__(self):
        # Common configuration for all LLM services
        self.system_prompt = config.get("SYSTEM_PROMPT")
        self.max_tokens = 4096
        self.timezone = config.get("TIMEZONE", "UTC")
        self.stream = False
        
        # Default LLM-specific configurations
        # Claude
        self.claude_model = "claude-3-7-sonnet-20250219"
        self.enable_thinking = True
        self.thinking_budget_tokens = 2048
        self.claude_thinking = None
        if self.enable_thinking:
            self.claude_thinking = {
                "type": "enabled",
                "budget_tokens": self.thinking_budget_tokens
            }
        
        # Gemini
        self.gemini_model = "gemini-2.5-pro-preview-05-06"
        
        # OpenAI
        self.openai_model = "o3"
        self.openai_reasoning_effort = "high"
        self.openai_reasoning_summary = "auto"
        self.openai_text_format = "text"
        self.openai_store = True
    
    @abc.abstractmethod
    def run(self, wa_id: str):
        """
        Execute the LLM request using the service and return a tuple (response_text, date_str, time_str).
        """
        pass


class AnthropicService(BaseLLMService):
    def run(self, wa_id: str):
        return run_claude(
            wa_id=wa_id, 
            model=self.claude_model,
            system_prompt=self.system_prompt,
            max_tokens=self.max_tokens,
            thinking=self.claude_thinking,
            stream=self.stream,
            timezone=self.timezone
        )


class GeminiService(BaseLLMService):
    def run(self, wa_id: str):
        return run_gemini(
            wa_id=wa_id, 
            model=self.gemini_model,
            system_prompt=self.system_prompt,
            max_tokens=self.max_tokens,
            timezone=self.timezone
        )


class OpenAIService(BaseLLMService):
    def run(self, wa_id: str):
        return run_openai(
            wa_id=wa_id, 
            model=self.openai_model,
            system_prompt=self.system_prompt,
            max_tokens=self.max_tokens,
            reasoning_effort=self.openai_reasoning_effort,
            reasoning_summary=self.openai_reasoning_summary,
            text_format=self.openai_text_format,
            store=self.openai_store,
            timezone=self.timezone
        )


def get_llm_service():
    """
    Factory function that returns an LLM service instance based on configuration.
    Supported values: 'anthropic', 'gemini', 'openai'.
    Defaults to 'anthropic'.
    """
    provider = get("LLM_PROVIDER", "anthropic").lower()
    logging.info(f"LLM provider configured as: {provider}")
    if provider == "anthropic":
        return AnthropicService()
    elif provider == "gemini":
        return GeminiService()
    elif provider == "openai":
        return OpenAIService()
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {provider}") 