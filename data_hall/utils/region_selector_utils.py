#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
from django.conf import settings
from django.utils.safestring import mark_safe

class RegionSelectorHelper:
    """地区选择器辅助类，用于生成预渲染的地区HTML"""
    
    def __init__(self):
        self.regions_data = None
        self.load_regions_data()
    
    def load_regions_data(self):
        """加载地区数据"""
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
                self.regions_data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"加载地区数据失败: {e}")
            self.regions_data = {"86": {}}
    
    def generate_region_dom_cache(self):
        """生成完整的地区DOM缓存HTML"""
        if not self.regions_data:
            return mark_safe('<template id="region-dom-cache" style="display:none;"></template>')
        
        html_lines = []
        html_lines.append('<template id="region-dom-cache" style="display:none;">')
        
        # 首先处理省份（父级为"86"的地区）
        if "86" in self.regions_data:
            provinces = self.regions_data["86"]
            for province_code, province_name in provinces.items():
                html_lines.append(self._generate_region_item(
                    province_code, province_name, 'province'
                ))
        
        # 然后处理城市和区县
        for parent_code, regions in self.regions_data.items():
            if parent_code == "86":
                continue  # 跳过省份，已经处理过了
            
            # 判断这是城市还是区县
            region_type = self._determine_region_type(parent_code)
            
            for region_code, region_name in regions.items():
                html_lines.append(self._generate_region_item(
                    region_code, region_name, region_type, parent_code
                ))
        
        html_lines.append('</template>')
        
        return mark_safe('\n'.join(html_lines))
    
    def _generate_region_item(self, code, name, region_type, parent_code=None):
        """生成单个地区项的HTML"""
        parent_attr = f' data-parent="{parent_code}"' if parent_code else ''
        
        return f'''    <div class="region-item" data-code="{code}" data-name="{name}" data-type="{region_type}"{parent_attr}>
        <input type="checkbox" class="region-checkbox">
        <span class="region-name">{name}</span>
        <span class="region-count"></span>
    </div>'''
    
    def _determine_region_type(self, parent_code):
        """根据父级代码判断地区类型"""
        # 如果父级是省份代码（在"86"中），则当前级别是城市
        if "86" in self.regions_data and parent_code in self.regions_data["86"]:
            return 'city'
        else:
            return 'district'
    
    def get_regions_for_codes(self, region_codes):
        """根据地区代码获取地区信息"""
        regions_info = []
        
        if not self.regions_data:
            return regions_info
        
        for code in region_codes:
            region_info = self._find_region_info(code)
            if region_info:
                regions_info.append(region_info)
        
        return regions_info
    
    def _find_region_info(self, code):
        """查找单个地区的详细信息"""
        for parent_code, regions in self.regions_data.items():
            if code in regions:
                region_type = 'province' if parent_code == '86' else self._determine_region_type(parent_code)
                return {
                    'code': code,
                    'name': regions[code],
                    'type': region_type,
                    'parent': parent_code if parent_code != '86' else None
                }
        return None

# 创建全局实例
region_selector_helper = RegionSelectorHelper() 