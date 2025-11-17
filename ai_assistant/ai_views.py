"""REST API views for the local AI assistant."""

import logging
from typing import Any, Dict, List

from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai_serializers import (
    ChatConfigSerializer,
    ChatHistoryResponseSerializer,
    ChatRequestSerializer,
    ChatResponseSerializer,
    ErrorResponseSerializer,
    SessionSerializer,
)
from .ai_services import MessageProcessor, get_local_ai_service

logger = logging.getLogger("ai_chat")


class SessionPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50
    page_query_param = "page"

    def get_paginated_response(self, data):
        return Response(
            {
                "results": data,
                "page": self.page.number,
                "page_size": self.page.paginator.per_page,
                "total": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "has_next": self.page.has_next(),
                "has_previous": self.page.has_previous(),
            }
        )


def _serialize_messages(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normalize cached messages to the API schema."""
    serialized = []
    for index, item in enumerate(items, start=1):
        serialized.append(
            {
                "id": f"{item.get('timestamp', 'unknown')}#{index}",
                "role": item.get("role", "assistant"),
                "content": item.get("content", ""),
                "created_at": item.get("timestamp", timezone.now().isoformat()),
                "metadata": item.get("metadata", {}),
            }
        )
    return serialized


@method_decorator(csrf_exempt, name="dispatch")
class AIChatAPIView(APIView):
    """Handle chat completion style requests."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("invalid chat request payload: %s", serializer.errors)
            error = ErrorResponseSerializer(
                {
                    "success": False,
                    "error": "请求数据格式错误",
                    "error_detail": serializer.errors,
                }
            )
            return Response(error.data, status=status.HTTP_400_BAD_REQUEST)

        user_message = serializer.get_user_message()
        if not MessageProcessor.validate_message(user_message):
            error = ErrorResponseSerializer(
                {
                    "success": False,
                    "error": "请输入有效的消息内容",
                }
            )
            return Response(error.data, status=status.HTTP_400_BAD_REQUEST)

        service = get_local_ai_service()
        session_id = request.data.get("session_id")
        result = service.send_message(user_message, session_id=session_id)

        response = ChatResponseSerializer(result)
        status_code = status.HTTP_200_OK if result.get("success") else status.HTTP_500_INTERNAL_SERVER_ERROR
        return Response(response.data, status=status_code)


@method_decorator(csrf_exempt, name="dispatch")
class SessionListAPIView(APIView):
    """Return the cached session list."""

    permission_classes = [AllowAny]
    pagination_class = SessionPagination

    def get(self, request):
        service = get_local_ai_service()
        sessions = service.list_sessions()

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(sessions, request, view=self)
        serializer = SessionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def delete(self, request):
        """Clear every cached session."""
        service = get_local_ai_service()
        service.reset_sessions()
        return Response({"success": True, "message": "所有会话已清除"}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class ChatHistoryAPIView(APIView):
    """Expose conversation history for a given session."""

    permission_classes = [AllowAny]

    def get(self, request, session_id: str):
        service = get_local_ai_service()
        messages = service.get_chat_history(session_id)
        payload = {
            "success": True,
            "messages": _serialize_messages(messages),
            "session_id": session_id,
            "total": len(messages),
        }
        serializer = ChatHistoryResponseSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, session_id: str):
        service = get_local_ai_service()
        removed = service.delete_session(session_id)
        if removed:
            return Response({"success": True, "session_id": session_id}, status=status.HTTP_200_OK)
        return Response(
            {"success": False, "error": "会话不存在", "session_id": session_id},
            status=status.HTTP_404_NOT_FOUND,
        )


@method_decorator(csrf_exempt, name="dispatch")
class AIChatConfigAPIView(APIView):
    """Return static configuration metadata for the UI."""

    permission_classes = [AllowAny]

    def get(self, request):
        service = get_local_ai_service()
        payload = {
            "provider": service.provider,
            "model": service.model,
            "status": "active",
        }
        serializer = ChatConfigSerializer(payload)
        return Response({"success": True, "config": serializer.data}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class AIConfigReloadAPIView(APIView):
    """Force reload of the singleton service."""

    permission_classes = [AllowAny]

    def post(self, request):
        service = get_local_ai_service()
        service.reset_sessions()
        # Recreate the singleton to pick up potential setting changes
        refreshed = get_local_ai_service(force_reload=True)
        return Response(
            {
                "success": True,
                "message": "配置已刷新，本地会话缓存已清空",
                "provider": refreshed.provider,
                "model": refreshed.model,
            },
            status=status.HTTP_200_OK,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def ai_health_check(_: Any):
    """Simple health check endpoint for external monitors."""
    service = get_local_ai_service()
    return Response(
        {
            "status": "healthy",
            "provider": service.provider,
            "model": service.model,
            "timestamp": timezone.now().isoformat(),
        },
        status=status.HTTP_200_OK,
    )
