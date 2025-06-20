from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import ChainPoint, ChainPointCompany, Province, City, District
from .serializers import (ChainPointSerializer, CompanyChainSerializer, EnterpriseListByChainPointSerializer,
                         ProvinceSerializer, CitySerializer, DistrictSerializer, RegionTreeSerializer,
                         RegionSimpleSerializer, CitySimpleSerializer, DistrictSimpleSerializer)
from django.core.paginator import Paginator

class ChainPointListAPIView(APIView):
    """获取所有产业链节点列表"""
    
    def get(self, request):
        """获取所有链点列表"""
        chain_points = ChainPoint.objects.all()
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
            chain_point = get_object_or_404(ChainPoint, id=chain_point_id)
            
            # 获取关联企业数据
            chain_point_companies = ChainPointCompany.objects.filter(
                chain_point_id=chain_point_id
            ).select_related('company')
            
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
                # 没有数据时返回空结果
                return Response({
                    'chain_point': ChainPointSerializer(chain_point).data,
                    'enterprises': [],
                    'total_count': 0,
                    'pagination': {
                        'current_page': 1,
                        'page_size': page_size,
                        'total_pages': 0,
                        'total_count': 0
                    },
                    'message': f'【{chain_point.name}】暂无企业数据'
                })
                
        except ChainPoint.DoesNotExist:
            return Response(
                {"detail": "链点不存在"}, 
                status=status.HTTP_404_NOT_FOUND
            )

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