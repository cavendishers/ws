from django.urls import path

from . import ai_views, views

app_name = "ai_assistant"

urlpatterns = [
    path("chat-widget/", views.chat_widget, name="chat_widget"),
    path("api/chat/", ai_views.AIChatAPIView.as_view(), name="ai_chat_api"),
    path("api/chat/config/", ai_views.AIChatConfigAPIView.as_view(), name="ai_chat_config"),
    path("api/config/reload/", ai_views.AIConfigReloadAPIView.as_view(), name="ai_config_reload"),
    path("api/health/", ai_views.ai_health_check, name="ai_health_check"),
    path("api/history/", ai_views.SessionListAPIView.as_view(), name="ai_chat_history"),
    path("api/sessions/", ai_views.SessionListAPIView.as_view(), name="ai_sessions"),
    path(
        "api/history/<str:session_id>/",
        ai_views.ChatHistoryAPIView.as_view(),
        name="ai_chat_history_detail",
    ),
]
