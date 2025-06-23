#!/usr/bin/env python
"""
聊天历史API测试脚本
测试聊天记录的分页加载功能
"""
import os
import sys
import django
import requests
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse
import json

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from data_hall.models import ChatMessage

User = get_user_model()

def test_chat_history_api():
    """测试聊天历史API"""
    
    # 创建测试用户
    test_user, created = User.objects.get_or_create(
        username='test_chat_user',
        defaults={
            'email': 'test@example.com',
            'first_name': '测试',
            'last_name': '用户'
        }
    )
    
    if created:
        test_user.set_password('testpass123')
        test_user.save()
        print(f"✅ 创建测试用户: {test_user.username}")
    else:
        print(f"✅ 使用现有测试用户: {test_user.username}")
    
    # 创建测试聊天记录
    print("\n📝 创建测试聊天记录...")
    test_messages = [
        {'role': 'user', 'content': '你好，AI助手！'},
        {'role': 'assistant', 'content': '你好！我是AI助手，很高兴为您服务。'},
        {'role': 'user', 'content': '请介绍一下数据大厅项目。'},
        {'role': 'assistant', 'content': '数据大厅是一个专注于企业数据分析和产业链可视化的平台...'},
        {'role': 'user', 'content': '能否展示一些企业排名信息？'},
        {'role': 'assistant', 'content': '当然可以！我可以为您展示企业在发展潜力、创新能力等维度的排名...'},
        {'role': 'user', 'content': '谢谢你的帮助！'},
        {'role': 'assistant', 'content': '不客气！随时为您提供帮助。'},
    ]
    
    # 清除该用户的旧测试记录
    ChatMessage.objects.filter(user=test_user).delete()
    
    # 创建新的测试记录
    for i, msg in enumerate(test_messages):
        ChatMessage.objects.create(
            user=test_user,
            role=msg['role'],
            content=msg['content'],
            metadata={'test_index': i}
        )
    
    print(f"✅ 创建了 {len(test_messages)} 条测试聊天记录")
    
    # 测试API客户端
    client = Client()
    
    # 登录测试用户
    login_success = client.login(username='test_chat_user', password='testpass123')
    if not login_success:
        print("❌ 用户登录失败")
        return
    
    print("✅ 用户登录成功")
    
    # 测试获取聊天历史（第一页）
    print("\n📊 测试获取聊天历史（第一页）...")
    response = client.get('/api/ai/history/?page=1&page_size=5')
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 获取聊天历史成功")
        print(f"   总记录数: {data['total']}")
        print(f"   当前页: {data['page']}")
        print(f"   每页大小: {data['page_size']}")
        print(f"   总页数: {data['total_pages']}")
        print(f"   有下一页: {data['has_next']}")
        print(f"   有上一页: {data['has_previous']}")
        print(f"   本页记录数: {len(data['results'])}")
        
        # 显示前几条记录
        for i, msg in enumerate(data['results'][:3]):
            print(f"   [{i+1}] {msg['role']}: {msg['content'][:30]}...")
            
    else:
        print(f"❌ 获取聊天历史失败: {response.status_code}")
        print(f"   响应内容: {response.content.decode()}")
    
    # 测试获取第二页
    print("\n📊 测试获取聊天历史（第二页）...")
    response = client.get('/api/ai/history/?page=2&page_size=5')
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 获取第二页成功，记录数: {len(data['results'])}")
        
        for i, msg in enumerate(data['results'][:3]):
            print(f"   [{i+1}] {msg['role']}: {msg['content'][:30]}...")
    else:
        print(f"❌ 获取第二页失败: {response.status_code}")
    
    # 测试创建聊天记录
    print("\n📝 测试创建聊天记录...")
    new_message = {
        'role': 'user',
        'content': '这是通过API创建的测试消息',
        'metadata': {'test': True}
    }
    
    response = client.post(
        '/api/ai/history/',
        data=json.dumps(new_message),
        content_type='application/json'
    )
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ 创建聊天记录成功")
        print(f"   消息ID: {data['data']['id']}")
        print(f"   内容: {data['data']['content']}")
    else:
        print(f"❌ 创建聊天记录失败: {response.status_code}")
        print(f"   响应内容: {response.content.decode()}")
    
    # 测试删除所有聊天记录
    print("\n🗑️  测试删除所有聊天记录...")
    response = client.delete('/api/ai/history/')
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 删除聊天记录成功")
        print(f"   删除数量: {data['deleted_count']}")
    else:
        print(f"❌ 删除聊天记录失败: {response.status_code}")
        print(f"   响应内容: {response.content.decode()}")
    
    # 验证删除结果
    remaining_count = ChatMessage.objects.filter(user=test_user).count()
    print(f"✅ 验证删除结果: 剩余记录数 = {remaining_count}")
    
    print("\n🎉 聊天历史API测试完成！")

if __name__ == '__main__':
    try:
        test_chat_history_api()
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {str(e)}")
        import traceback
        traceback.print_exc() 