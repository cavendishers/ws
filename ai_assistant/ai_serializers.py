"""Serializers for the local AI assistant endpoints."""

from typing import Any, Dict

from rest_framework import serializers


class ChatRequestSerializer(serializers.Serializer):
    """Validate chat requests coming from the frontend."""

    messages = serializers.CharField(max_length=8000, required=False, allow_blank=False)
    message = serializers.CharField(max_length=8000, required=False, allow_blank=False)
    content = serializers.CharField(max_length=8000, required=False, allow_blank=False)
    session_id = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True
    )
    temperature = serializers.FloatField(
        min_value=0.0, max_value=2.0, required=False
    )
    max_tokens = serializers.IntegerField(min_value=1, max_value=4000, required=False)

    MESSAGE_FIELDS = ("messages", "message", "content")

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        if not any(attrs.get(field) for field in self.MESSAGE_FIELDS):
            raise serializers.ValidationError("请提供有效的消息内容")
        return attrs

    def get_user_message(self) -> str:
        for field in self.MESSAGE_FIELDS:
            value = self.validated_data.get(field)
            if value:
                return str(value).strip()
        return ""


class ChatResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    response = serializers.CharField()
    session_id = serializers.CharField(required=False)
    model = serializers.CharField(required=False)
    timestamp = serializers.CharField(required=False)
    metadata = serializers.DictField(required=False)
    error = serializers.CharField(required=False)


class ErrorResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField(default=False)
    error = serializers.CharField()
    error_detail = serializers.CharField(required=False)
    error_type = serializers.CharField(required=False)


class ChatConfigSerializer(serializers.Serializer):
    provider = serializers.CharField()
    model = serializers.CharField(required=False)
    status = serializers.CharField()


class SessionSerializer(serializers.Serializer):
    session_id = serializers.CharField()
    title = serializers.CharField(required=False)
    created_time = serializers.CharField(required=False)
    update_time = serializers.CharField(required=False)
    message_count = serializers.IntegerField(required=False)
    last_preview = serializers.CharField(required=False, allow_blank=True)


class MessageSerializer(serializers.Serializer):
    id = serializers.CharField()
    role = serializers.ChoiceField(choices=[("user", "用户"), ("assistant", "AI助手")])
    content = serializers.CharField()
    created_at = serializers.CharField()
    metadata = serializers.DictField(required=False)


class ChatHistoryResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    messages = MessageSerializer(many=True)
    session_id = serializers.CharField()
    total = serializers.IntegerField()
