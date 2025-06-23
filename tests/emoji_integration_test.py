#!/usr/bin/env python
"""
Integration test for emoji processing in AI chat system
"""
import os
import sys
import django
import json

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from data_hall.models import ChatMessage

def test_emoji_chat_integration():
    """Test the complete emoji chat workflow"""
    print("=== 测试AI聊天表情符号集成功能 ===\n")
    
    # 创建测试客户端
    client = Client()
    
    # 创建测试用户（如果不存在）
    try:
        test_user = User.objects.get(username='emoji_test_user')
        print("使用现有测试用户")
    except User.DoesNotExist:
        test_user = User.objects.create_user(
            username='emoji_test_user',
            email='test@example.com',
            password='testpass123'
        )
        print("创建新的测试用户")
    
    # 登录测试用户
    client.login(username='emoji_test_user', password='testpass123')
    print("用户登录成功")
    
    # 清理之前的测试数据
    ChatMessage.objects.filter(user=test_user).delete()
    print("清理旧的测试数据")
    
    test_messages = [
        "Hello! 😀",
        "Python编程很有趣！🐍💻",
        "测试多个表情符号：😊👍🎉🌟",
        "复杂表情符号：👨‍💻🏃‍♀️🌈",
        "没有表情符号的普通文本",
    ]
    
    print(f"\n开始测试 {len(test_messages)} 条消息...\n")
    
    for i, message in enumerate(test_messages, 1):
        print(f"测试消息 {i}: {message}")
        
        # 模拟前端发送编码后的消息
        from data_hall.emoji_utils import encode_emojis
        encoded_message = encode_emojis(message)
        
        # 构建请求数据（模拟前端）
        request_data = {
            'messages': encoded_message,
            'encode_emojis': True,
            'emoji_encoding_method': 'html_entities'
        }
        
        # 发送请求到AI聊天API
        response = client.post(
            '/api/ai/chat/',
            data=json.dumps(request_data),
            content_type='application/json',
            HTTP_X_EMOJI_ENCODING='true',
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        
        print(f"  API响应状态: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            if response_data.get('success'):
                print(f"  ✅ AI响应成功")
                print(f"  AI回复: {response_data.get('response', '')[:100]}...")
                
                # 检查消息是否正确保存到数据库
                user_messages = ChatMessage.objects.filter(user=test_user, role='user')
                ai_messages = ChatMessage.objects.filter(user=test_user, role='assistant')
                
                print(f"  数据库中用户消息数: {user_messages.count()}")
                print(f"  数据库中AI消息数: {ai_messages.count()}")
                
                # 检查最新的用户消息是否正确解码
                latest_user_msg = user_messages.order_by('-created_at').first()
                if latest_user_msg:
                    from data_hall.emoji_utils import prepare_for_display
                    displayed_content = prepare_for_display(latest_user_msg.content)
                    print(f"  数据库存储内容: {latest_user_msg.content}")
                    print(f"  显示格式内容: {displayed_content}")
                    
                    if displayed_content == message:
                        print(f"  ✅ 表情符号处理正确")
                    else:
                        print(f"  ❌ 表情符号处理错误:")
                        print(f"     原始: {repr(message)}")
                        print(f"     显示: {repr(displayed_content)}")
                
            else:
                print(f"  ❌ AI响应失败: {response_data.get('response', '')}")
        else:
            print(f"  ❌ API请求失败: {response.status_code}")
            if hasattr(response, 'content'):
                print(f"  错误内容: {response.content.decode()[:200]}")
        
        print()
    
    # 测试聊天历史获取
    print("测试聊天历史获取...")
    history_response = client.get('/api/ai/history/')
    
    if history_response.status_code == 200:
        history_data = history_response.json()
        print(f"✅ 聊天历史获取成功，共 {len(history_data.get('results', []))} 条记录")
        
        # 验证历史记录中的表情符号显示
        for record in history_data.get('results', [])[:3]:  # 只检查前3条
            content = record.get('content', '')
            print(f"  历史记录: {content[:50]}...")
            
            # 检查是否包含表情符号
            has_emojis = any(ord(c) > 127 for c in content)
            if has_emojis:
                print(f"    ✅ 包含Unicode字符（可能是表情符号）")
            
    else:
        print(f"❌ 聊天历史获取失败: {history_response.status_code}")
    
    print(f"\n=== 测试完成 ===")
    print(f"最终数据库记录数: {ChatMessage.objects.filter(user=test_user).count()}")

if __name__ == "__main__":
    try:
        test_emoji_chat_integration()
    except Exception as e:
        print(f"测试失败: {str(e)}")
        import traceback
        traceback.print_exc() 