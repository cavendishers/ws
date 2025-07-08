from django.urls import path
from . import views
from . import tencent_ai_views

app_name = 'ai_assistant'

urlpatterns = [
    # AI聊天页面
    path('chat-widget/', views.chat_widget, name='chat_widget'),
    
    # AI聊天API路由 - 使用腾讯智能体
    path('api/chat/', tencent_ai_views.AIChatAPIView.as_view(), name='ai_chat_api'),
    path('api/chat/config/', tencent_ai_views.TencentChatConfigAPIView.as_view(), name='ai_chat_config'),
    path('api/config/reload/', tencent_ai_views.TencentConfigReloadAPIView.as_view(), name='ai_config_reload'),
    path('api/health/', tencent_ai_views.tencent_ai_health_check, name='ai_health_check'),
    path('api/history/', tencent_ai_views.ChatHistoryAPIView.as_view(), name='ai_chat_history'),
    path('api/sessions/', tencent_ai_views.TencentSessionsAPIView.as_view(), name='ai_sessions'),
    path('api/history/<str:session_id>/', tencent_ai_views.TencentChatHistoryAPIView.as_view(), name='ai_chat_history_detail'),
] 