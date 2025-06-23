"""
AI聊天API视图
提供与DeepSeek模型交互的REST API接口
"""
import time
import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework import generics
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import Http404

import json

from .ai_services import get_deepseek_service, ChatMessageProcessor
from .ai_serializers import (
    ChatRequestSerializer, 
    ChatResponseSerializer,
    ErrorResponseSerializer,
    ChatConfigSerializer,
    ChatMessageSerializer,
    ChatHistoryResponseSerializer,
    ChatMessageCreateSerializer
)
from .models import ChatMessage

logger = logging.getLogger('ai_chat')


class ChatHistoryPagination(PageNumberPagination):
    """聊天历史分页器"""
    page_size = 10  # 默认每页10条
    page_size_query_param = 'page_size'
    max_page_size = 50  # 最大每页50条
    page_query_param = 'page'
    
    def get_paginated_response(self, data):
        """自定义分页响应格式"""
        return Response({
            'results': data,
            'has_next': self.page.has_next(),
            'has_previous': self.page.has_previous(),
            'total': self.page.paginator.count,
            'page': self.page.number,
            'page_size': self.page.paginator.per_page,
            'total_pages': self.page.paginator.num_pages,
        })


@method_decorator(csrf_exempt, name='dispatch')
class ChatHistoryAPIView(APIView):
    """
    聊天历史API视图
    
    GET /api/ai/history/ - 获取聊天历史记录（分页）
    DELETE /api/ai/history/ - 删除所有聊天记录
    POST /api/ai/history/ - 创建聊天记录（用于手动保存）
    """
    
    permission_classes = [IsAuthenticated]
    pagination_class = ChatHistoryPagination
    
    def get(self, request):
        """获取用户的聊天历史记录"""
        try:
            # 获取当前用户的聊天记录，按时间倒序（最新的在前）
            queryset = ChatMessage.objects.filter(user=request.user).order_by('-created_at')
            
            # 应用分页
            paginator = self.pagination_class()
            paginated_queryset = paginator.paginate_queryset(queryset, request)
            
            # 序列化数据
            serializer = ChatMessageSerializer(paginated_queryset, many=True, context={'request': request})
            
            # 返回分页响应
            return paginator.get_paginated_response(serializer.data)
            
        except Exception as e:
            logger.error(f"获取聊天历史时发生错误: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': '获取聊天历史失败',
                'error_detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """创建聊天记录（用于手动保存）"""
        try:
            serializer = ChatMessageCreateSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                message = serializer.save()
                response_serializer = ChatMessageSerializer(message, context={'request': request})
                return Response({
                    'success': True,
                    'message': '聊天记录保存成功',
                    'data': response_serializer.data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'error': '数据验证失败',
                    'error_detail': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"保存聊天记录时发生错误: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': '保存聊天记录失败',
                'error_detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request):
        """删除用户的所有聊天记录"""
        try:
            deleted_count, _ = ChatMessage.objects.filter(user=request.user).delete()
            
            logger.info(f"用户 {request.user.username} 删除了 {deleted_count} 条聊天记录")
            
            return Response({
                'success': True,
                'message': f'成功删除 {deleted_count} 条聊天记录',
                'deleted_count': deleted_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"删除聊天记录时发生错误: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': '删除聊天记录失败',
                'error_detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class SingleChatMessageAPIView(APIView):
    """
    单条聊天记录API视图
    
    DELETE /api/ai/history/<id>/ - 删除单条聊天记录
    PUT /api/ai/history/<id>/ - 更新单条聊天记录
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk, user):
        """获取用户的特定聊天记录"""
        try:
            return ChatMessage.objects.get(pk=pk, user=user)
        except ChatMessage.DoesNotExist:
            raise Http404("聊天记录不存在或无权访问")
    
    def delete(self, request, pk):
        """删除单条聊天记录"""
        try:
            message = self.get_object(pk, request.user)
            message.delete()
            
            logger.info(f"用户 {request.user.username} 删除了聊天记录 {pk}")
            
            return Response({
                'success': True,
                'message': '聊天记录删除成功'
            }, status=status.HTTP_200_OK)
            
        except Http404 as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"删除单条聊天记录时发生错误: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': '删除聊天记录失败',
                'error_detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class AIChatAPIView(APIView):
    """
    AI聊天API视图
    
    POST /api/ai/chat/
    
    请求格式:
    {
        "messages": "用户消息内容"  // 字符串格式
    }
    或
    {
        "messages": [              // 消息列表格式
            {"role": "user", "content": "用户消息"},
            {"role": "assistant", "content": "AI回复"},
            {"role": "user", "content": "新的用户消息"}
        ]
    }
    
    响应格式:
    {
        "response": "AI回复内容",
        "success": true,
        "model": "deepseek-chat",
        "usage": {...},
        "metadata": {...}
    }
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        """处理聊天请求"""
        start_time = time.time()
        
        try:
            logger.info(f"收到AI聊天请求，IP: {request.META.get('REMOTE_ADDR')}")
            
            # 解析请求数据
            request_data = request.data if hasattr(request, 'data') else json.loads(request.body)
            
            # 验证请求数据
            serializer = ChatRequestSerializer(data=request_data)
            if not serializer.is_valid():
                logger.warning(f"请求数据验证失败: {serializer.errors}")
                return Response({
                    'success': False,
                    'response': '请求数据格式错误',
                    'error': str(serializer.errors),
                    'error_type': 'ValidationError'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 提取用户消息
            user_message = ChatMessageProcessor.parse_user_input(request_data)
            if not user_message:
                return Response({
                    'success': False,
                    'response': '请提供有效的消息内容',
                    'error': '消息内容为空',
                    'error_type': 'ValidationError'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"用户消息: {user_message[:100]}...")
            
            # 保存用户消息到数据库（如果用户已登录）
            user_message_record = None
            if request.user.is_authenticated:
                try:
                    user_message_record = ChatMessage.objects.create(
                        user=request.user,
                        role='user',
                        content=user_message,
                        metadata={'request_ip': request.META.get('REMOTE_ADDR')}
                    )
                    logger.info(f"用户消息已保存到数据库，ID: {user_message_record.id}")
                except Exception as e:
                    logger.warning(f"保存用户消息到数据库失败: {str(e)}")
            
            # 提取对话历史
            conversation_history = ChatMessageProcessor.extract_conversation_history(request_data)
            
            # 获取DeepSeek服务并处理请求
            deepseek_service = get_deepseek_service()
            result = deepseek_service.chat_completion(
                user_message=user_message,
                conversation_history=conversation_history
            )
            
            # 添加响应时间
            response_time = time.time() - start_time
            if 'metadata' not in result:
                result['metadata'] = {}
            result['metadata']['response_time'] = round(response_time, 3)
            
            # 保存AI回复到数据库（如果用户已登录且AI响应成功）
            if request.user.is_authenticated and result.get('success') and result.get('response'):
                try:
                    ai_response_record = ChatMessage.objects.create(
                        user=request.user,
                        role='assistant',
                        content=result['response'],
                        metadata={
                            'model': result.get('model', 'deepseek-chat'),
                            'usage': result.get('usage', {}),
                            'response_time': response_time,
                            'request_ip': request.META.get('REMOTE_ADDR')
                        }
                    )
                    logger.info(f"AI回复已保存到数据库，ID: {ai_response_record.id}")
                except Exception as e:
                    logger.warning(f"保存AI回复到数据库失败: {str(e)}")
            
            # 记录响应日志
            if result.get('success'):
                logger.info(f"AI响应成功，用时: {response_time:.3f}s")
                return Response(result, status=status.HTTP_200_OK)
            else:
                logger.error(f"AI响应失败: {result.get('error')}")
                return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析错误: {str(e)}")
            return Response({
                'success': False,
                'response': 'JSON格式错误',
                'error': str(e),
                'error_type': 'JSONDecodeError'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"处理聊天请求时发生未知错误: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'response': '服务器内部错误，请稍后重试',
                'error': str(e),
                'error_type': type(e).__name__
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        """获取API状态信息"""
        try:
            deepseek_service = get_deepseek_service()
            return Response({
                'status': 'active',
                'model': deepseek_service.model,
                'base_url': deepseek_service.base_url,
                'system_prompt': deepseek_service.system_prompt[:100] + '...' if len(deepseek_service.system_prompt) > 100 else deepseek_service.system_prompt,
                'max_tokens': deepseek_service.max_tokens,
                'temperature': deepseek_service.temperature
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class AIChatConfigAPIView(APIView):
    """
    AI聊天配置API视图
    
    GET /api/ai/chat/config/  - 获取当前配置
    POST /api/ai/chat/config/ - 更新配置（需要管理员权限）
    """
    
    def get(self, request):
        """获取当前AI配置"""
        try:
            deepseek_service = get_deepseek_service()
            config = {
                'model': deepseek_service.model,
                'max_tokens': deepseek_service.max_tokens,
                'temperature': deepseek_service.temperature,
                'system_prompt': deepseek_service.system_prompt,
                'base_url': deepseek_service.base_url
            }
            return Response(config)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# 健康检查视图
@api_view(['GET'])
@permission_classes([AllowAny])
def ai_health_check(request):
    """AI服务健康检查"""
    try:
        deepseek_service = get_deepseek_service()
        
        # 简单的健康检查 - 尝试创建服务实例
        health_status = {
            'status': 'healthy',
            'service': 'ai_chat',
            'model': deepseek_service.model,
            'timestamp': time.time()
        }
        
        return Response(health_status)
        
    except Exception as e:
        return Response({
            'status': 'unhealthy',
            'service': 'ai_chat',
            'error': str(e),
            'timestamp': time.time()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 