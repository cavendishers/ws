"""
AI聊天服务层
处理与DeepSeek API的交互逻辑
"""
import logging
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from django.conf import settings
from openai import OpenAI
import json

logger = logging.getLogger('ai_chat')


class DeepSeekChatService:
    """DeepSeek聊天服务"""
    
    def __init__(self):
        self.api_key = settings.DEEPSEEK_API_KEY
        self.base_url = settings.DEEPSEEK_BASE_URL
        self.model = settings.DEEPSEEK_MODEL
        self.max_tokens = settings.DEEPSEEK_MAX_TOKENS
        self.temperature = settings.DEEPSEEK_TEMPERATURE
        self.system_prompt = settings.DEEPSEEK_SYSTEM_PROMPT
        
        # 验证API密钥
        if not self.api_key or self.api_key.strip() == '':
            error_msg = "DeepSeek API密钥未设置或为空。请设置环境变量 DEEPSEEK_API_KEY"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # 验证其他必要配置
        if not self.base_url:
            error_msg = "DeepSeek API基础URL未设置"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        if not self.model:
            error_msg = "DeepSeek模型名称未设置"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # 初始化OpenAI客户端
        try:
            self.client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url
            )
        except Exception as e:
            error_msg = f"初始化DeepSeek客户端失败: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        logger.info(f"DeepSeek服务初始化完成，模型: {self.model}")
        logger.info(f"API密钥状态: {'已设置' if self.api_key else '未设置'} (长度: {len(self.api_key) if self.api_key else 0})")
    
    def _build_messages(self, user_message: str, conversation_history: Optional[List[Dict]] = None) -> List[Dict[str, str]]:
        """构建消息列表"""
        messages = []
        
        # 添加系统提示
        if self.system_prompt:
            messages.append({
                "role": "system", 
                "content": self.system_prompt
            })
        
        # 添加对话历史（如果有）
        if conversation_history:
            messages.extend(conversation_history)
        
        # 添加当前用户消息
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        return messages
    
    def chat_completion(self, user_message: str, conversation_history: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        发送聊天请求到DeepSeek API
        
        Args:
            user_message: 用户消息
            conversation_history: 对话历史
            
        Returns:
            包含响应内容和元数据的字典
        """
        try:
            logger.info(f"开始处理聊天请求: {user_message[:50]}...")
            
            # 构建消息列表
            messages = self._build_messages(user_message, conversation_history)
            
            logger.info(f"构建的消息列表长度: {len(messages)}")
            
            # 调用API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                stream=False
            )
            
            # 提取响应内容
            ai_response = response.choices[0].message.content
            
            # 构建返回数据
            result = {
                'success': True,
                'response': ai_response,
                'model': self.model,
                'usage': {
                    'prompt_tokens': getattr(response.usage, 'prompt_tokens', 0),
                    'completion_tokens': getattr(response.usage, 'completion_tokens', 0),
                    'total_tokens': getattr(response.usage, 'total_tokens', 0)
                },
                'metadata': {
                    'finish_reason': response.choices[0].finish_reason,
                    'created': response.created
                }
            }
            
            logger.info(f"AI响应成功生成，长度: {len(ai_response)} 字符")
            return result
            
        except Exception as e:
            logger.error(f"DeepSeek API调用失败: {str(e)}", exc_info=True)
            return {
                'success': False,
                'response': f"抱歉，AI服务暂时不可用。错误信息：{str(e)}",
                'error': str(e),
                'error_type': type(e).__name__
            }
    
    async def chat_completion_async(self, user_message: str, conversation_history: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        异步版本的聊天完成
        
        Args:
            user_message: 用户消息
            conversation_history: 对话历史
            
        Returns:
            包含响应内容和元数据的字典
        """
        try:
            logger.info(f"开始异步处理聊天请求: {user_message[:50]}...")
            
            # 构建消息列表
            messages = self._build_messages(user_message, conversation_history)
            
            # 使用httpx进行异步请求
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {
                    "model": self.model,
                    "messages": messages,
                    "max_tokens": self.max_tokens,
                    "temperature": self.temperature,
                    "stream": False
                }
                
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers
                )
                
                response.raise_for_status()
                data = response.json()
                
                # 提取响应内容
                ai_response = data['choices'][0]['message']['content']
                
                result = {
                    'success': True,
                    'response': ai_response,
                    'model': self.model,
                    'usage': data.get('usage', {}),
                    'metadata': {
                        'finish_reason': data['choices'][0].get('finish_reason'),
                        'created': data.get('created')
                    }
                }
                
                logger.info(f"异步AI响应成功生成，长度: {len(ai_response)} 字符")
                return result
                
        except Exception as e:
            logger.error(f"异步DeepSeek API调用失败: {str(e)}", exc_info=True)
            return {
                'success': False,
                'response': f"抱歉，AI服务暂时不可用。错误信息：{str(e)}",
                'error': str(e),
                'error_type': type(e).__name__
            }


class ChatMessageProcessor:
    """聊天消息处理器"""
    
    @staticmethod
    def parse_user_input(request_data: Dict[str, Any]) -> str:
        """
        解析用户输入，支持多种格式
        
        Args:
            request_data: 请求数据
            
        Returns:
            用户消息字符串
        """
        # 尝试从不同字段获取消息
        message = request_data.get('messages', '')
        
        # 如果messages是列表，提取用户消息
        if isinstance(message, list):
            user_messages = [msg.get('content', '') for msg in message if msg.get('role') == 'user']
            message = user_messages[-1] if user_messages else ''
        
        # 如果messages是字符串，直接使用
        elif isinstance(message, str):
            pass
        
        # 兼容其他可能的字段名
        else:
            message = request_data.get('message', '') or request_data.get('content', '')
        
        return str(message).strip()
    
    @staticmethod
    def extract_conversation_history(request_data: Dict[str, Any]) -> Optional[List[Dict]]:
        """
        提取对话历史
        
        Args:
            request_data: 请求数据
            
        Returns:
            对话历史列表或None
        """
        messages = request_data.get('messages', [])
        
        if isinstance(messages, list) and len(messages) > 1:
            # 过滤掉系统消息和最后一条用户消息
            history = []
            for msg in messages[:-1]:  # 排除最后一条消息
                if msg.get('role') in ['user', 'assistant'] and msg.get('content'):
                    history.append({
                        'role': msg['role'],
                        'content': msg['content']
                    })
            return history if history else None
        
        return None


# 全局服务实例
_deepseek_service = None

def get_deepseek_service() -> DeepSeekChatService:
    """获取DeepSeek服务实例（单例模式）"""
    global _deepseek_service
    if _deepseek_service is None:
        _deepseek_service = DeepSeekChatService()
    return _deepseek_service 