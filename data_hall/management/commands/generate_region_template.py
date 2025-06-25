#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = '从regions-data.json生成完整的地区DOM模板代码'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='region_template.html',
            help='输出文件名 (默认: region_template.html)'
        )

    def handle(self, *args, **options):
        # 读取地区数据JSON文件
        json_file_path = os.path.join(
            settings.BASE_DIR, 
            'data_hall', 
            'static', 
            'data_hall', 
            'js', 
            'regions-data.json'
        )
        
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                regions_data = json.load(f)
        except FileNotFoundError:
            self.stdout.write(
                self.style.ERROR(f'找不到地区数据文件: {json_file_path}')
            )
            return
        except json.JSONDecodeError as e:
            self.stdout.write(
                self.style.ERROR(f'地区数据JSON格式错误: {e}')
            )
            return

        # 生成HTML模板
        html_content = self.generate_region_template(regions_data)
        
        # 输出到文件
        output_file = options['output']
        output_path = os.path.join(settings.BASE_DIR, output_file)
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            self.stdout.write(
                self.style.SUCCESS(f'成功生成地区模板文件: {output_path}')
            )
            self.stdout.write(
                self.style.WARNING('请将生成的内容复制到对应的模板文件中的 #region-dom-cache 元素内')
            )
            
        except IOError as e:
            self.stdout.write(
                self.style.ERROR(f'写入文件失败: {e}')
            )

    def generate_region_template(self, regions_data):
        """生成完整的地区DOM模板"""
        
        html_lines = []
        html_lines.append('<!-- 地区数据DOM缓存 - 由后端预渲染 -->')
        html_lines.append('<template id="region-dom-cache" style="display:none;">')
        
        # 首先处理省份（父级为"86"的地区）
        if "86" in regions_data:
            html_lines.append('    <!-- 省份/直辖市 -->')
            provinces = regions_data["86"]
            
            for province_code, province_name in provinces.items():
                html_lines.append(self.generate_region_item(
                    province_code, province_name, 'province'
                ))
        
        # 然后处理城市和区县
        for parent_code, regions in regions_data.items():
            if parent_code == "86":
                continue  # 跳过省份，已经处理过了
            
            # 判断这是城市还是区县
            region_type = self.determine_region_type(parent_code, regions_data)
            
            if region_type == 'city':
                html_lines.append(f'    <!-- 城市 - {self.get_parent_name(parent_code, regions_data)}下的城市 -->')
            elif region_type == 'district':
                html_lines.append(f'    <!-- 区县 - {self.get_parent_name(parent_code, regions_data)}下的区县 -->')
            
            for region_code, region_name in regions.items():
                html_lines.append(self.generate_region_item(
                    region_code, region_name, region_type, parent_code
                ))
        
        html_lines.append('</template>')
        
        return '\n'.join(html_lines)

    def generate_region_item(self, code, name, region_type, parent_code=None):
        """生成单个地区项的HTML"""
        parent_attr = f' data-parent="{parent_code}"' if parent_code else ''
        
        return f'''    <div class="region-item" data-code="{code}" data-name="{name}" data-type="{region_type}"{parent_attr}>
        <input type="checkbox" class="region-checkbox">
        <span class="region-name">{name}</span>
        <span class="region-count"></span>
    </div>'''

    def determine_region_type(self, parent_code, regions_data):
        """根据父级代码判断地区类型"""
        # 如果父级是省份代码（在"86"中），则当前级别是城市
        if "86" in regions_data and parent_code in regions_data["86"]:
            return 'city'
        else:
            return 'district'

    def get_parent_name(self, parent_code, regions_data):
        """获取父级地区名称"""
        # 在所有地区中查找父级名称
        for regions in regions_data.values():
            if parent_code in regions:
                return regions[parent_code]
        return '未知地区' 