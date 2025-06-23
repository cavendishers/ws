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
from django.utils import timezone

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
from .emoji_utils import prepare_for_display, sanitize_for_db

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
            
            # 处理返回数据中的表情符号，确保前端能正确显示
            response_data = serializer.data
            for message_data in response_data:
                if 'content' in message_data:
                    # 为前端显示准备消息内容（解码表情符号）
                    message_data['content'] = ChatMessageProcessor.prepare_message_for_display(message_data['content'])
            
            # 返回分页响应
            return paginator.get_paginated_response(response_data)
            
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
        """删除消息对（用户消息和对应的AI回复）"""
        try:
            # 获取要删除的用户消息
            user_message = self.get_object(pk, request.user)
            
            # 确保只能删除用户消息
            if user_message.role != 'user':
                return Response({
                    'success': False,
                    'error': '只能删除用户消息'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 查找紧随其后的AI回复（基于时间顺序和用户）
            ai_response = ChatMessage.objects.filter(
                user=request.user,
                role='assistant',
                created_at__gt=user_message.created_at
            ).order_by('created_at').first()
            
            deleted_count = 1  # 至少删除用户消息
            
            # 删除用户消息
            user_message.delete()
            logger.info(f"用户 {request.user.username} 删除了用户消息 {pk}")
            
            # 如果找到对应的AI回复，也删除它
            if ai_response:
                # 验证这个AI回复确实是对该用户消息的回复
                # 检查时间间隔是否合理（比如5分钟内）
                time_diff = (ai_response.created_at - user_message.created_at).total_seconds()
                if time_diff <= 300:  # 5分钟内的回复才认为是对应的
                    ai_response.delete()
                    deleted_count += 1
                    logger.info(f"同时删除了对应的AI回复 {ai_response.id}")
            
            return Response({
                'success': True,
                'message': f'成功删除消息对，共删除 {deleted_count} 条记录',
                'deleted_count': deleted_count
            }, status=status.HTTP_200_OK)
            
        except Http404 as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"删除消息对时发生错误: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': '删除消息对失败',
                'error_detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, pk):
        """更新单条聊天记录"""
        try:
            # 获取要更新的消息
            message = self.get_object(pk, request.user)
            
            # 确保只能更新用户消息
            if message.role != 'user':
                return Response({
                    'success': False,
                    'error': '只能更新用户消息'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 获取新的消息内容
            new_content = request.data.get('content', '').strip()
            if not new_content:
                return Response({
                    'success': False,
                    'error': '消息内容不能为空'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 为数据库存储准备消息内容（处理表情符号）
            processed_content = ChatMessageProcessor.prepare_message_for_storage(new_content)
            
            # 更新消息内容
            old_content = message.content
            message.content = processed_content
            
            # 更新元数据，标记为已编辑
            if not message.metadata:
                message.metadata = {}
            message.metadata.update({
                'edited': True,
                'edit_time': timezone.now().isoformat(),
                'original_content': old_content if 'original_content' not in message.metadata else message.metadata.get('original_content'),
                'edit_count': message.metadata.get('edit_count', 0) + 1
            })
            
            message.save()
            
            logger.info(f"用户 {request.user.username} 更新了消息 {pk}: '{old_content[:50]}...' -> '{processed_content[:50]}...'")
            
            # 序列化返回更新后的消息
            serializer = ChatMessageSerializer(message, context={'request': request})
            
            return Response({
                'success': True,
                'message': '消息更新成功',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Http404 as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"更新消息时发生错误: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': '更新消息失败',
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
            
            # 检查是否包含emoji编码标志
            has_emoji_encoding = (
                request.headers.get('X-Emoji-Encoding') == 'true' or 
                request_data.get('encode_emojis') is True
            )
            
            # 如果包含emoji编码标志，将其添加到request_data中供ChatMessageProcessor使用
            if has_emoji_encoding:
                request_data['X-Emoji-Encoding'] = True
                logger.info("检测到emoji编码标志，将进行相应处理")
            
            # 检查是否是重新生成请求
            is_regenerate = request_data.get('regenerate', False)
            user_message_id = request_data.get('user_message_id')
            
            if is_regenerate and user_message_id:
                logger.info(f"检测到重新生成请求，用户消息ID: {user_message_id}")
                
                # 先删除该用户消息对应的旧AI回复
                if request.user.is_authenticated:
                    try:
                        # 查找用户消息
                        user_msg = ChatMessage.objects.get(id=user_message_id, user=request.user, role='user')
                        
                        # 查找并删除对应的AI回复
                        ai_replies = ChatMessage.objects.filter(
                            user=request.user,
                            role='assistant',
                            created_at__gt=user_msg.created_at
                        ).order_by('created_at')
                        
                        deleted_ai_count = 0
                        for ai_reply in ai_replies:
                            # 检查时间间隔，确保是对应的回复
                            time_diff = (ai_reply.created_at - user_msg.created_at).total_seconds()
                            if time_diff <= 300:  # 5分钟内的回复
                                ai_reply.delete()
                                deleted_ai_count += 1
                                logger.info(f"删除旧AI回复: {ai_reply.id}")
                                break  # 只删除第一个匹配的AI回复
                        
                        logger.info(f"重新生成前删除了 {deleted_ai_count} 条旧AI回复")
                        
                    except ChatMessage.DoesNotExist:
                        logger.warning(f"未找到用户消息ID {user_message_id}，继续进行重新生成")
                    except Exception as e:
                        logger.error(f"删除旧AI回复失败: {str(e)}")
                        # 即使删除失败也继续生成新回复
            
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
            
            # 保存用户消息到数据库（如果用户已登录且不是重新生成请求）
            user_message_record = None
            if request.user.is_authenticated and not is_regenerate:
                try:
                    # 为数据库存储准备用户消息（处理表情符号）
                    user_message_for_db = ChatMessageProcessor.prepare_message_for_storage(user_message)
                    
                    user_message_record = ChatMessage.objects.create(
                        user=request.user,
                        role='user',
                        content=user_message_for_db,
                        metadata={
                            'request_ip': request.META.get('REMOTE_ADDR'),
                            'original_emoji_encoding': request.headers.get('X-Emoji-Encoding', 'false'),
                            'has_emojis': any(ord(c) > 127 for c in user_message)  # 简单检测非ASCII字符
                        }
                    )
                    logger.info(f"用户消息已保存到数据库，ID: {user_message_record.id}")
                except Exception as e:
                    logger.warning(f"保存用户消息到数据库失败: {str(e)}")
            elif is_regenerate and user_message_id:
                # 重新生成时，尝试获取现有的用户消息记录
                try:
                    user_message_record = ChatMessage.objects.get(id=user_message_id, user=request.user, role='user')
                    
                    # 检查前端传来的消息内容是否与数据库中的不同（可能已被编辑）
                    stored_content = ChatMessageProcessor.prepare_message_for_display(user_message_record.content)
                    if stored_content.strip() != user_message.strip():
                        logger.info(f"检测到消息内容变化，更新数据库记录 {user_message_id}")
                        
                        # 更新数据库中的消息内容
                        old_content = user_message_record.content
                        user_message_record.content = ChatMessageProcessor.prepare_message_for_storage(user_message)
                        
                        # 更新元数据，标记为已编辑
                        if not user_message_record.metadata:
                            user_message_record.metadata = {}
                        user_message_record.metadata.update({
                            'edited': True,
                            'edit_time': timezone.now().isoformat(),
                            'original_content': old_content if 'original_content' not in user_message_record.metadata else user_message_record.metadata.get('original_content'),
                            'edit_count': user_message_record.metadata.get('edit_count', 0) + 1,
                            'edited_during_regenerate': True
                        })
                        
                        user_message_record.save()
                        logger.info(f"用户消息 {user_message_id} 内容已更新")
                    
                    logger.info(f"重新生成使用现有用户消息: {user_message_record.id}")
                except ChatMessage.DoesNotExist:
                    logger.warning(f"重新生成时未找到用户消息ID {user_message_id}")
            elif is_regenerate and not user_message_id:
                # 重新生成但没有用户消息ID，可能是编辑后的消息，创建新的用户消息记录
                try:
                    user_message_for_db = ChatMessageProcessor.prepare_message_for_storage(user_message)
                    user_message_record = ChatMessage.objects.create(
                        user=request.user,
                        role='user',
                        content=user_message_for_db,
                        metadata={
                            'request_ip': request.META.get('REMOTE_ADDR'),
                            'original_emoji_encoding': request.headers.get('X-Emoji-Encoding', 'false'),
                            'has_emojis': any(ord(c) > 127 for c in user_message),
                            'is_regenerate_edit': True  # 标记为重新生成时的编辑消息
                        }
                    )
                    logger.info(f"重新生成时创建新用户消息: {user_message_record.id}")
                except Exception as e:
                    logger.warning(f"重新生成时保存新用户消息失败: {str(e)}")
            
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
                    # 为数据库存储准备AI回复（处理表情符号）
                    ai_response_for_db = ChatMessageProcessor.prepare_message_for_storage(result['response'])
                    
                    ai_response_record = ChatMessage.objects.create(
                        user=request.user,
                        role='assistant',
                        content=ai_response_for_db,
                        metadata={
                            'model': result.get('model', 'deepseek-chat'),
                            'usage': result.get('usage', {}),
                            'response_time': response_time,
                            'request_ip': request.META.get('REMOTE_ADDR'),
                            'has_emojis': any(ord(c) > 127 for c in result['response'])  # 简单检测非ASCII字符
                        }
                    )
                    logger.info(f"AI回复已保存到数据库，ID: {ai_response_record.id}")
                    
                    # 将AI消息ID添加到响应中，供前端使用
                    if 'metadata' not in result:
                        result['metadata'] = {}
                    result['metadata']['ai_message_id'] = ai_response_record.id
                    result['metadata']['user_message_id'] = user_message_record.id if user_message_record else None
                    
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