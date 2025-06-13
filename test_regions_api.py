#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
省市区 API 接口测试脚本
用于快速验证所有接口是否正常工作
"""

import requests
import json
import time
from urllib.parse import urljoin

class RegionsAPITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []
    
    def log_result(self, test_name, success, message, response_time=None):
        """记录测试结果"""
        status = "✅ PASS" if success else "❌ FAIL"
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status} {test_name}{time_info}")
        if not success:
            print(f"    Error: {message}")
        
        self.results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_time": response_time
        })
    
    def make_request(self, endpoint, params=None):
        """发送 HTTP 请求"""
        url = urljoin(self.base_url, endpoint)
        try:
            start_time = time.time()
            response = self.session.get(url, params=params, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                return True, response.json(), response_time
            else:
                return False, f"HTTP {response.status_code}: {response.text}", response_time
        except requests.exceptions.RequestException as e:
            return False, str(e), None
    
    def test_regions_tree(self):
        """测试获取省市区树形结构"""
        success, data, response_time = self.make_request("/api/regions/tree/")
        
        if success:
            if "provinces" in data and len(data["provinces"]) > 0:
                province = data["provinces"][0]
                if "cities" in province and len(province["cities"]) > 0:
                    city = province["cities"][0]
                    if "districts" in city:
                        self.log_result("获取省市区树形结构", True, f"成功获取 {len(data['provinces'])} 个省份", response_time)
                    else:
                        self.log_result("获取省市区树形结构", False, "城市缺少区县数据", response_time)
                else:
                    self.log_result("获取省市区树形结构", False, "省份缺少城市数据", response_time)
            else:
                self.log_result("获取省市区树形结构", False, "没有省份数据", response_time)
        else:
            self.log_result("获取省市区树形结构", False, data, response_time)
    
    def test_provinces_list(self):
        """测试获取省份列表"""
        success, data, response_time = self.make_request("/api/regions/provinces/")
        
        if success:
            if "provinces" in data and len(data["provinces"]) > 0:
                self.log_result("获取省份列表", True, f"成功获取 {len(data['provinces'])} 个省份", response_time)
            else:
                self.log_result("获取省份列表", False, "没有省份数据", response_time)
        else:
            self.log_result("获取省份列表", False, data, response_time)
    
    def test_cities_list(self):
        """测试获取城市列表"""
        # 测试获取所有城市
        success, data, response_time = self.make_request("/api/regions/cities/")
        
        if success:
            if "cities" in data and len(data["cities"]) > 0:
                self.log_result("获取城市列表（所有）", True, f"成功获取 {len(data['cities'])} 个城市", response_time)
            else:
                self.log_result("获取城市列表（所有）", False, "没有城市数据", response_time)
        else:
            self.log_result("获取城市列表（所有）", False, data, response_time)
        
        # 测试按省份筛选城市
        success, data, response_time = self.make_request("/api/regions/cities/", {"province_code": "110000"})
        
        if success:
            if "cities" in data:
                self.log_result("按省份获取城市（北京）", True, f"成功获取北京市 {len(data['cities'])} 个城市", response_time)
            else:
                self.log_result("按省份获取城市（北京）", False, "没有城市数据", response_time)
        else:
            self.log_result("按省份获取城市（北京）", False, data, response_time)
    
    def test_districts_list(self):
        """测试获取区县列表"""
        # 测试按城市筛选区县
        success, data, response_time = self.make_request("/api/regions/districts/", {"city_code": "110100"})
        
        if success:
            if "districts" in data and len(data["districts"]) > 0:
                self.log_result("按城市获取区县（北京市辖区）", True, f"成功获取 {len(data['districts'])} 个区县", response_time)
            else:
                self.log_result("按城市获取区县（北京市辖区）", False, "没有区县数据", response_time)
        else:
            self.log_result("按城市获取区县（北京市辖区）", False, data, response_time)
        
        # 测试按省份筛选区县
        success, data, response_time = self.make_request("/api/regions/districts/", {"province_code": "110000"})
        
        if success:
            if "districts" in data and len(data["districts"]) > 0:
                self.log_result("按省份获取区县（北京市）", True, f"成功获取北京市 {len(data['districts'])} 个区县", response_time)
            else:
                self.log_result("按省份获取区县（北京市）", False, "没有区县数据", response_time)
        else:
            self.log_result("按省份获取区县（北京市）", False, data, response_time)
    
    def test_region_detail(self):
        """测试获取地区详情"""
        # 测试省份详情
        success, data, response_time = self.make_request("/api/regions/province/110000/")
        
        if success:
            if "code" in data and data["code"] == "110000":
                self.log_result("获取省份详情（北京市）", True, f"成功获取 {data['name']}", response_time)
            else:
                self.log_result("获取省份详情（北京市）", False, "返回数据格式错误", response_time)
        else:
            self.log_result("获取省份详情（北京市）", False, data, response_time)
        
        # 测试城市详情
        success, data, response_time = self.make_request("/api/regions/city/110100/")
        
        if success:
            if "code" in data and data["code"] == "110100":
                self.log_result("获取城市详情（北京市辖区）", True, f"成功获取 {data['name']}", response_time)
            else:
                self.log_result("获取城市详情（北京市辖区）", False, "返回数据格式错误", response_time)
        else:
            self.log_result("获取城市详情（北京市辖区）", False, data, response_time)
        
        # 测试区县详情
        success, data, response_time = self.make_request("/api/regions/district/110101/")
        
        if success:
            if "code" in data and data["code"] == "110101":
                self.log_result("获取区县详情（东城区）", True, f"成功获取 {data['name']}", response_time)
            else:
                self.log_result("获取区县详情（东城区）", False, "返回数据格式错误", response_time)
        else:
            self.log_result("获取区县详情（东城区）", False, data, response_time)
    
    def test_region_search(self):
        """测试地区搜索"""
        # 测试搜索所有类型
        success, data, response_time = self.make_request("/api/regions/search/", {"keyword": "海"})
        
        if success:
            if "results" in data and len(data["results"]) > 0:
                self.log_result("搜索地区（关键词：海）", True, f"找到 {len(data['results'])} 个结果", response_time)
            else:
                self.log_result("搜索地区（关键词：海）", False, "没有搜索结果", response_time)
        else:
            self.log_result("搜索地区（关键词：海）", False, data, response_time)
        
        # 测试搜索城市
        success, data, response_time = self.make_request("/api/regions/search/", {"keyword": "北京", "type": "city"})
        
        if success:
            if "results" in data:
                self.log_result("搜索城市（关键词：北京）", True, f"找到 {len(data['results'])} 个城市", response_time)
            else:
                self.log_result("搜索城市（关键词：北京）", False, "没有搜索结果", response_time)
        else:
            self.log_result("搜索城市（关键词：北京）", False, data, response_time)
        
        # 测试搜索区县
        success, data, response_time = self.make_request("/api/regions/search/", {"keyword": "海淀", "type": "district"})
        
        if success:
            if "results" in data:
                self.log_result("搜索区县（关键词：海淀）", True, f"找到 {len(data['results'])} 个区县", response_time)
            else:
                self.log_result("搜索区县（关键词：海淀）", False, "没有搜索结果", response_time)
        else:
            self.log_result("搜索区县（关键词：海淀）", False, data, response_time)
    
    def test_error_handling(self):
        """测试错误处理"""
        # 测试不存在的省份
        success, data, response_time = self.make_request("/api/regions/province/999999/")
        
        if not success and "999999 不存在" in str(data):
            self.log_result("错误处理（不存在的省份）", True, "正确返回404错误", response_time)
        else:
            self.log_result("错误处理（不存在的省份）", False, "错误处理不正确", response_time)
        
        # 测试无效的地区类型
        success, data, response_time = self.make_request("/api/regions/invalid/110000/")
        
        if not success and "无效的地区类型" in str(data):
            self.log_result("错误处理（无效地区类型）", True, "正确返回400错误", response_time)
        else:
            self.log_result("错误处理（无效地区类型）", False, "错误处理不正确", response_time)
        
        # 测试缺少搜索关键词
        success, data, response_time = self.make_request("/api/regions/search/")
        
        if not success and "请提供搜索关键词" in str(data):
            self.log_result("错误处理（缺少搜索关键词）", True, "正确返回400错误", response_time)
        else:
            self.log_result("错误处理（缺少搜索关键词）", False, "错误处理不正确", response_time)
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始测试省市区 API 接口...")
        print(f"📍 测试服务器: {self.base_url}")
        print("-" * 60)
        
        # 运行各项测试
        self.test_regions_tree()
        self.test_provinces_list()
        self.test_cities_list()
        self.test_districts_list()
        self.test_region_detail()
        self.test_region_search()
        self.test_error_handling()
        
        # 统计结果
        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print("-" * 60)
        print(f"📊 测试结果统计:")
        print(f"   总测试数: {total_tests}")
        print(f"   通过: {passed_tests} ✅")
        print(f"   失败: {failed_tests} ❌")
        print(f"   成功率: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ 失败的测试:")
            for result in self.results:
                if not result["success"]:
                    print(f"   - {result['test']}: {result['message']}")
        
        # 计算平均响应时间
        response_times = [r["response_time"] for r in self.results if r["response_time"]]
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            print(f"\n⏱️  平均响应时间: {avg_time:.3f}s")
        
        return passed_tests == total_tests

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="省市区 API 接口测试工具")
    parser.add_argument("--url", default="http://localhost:8000", help="API 服务器地址")
    parser.add_argument("--json", action="store_true", help="输出 JSON 格式的测试结果")
    
    args = parser.parse_args()
    
    tester = RegionsAPITester(args.url)
    success = tester.run_all_tests()
    
    if args.json:
        print("\n" + "="*60)
        print("JSON 格式测试结果:")
        print(json.dumps(tester.results, ensure_ascii=False, indent=2))
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main()) 