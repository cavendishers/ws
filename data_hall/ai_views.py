"""
简化的AI视图 - 备用实现
主要功能已迁移到 tencent_ai_views.py
此文件仅保留基本接口定义，不依赖ChatMessage模型
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone

import logging

logger = logging.getLogger('ai_chat')


@method_decorator(csrf_exempt, name='dispatch')
class AIChatAPIView(APIView):
    """
    备用AI聊天API视图 - 已废弃
    请使用 tencent_ai_views.TencentChatAPIView
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        """返回服务已迁移的提示"""
        return Response({
            'success': False,
            'error': 'AI聊天服务已迁移到腾讯智能体',
            'message': '请使用新的API接口 /api/ai/chat/',
            'migration_note': '原DeepSeek服务已停用，请使用腾讯智能体服务'
        }, status=status.HTTP_410_GONE)


@method_decorator(csrf_exempt, name='dispatch')
class ChatHistoryAPIView(APIView):
    """
    备用聊天历史API视图 - 已废弃
    请使用腾讯智能体API
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        """返回服务已迁移的提示"""
        return Response({
            'success': False,
            'error': '聊天历史服务已迁移到腾讯智能体',
            'message': '请使用新的API接口',
            'migration_note': '历史记录现在由腾讯云管理'
        }, status=status.HTTP_410_GONE)
    
    def delete(self, request):
        """返回服务已迁移的提示"""
        return Response({
            'success': False,
            'error': '聊天历史管理已迁移到腾讯智能体',
            'message': '请通过腾讯云控制台管理聊天记录'
        }, status=status.HTTP_410_GONE)


@method_decorator(csrf_exempt, name='dispatch')
class SingleChatMessageAPIView(APIView):
    """
    备用单条消息API视图 - 已废弃
    """
    
    permission_classes = [AllowAny]
    
    def delete(self, request, pk):
        """返回服务已迁移的提示"""
        return Response({
            'success': False,
            'error': '消息管理已迁移到腾讯智能体',
            'message': '请通过腾讯云控制台管理消息'
        }, status=status.HTTP_410_GONE)
    
    def put(self, request, pk):
        """返回服务已迁移的提示"""
        return Response({
            'success': False,
            'error': '消息编辑已迁移到腾讯智能体',
            'message': '请通过腾讯云控制台编辑消息'
        }, status=status.HTTP_410_GONE)


@method_decorator(csrf_exempt, name='dispatch')
class AIChatConfigAPIView(APIView):
    """
    备用AI配置API视图 - 已废弃
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        """返回基本配置信息"""
        return Response({
            'success': True,
            'config': {
                'provider': 'deprecated',
                'status': 'migrated',
                'message': 'AI服务已迁移到腾讯智能体',
                'new_endpoint': '/api/ai/config/'
            }
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def ai_health_check(request):
    """备用健康检查接口"""
    return Response({
        'status': 'deprecated',
        'message': 'AI服务已迁移到腾讯智能体',
        'new_endpoint': '/api/ai/health/',
        'timestamp': timezone.now().isoformat()
    }, status=status.HTTP_200_OK) 