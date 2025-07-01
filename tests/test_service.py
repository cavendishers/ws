#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯智能体服务测试脚本
在不启动Django服务的情况下测试后端逻辑

功能测试：
1. 获取会话列表
2. 获取指定会话的历史记录
3. 模拟一次完整的对话（新建会话 -> 发送第一条消息 -> 在同一会话中发送第二条消息）

使用方法：
python test_service.py
"""

import os
import sys
import asyncio
import json
from datetime import datetime

# 添加Django项目路径到Python路径
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_DIR)

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

# 初始化Django
import django
django.setup()

# 导入服务
from ai_assistant.services import TencentAgentService


def print_separator(title):
    """打印分隔符"""
    print("\n" + "="*60)
    print(f" {title} ")
    print("="*60)


def print_result(result, title="结果"):
    """打印结果"""
    print(f"\n{title}:")
    print("-" * 40)
    if isinstance(result, (dict, list)):
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(result)
    print("-" * 40)


async def test_tencent_service():
    """测试腾讯智能体服务"""
    
    print_separator("腾讯智能体服务测试开始")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # 初始化服务
        print("\n1. 初始化腾讯智能体服务...")
        service = TencentAgentService()
        print("✅ 服务初始化成功")
        print(f"   - 区域: {service.region}")
        print(f"   - Bot App Key: {service.bot_app_key[:10]}...")
        print(f"   - Visitor Biz ID: {service.visitor_biz_id}")
        
    except Exception as e:
        print(f"❌ 服务初始化失败: {e}")
        return False
    
    # 测试1：获取会话列表
    print_separator("测试1: 获取会话列表")
    try:
        sessions = service.list_sessions()
        print(f"✅ 获取会话列表成功，共 {len(sessions)} 个会话")
        print_result(sessions, "会话列表")
        
        # 保存第一个会话ID用于后续测试
        test_session_id = sessions[0]['session_id'] if sessions else None
        
    except Exception as e:
        print(f"❌ 获取会话列表失败: {e}")
        test_session_id = None
    
    # 测试2：获取指定会话的历史记录
    if test_session_id:
        print_separator("测试2: 获取指定会话的历史记录")
        try:
            messages = service.get_chat_history(test_session_id)
            print(f"✅ 获取会话历史成功，共 {len(messages)} 条消息")
            print_result(messages, f"会话 {test_session_id} 的历史记录")
            
        except Exception as e:
            print(f"❌ 获取会话历史失败: {e}")
    else:
        print_separator("测试2: 跳过历史记录测试（没有可用会话）")
    
    # 测试3：模拟完整对话
    print_separator("测试3: 模拟完整对话")
    
    # 3.1 创建新会话并发送第一条消息
    print("\n3.1 发送第一条消息（创建新会话）...")
    try:
        first_message = "你好，我想了解人工智能产业的发展情况"
        result1 = await service.send_message(first_message)
        
        if result1.get('success'):
            print("✅ 第一条消息发送成功")
            print(f"   - 会话ID: {result1.get('session_id')}")
            print(f"   - AI回复: {result1.get('response', '')[:100]}...")
            
            new_session_id = result1.get('session_id')
            print_result(result1, "第一条消息响应")
            
        else:
            print(f"❌ 第一条消息发送失败: {result1.get('error')}")
            new_session_id = None
            
    except Exception as e:
        print(f"❌ 第一条消息发送异常: {e}")
        new_session_id = None
    
    # 3.2 在同一会话中发送第二条消息
    if new_session_id:
        print("\n3.2 在同一会话中发送第二条消息...")
        try:
            second_message = "能详细介绍一下人工智能产业链的上下游企业分布吗？"
            result2 = await service.send_message(second_message, new_session_id)
            
            if result2.get('success'):
                print("✅ 第二条消息发送成功")
                print(f"   - 会话ID: {result2.get('session_id')}")
                print(f"   - AI回复: {result2.get('response', '')[:100]}...")
                print_result(result2, "第二条消息响应")
                
                # 验证会话ID是否一致
                if result2.get('session_id') == new_session_id:
                    print("✅ 会话ID一致，证明在同一会话中")
                else:
                    print("⚠️  会话ID不一致，可能存在问题")
                
            else:
                print(f"❌ 第二条消息发送失败: {result2.get('error')}")
                
        except Exception as e:
            print(f"❌ 第二条消息发送异常: {e}")
    else:
        print("⚠️  跳过第二条消息测试（第一条消息失败）")
    
    # 测试4：获取新会话的历史记录
    if new_session_id:
        print_separator("测试4: 获取新会话的历史记录")
        try:
            # 稍等一下让消息保存到腾讯云
            await asyncio.sleep(2)
            
            new_messages = service.get_chat_history(new_session_id)
            print(f"✅ 获取新会话历史成功，共 {len(new_messages)} 条消息")
            print_result(new_messages, f"新会话 {new_session_id} 的历史记录")
            
            # 验证消息数量
            if len(new_messages) >= 2:  # 至少应该有2条用户消息和2条AI回复
                print("✅ 新会话包含预期的消息数量")
            else:
                print("⚠️  新会话消息数量少于预期，可能需要等待同步")
                
        except Exception as e:
            print(f"❌ 获取新会话历史失败: {e}")
    
    print_separator("测试完成")
    print("🎉 腾讯智能体服务测试完成！")
    return True


def test_service_initialization():
    """测试服务初始化"""
    print_separator("服务初始化测试")
    
    try:
        service = TencentAgentService()
        print("✅ TencentAgentService 初始化成功")
        
        # 检查配置
        print(f"✅ 秘钥ID: {service.secret_id[:8]}...")
        print(f"✅ 区域: {service.region}")
        print(f"✅ Bot App Key: {service.bot_app_key[:10]}...")
        print(f"✅ WebSocket URL: {service.websocket_url}")
        
        return True
        
    except Exception as e:
        print(f"❌ 服务初始化失败: {e}")
        print("请检查以下配置:")
        print("1. TENCENT_SECRET_ID")
        print("2. TENCENT_SECRET_KEY") 
        print("3. TENCENT_BOT_APP_KEY")
        print("4. 网络连接是否正常")
        return False


def main():
    """主函数"""
    print("🚀 腾讯智能体服务测试脚本")
    print(f"项目路径: {PROJECT_DIR}")
    
    # 先测试服务初始化
    if not test_service_initialization():
        print("\n❌ 服务初始化失败，退出测试")
        return
    
    # 运行异步测试
    try:
        asyncio.run(test_tencent_service())
    except KeyboardInterrupt:
        print("\n⚠️  测试被用户中断")
    except Exception as e:
        print(f"\n❌ 测试过程中发生未预期的错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main() 