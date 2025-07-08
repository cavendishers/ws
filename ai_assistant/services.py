"""
腾讯智能体服务层
处理与腾讯智能体API的交互逻辑
"""
import asyncio
import re
import json
import uuid
import ssl
import certifi
import logging
from typing import List, Dict, Any, Optional
import websockets
from django.conf import settings
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.lke.v20231130 import lke_client, models

logger = logging.getLogger('ai_chat')


class TencentAgentService:
    """腾讯智能体服务"""
    
    def __init__(self):
        """初始化腾讯智能体服务"""
        # 从配置中读取参数
        self.secret_id = settings.TENCENT_SECRET_ID
        self.secret_key = settings.TENCENT_SECRET_KEY
        self.region = settings.TENCENT_REGION
        self.bot_app_key = settings.TENCENT_BOT_APP_KEY
        self.visitor_biz_id = settings.TENCENT_VISITOR_BIZ_ID
        self.conn_type_api = settings.TENCENT_CONN_TYPE_API
        self.websocket_url = settings.TENCENT_WEBSOCKET_URL
        
        # 验证必要配置
        if not all([self.secret_id, self.secret_key, self.bot_app_key]):
            error_msg = "腾讯云配置不完整，请检查 TENCENT_SECRET_ID, TENCENT_SECRET_KEY, TENCENT_BOT_APP_KEY"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # 初始化腾讯云客户端
        try:
            cred = credential.Credential(self.secret_id, self.secret_key)
            httpProfile = HttpProfile()
            httpProfile.endpoint = "lke.tencentcloudapi.com"
            
            clientProfile = ClientProfile()
            clientProfile.httpProfile = httpProfile
            
            self.client = lke_client.LkeClient(cred, self.region, clientProfile)
            logger.info("腾讯智能体服务初始化成功")
        except Exception as e:
            error_msg = f"初始化腾讯云客户端失败: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # SSL上下文
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.load_verify_locations(certifi.where())
        
        # 消息解析正则
        self.pattern = r'\d+(.*)'
    
    def _get_session_id(self) -> str:
        """生成会话ID"""
        return str(uuid.uuid1())
    
    def _get_request_id(self) -> str:
        """生成请求ID"""
        return str(uuid.uuid1())
    
    def _get_ws_token(self) -> str:
        """获取WebSocket令牌"""
        try:
            req = models.GetWsTokenRequest()
            params = {
                "Type": self.conn_type_api,
                "BotAppKey": self.bot_app_key,
                "VisitorBizId": self.visitor_biz_id
            }
            req.from_json_string(json.dumps(params))
            
            resp = self.client.GetWsToken(req)
            logger.info("获取WebSocket令牌成功")
            return resp.Token
        except TencentCloudSDKException as err:
            logger.error(f"获取WebSocket令牌失败: {err}")
            raise Exception(f"获取WebSocket令牌失败: {err}")
    
    def list_sessions(self) -> List[Dict[str, Any]]:
        """
        获取所有历史会话列表
        注意：腾讯云智能体LKE API不提供会话列表功能
        这里返回模拟数据或空列表
        
        Returns:
            List[Dict]: 会话列表（模拟数据）
        """
        try:
            # 腾讯云LKE API目前不提供会话列表功能
            # 返回模拟数据说明情况
            logger.info("腾讯云LKE API暂不支持会话列表查询")
            return [
                {
                    'session_id': 'demo-session-1',
                    'title': '智能体演示会话',
                    'created_time': '2024-01-01 00:00:00',
                    'update_time': '2024-01-01 00:00:00',
                    'message_count': 0,
                    'note': '腾讯云LKE API暂不支持会话列表查询功能'
                }
            ]
            
        except Exception as err:
            logger.error(f"会话列表模拟返回失败: {err}")
            return []
    
    def get_chat_history(self, session_id: str) -> List[Dict[str, Any]]:
        """
        获取指定会话的聊天记录
        调用腾讯 GetMsgRecord API
        
        Args:
            session_id: 会话ID
            
        Returns:
            List[Dict]: 聊天记录列表
        """
        try:
            req = models.GetMsgRecordRequest()
            # 设置正确的参数
            req.BotBizId = self.visitor_biz_id  # 使用访客业务ID
            req.SessionId = session_id
            req.Count = 50  # 必传参数：获取消息条数
            req.StartTime = "2024-01-01 00:00:00"  # 开始时间
            req.EndTime = "2025-12-31 23:59:59"    # 结束时间
            
            resp = self.client.GetMsgRecord(req)
            
            messages = []
            if hasattr(resp, 'Records') and resp.Records:
                for record in resp.Records:
                    messages.append({
                        'id': getattr(record, 'RecordId', ''),
                        'role': 'user' if getattr(record, 'UserId', '') != 'assistant' else 'assistant',
                        'content': getattr(record, 'Content', ''),
                        'created_at': getattr(record, 'CreateTime', ''),
                        'metadata': {
                            'user_id': getattr(record, 'UserId', ''),
                            'session_id': session_id
                        }
                    })
            
            logger.info(f"获取会话 {session_id} 的 {len(messages)} 条消息")
            return messages
            
        except TencentCloudSDKException as err:
            logger.error(f"获取聊天记录失败: {err}")
            logger.error(f"错误详情: {err}")
            return []
    
    async def send_message(self, message: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        发送消息并接收AI回复
        使用WebSocket进行实时通信
        
        Args:
            message: 用户消息
            session_id: 会话ID，为空时创建新会话
            
        Returns:
            Dict: 包含AI回复和会话信息的字典
        """
        if not message or not message.strip():
            raise ValueError("消息内容不能为空")
        
        # 如果没有提供session_id，生成新的
        if not session_id:
            session_id = self._get_session_id()
            logger.info(f"创建新会话: {session_id}")
        
        try:
            # 获取WebSocket令牌
            token = self._get_ws_token()
            
            # 建立WebSocket连接并发送消息
            response = await self._websocket_chat(token, message, session_id)
            
            return {
                'success': True,
                'response': response,
                'session_id': session_id,
                'model': 'tencent-agent',
                'timestamp': None,  # 腾讯API返回的时间戳
                'metadata': {
                    'provider': 'tencent',
                    'session_id': session_id
                }
            }
            
        except Exception as e:
            logger.error(f"发送消息失败: {str(e)}")
            return {
                'success': False,
                'response': f"抱歉，AI服务暂时不可用。错误信息：{str(e)}",
                'error': str(e),
                'session_id': session_id
            }
    
    async def _websocket_chat(self, token: str, message: str, session_id: str) -> str:
        """
        通过WebSocket进行聊天
        
        Args:
            token: WebSocket认证令牌
            message: 用户消息
            session_id: 会话ID
            
        Returns:
            str: AI回复内容
        """
        async with websockets.connect(self.websocket_url, ssl=self.ssl_context) as ws:
            # 连接建立
            response = await ws.recv()
            logger.info(f"WebSocket连接建立: {response}")
            
            # 发送认证信息
            auth = {"token": token}
            auth_message = f"40{json.dumps(auth)}"
            await ws.send(auth_message)
            
            # 接收认证结果
            response = await ws.recv()
            logger.info(f"WebSocket认证结果: {response}")
            
            # 构建请求消息 (严格按照示例代码格式)
            request_id = self._get_request_id()
            payload = {
                "payload": {
                    "request_id": request_id,
                    "session_id": session_id,
                    "content": f"{message}",  # 确保是字符串格式
                }
            }
            req_data = ["send", payload]
            
            send_data = f"42{json.dumps(req_data, ensure_ascii=False)}"
            logger.info(f"发送消息: {message}")
            logger.debug(f"发送数据格式: {send_data}")
            await ws.send(send_data)
            
            # 接收响应
            ai_response = ""
            while True:
                rsp = await ws.recv()
                
                # 处理心跳包
                if rsp == '2':
                    await ws.send("3")
                    continue
                
                # 解析响应
                try:
                    rsp_re_result = re.search(self.pattern, rsp).group(1)
                    rsp_dict = json.loads(rsp_re_result)
                    
                    if rsp_dict[0] == "error":
                        logger.error(f"WebSocket错误: {rsp_dict}")
                        raise Exception(f"WebSocket错误: {rsp_dict[1]}")
                    
                    elif rsp_dict[0] == "reply":
                        payload = rsp_dict[1]["payload"]
                        
                        # 跳过自己发送的消息
                        if payload.get("is_from_self", False):
                            logger.info(f"跳过自己的消息: {payload['content']}")
                            continue
                        
                        # 检查是否是最终消息
                        if payload.get("is_final", False):
                            ai_response = payload["content"]
                            logger.info(f"接收到最终AI回复: {ai_response}")
                            break
                        else:
                            # 流式消息，可以在这里处理增量内容
                            logger.debug(f"接收到流式消息: {payload}")
                            continue
                
                except (AttributeError, json.JSONDecodeError, KeyError) as e:
                    logger.warning(f"解析WebSocket响应失败: {e}, 原始响应: {rsp}")
                    continue
            
            return ai_response if ai_response else "抱歉，没有收到有效的AI回复。"


# 单例模式
_tencent_service = None

def get_tencent_service(force_reload: bool = False) -> TencentAgentService:
    """
    获取腾讯智能体服务实例（单例模式）
    
    Args:
        force_reload: 是否强制重新加载配置和服务实例
    """
    global _tencent_service
    if _tencent_service is None or force_reload:
        _tencent_service = TencentAgentService()
    return _tencent_service 