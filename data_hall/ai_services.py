"""
AI服务工具类
主要功能已迁移到腾讯智能体服务 (data_hall/services.py)
此文件保留一些通用的工具函数
"""
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger('ai_chat')


class MessageProcessor:
    """消息处理工具类 - 通用消息处理功能"""
    
    @staticmethod
    def parse_user_input(request_data: Dict[str, Any]) -> str:
        """从请求数据中提取用户消息"""
        if not request_data:
            return ""
        
        # 支持多种消息字段格式
        message_fields = ['messages', 'message', 'content', 'text']
        
        for field in message_fields:
            if field in request_data and request_data[field]:
                message = request_data[field]
                
                # 如果是字符串，直接返回
                if isinstance(message, str):
                    return message.strip()
                
                # 如果是列表，提取最后一条用户消息
                if isinstance(message, list) and len(message) > 0:
                    last_message = message[-1]
                    if isinstance(last_message, dict) and 'content' in last_message:
                        return str(last_message['content']).strip()
                    elif isinstance(last_message, str):
                        return last_message.strip()
        
        return ""
    
    @staticmethod
    def validate_message(message: str) -> bool:
        """验证消息是否有效"""
        if not message or not isinstance(message, str):
            return False
        
        # 检查消息长度
        if len(message.strip()) == 0:
            return False
        
        if len(message) > 8000:  # 限制消息长度
            return False
        
        return True
    
    @staticmethod
    def clean_message(message: str) -> str:
        """清理消息内容"""
        if not message:
            return ""
        
        # 移除首尾空白字符
        cleaned = message.strip()
        
        # 移除多余的换行符
        cleaned = '\n'.join(line.rstrip() for line in cleaned.split('\n'))
        
        return cleaned


class ChatMessageProcessor(MessageProcessor):
    """
    聊天消息处理器 - 兼容性类
    原有功能已迁移到腾讯智能体，此类仅保留基本功能
    """
    
    @staticmethod
    def prepare_message_for_storage(content: str) -> str:
        """
        为数据库存储准备消息内容
        注意：现在主要由腾讯云管理存储，此方法仅用于兼容性
        """
        if not content:
            return ""
        
        # 基本清理
        cleaned = MessageProcessor.clean_message(content)
        
        logger.debug(f"消息已准备存储: {cleaned[:50]}...")
        return cleaned
    
    @staticmethod
    def prepare_message_for_display(content: str) -> str:
        """
        为前端显示准备消息内容
        注意：现在主要由腾讯云管理显示，此方法仅用于兼容性
        """
        if not content:
            return ""
        
        # 基本清理
        cleaned = MessageProcessor.clean_message(content)
        
        logger.debug(f"消息已准备显示: {cleaned[:50]}...")
        return cleaned
    
    @staticmethod
    def extract_conversation_history(request_data: Dict[str, Any]) -> Optional[List[Dict]]:
        """
        从请求数据中提取对话历史
        注意：现在主要由腾讯云管理对话历史，此方法仅用于兼容性
        """
        logger.info("对话历史提取功能已迁移到腾讯智能体")
        return None


# 兼容性函数
def get_deepseek_service():
    """
    已废弃的DeepSeek服务获取函数
    抛出异常提示已迁移
    """
    raise NotImplementedError(
        "DeepSeek服务已废弃，请使用腾讯智能体服务。"
        "导入: from .services import TencentAgentService"
    )


def get_ai_service():
    """
    获取AI服务的通用函数
    现在返回腾讯智能体服务
    """
    try:
        from .services import TencentAgentService
        return TencentAgentService()
    except ImportError as e:
        logger.error(f"无法导入腾讯智能体服务: {str(e)}")
        raise NotImplementedError("AI服务不可用，请检查腾讯智能体服务配置")


# 健康检查函数
def check_ai_service_health() -> Dict[str, Any]:
    """检查AI服务健康状态"""
    try:
        service = get_ai_service()
        return {
            'status': 'healthy',
            'provider': 'tencent',
            'service_available': True,
            'message': '腾讯智能体服务正常'
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'provider': 'tencent',
            'service_available': False,
            'error': str(e),
            'message': 'AI服务不可用'
        } 