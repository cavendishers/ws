"""
腾讯智能体AI聊天API视图
基于腾讯云智能体API，不使用本地数据库存储
"""
import asyncio
import time
import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import Http404
from django.utils import timezone

import json
from asgiref.sync import sync_to_async

from .services import get_tencent_service
from .ai_serializers import (
    ChatRequestSerializer, 
    ChatResponseSerializer,
    ErrorResponseSerializer,
    ChatConfigSerializer,
)

logger = logging.getLogger('ai_chat')


class SessionPagination(PageNumberPagination):
    """会话分页器"""
    page_size = 10  # 默认每页10条
    page_size_query_param = 'page_size'
    max_page_size = 50  # 最大每页50条
    page_query_param = 'page'
    
    def get_paginated_response(self, data):
        """自定义分页响应格式"""
        return Response({
            'results': data,
            'has_next': False,  # 腾讯API暂时不支持分页，所以设为False
            'has_previous': False,
            'total': len(data),
            'page': 1,
            'page_size': len(data),
            'total_pages': 1,
        })


@method_decorator(csrf_exempt, name='dispatch')
class TencentChatAPIView(APIView):
    """
    腾讯智能体聊天API视图
    
    POST /ai/api/chat/
    
    请求格式:
    {
        "messages": "用户消息内容",
        "session_id": "可选的会话ID"
    }
    
    响应格式:
    {
        "response": "AI回复内容",
        "success": true,
        "session_id": "会话ID",
        "model": "tencent-agent",
        "metadata": {...}
    }
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        """处理聊天请求"""
        start_time = time.time()
        
        try:
            # 验证请求数据
            serializer = ChatRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'error': '请求数据格式错误',
                    'error_detail': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 获取用户消息
            user_message = serializer.get_user_message()
            session_id = request.data.get('session_id')
            
            logger.info(f"收到聊天请求: {user_message[:50]}..., 会话ID: {session_id}")
            
            # 获取腾讯智能体服务
            tencent_service = get_tencent_service()
            
            # 使用asyncio运行异步方法
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(
                    tencent_service.send_message(user_message, session_id)
                )
            finally:
                loop.close()
            
            # 计算响应时间
            response_time = time.time() - start_time
            
            # 添加响应时间到元数据
            if 'metadata' not in result:
                result['metadata'] = {}
            result['metadata']['response_time'] = response_time
            
            logger.info(f"聊天请求处理完成，耗时: {response_time:.2f}秒")
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            response_time = time.time() - start_time
            logger.error(f"聊天请求处理失败: {str(e)}", exc_info=True)
            
            return Response({
                'success': False,
                'response': '抱歉，AI服务暂时不可用，请稍后重试。',
                'error': str(e),
                'error_type': type(e).__name__,
                'metadata': {
                    'response_time': response_time
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class TencentSessionsAPIView(APIView):
    """
    腾讯智能体会话列表API视图
    
    GET /ai/api/sessions/ - 获取所有会话列表
    """
    
    permission_classes = [AllowAny]  # 可以根据需要调整权限
    
    def get(self, request):
        """获取会话列表"""
        try:
            # 获取腾讯智能体服务
            tencent_service = get_tencent_service()
            
            # 获取会话列表
            sessions = tencent_service.list_sessions()
            
            logger.info(f"获取到 {len(sessions)} 个会话")
            
            return Response({
                'success': True,
                'sessions': sessions,
                'total': len(sessions)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"获取会话列表失败: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': '获取会话列表失败',
                'error_detail': str(e),
                'sessions': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class TencentChatHistoryAPIView(APIView):
    """
    腾讯智能体聊天历史API视图
    
    GET /ai/api/history/<session_id>/ - 获取指定会话的聊天记录
    """
    
    permission_classes = [AllowAny]  # 可以根据需要调整权限
    
    def get(self, request, session_id):
        """获取指定会话的聊天记录"""
        try:
            # 获取腾讯智能体服务
            tencent_service = get_tencent_service()
            
            # 获取聊天记录
            messages = tencent_service.get_chat_history(session_id)
            
            logger.info(f"获取会话 {session_id} 的 {len(messages)} 条消息")
            
            return Response({
                'success': True,
                'messages': messages,
                'session_id': session_id,
                'total': len(messages)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"获取聊天历史失败: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': '获取聊天历史失败',
                'error_detail': str(e),
                'messages': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class TencentChatConfigAPIView(APIView):
    """
    腾讯智能体配置API视图
    
    GET /ai/api/config/ - 获取AI配置信息
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        """获取AI配置信息"""
        try:
            tencent_service = get_tencent_service()
            
            config = {
                'provider': 'tencent',
                'model': 'tencent-agent',
                'bot_app_key': tencent_service.bot_app_key[:10] + '...',  # 只显示前10位
                'region': tencent_service.region,
                'visitor_biz_id': tencent_service.visitor_biz_id,
                'websocket_url': tencent_service.websocket_url,
                'status': 'active'
            }
            
            return Response({
                'success': True,
                'config': config
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"获取AI配置失败: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': '获取AI配置失败',
                'error_detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def tencent_ai_health_check(request):
    """腾讯智能体健康检查接口"""
    try:
        tencent_service = get_tencent_service()
        
        # 简单的健康检查 - 只验证服务是否能正常初始化
        return Response({
            'status': 'healthy',
            'provider': 'tencent',
            'region': tencent_service.region,
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"腾讯AI健康检查失败: {str(e)}", exc_info=True)
        return Response({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


# 兼容性视图 - 保持原有API路径的兼容性
@method_decorator(csrf_exempt, name='dispatch')
class AIChatAPIView(TencentChatAPIView):
    """
    兼容性AI聊天API视图
    继承自TencentChatAPIView，保持原有接口兼容性
    """
    pass


@method_decorator(csrf_exempt, name='dispatch')
class ChatHistoryAPIView(TencentSessionsAPIView):
    """
    重定向到会话列表API视图
    保持兼容性
    """
    def get(self, request):
        """获取会话列表"""
        # 重定向到父类方法
        return super().get(request)
    
    def delete(self, request):
        """删除所有会话（模拟操作）"""
        # 腾讯云LKE API暂不支持会话删除功能
        logger.info("收到删除会话请求，但腾讯云LKE API暂不支持此功能")
        return Response({
            'success': True,
            'message': '腾讯云LKE API暂不支持会话删除功能',
            'note': '这是一个模拟操作，实际上没有删除任何数据'
        }, status=status.HTTP_200_OK)


# 健康检查的兼容性视图
ai_health_check = tencent_ai_health_check 


@method_decorator(csrf_exempt, name='dispatch')
class TencentConfigReloadAPIView(APIView):
    """
    腾讯智能体配置重载API视图
    
    POST /ai/api/config/reload/ - 重新加载腾讯AI配置
    """
    
    permission_classes = [AllowAny]  # 生产环境建议改为需要认证
    
    def post(self, request):
        """重新加载腾讯AI配置"""
        try:
            # 强制重新加载配置
            tencent_service = get_tencent_service(force_reload=True)
            
            logger.info("腾讯AI配置重载成功")
            
            return Response({
                'success': True,
                'message': '腾讯AI配置重载成功',
                'bot_app_key': tencent_service.bot_app_key[:8] + '...' if tencent_service.bot_app_key else None,  # 只显示前8位
                'region': tencent_service.region,
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"腾讯AI配置重载失败: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': '配置重载失败',
                'error_detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 