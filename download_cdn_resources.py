#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CDN资源下载和本地化脚本
自动下载项目中所有CDN资源到本地，并修改HTML文件中的链接
"""

import os
import re
import requests
from urllib.parse import urlparse
from pathlib import Path
import time
import hashlib

class CDNDownloader:
    def __init__(self, project_root="."):
        self.project_root = Path(project_root)
        self.static_dir = self.project_root / "data_hall" / "static" / "data_hall"
        self.templates_dir = self.project_root / "data_hall" / "templates" / "data_hall"
        
        # 创建本地资源目录
        self.css_dir = self.static_dir / "css" / "vendor"
        self.js_dir = self.static_dir / "js" / "vendor"
        self.fonts_dir = self.static_dir / "fonts"
        
        # 确保目录存在
        self.css_dir.mkdir(parents=True, exist_ok=True)
        self.js_dir.mkdir(parents=True, exist_ok=True)
        self.fonts_dir.mkdir(parents=True, exist_ok=True)
        
        # CDN资源映射
        self.cdn_resources = {
            # Tailwind CSS
            "https://cdn.tailwindcss.com": {
                "local_path": "js/vendor/tailwindcss.js",
                "type": "js"
            },
            # Font Awesome
            "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css": {
                "local_path": "css/vendor/font-awesome.min.css",
                "type": "css"
            },
            # ECharts
            "https://cdn.jsdelivr.net/npm/echarts@5.4.2/dist/echarts.min.js": {
                "local_path": "js/vendor/echarts.min.js",
                "type": "js"
            },
            "https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js": {
                "local_path": "js/vendor/echarts.min.js",
                "type": "js"
            },
            # Google Fonts
            "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap": {
                "local_path": "css/vendor/noto-sans-sc.css",
                "type": "css"
            }
        }
        
        # 请求头
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

    def download_file(self, url, local_path):
        """下载文件到本地路径"""
        try:
            print(f"正在下载: {url}")
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            full_path = self.static_dir / local_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(full_path, 'wb') as f:
                f.write(response.content)
            
            print(f"✓ 下载完成: {full_path}")
            return True
            
        except Exception as e:
            print(f"✗ 下载失败 {url}: {e}")
            return False

    def download_google_fonts(self, css_url, local_css_path):
        """下载Google Fonts CSS和字体文件"""
        try:
            print(f"正在下载Google Fonts CSS: {css_url}")
            response = requests.get(css_url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            css_content = response.text
            
            # 查找CSS中的字体文件URL
            font_urls = re.findall(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', css_content)
            
            # 下载字体文件并替换URL
            for font_url in font_urls:
                # 生成本地字体文件名
                font_filename = os.path.basename(urlparse(font_url).path)
                if not font_filename:
                    # 如果没有文件名，使用URL的hash作为文件名
                    font_filename = hashlib.md5(font_url.encode()).hexdigest() + '.woff2'
                
                local_font_path = f"fonts/{font_filename}"
                full_font_path = self.static_dir / local_font_path
                
                # 下载字体文件
                try:
                    print(f"  正在下载字体文件: {font_url}")
                    font_response = requests.get(font_url, headers=self.headers, timeout=30)
                    font_response.raise_for_status()
                    
                    with open(full_font_path, 'wb') as f:
                        f.write(font_response.content)
                    
                    # 替换CSS中的URL为本地路径
                    css_content = css_content.replace(font_url, f"../fonts/{font_filename}")
                    print(f"  ✓ 字体文件下载完成: {full_font_path}")
                    
                except Exception as e:
                    print(f"  ✗ 字体文件下载失败 {font_url}: {e}")
            
            # 保存修改后的CSS文件
            full_css_path = self.static_dir / local_css_path
            with open(full_css_path, 'w', encoding='utf-8') as f:
                f.write(css_content)
            
            print(f"✓ Google Fonts CSS保存完成: {full_css_path}")
            return True
            
        except Exception as e:
            print(f"✗ Google Fonts下载失败 {css_url}: {e}")
            return False

    def download_all_resources(self):
        """下载所有CDN资源"""
        print("开始下载CDN资源...")
        success_count = 0
        total_count = len(self.cdn_resources)
        
        for url, info in self.cdn_resources.items():
            if "fonts.googleapis.com" in url:
                # 特殊处理Google Fonts
                if self.download_google_fonts(url, info["local_path"]):
                    success_count += 1
            else:
                if self.download_file(url, info["local_path"]):
                    success_count += 1
            
            # 添加延迟避免请求过快
            time.sleep(1)
        
        print(f"\n下载完成: {success_count}/{total_count} 个资源下载成功")
        return success_count == total_count

    def update_html_files(self):
        """更新HTML文件中的CDN链接"""
        print("\n开始更新HTML文件中的CDN链接...")
        
        # 获取所有HTML文件
        html_files = list(self.templates_dir.glob("*.html"))
        
        for html_file in html_files:
            print(f"正在处理: {html_file.name}")
            
            try:
                with open(html_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                
                # 替换CDN链接
                for cdn_url, info in self.cdn_resources.items():
                    local_static_path = f"data_hall/{info['local_path']}"
                    
                    if cdn_url in content:
                        if info["type"] == "css":
                            # 替换CSS链接
                            content = content.replace(
                                f'href="{cdn_url}"',
                                f'href="{{% static \'{local_static_path}\' %}}"'
                            )
                        elif info["type"] == "js":
                            # 替换JS链接
                            content = content.replace(
                                f'src="{cdn_url}"',
                                f'src="{{% static \'{local_static_path}\' %}}"'
                            )
                
                # 处理Google Fonts的preconnect链接
                content = re.sub(
                    r'<link rel="preconnect" href="https://fonts\.googleapis\.com"[^>]*>',
                    '',
                    content
                )
                content = re.sub(
                    r'<link rel="preconnect" href="https://fonts\.gstatic\.com"[^>]*>',
                    '',
                    content
                )
                
                # 如果内容有变化，保存文件
                if content != original_content:
                    with open(html_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"✓ 已更新: {html_file.name}")
                else:
                    print(f"- 无需更新: {html_file.name}")
                    
            except Exception as e:
                print(f"✗ 处理文件失败 {html_file.name}: {e}")

    def create_backup(self):
        """创建模板文件备份"""
        backup_dir = self.project_root / "templates_backup"
        backup_dir.mkdir(exist_ok=True)
        
        print(f"正在创建模板文件备份到: {backup_dir}")
        
        html_files = list(self.templates_dir.glob("*.html"))
        for html_file in html_files:
            backup_file = backup_dir / html_file.name
            backup_file.write_text(html_file.read_text(encoding='utf-8'), encoding='utf-8')
        
        print(f"✓ 备份完成，共备份 {len(html_files)} 个文件")

    def run(self):
        """运行完整的CDN本地化流程"""
        print("=" * 60)
        print("CDN资源本地化工具")
        print("=" * 60)
        
        # 创建备份
        self.create_backup()
        
        # 下载资源
        if self.download_all_resources():
            print("\n所有资源下载成功，开始更新HTML文件...")
            self.update_html_files()
            print("\n✓ CDN本地化完成！")
            print("\n注意事项：")
            print("1. 请检查网站功能是否正常")
            print("2. 如有问题，可从 templates_backup 目录恢复原始文件")
            print("3. 建议将新下载的静态文件添加到版本控制")
        else:
            print("\n✗ 部分资源下载失败，请检查网络连接后重试")

if __name__ == "__main__":
    downloader = CDNDownloader()
    downloader.run() 