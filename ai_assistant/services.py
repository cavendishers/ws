"""AI services for chat: local rule-based and optional external provider."""

import logging
import os
import uuid
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger("ai_chat")


def _now_iso() -> str:
    """Return the current timestamp in ISO 8601 format."""
    return timezone.now().isoformat()


@dataclass
class Message:
    """Lightweight chat message representation."""

    role: str
    content: str
    timestamp: str

    @classmethod
    def build(cls, role: str, content: str) -> "Message":
        cleaned = (content or "").strip()
        if not cleaned:
            raise ValueError("message content cannot be empty")
        return cls(role=role, content=cleaned, timestamp=_now_iso())


class LocalConversationStore:
    """Cache backed storage that keeps lightweight session data."""

    INDEX_KEY = "local_ai_sessions_index"
    SESSION_PREFIX = "local_ai_session:"
    DEFAULT_TIMEOUT = getattr(settings, "LOCAL_AI_SESSION_TIMEOUT", 60 * 60 * 24)

    @classmethod
    def _session_key(cls, session_id: str) -> str:
        return f"{cls.SESSION_PREFIX}{session_id}"

    @classmethod
    def list_sessions(cls) -> List[Dict[str, Any]]:
        sessions = cache.get(cls.INDEX_KEY, [])
        return [dict(item) for item in sessions or []]

    @classmethod
    def get_history(cls, session_id: str) -> List[Dict[str, Any]]:
        history = cache.get(cls._session_key(session_id), [])
        return [dict(item) for item in history or []]

    @classmethod
    def _save_history(cls, session_id: str, history: List[Dict[str, Any]]) -> None:
        cache.set(cls._session_key(session_id), history, cls.DEFAULT_TIMEOUT)

    @classmethod
    def _save_sessions(cls, sessions: List[Dict[str, Any]]) -> None:
        cache.set(cls.INDEX_KEY, sessions, cls.DEFAULT_TIMEOUT)

    @classmethod
    def append_message(cls, session_id: str, message: Message) -> int:
        history = cache.get(cls._session_key(session_id), [])
        if history is None:
            history = []
        history.append(asdict(message))
        cls._save_history(session_id, history)
        cls._update_session_index(session_id, message.content, len(history))
        return len(history)

    @classmethod
    def _update_session_index(
        cls, session_id: str, preview: str, message_count: int
    ) -> None:
        sessions = cache.get(cls.INDEX_KEY, [])
        if not sessions:
            sessions = []
        now_text = _now_iso()
        existing: Optional[Dict[str, Any]] = next(
            (item for item in sessions if item.get("session_id") == session_id), None
        )
        preview_text = (preview or "").strip()
        preview_safe = preview_text[:60] if preview_text else "会话暂无摘要"
        if existing:
            existing["update_time"] = now_text
            existing["message_count"] = message_count
            existing["last_preview"] = preview_safe
        else:
            sessions.append(
                {
                    "session_id": session_id,
                    "title": preview_safe[:16] or "新的会话",
                    "created_time": now_text,
                    "update_time": now_text,
                    "message_count": message_count,
                    "last_preview": preview_safe,
                }
            )
        cls._save_sessions(sessions)

    @classmethod
    def delete_session(cls, session_id: str) -> bool:
        """Remove a session and its history from the cache."""
        removed = False
        sessions = cache.get(cls.INDEX_KEY, [])
        if sessions:
            filtered = [item for item in sessions if item.get("session_id") != session_id]
            removed = len(filtered) != len(sessions)
            cls._save_sessions(filtered)
        cache.delete(cls._session_key(session_id))
        return removed

    @classmethod
    def clear_all(cls) -> None:
        """Remove every cached session; used by tests and administration endpoints."""
        sessions = cache.get(cls.INDEX_KEY, [])
        for item in sessions or []:
            cache.delete(cls._session_key(item.get("session_id")))
        cache.delete(cls.INDEX_KEY)


class LocalAgentService:
    """Rule-based assistant used for local development and testing."""

    def __init__(self) -> None:
        self.provider = getattr(settings, "LOCAL_AI_PROVIDER_NAME", "local-simulator")
        self.model = getattr(settings, "LOCAL_AI_MODEL_NAME", "rule-based-v1")
        self.max_history = max(getattr(settings, "LOCAL_AI_MAX_HISTORY", 20), 1)

    def list_sessions(self) -> List[Dict[str, Any]]:
        return LocalConversationStore.list_sessions()

    def get_chat_history(self, session_id: str) -> List[Dict[str, Any]]:
        history = LocalConversationStore.get_history(session_id)
        if len(history) > self.max_history:
            history = history[-self.max_history :]
        return history

    def send_message(
        self, message: str, session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        try:
            if not message or not message.strip():
                raise ValueError("user message cannot be empty")

            session_id = session_id or uuid.uuid4().hex

            # keep truncated history for lightweight context
            history = LocalConversationStore.get_history(session_id)
            history_tail = history[-self.max_history :] if history else []

            user_message = Message.build("user", message)
            LocalConversationStore.append_message(session_id, user_message)

            reply_text = self._generate_response(message, history_tail)

            assistant_message = Message.build("assistant", reply_text)
            LocalConversationStore.append_message(session_id, assistant_message)

            return {
                "success": True,
                "response": reply_text,
                "session_id": session_id,
                "model": self.model,
                "metadata": {
                    "provider": self.provider,
                    "message_count": len(self.get_chat_history(session_id)),
                },
            }
        except Exception as exc:
            logger.error("local AI service failed to process message: %s", exc, exc_info=True)
            return {
                "success": False,
                "error": str(exc),
                "response": "对不起，本地助手暂时不可用，请稍后再试。",
                "session_id": session_id,
            }

    def _generate_response(
        self, message: str, history: List[Dict[str, Any]]
    ) -> str:
        """Very small rule-based response engine tuned for the industry-chain domain."""
        text = (message or "").strip()
        text_lower = text.lower()

        if not text:
            return "请告诉我您想了解的产业链或企业信息，我会尽力回答。"

        if "产业链" in text or "industry chain" in text_lower:
            return (
                "本系统聚合了产业链基础数据、链点结构与企业画像，"
                "可在数据大厅中查看重要节点、上下游分布以及重点企业清单。"
                "继续提供具体产业或链点名称，我可以帮你梳理关键环节。"
            )

        if "企业" in text or "company" in text_lower:
            return (
                "企业信息模块支持按照地区、规模、融资阶段等条件检索，"
                "并包含企业评分、标签与产业链关联链点。"
                "如需对比或导出，请告知企业名称或筛选条件。"
            )

        if "分析" in text or "report" in text_lower:
            return (
                "分析中心提供项目概览、风险提示与重点指标监控，"
                "可以结合地图与链路视图快速锁定关键节点。"
                "如需生成报告，请说明行业、区域或企业集合范围。"
            )

        if "融资" in text or "investment" in text_lower:
            return (
                "融资情报模块记录了企业融资轮次、金额与投资机构，"
                "能够帮助判断资本关注度和增长潜力。"
                "告诉我目标企业或产业，我可以返回对应的融资摘要。"
            )

        if "帮助" in text or "help" in text_lower:
            return (
                "可以从以下角度提问：\n"
                "1. 了解某条产业链的结构与核心环节。\n"
                "2. 查询目标企业的基本面、评分和链点关系。\n"
                "3. 查看地区或行业的企业分布与投资趋势。\n"
                "请尝试提供更多上下文，我会返回更具体的建议。"
            )

        if history:
            last_user = next(
                (item for item in reversed(history) if item.get("role") == "user"),
                None,
            )
            if last_user:
                return (
                    "我已经记录了您的问题，并会结合之前的对话继续提供信息。"
                    "若需要更精确的分析，请给出企业或链点关键词。"
                )

        return (
            "收到您的问题。当前本地助手提供产业链导航、企业画像和融资情报的基础说明。"
            "请提供更明确的产业、地域或企业名称，我可以进一步整理要点。"
        )

    def delete_session(self, session_id: str) -> bool:
        """Remove a session and return True if something was deleted."""
        return LocalConversationStore.delete_session(session_id)

    def reset_sessions(self) -> None:
        """Clear all cached sessions; primarily used in tests."""
        LocalConversationStore.clear_all()


class ExternalAIService:
    """OpenAI-compatible external AI service using API key/base URL from settings."""

    def __init__(self) -> None:
        # Lazy import to avoid mandatory dependency when running local mode only
        try:
            from openai import OpenAI  # type: ignore
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("openai SDK 未安装或不可用") from exc

        self.provider = getattr(settings, "AI_PROVIDER", "openai")
        self.model = getattr(settings, "AI_MODEL_NAME", "gpt-4o-mini") or "gpt-4o-mini"
        self.base_url = getattr(settings, "AI_API_BASE_URL", "").strip()
        self.api_key = getattr(settings, "AI_API_KEY", "").strip()

        if not self.api_key:
            raise RuntimeError("缺少 AI_API_KEY 配置")
        # 规范化 base_url（DeepSeek 等需要 /v1）
        normalized_base_url = None
        if self.base_url:
            url = self.base_url.rstrip('/')
            if not url.lower().endswith('/v1'):
                url = url + '/v1'
            normalized_base_url = url
        # base_url 可为空（官方默认），兼容 OpenAI/兼容生态
        self._client = OpenAI(api_key=self.api_key, base_url=normalized_base_url)
        # 适度截断历史，沿用本地存储
        self.max_history = max(getattr(settings, "LOCAL_AI_MAX_HISTORY", 20), 1)

    def list_sessions(self) -> List[Dict[str, Any]]:
        return LocalConversationStore.list_sessions()

    def get_chat_history(self, session_id: str) -> List[Dict[str, Any]]:
        history = LocalConversationStore.get_history(session_id)
        if len(history) > self.max_history:
            history = history[-self.max_history :]
        return history

    def send_message(
        self, message: str, session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        if not message or not message.strip():
            return {"success": False, "error": "消息为空"}

        session_id = session_id or uuid.uuid4().hex
        history = LocalConversationStore.get_history(session_id)
        history_tail = history[-self.max_history :] if history else []

        # 构造 messages（system + 历史 + 当前）
        messages: List[Dict[str, str]] = [
            {"role": "system", "content": "你是产业研究助手，回答简洁准确。"}
        ]
        for item in history_tail:
            role = item.get("role", "user")
            content = item.get("content", "")
            if content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": message})

        # 先写入用户消息
        LocalConversationStore.append_message(session_id, Message.build("user", message))

        try:
            resp = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
            )
            reply = resp.choices[0].message.content or ""
        except Exception as exc:
            logger.error("external AI request failed: %s", exc, exc_info=True)
            return {
                "success": False,
                "error": str(exc),
                "response": "外部AI服务不可用，请稍后再试。",
                "session_id": session_id,
            }

        LocalConversationStore.append_message(session_id, Message.build("assistant", reply))
        return {
            "success": True,
            "response": reply,
            "session_id": session_id,
            "model": self.model,
            "metadata": {"provider": self.provider, "message_count": len(self.get_chat_history(session_id))},
        }

    def delete_session(self, session_id: str) -> bool:
        return LocalConversationStore.delete_session(session_id)

    def reset_sessions(self) -> None:
        LocalConversationStore.clear_all()


_service_singleton: Optional[Any] = None


def get_local_service(force_reload: bool = False) -> LocalAgentService:
    """Return a singleton instance of the local AI service."""
    global _service_singleton
    if isinstance(_service_singleton, LocalAgentService) and not force_reload:
        return _service_singleton
    _service_singleton = LocalAgentService()
    return _service_singleton


def get_ai_service(force_reload: bool = False):
    """Return active AI service based on settings.AI_PROVIDER.

    Falls back to LocalAgentService if provider is 'local' or configuration is incomplete.
    """
    global _service_singleton

    if not force_reload and _service_singleton is not None:
        return _service_singleton

    provider = getattr(settings, "AI_PROVIDER", "local").strip().lower()
    api_key = getattr(settings, "AI_API_KEY", "").strip()

    if provider != "local" and api_key:
        try:
            _service_singleton = ExternalAIService()
            logger.info("AI service initialized: provider=%s, model=%s", provider, getattr(_service_singleton, "model", ""))
            return _service_singleton
        except Exception as exc:
            logger.warning("External AI init failed, fallback to local: %s", exc)

    _service_singleton = LocalAgentService()
    logger.info("AI service initialized: provider=local, model=%s", _service_singleton.model)
    return _service_singleton
