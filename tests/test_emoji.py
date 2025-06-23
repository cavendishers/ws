#!/usr/bin/env python
"""
Simple test script to verify emoji processing functionality
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from data_hall.emoji_utils import EmojiProcessor

def test_emoji_processing():
    """Test emoji encoding and decoding"""
    print("=== 测试表情符号处理功能 ===")
    
    test_cases = [
        "Hello 😀 World!",
        "Python is fun! 🐍💻",
        "测试中文和表情符号 😊👍",
        "No emojis here",
        "Multiple emojis: 😀😃😄😁😆😅",
        "Complex emoji: 👨‍💻🏃‍♀️🌈",
    ]
    
    for test_text in test_cases:
        print(f"\n原始文本: {test_text}")
        
        # 检测是否包含表情符号
        has_emojis = EmojiProcessor.contains_emojis(test_text)
        print(f"包含表情符号: {has_emojis}")
        
        # 编码
        encoded = EmojiProcessor.encode_emojis_to_html(test_text)
        print(f"编码后: {encoded}")
        
        # 解码
        decoded = EmojiProcessor.decode_html_to_emojis(encoded)
        print(f"解码后: {decoded}")
        
        # 验证往返转换
        is_correct = test_text == decoded
        print(f"往返转换正确: {is_correct}")
        
        if not is_correct:
            print(f"❌ 错误: 原始文本与解码后文本不匹配!")
            print(f"   原始: {repr(test_text)}")
            print(f"   解码: {repr(decoded)}")
        else:
            print("✅ 往返转换成功")
        
        # 数据库存储准备
        db_ready = EmojiProcessor.sanitize_for_database(test_text)
        print(f"数据库存储格式: {db_ready}")
        
        # 显示准备
        display_ready = EmojiProcessor.prepare_for_display(db_ready)
        print(f"显示格式: {display_ready}")
        
        # 验证完整流程
        full_cycle_correct = test_text == display_ready
        print(f"完整流程正确: {full_cycle_correct}")
        
        if not full_cycle_correct:
            print(f"❌ 完整流程错误!")
        else:
            print("✅ 完整流程成功")

if __name__ == "__main__":
    test_emoji_processing()
    print("\n=== 测试完成 ===") 