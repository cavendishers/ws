#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CDN资源验证脚本
验证所有CDN资源是否已正确下载到本地并且HTML文件已正确更新
"""

import os
from pathlib import Path

def verify_cdn_resources():
    """验证CDN资源本地化是否成功"""
    project_root = Path(".")
    static_dir = project_root / "data_hall" / "static" / "data_hall"
    
    print("=" * 60)
    print("CDN资源验证报告")
    print("=" * 60)
    
    # 检查静态文件
    expected_files = {
        "css/vendor/font-awesome.min.css": "Font Awesome CSS",
        "css/vendor/noto-sans-sc.css": "Google Fonts CSS",
        "js/vendor/tailwindcss.js": "Tailwind CSS",
        "js/vendor/echarts.min.js": "ECharts",
    }
    
    print("\n1. 静态文件检查:")
    all_files_exist = True
    
    for file_path, description in expected_files.items():
        full_path = static_dir / file_path
        if full_path.exists():
            size = full_path.stat().st_size
            print(f"✓ {description}: {file_path} ({size:,} bytes)")
        else:
            print(f"✗ {description}: {file_path} (文件不存在)")
            all_files_exist = False
    
    # 检查字体文件
    fonts_dir = static_dir / "fonts"
    if fonts_dir.exists():
        font_files = list(fonts_dir.glob("*.woff2"))
        print(f"✓ 字体文件: {len(font_files)} 个 .woff2 文件")
    else:
        print("✗ 字体目录不存在")
        all_files_exist = False
    
    # 检查HTML文件更新
    templates_dir = project_root / "data_hall" / "templates" / "data_hall"
    html_files = ["base.html", "index.html", "map.html", "industry_detail.html"]
    
    print("\n2. HTML文件更新检查:")
    all_html_updated = True
    
    for html_file in html_files:
        file_path = templates_dir / html_file
        if file_path.exists():
            content = file_path.read_text(encoding='utf-8')
            
            # 检查是否还有CDN链接
            cdn_patterns = [
                "https://cdn.tailwindcss.com",
                "https://cdnjs.cloudflare.com",
                "https://cdn.jsdelivr.net",
                "https://fonts.googleapis.com/css2"
            ]
            
            has_cdn = any(pattern in content for pattern in cdn_patterns)
            
            # 检查是否有本地静态文件引用
            has_local = "{% static 'data_hall/" in content
            
            if not has_cdn and has_local:
                print(f"✓ {html_file}: 已更新为本地资源")
            elif has_cdn:
                print(f"⚠ {html_file}: 仍包含CDN链接")
                all_html_updated = False
            else:
                print(f"- {html_file}: 无需更新")
        else:
            print(f"✗ {html_file}: 文件不存在")
            all_html_updated = False
    
    # 检查备份文件
    backup_dir = project_root / "templates_backup"
    print("\n3. 备份文件检查:")
    
    if backup_dir.exists():
        backup_files = list(backup_dir.glob("*.html"))
        print(f"✓ 备份目录存在，包含 {len(backup_files)} 个HTML文件")
    else:
        print("✗ 备份目录不存在")
    
    # 总结
    print("\n" + "=" * 60)
    print("验证总结:")
    
    if all_files_exist:
        print("✓ 所有静态资源文件已成功下载")
    else:
        print("✗ 部分静态资源文件缺失")
    
    if all_html_updated:
        print("✓ HTML文件已正确更新为本地资源引用")
    else:
        print("⚠ 部分HTML文件可能仍包含CDN链接")
    
    if all_files_exist and all_html_updated:
        print("\n🎉 CDN本地化完全成功！")
        print("\n建议:")
        print("1. 测试网站功能确保一切正常")
        print("2. 将新的静态文件添加到版本控制")
        print("3. 可以删除下载脚本和备份文件（如果确认无问题）")
    else:
        print("\n⚠️  CDN本地化可能存在问题，请检查上述错误")
    
    print("=" * 60)

if __name__ == "__main__":
    verify_cdn_resources() 