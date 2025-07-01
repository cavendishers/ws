#!/usr/bin/env python3
"""
快速验证腾讯智能体重构是否成功
"""

import os
import sys
import asyncio

# 设置Django环境
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

import django
django.setup()

from ai_assistant.services import TencentAgentService

async def quick_test():
    print("🚀 快速测试腾讯智能体重构")
    
    try:
        # 1. 初始化服务
        print("\n1. 初始化服务...")
        service = TencentAgentService()
        print("✅ 服务初始化成功")
        
        # 2. 测试会话列表
        print("\n2. 测试会话列表...")
        sessions = service.list_sessions()
        print(f"✅ 会话列表获取成功，{len(sessions)} 个会话")
        
        # 3. 测试发送消息
        print("\n3. 测试发送消息...")
        result = await service.send_message("你好")
        
        if result.get('success'):
            print("✅ 消息发送成功")
            print(f"   会话ID: {result.get('session_id')}")
            print(f"   AI回复: {result.get('response', '')[:50]}...")
            print("🎉 腾讯智能体重构成功！")
            return True
        else:
            print(f"❌ 消息发送失败: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(quick_test())
    exit(0 if success else 1) 