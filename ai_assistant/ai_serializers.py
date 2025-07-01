"""
AI聊天API序列化器
用于验证和格式化API请求和响应数据
注意：ChatMessage相关序列化器已移除，现在使用腾讯智能体API
"""
from rest_framework import serializers
from typing import List, Dict, Any


class ChatRequestSerializer(serializers.Serializer):
    """聊天请求序列化器"""
    # 支持两种格式：字符串消息或消息列表
    messages = serializers.CharField(max_length=8000, required=False, allow_blank=False)
    message = serializers.CharField(max_length=8000, required=False, allow_blank=False)
    content = serializers.CharField(max_length=8000, required=False, allow_blank=False)
    
    # 可选的会话ID
    session_id = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    
    # 可选的模型参数（保留兼容性）
    temperature = serializers.FloatField(min_value=0.0, max_value=2.0, required=False)
    max_tokens = serializers.IntegerField(min_value=1, max_value=4000, required=False)
    
    def validate(self, data):
        """验证请求数据"""
        # 至少需要一个消息字段
        message_fields = ['messages', 'message', 'content']
        if not any(data.get(field) for field in message_fields):
            raise serializers.ValidationError("请提供有效的消息内容")
        
        return data
    
    def get_user_message(self) -> str:
        """获取用户消息内容"""
        validated_data = self.validated_data
        
        # 按优先级获取消息
        for field in ['messages', 'message', 'content']:
            if validated_data.get(field):
                return str(validated_data[field]).strip()
        
        return ""


class ChatResponseSerializer(serializers.Serializer):
    """聊天响应序列化器"""
    success = serializers.BooleanField()
    response = serializers.CharField()
    session_id = serializers.CharField(required=False)
    model = serializers.CharField(required=False)
    timestamp = serializers.CharField(required=False)
    metadata = serializers.DictField(required=False)
    error = serializers.CharField(required=False)


class ErrorResponseSerializer(serializers.Serializer):
    """错误响应序列化器"""
    success = serializers.BooleanField(default=False)
    error = serializers.CharField()
    error_detail = serializers.CharField(required=False)
    error_type = serializers.CharField(required=False)


class ChatConfigSerializer(serializers.Serializer):
    """AI配置序列化器"""
    provider = serializers.CharField()
    model = serializers.CharField(required=False)
    region = serializers.CharField(required=False)
    status = serializers.CharField()
    websocket_url = serializers.CharField(required=False)


class SessionSerializer(serializers.Serializer):
    """会话序列化器"""
    session_id = serializers.CharField()
    title = serializers.CharField(required=False)
    created_time = serializers.CharField(required=False)
    update_time = serializers.CharField(required=False)
    message_count = serializers.IntegerField(required=False)


class MessageSerializer(serializers.Serializer):
    """消息序列化器"""
    id = serializers.CharField()
    role = serializers.ChoiceField(choices=[('user', '用户'), ('assistant', 'AI助手')])
    content = serializers.CharField()
    created_at = serializers.CharField()
    metadata = serializers.DictField(required=False)


class ChatHistoryResponseSerializer(serializers.Serializer):
    """聊天历史响应序列化器"""
    success = serializers.BooleanField()
    messages = MessageSerializer(many=True)
    session_id = serializers.CharField()
    total = serializers.IntegerField()


# 为了保持某些兼容性，保留空的占位符类
class ChatMessageSerializer:
    """已废弃的ChatMessage序列化器 - 占位符"""
    def __init__(self, *args, **kwargs):
        raise NotImplementedError("ChatMessageSerializer已废弃，请使用腾讯智能体API")


class ChatMessageCreateSerializer:
    """已废弃的ChatMessageCreate序列化器 - 占位符"""
    def __init__(self, *args, **kwargs):
        raise NotImplementedError("ChatMessageCreateSerializer已废弃，请使用腾讯智能体API") 