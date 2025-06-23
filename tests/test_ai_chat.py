#!/usr/bin/env python3
"""
AI聊天API测试脚本
用于验证DeepSeek AI聊天系统是否正常工作
"""
import os
import sys
import requests
import json
import time

# Django项目设置
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 初始化Django
import django
django.setup()

def test_api_health():
    """测试API健康状态"""
    print("🔍 测试API健康状态...")
    try:
        response = requests.get('http://localhost:8000/api/ai/health/')
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API健康检查通过: {data}")
            return True
        else:
            print(f"❌ API健康检查失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API健康检查异常: {str(e)}")
        return False

def test_chat_api():
    """测试聊天API"""
    print("\n💬 测试聊天API...")
    
    test_messages = [
        "你好，请介绍一下你自己",
        "什么是新势力企业？",
        "中国新势力企业的发展趋势如何？"
    ]
    
    for i, message in enumerate(test_messages, 1):
        print(f"\n📝 测试消息 {i}: {message}")
        
        try:
            start_time = time.time()
            
            response = requests.post(
                'http://localhost:8000/api/ai/chat/',
                headers={'Content-Type': 'application/json'},
                json={'messages': message},
                timeout=30
            )
            
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ 响应成功 (用时: {response_time:.2f}s)")
                print(f"📄 AI回复: {data.get('response', '')[:200]}...")
                if 'usage' in data:
                    print(f"📊 Token使用: {data['usage']}")
            else:
                print(f"❌ 响应失败: {response.status_code}")
                print(f"📄 错误信息: {response.text}")
                
        except requests.exceptions.Timeout:
            print("⏰ 请求超时")
        except Exception as e:
            print(f"❌ 请求异常: {str(e)}")
        
        # 添加延迟，避免频率限制
        time.sleep(1)

def test_conversation_history():
    """测试对话历史功能"""
    print("\n🔄 测试对话历史功能...")
    
    try:
        # 第一轮对话
        response1 = requests.post(
            'http://localhost:8000/api/ai/chat/',
            headers={'Content-Type': 'application/json'},
            json={'messages': '我刚才问过什么问题吗？'}
        )
        
        if response1.status_code == 200:
            data1 = response1.json()
            print(f"✅ 无历史对话响应: {data1.get('response', '')[:100]}...")
        
        # 第二轮对话（带历史）
        conversation_history = [
            {"role": "user", "content": "什么是人工智能？"},
            {"role": "assistant", "content": "人工智能是一种让机器模拟人类智能的技术。"}
        ]
        
        response2 = requests.post(
            'http://localhost:8000/api/ai/chat/',
            headers={'Content-Type': 'application/json'},
            json={
                'messages': '请详细解释一下你刚才提到的内容',
                'conversation_history': conversation_history
            }
        )
        
        if response2.status_code == 200:
            data2 = response2.json()
            print(f"✅ 带历史对话响应: {data2.get('response', '')[:100]}...")
        
    except Exception as e:
        print(f"❌ 对话历史测试失败: {str(e)}")

def test_config_api():
    """测试配置API"""
    print("\n⚙️ 测试配置API...")
    
    try:
        response = requests.get('http://localhost:8000/api/ai/chat/config/')
        if response.status_code == 200:
            config = response.json()
            print(f"✅ 配置获取成功:")
            for key, value in config.items():
                if key == 'system_prompt':
                    print(f"  {key}: {str(value)[:50]}...")
                else:
                    print(f"  {key}: {value}")
        else:
            print(f"❌ 配置获取失败: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 配置API测试失败: {str(e)}")

def main():
    """主测试函数"""
    print("🚀 开始AI聊天系统测试")
    print("=" * 50)
    
    # 检查环境变量
    api_key = os.getenv('DEEPSEEK_API_KEY')
    if not api_key:
        print("⚠️ 警告: 未设置DEEPSEEK_API_KEY环境变量")
        print("请设置环境变量: export DEEPSEEK_API_KEY='your_api_key'")
        return
    else:
        print(f"✅ API密钥已设置: {api_key[:10]}...")
    
    # 运行测试
    health_ok = test_api_health()
    
    if health_ok:
        test_config_api()
        test_chat_api()
        test_conversation_history()
    
    print("\n" + "=" * 50)
    print("🎯 测试完成!")

if __name__ == '__main__':
    main() 