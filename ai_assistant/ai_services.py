"""Utility helpers for the AI assistant module."""

import logging
from typing import Any, Dict, List, Optional

from .services import LocalAgentService, get_ai_service

logger = logging.getLogger("ai_chat")


class MessageProcessor:
    """Basic request parsing helpers used by the API layer."""

    MESSAGE_FIELDS = ("messages", "message", "content", "text")

    @classmethod
    def parse_user_input(cls, request_data: Dict[str, Any]) -> str:
        if not request_data:
            return ""
        for field in cls.MESSAGE_FIELDS:
            if field not in request_data or not request_data[field]:
                continue
            value = request_data[field]
            if isinstance(value, str):
                return value.strip()
            if isinstance(value, list) and value:
                candidate = value[-1]
                if isinstance(candidate, dict) and "content" in candidate:
                    return str(candidate["content"]).strip()
                if isinstance(candidate, str):
                    return candidate.strip()
        return ""

    @staticmethod
    def validate_message(message: str) -> bool:
        if not isinstance(message, str):
            return False
        stripped = message.strip()
        if not stripped:
            return False
        if len(stripped) > 8000:
            return False
        return True

    @staticmethod
    def clean_message(message: str) -> str:
        if not message:
            return ""
        cleaned = message.strip()
        return "\n".join(line.rstrip() for line in cleaned.splitlines())


class ChatMessageProcessor(MessageProcessor):
    """Convenience methods kept for template compatibility."""

    @staticmethod
    def prepare_message_for_storage(content: str) -> str:
        return MessageProcessor.clean_message(content)

    @staticmethod
    def prepare_message_for_display(content: str) -> str:
        return MessageProcessor.clean_message(content)

    @staticmethod
    def extract_conversation_history(_: Dict[str, Any]) -> Optional[List[Dict[str, Any]]]:
        logger.debug("conversation history is managed by LocalAgentService; returning None")
        return None


def get_local_ai_service(force_reload: bool = False) -> LocalAgentService:
    """Explicit helper used by management commands or tests."""
    return get_ai_service(force_reload=force_reload)


def check_ai_service_health() -> Dict[str, Any]:
    """Lightweight health check used by the monitoring endpoints."""
    try:
        service = get_ai_service()
        _ = service.list_sessions()
        return {
            "status": "healthy",
            "provider": service.provider,
            "service_available": True,
            "message": "local AI service is ready",
        }
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("local AI service health check failed: %s", exc, exc_info=True)
        return {
            "status": "unhealthy",
            "provider": "local-simulator",
            "service_available": False,
            "error": str(exc),
            "message": "local AI service is not available",
        }
