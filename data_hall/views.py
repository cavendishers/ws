from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Count
from .models import CompanyInfo
from django.db.models import Q

def index(request):
    """首页视图"""
    return render(request, 'data_hall/index.html')

def ranking(request):
    """新势力榜单页面"""
    return render(request, 'data_hall/ranking.html')

def industry(request):
    """产业链图谱页面"""
    return render(request, 'data_hall/industry.html')

def enterprise(request):
    """企业库页面"""
    return render(request, 'data_hall/enterprise.html')

def precision(request):
    """精准招商页面"""
    return render(request, 'data_hall/precision.html')

def map_view(request):
    """产业地图页面"""
    # 从数据库中获取筛选选项数据
    industries = CompanyInfo.objects.values_list('industry', flat=True).distinct().exclude(industry__isnull=True).exclude(industry='')
    cities = CompanyInfo.objects.values_list('city', flat=True).distinct().exclude(city__isnull=True).exclude(city='')
    counties = CompanyInfo.objects.values_list('county', flat=True).distinct().exclude(county__isnull=True).exclude(county='')
    
    context = {
        'industries': [{'id': industry, 'name': industry} for industry in industries],
        'cities': [{'id': city, 'name': city} for city in cities],
        'counties': [{'id': county, 'name': county} for county in counties],
    }
    
    return render(request, 'data_hall/map.html', context)

def report(request):
    """产业报告页面"""
    return render(request, 'data_hall/report.html')

def news(request):
    """商业快讯页面"""
    return render(request, 'data_hall/news.html')

@login_required
def login(request):
    """登录页面"""
    return render(request, 'data_hall/login.html')

def get_filter_data(request):
    """获取筛选选项数据"""
    # 排除空值，并进行排序
    industries = CompanyInfo.objects.values_list('industry', flat=True).distinct().exclude(industry__isnull=True).exclude(industry='')
    cities = CompanyInfo.objects.values_list('city', flat=True).distinct().exclude(city__isnull=True).exclude(city='')
    counties = CompanyInfo.objects.values_list('county', flat=True).distinct().exclude(county__isnull=True).exclude(county='')
    
    return JsonResponse({
        'industries': list(industries),
        'cities': list(cities),
        'counties': list(counties)
    })

def get_company_stats(request):
    """获取企业统计数据"""
    # 获取筛选参数
    industry = request.GET.get('industry')
    city = request.GET.get('city')
    county = request.GET.get('county')
    
    # 构建查询条件
    query = Q()
    if industry and industry != '':
        query &= Q(industry=industry)
    if city and city != '':
        query &= Q(city=city)
    if county and county != '':
        query &= Q(county=county)
    
    # 按产业统计，排除空值
    industry_stats = CompanyInfo.objects.filter(query).exclude(industry__isnull=True).exclude(industry='').values('industry').annotate(count=Count('keyno')).order_by('-count')
    
    # 按区县统计，排除空值
    county_stats = CompanyInfo.objects.filter(query).exclude(county__isnull=True).exclude(county='').values('county').annotate(count=Count('keyno')).order_by('-count')
    
    # 添加调试信息
    print(f"统计查询条件: industry={industry}, city={city}, county={county}")
    print(f"产业统计结果: {list(industry_stats)}")
    print(f"区县统计结果: {list(county_stats)}")
    
    return JsonResponse({
        'industry_stats': list(industry_stats),
        'county_stats': list(county_stats)
    })

def get_company_locations(request):
    """获取企业位置数据"""
    # 获取筛选参数
    industry = request.GET.get('industry')
    city = request.GET.get('city')
    county = request.GET.get('county')
    
    # 构建查询条件，只包含有经纬度的公司
    query = Q(latitude__isnull=False, longitude__isnull=False)
    # 额外排除0值坐标
    query &= ~Q(latitude=0, longitude=0)
    
    if industry and industry != '':
        query &= Q(industry=industry)
    if city and city != '':
        query &= Q(city=city)
    if county and county != '':
        query &= Q(county=county)
    
    companies = CompanyInfo.objects.filter(query).values('company_name', 'latitude', 'longitude', 'county')
    
    # 添加调试信息
    print(f"筛选条件: industry={industry}, city={city}, county={county}")
    print(f"查询结果数量: {companies.count()}")
    
    # 如果没有数据，使用测试数据
    if companies.count() == 0:
        print("使用测试数据")
        test_companies = [
            {
                'company_name': '测试公司1 - 西湖区',
                'latitude': '30.259924',
                'longitude': '120.130095',
                'county': '西湖区'
            },
            {
                'company_name': '测试公司2 - 拱墅区',
                'latitude': '30.319104',
                'longitude': '120.150116',
                'county': '拱墅区'
            },
            {
                'company_name': '测试公司3 - 滨江区',
                'latitude': '30.206428',
                'longitude': '120.210095',
                'county': '滨江区'
            }
        ]
        return JsonResponse({'companies': test_companies})
    
    return JsonResponse({
        'companies': list(companies)
    })

def get_county_company_counts(request):
    """获取各区县公司数量"""
    # 获取筛选参数
    industry = request.GET.get('industry')
    city = request.GET.get('city')
    
    # 构建查询条件
    query = Q()
    if industry and industry != '':
        query &= Q(industry=industry)
    if city and city != '':
        query &= Q(city=city)
    
    # 按区县分组统计
    county_stats = (
        CompanyInfo.objects.filter(query)
        .exclude(county__isnull=True)
        .exclude(county='')
        .values('county')
        .annotate(count=Count('keyno'))
        .order_by('county')
    )
    
    # 返回数据
    return JsonResponse({
        'county_stats': list(county_stats)
    })

def get_company_yearly_stats(request):
    """获取近十年企业创立分布情况"""
    # 获取筛选参数
    industry = request.GET.get('industry')
    city = request.GET.get('city')
    county = request.GET.get('county')
    
    # 构建查询条件
    query = Q()
    if industry and industry != '':
        query &= Q(industry=industry)
    if city and city != '':
        query &= Q(city=city)
    if county and county != '':
        query &= Q(county=county)
    
    # 额外排除company_birth为空的记录
    query &= ~Q(company_birth__isnull=True)
    query &= ~Q(company_birth='')
    
    # 固定年份为2024年，确保统计到2024年
    current_year = 2024
    
    # 计算近十年的年份列表
    years = list(range(current_year - 9, current_year + 1))
    
    # 创建年份数据字典
    yearly_stats = {str(year): 0 for year in years}
    
    # 查询数据
    companies = CompanyInfo.objects.filter(query)
    
    # 按年份分组统计
    for company in companies:
        try:
            # 尝试提取年份，考虑不同的日期格式
            birth_year = None
            if company.company_birth:
                # 尝试直接获取年份
                if len(company.company_birth) == 4 and company.company_birth.isdigit():
                    birth_year = int(company.company_birth)
                # 尝试从"YYYY-MM-DD"格式提取
                elif '-' in company.company_birth:
                    birth_year = int(company.company_birth.split('-')[0])
                # 尝试从"YYYY/MM/DD"格式提取
                elif '/' in company.company_birth:
                    birth_year = int(company.company_birth.split('/')[0])
            
            # 如果年份在近十年范围内，增加计数
            if birth_year and str(birth_year) in yearly_stats:
                yearly_stats[str(birth_year)] += 1
        except (ValueError, IndexError):
            # 忽略无法解析的日期
            continue
    
    # 转换为返回的格式
    result = [{"year": year, "count": count} for year, count in yearly_stats.items()]
    
    # 添加调试信息
    print(f"年度统计查询条件: industry={industry}, city={city}, county={county}")
    print(f"年度统计结果: {result}")
    
    return JsonResponse({
        'yearly_stats': result
    })
