# app/services/llm_service.py
import abc
import logging
import httpx
from app.config import get
from app.services.anthropic_service import run_claude
from app.services.gemini_service import run_gemini
from app.services.openai_service import run_openai

# Create a shared HTTP client for LLM API calls
http_client = httpx.AsyncClient(
    timeout=30.0,
    limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
)

class BaseLLMService(abc.ABC):
    """
    Abstract base class for LLM services. Subclasses must implement the `run` method.
    """
    def __init__(self):
        self.client = http_client
    
    @abc.abstractmethod
    async def run(self, wa_id: str, name: str):
        """
        Execute the LLM request using the service and return a tuple (response_text, date_str, time_str).
        """
        pass


class AnthropicService(BaseLLMService):
    async def run(self, wa_id: str, name: str):
        return await run_claude(wa_id, name, self.client)


class GeminiService(BaseLLMService):
    async def run(self, wa_id: str, name: str):
        return await run_gemini(wa_id, name, self.client)


class OpenAIService(BaseLLMService):
    async def run(self, wa_id: str, name: str):
        return await run_openai(wa_id, name, self.client)


# Create singleton instances of each service
_anthropic_service = None
_gemini_service = None
_openai_service = None

def get_llm_service():
    """
    Factory function that returns an LLM service instance based on configuration.
    Supported values: 'anthropic', 'gemini', 'openai'.
    Defaults to 'anthropic'.
    
    Returns a singleton instance of the appropriate service.
    """
    global _anthropic_service, _gemini_service, _openai_service
    
    provider = get("LLM_PROVIDER", "anthropic").lower()
    logging.info(f"LLM provider configured as: {provider}")
    
    if provider == "anthropic":
        if _anthropic_service is None:
            _anthropic_service = AnthropicService()
        return _anthropic_service
    elif provider == "gemini":
        if _gemini_service is None:
            _gemini_service = GeminiService()
        return _gemini_service
    elif provider == "openai":
        if _openai_service is None:
            _openai_service = OpenAIService()
        return _openai_service
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {provider}") 