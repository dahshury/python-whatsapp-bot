# app/services/llm_service.py
import abc
from app.config import get
from app.services.anthropic_service import run_claude
from app.services.gemini_service import run_gemini
from app.services.openai_service import run_openai


class BaseLLMService(abc.ABC):
    """
    Abstract base class for LLM services. Subclasses must implement the `run` method.
    """
    @abc.abstractmethod
    def run(self, wa_id: str, name: str):
        """
        Execute the LLM request using the service and return a tuple (response_text, date_str, time_str).
        """
        pass


class AnthropicService(BaseLLMService):
    def run(self, wa_id: str, name: str):
        return run_claude(wa_id, name)


class GeminiService(BaseLLMService):
    def run(self, wa_id: str, name: str):
        return run_gemini(wa_id, name)


class OpenAIService(BaseLLMService):
    def run(self, wa_id: str, name: str):
        return run_openai(wa_id, name)


def get_llm_service():
    """
    Factory function that returns an LLM service instance based on configuration.
    Supported values: 'anthropic', 'gemini', 'openai'.
    Defaults to 'anthropic'.
    """
    provider = get("LLM_PROVIDER", "anthropic").lower()
    if provider == "anthropic":
        return AnthropicService()
    elif provider == "gemini":
        return GeminiService()
    elif provider == "openai":
        return OpenAIService()
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {provider}") 