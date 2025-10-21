# app/services/llm_service.py
import abc
import datetime
import logging
from zoneinfo import ZoneInfo

from app.config import config, get


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
        self.claude_model = "claude-sonnet-4-20250514"
        self.enable_thinking = False
        self.thinking_budget_tokens = 1024
        self.claude_thinking = None
        if self.enable_thinking:
            self.claude_thinking = {
                "type": "enabled",
                "budget_tokens": self.thinking_budget_tokens,
            }

        # Gemini
        self.gemini_model = "gemini-2.5-pro-preview-05-06"

        # OpenAI
        self.openai_model = "gpt-5"
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
        from app.services.anthropic_service import run_claude

        return run_claude(
            wa_id=wa_id,
            model=self.claude_model,
            system_prompt=self.system_prompt,
            max_tokens=self.max_tokens,
            thinking=self.claude_thinking,
            stream=self.stream,
            timezone=self.timezone,
        )


class GeminiService(BaseLLMService):
    def run(self, wa_id: str):
        from app.services.gemini_service import run_gemini

        return run_gemini(
            wa_id=wa_id,
            model=self.gemini_model,
            system_prompt=self.system_prompt,
            max_tokens=self.max_tokens,
            timezone=self.timezone,
        )


class OpenAIService(BaseLLMService):
    def run(self, wa_id: str):
        from app.services.openai_service import run_openai

        return run_openai(
            wa_id=wa_id,
            model=self.openai_model,
            system_prompt=self.system_prompt,
            max_tokens=self.max_tokens,
            reasoning_effort=self.openai_reasoning_effort,
            reasoning_summary=self.openai_reasoning_summary,
            text_format=self.openai_text_format,
            store=self.openai_store,
            timezone=self.timezone,
        )


class OfflineLLMService(BaseLLMService):
    """Fallback LLM service that returns deterministic responses when providers are unavailable."""

    def __init__(self, reason: str | None = None):
        super().__init__()
        self.reason = reason or "Automated assistant replies are disabled."

    def run(self, wa_id: str):
        try:
            now = datetime.datetime.now(ZoneInfo(self.timezone))
        except Exception:
            now = datetime.datetime.utcnow()
        message = (
            self.reason
            if isinstance(self.reason, str) and self.reason
            else "Automated assistant replies are disabled."
        )
        logging.info(
            "OfflineLLMService responding for wa_id=%s with static message", wa_id
        )
        return message, now.strftime("%Y-%m-%d"), now.strftime("%H:%M")


def get_llm_service():
    """
    Factory function that returns an LLM service instance based on configuration.
    Supported values: 'anthropic', 'gemini', 'openai'.
    Defaults to 'anthropic'. Falls back to OfflineLLMService when configuration is missing.
    """
    provider = (get("LLM_PROVIDER", "anthropic") or "").strip().lower()
    logging.debug("LLM provider configured as: %s", provider or "<unset>")

    if provider in {"", "offline", "disabled", "none"}:
        logging.warning(
            "LLM provider is unset or disabled; using OfflineLLMService fallback."
        )
        return OfflineLLMService("Automated replies are disabled (offline mode).")

    if provider == "anthropic":
        if not config.get("ANTHROPIC_API_KEY"):
            logging.warning(
                "ANTHROPIC_API_KEY is missing; defaulting to OfflineLLMService."
            )
            return OfflineLLMService(
                "Set ANTHROPIC_API_KEY to enable Claude-powered responses."
            )
        return AnthropicService()
    elif provider == "gemini":
        if not config.get("GEMINI_API_KEY"):
            logging.warning(
                "GEMINI_API_KEY is missing; defaulting to OfflineLLMService."
            )
            return OfflineLLMService(
                "Set GEMINI_API_KEY to enable Gemini-powered responses."
            )
        try:
            __import__("app.services.gemini_service")
        except ImportError as exc:
            logging.warning(
                "Gemini dependencies are unavailable (%s); using OfflineLLMService.",
                exc,
            )
            return OfflineLLMService(
                "Gemini dependencies are missing; install google-genai to enable it."
            )
        return GeminiService()
    elif provider == "openai":
        if not config.get("OPENAI_API_KEY"):
            logging.warning(
                "OPENAI_API_KEY is missing; defaulting to OfflineLLMService."
            )
            return OfflineLLMService(
                "Set OPENAI_API_KEY to enable OpenAI-powered responses."
            )
        try:
            __import__("app.services.openai_service")
        except ImportError as exc:
            logging.warning(
                "OpenAI dependencies are unavailable (%s); using OfflineLLMService.",
                exc,
            )
            return OfflineLLMService(
                "OpenAI dependencies are missing; install openai to enable it."
            )
        return OpenAIService()
    else:
        logging.warning(
            "Unknown LLM_PROVIDER '%s'; using OfflineLLMService fallback.", provider
        )
        return OfflineLLMService(
            f"Unknown LLM provider '{provider}'. Automated replies are disabled."
        )
