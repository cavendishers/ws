"""
AI聊天API序列化器
用于验证和格式化API请求和响应数据
"""
from rest_framework import serializers
from typing import List, Dict, Any
from .models import ChatMessage
from .emoji_utils import prepare_for_display, sanitize_for_db


class ChatMessageSerializer(serializers.ModelSerializer):
    """聊天消息序列化器"""
    
    # 只读字段，不需要在创建时提供
    user = serializers.StringRelatedField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True, format='%Y-%m-%d %H:%M:%S')
    updated_at = serializers.DateTimeField(read_only=True, format='%Y-%m-%d %H:%M:%S')
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'user', 'role', 'content', 
            'created_at', 'updated_at', 
            'session_id', 'metadata'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """自定义序列化输出，确保表情符号正确显示"""
        data = super().to_representation(instance)
        
        # 为前端显示准备消息内容（解码表情符号）
        if 'content' in data and data['content']:
            data['content'] = prepare_for_display(data['content'])
        
        return data
    
    def create(self, validated_data):
        """创建聊天消息时自动设置用户并处理表情符号"""
        # 从context中获取request，然后获取当前用户
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['user'] = request.user
        
        # 为数据库存储准备消息内容（处理表情符号）
        if 'content' in validated_data:
            validated_data['content'] = sanitize_for_db(validated_data['content'])
        
        return super().create(validated_data)


class ChatRequestSerializer(serializers.Serializer):
    """聊天请求序列化器"""
    # 支持两种格式：字符串消息或消息列表
    messages = serializers.CharField(max_length=8000, required=False, allow_blank=False)
    message = serializers.CharField(max_length=8000, required=False, allow_blank=False)
    content = serializers.CharField(max_length=8000, required=False, allow_blank=False)
    
    # 可选的对话历史
    conversation_history = ChatMessageSerializer(many=True, required=False)
    
    # 可选的模型参数
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
    response = serializers.CharField()
    success = serializers.BooleanField(default=True)
    model = serializers.CharField(required=False)
    
    # 使用统计信息
    usage = serializers.DictField(required=False)
    
    # 元数据
    metadata = serializers.DictField(required=False)
    
    # 错误信息（失败时）
    error = serializers.CharField(required=False)
    error_type = serializers.CharField(required=False)


class ChatUsageSerializer(serializers.Serializer):
    """API使用统计序列化器"""
    prompt_tokens = serializers.IntegerField(default=0)
    completion_tokens = serializers.IntegerField(default=0)
    total_tokens = serializers.IntegerField(default=0)


class ChatMetadataSerializer(serializers.Serializer):
    """聊天元数据序列化器"""
    finish_reason = serializers.CharField(required=False)
    created = serializers.IntegerField(required=False)
    model = serializers.CharField(required=False)
    response_time = serializers.FloatField(required=False)


class ErrorResponseSerializer(serializers.Serializer):
    """错误响应序列化器"""
    success = serializers.BooleanField(default=False)
    response = serializers.CharField()
    error = serializers.CharField()
    error_type = serializers.CharField()
    error_code = serializers.CharField(required=False)


class ChatHistoryItemSerializer(serializers.Serializer):
    """聊天历史项序列化器"""
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    content = serializers.CharField()
    timestamp = serializers.DateTimeField(required=False)


class BulkChatRequestSerializer(serializers.Serializer):
    """批量聊天请求序列化器"""
    requests = ChatRequestSerializer(many=True, max_length=10)
    
    def validate_requests(self, value):
        """验证批量请求"""
        if len(value) == 0:
            raise serializers.ValidationError("至少需要一个聊天请求")
        return value


class ChatConfigSerializer(serializers.Serializer):
    """聊天配置序列化器"""
    model = serializers.CharField(required=False)
    temperature = serializers.FloatField(min_value=0.0, max_value=2.0, required=False)
    max_tokens = serializers.IntegerField(min_value=1, max_value=4000, required=False)
    system_prompt = serializers.CharField(max_length=2000, required=False)
    
    def validate(self, data):
        """验证配置数据"""
        # 可以添加自定义验证逻辑
        return data 


class ChatHistoryResponseSerializer(serializers.Serializer):
    """聊天历史响应序列化器"""
    
    results = ChatMessageSerializer(many=True, read_only=True)
    has_next = serializers.BooleanField(read_only=True)
    has_previous = serializers.BooleanField(read_only=True)
    total = serializers.IntegerField(read_only=True)
    page = serializers.IntegerField(read_only=True)
    page_size = serializers.IntegerField(read_only=True)
    total_pages = serializers.IntegerField(read_only=True)


class ChatMessageCreateSerializer(serializers.ModelSerializer):
    """创建聊天消息的序列化器"""
    
    class Meta:
        model = ChatMessage
        fields = ['role', 'content', 'session_id', 'metadata']
        
    def create(self, validated_data):
        """创建聊天消息时自动设置用户并处理表情符号"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['user'] = request.user
        
        # 为数据库存储准备消息内容（处理表情符号）
        if 'content' in validated_data:
            validated_data['content'] = sanitize_for_db(validated_data['content'])
        
        return super().create(validated_data) 