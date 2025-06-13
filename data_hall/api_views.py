from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import ChainPoint, ChainPointCompany, Province, City, District
from .serializers import (ChainPointSerializer, CompanyChainSerializer, EnterpriseListByChainPointSerializer,
                         ProvinceSerializer, CitySerializer, DistrictSerializer, RegionTreeSerializer,
                         RegionSimpleSerializer, CitySimpleSerializer, DistrictSimpleSerializer)
from django.core.paginator import Paginator
import random

class ChainPointListAPIView(APIView):
    """获取所有产业链节点列表，用于测试API接口"""
    
    def get(self, request):
        """获取所有链点列表"""
        chain_points = ChainPoint.objects.all()
        
        # 如果数据库中没有链点数据，返回mock数据
        if not chain_points.exists():
            mock_chain_points = [
                {"id": 1, "name": "原材料供应", "code": "IC0001001", "level": "1"},
                {"id": 2, "name": "零部件生产", "code": "IC0001002", "level": "1"},
                {"id": 3, "name": "整车组装", "code": "IC0001003", "level": "1"},
                {"id": 4, "name": "销售与服务", "code": "IC0001004", "level": "1"},
                {"id": 5, "name": "电池材料", "code": "IC0001005", "level": "2"},
                {"id": 6, "name": "电池组装", "code": "IC0001006", "level": "2"}
            ]
            return Response(mock_chain_points)
            
        serializer = ChainPointSerializer(chain_points, many=True)
        return Response(serializer.data)

class ChainPointEnterpriseListAPIView(APIView):
    """获取产业链节点关联的企业列表"""
    
    def get(self, request, chain_point_id):
        """
        根据链点ID获取关联企业列表
        
        参数:
        - chain_point_id: 链点ID
        - page: 页码，默认1
        - page_size: 每页数量，默认20
        """
        # 获取分页参数
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        # 获取链点信息
        try:
            chain_point = ChainPoint.objects.get(id=chain_point_id)
            chain_point_data = {
                "id": chain_point.id,
                "name": chain_point.name,
                "code": chain_point.code,
                "level": chain_point.level
            }
            
            # 检查是否有真实的企业数据
            chain_point_companies = ChainPointCompany.objects.filter(
                chain_point_id=chain_point_id
            ).select_related('company')
            
            # 如果有真实数据，直接返回
            if chain_point_companies.exists():
                # 处理真实数据
                paginator = Paginator(chain_point_companies, page_size)
                page_obj = paginator.get_page(page)
                
                # 准备响应数据
                data = {
                    'chain_point': chain_point,
                    'enterprises': page_obj.object_list,
                    'total_count': paginator.count
                }
                
                # 序列化数据
                serializer = EnterpriseListByChainPointSerializer(data)
                
                # 添加分页信息
                response_data = serializer.data
                response_data['pagination'] = {
                    'current_page': page,
                    'page_size': page_size,
                    'total_pages': paginator.num_pages,
                    'total_count': paginator.count
                }
                
                return Response(response_data)
            else:
                # 没有真实数据，检查是否为特殊的链点ID (1-6)
                if chain_point_id in [1, 2, 3, 4, 5, 6]:
                    # 对于链点1-6，使用mock数据
                    mock_companies = self.generate_mock_companies(chain_point_data, page, page_size)
                    return Response(mock_companies)
                else:
                    # 其他链点返回Coming Soon状态
                    return Response({
                        'chain_point': chain_point_data,
                        'enterprises': [],
                        'total_count': 0,
                        'pagination': {
                            'current_page': 1,
                            'page_size': page_size,
                            'total_pages': 0,
                            'total_count': 0
                        },
                        'status': 'coming_soon',
                        'message': f'【{chain_point.name}】的企业数据正在整理中，敬请期待...'
                    })
                
        except ChainPoint.DoesNotExist:
            # 链点不存在，使用mock数据进行测试（仅针对1-6）
            mock_chain_points = {
                1: {"id": 1, "name": "原材料供应", "code": "IC0001001", "level": "1"},
                2: {"id": 2, "name": "零部件生产", "code": "IC0001002", "level": "1"},
                3: {"id": 3, "name": "整车组装", "code": "IC0001003", "level": "1"},
                4: {"id": 4, "name": "销售与服务", "code": "IC0001004", "level": "1"},
                5: {"id": 5, "name": "电池材料", "code": "IC0001005", "level": "2"},
                6: {"id": 6, "name": "电池组装", "code": "IC0001006", "level": "2"}
            }
            
            if chain_point_id not in mock_chain_points:
                return Response(
                    {"detail": "链点不存在"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            chain_point_data = mock_chain_points[chain_point_id]
            
            # 生成mock企业数据
            mock_companies = self.generate_mock_companies(chain_point_data, page, page_size)
            return Response(mock_companies)
    
    def generate_mock_companies(self, chain_point_data, page, page_size):
        """生成mock企业数据"""
        # 行业列表
        industries = ["新能源汽车", "智能制造", "新材料", "生物医药", "人工智能"]
        
        # 子行业列表
        sub_industries = {
            "新能源汽车": ["电动汽车", "混合动力汽车", "氢能源汽车", "电池技术", "充电设备"],
            "智能制造": ["工业机器人", "智能装备", "自动化系统", "工业互联网", "3D打印"],
            "新材料": ["高性能材料", "功能材料", "复合材料", "纳米材料", "生物材料"],
            "生物医药": ["生物制药", "医疗器械", "基因技术", "细胞治疗", "创新药物"],
            "人工智能": ["机器学习", "计算机视觉", "自然语言处理", "智能芯片", "机器人技术"]
        }
        
        # 产业关联度
        relevance_levels = ["高", "中", "低"]
        
        # 总企业数量
        total_count = 35
        
        # 根据链点特点选择主要行业
        if "材料" in chain_point_data["name"]:
            main_industry = "新材料"
        elif "组装" in chain_point_data["name"]:
            main_industry = "智能制造"
        elif "零部件" in chain_point_data["name"]:
            main_industry = "新能源汽车"
        else:
            main_industry = random.choice(industries)
        
        # 生成企业列表
        all_enterprises = []
        for i in range(1, total_count + 1):
            # 为80%的企业分配主行业，20%随机分配
            if random.random() < 0.8:
                industry = main_industry
            else:
                industry = random.choice(industries)
                
            # 选择子行业
            industry_sub = random.choice(sub_industries[industry])
            
            # 确定关联度 - 靠前的企业关联度更高
            if i <= 10:
                relevance = "高"
            elif i <= 25:
                relevance = "中"
            else:
                relevance = "低"
                
            enterprise = {
                "company_id": f"CP{i:03d}",
                "company_name": f"{industry}{random.choice(['科技', '智能', '创新', '未来', '先进'])}公司{i:03d}",
                "chain_point_name": chain_point_data["name"],
                "chain_point_level": chain_point_data["level"],
                "industry": industry,
                "industry_sub": industry_sub,
                "industry_relevance": relevance
            }
            all_enterprises.append(enterprise)
        
        # 计算分页
        start_idx = (page - 1) * page_size
        end_idx = min(start_idx + page_size, total_count)
        
        # 分页后的企业
        paged_enterprises = all_enterprises[start_idx:end_idx]
        
        # 构建响应数据
        return {
            "chain_point": chain_point_data,
            "enterprises": paged_enterprises,
            "total_count": total_count,
            "pagination": {
                "current_page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size,
                "total_count": total_count
            }
        }

class ChainPointDetailAPIView(APIView):
    """获取产业链节点详情"""
    
    def get(self, request, chain_point_id):
        """根据链点ID获取节点详情"""
        try:
            chain_point = ChainPoint.objects.get(id=chain_point_id)
            serializer = ChainPointSerializer(chain_point)
            return Response(serializer.data)
        except ChainPoint.DoesNotExist:
            # 使用mock链点数据
            mock_chain_points = {
                1: {"id": 1, "name": "原材料供应", "code": "IC0001001", "level": "1"},
                2: {"id": 2, "name": "零部件生产", "code": "IC0001002", "level": "1"},
                3: {"id": 3, "name": "整车组装", "code": "IC0001003", "level": "1"},
                4: {"id": 4, "name": "销售与服务", "code": "IC0001004", "level": "1"},
                5: {"id": 5, "name": "电池材料", "code": "IC0001005", "level": "2"},
                6: {"id": 6, "name": "电池组装", "code": "IC0001006", "level": "2"}
            }
            
            if chain_point_id not in mock_chain_points:
                return Response(
                    {"detail": "链点不存在"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            return Response(mock_chain_points[chain_point_id])

# 省市区相关 API 视图
class RegionTreeAPIView(APIView):
    """获取完整的省市区树形结构"""
    
    def get(self, request):
        """
        获取完整的省市区三级联动数据
        返回格式: {provinces: [{code, name, cities: [{code, name, districts: [...]}]}]}
        """
        provinces = Province.objects.prefetch_related('cities__districts').all()
        serializer = ProvinceSerializer(provinces, many=True)
        return Response({
            'provinces': serializer.data
        })

class ProvinceListAPIView(APIView):
    """获取省份列表"""
    
    def get(self, request):
        """获取所有省份列表（不包含子级数据）"""
        provinces = Province.objects.all()
        serializer = RegionSimpleSerializer(provinces, many=True)
        return Response({
            'provinces': serializer.data
        })

class CityListAPIView(APIView):
    """获取城市列表"""
    
    def get(self, request):
        """
        获取城市列表
        支持根据省份代码筛选: ?province_code=110000
        """
        province_code = request.query_params.get('province_code')
        
        if province_code:
            cities = City.objects.filter(province__code=province_code).select_related('province')
        else:
            cities = City.objects.select_related('province')
            
        serializer = CitySimpleSerializer(cities, many=True)
        return Response({
            'cities': serializer.data
        })

class DistrictListAPIView(APIView):
    """获取区县列表"""
    
    def get(self, request):
        """
        获取区县列表
        支持根据城市代码筛选: ?city_code=110100
        支持根据省份代码筛选: ?province_code=110000
        """
        city_code = request.query_params.get('city_code')
        province_code = request.query_params.get('province_code')
        
        districts = District.objects.select_related('city__province')
        
        if city_code:
            districts = districts.filter(city__code=city_code)
        elif province_code:
            districts = districts.filter(city__province__code=province_code)
            
        serializer = DistrictSimpleSerializer(districts, many=True)
        return Response({
            'districts': serializer.data
        })

class RegionDetailAPIView(APIView):
    """获取地区详情"""
    
    def get(self, request, region_type, region_code):
        """
        获取地区详情
        region_type: province/city/district
        region_code: 地区代码
        """
        try:
            if region_type == 'province':
                region = Province.objects.prefetch_related('cities__districts').get(code=region_code)
                serializer = ProvinceSerializer(region)
            elif region_type == 'city':
                region = City.objects.prefetch_related('districts').select_related('province').get(code=region_code)
                serializer = CitySerializer(region)
            elif region_type == 'district':
                region = District.objects.select_related('city__province').get(code=region_code)
                serializer = DistrictSerializer(region)
            else:
                return Response(
                    {"detail": "无效的地区类型，支持: province/city/district"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            return Response(serializer.data)
            
        except (Province.DoesNotExist, City.DoesNotExist, District.DoesNotExist):
            return Response(
                {"detail": f"{region_type} 代码 {region_code} 不存在"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class RegionSearchAPIView(APIView):
    """地区搜索接口"""
    
    def get(self, request):
        """
        根据关键词搜索地区
        支持参数:
        - keyword: 搜索关键词（必需）
        - type: 搜索类型 province/city/district/all（默认 all）
        - limit: 返回数量限制（默认 20）
        """
        keyword = request.query_params.get('keyword', '').strip()
        search_type = request.query_params.get('type', 'all')
        limit = int(request.query_params.get('limit', 20))
        
        if not keyword:
            return Response(
                {"detail": "请提供搜索关键词"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        results = []
        
        # 搜索省份
        if search_type in ['province', 'all']:
            provinces = Province.objects.filter(name__icontains=keyword)[:limit]
            for province in provinces:
                results.append({
                    'type': 'province',
                    'code': province.code,
                    'name': province.name,
                    'full_name': province.name
                })
        
        # 搜索城市
        if search_type in ['city', 'all']:
            cities = City.objects.filter(name__icontains=keyword).select_related('province')[:limit]
            for city in cities:
                results.append({
                    'type': 'city',
                    'code': city.code,
                    'name': city.name,
                    'full_name': f"{city.province.name} {city.name}",
                    'province_code': city.province.code,
                    'province_name': city.province.name
                })
        
        # 搜索区县
        if search_type in ['district', 'all']:
            districts = District.objects.filter(name__icontains=keyword).select_related('city__province')[:limit]
            for district in districts:
                results.append({
                    'type': 'district',
                    'code': district.code,
                    'name': district.name,
                    'full_name': f"{district.city.province.name} {district.city.name} {district.name}",
                    'city_code': district.city.code,
                    'city_name': district.city.name,
                    'province_code': district.city.province.code,
                    'province_name': district.city.province.name
                })
        
        # 限制结果数量
        results = results[:limit]
        
        return Response({
            'keyword': keyword,
            'type': search_type,
            'count': len(results),
            'results': results
        }) 