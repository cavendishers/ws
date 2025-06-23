#!/usr/bin/env python3
"""
简化版AI聊天系统启动脚本
"""
import os
import sys
import subprocess
import time

def check_api_key():
    """检查API密钥"""
    api_key = os.getenv('DEEPSEEK_API_KEY')
    if not api_key:
        print("❌ 错误：未设置DEEPSEEK_API_KEY环境变量")
        print("请先设置：export DEEPSEEK_API_KEY='your_api_key'")
        return False
    print(f"✅ API密钥已设置 (长度: {len(api_key)})")
    return True

def start_server():
    """启动Django服务器"""
    print("\n🚀 启动AI聊天服务...")
    try:
        subprocess.run([
            sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'
        ], check=True)
    except KeyboardInterrupt:
        print("\n👋 服务已停止")
    except subprocess.CalledProcessError as e:
        print(f"❌ 启动失败: {e}")

def main():
    print("🤖 AI聊天系统 - 简化启动")
    print("=" * 40)
    
    # 检查API密钥
    if not check_api_key():
        sys.exit(1)
    
    # 启动服务器
    start_server()

if __name__ == '__main__':
    main() 