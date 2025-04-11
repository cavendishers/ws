from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Count
from .models import CompanyInfo, CompanyRanking
from django.db.models import Q
import json

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

def login(request):
    """登录页面"""
    return render(request, 'data_hall/login.html')

def get_filter_data(request):
    """获取筛选选项数据"""
    # 获取所有不重复的行业
    industries = list(CompanyInfo.objects.exclude(industry='').values_list('industry', flat=True).distinct())
    # 获取所有不重复的省份
    provinces = list(CompanyInfo.objects.exclude(province='').values_list('province', flat=True).distinct())
    # 获取所有不重复的城市
    cities = list(CompanyInfo.objects.exclude(city='').values_list('city', flat=True).distinct())
    
    return JsonResponse({
        'industries': industries,
        'provinces': provinces,
        'cities': cities
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

def get_company_rankings(request):
    """获取企业排名数据"""
    # 获取筛选参数
    industry = request.GET.get('industry')
    limit = request.GET.get('limit', 20)  # 默认返回前20名
    
    try:
        limit = int(limit)
    except ValueError:
        limit = 20
    
    # 构建查询条件
    query = Q()
    if industry and industry != '':
        query &= Q(company__industry=industry)
    
    # 查询企业排名数据，按综合得分降序排序
    rankings = (
        CompanyRanking.objects.filter(query)
        .select_related('company')
        .order_by('-comprehensive_score')[:limit]
    )
    
    # 构建返回数据
    result = []
    for idx, ranking in enumerate(rankings, 1):
        result.append({
            'rank': idx,
            'name': ranking.company.company_name,
            'devPotential': float(ranking.dev_potential),
            'expansionSpeed': float(ranking.expansion_speed),
            'innovation': float(ranking.innovation),
            'capitalAttention': float(ranking.capital_attention),
            'teamBackground': float(ranking.team_background),
            'comprehensiveScore': float(ranking.comprehensive_score)
        })
    
    # 添加调试信息
    print(f"排名查询条件: industry={industry}, limit={limit}")
    print(f"排名结果数量: {len(result)}")
    
    return JsonResponse({
        'rankings': result
    })

def get_enterprise_list(request):
    """获取企业列表数据"""
    try:
        # 获取分页参数
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        
        # 获取筛选参数
        name = request.GET.get('name', '')
        industry = request.GET.get('industry', '')
        province = request.GET.get('province', '')
        city = request.GET.get('city', '')
        
        # 构建查询条件
        query = Q()
        if name:
            query &= Q(company_name__icontains=name)
        if industry:
            query &= Q(industry=industry)
        if province:
            query &= Q(province=province)
        if city:
            query &= Q(city=city)
        
        # 计算总数和总页数
        total_count = CompanyInfo.objects.filter(query).count()
        total_pages = (total_count + page_size - 1) // page_size
        
        # 获取当前页的数据
        start = (page - 1) * page_size
        end = start + page_size
        companies = CompanyInfo.objects.filter(query)[start:end]
        
        # 构建返回数据
        data = []
        for company in companies:
            data.append({
                'name': company.company_name or '',
                'province': company.province or '',
                'city': company.city or '',
                'industry': company.industry or '',
                'subTrack': company.std_industr_small_category or '',
                'regYear': company.company_birth[:4] if company.company_birth else '',
                'financing': '未知',  # 暂时不显示融资轮次
                'devPotential': 0,  # 暂时不显示评分
                'expansionSpeed': 0,
                'innovation': 0,
                'capitalAttention': 0,
                'teamBackground': 0
            })
        
        # 获取行业分布数据
        industry_stats = []
        if industry:  # 如果选择了具体行业，显示细分行业分布
            sub_industries = CompanyInfo.objects.filter(query).exclude(
                std_industr_small_category__isnull=True
            ).exclude(
                std_industr_small_category=''
            ).values('std_industr_small_category').annotate(
                count=Count('keyno')
            ).order_by('-count')
            
            for sub in sub_industries:
                industry_stats.append({
                    'name': sub['std_industr_small_category'],
                    'value': sub['count']
                })
        else:  # 如果未选择具体行业，显示所有行业分布
            industries = CompanyInfo.objects.filter(query).exclude(
                industry__isnull=True
            ).exclude(
                industry=''
            ).values('industry').annotate(
                count=Count('keyno')
            ).order_by('-count')
            
            for ind in industries:
                industry_stats.append({
                    'name': ind['industry'],
                    'value': ind['count']
                })
        
        return JsonResponse({
            'data': data,
            'total_count': total_count,
            'current_page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'industry_stats': industry_stats
        })
        
    except Exception as e:
        print(f"Error in get_enterprise_list: {str(e)}")  # 添加错误日志
        return JsonResponse({
            'error': str(e)
        }, status=500)

def get_precision_list(request):
    """获取精准招商企业匹配列表"""
    # 获取筛选参数，如地区、行业等
    industry = request.GET.get('industry', '')
    region = request.GET.get('region', '')
    
    # 构建查询条件
    query = Q()
    if industry and industry != '全部':
        query &= Q(industry=industry)
    if region and region != '全部':
        query &= Q(province=region) | Q(city=region) | Q(county=region)
    
    # 查询企业数据
    companies = CompanyInfo.objects.filter(query).values(
        'keyno', 'company_name', 'industry', 'std_industr_small_category',
        'company_birth', 'tag'
    )[:50]  # 限制返回数量
    
    # 构建返回数据
    result = []
    for company in companies:
        # 模拟匹配度评分（1-5分）
        # 实际项目中应根据企业数据和地区特点计算实际匹配度
        match_scores = {
            'marketFit': round(2 + 3 * (hash(company['keyno']) % 100) / 100, 2),
            'supplyChainFit': round(2 + 3 * (hash(company['keyno'] + '1') % 100) / 100, 2),
            'networkFit': round(2 + 3 * (hash(company['keyno'] + '2') % 100) / 100, 2),
            'resourceFit': round(2 + 3 * (hash(company['keyno'] + '3') % 100) / 100, 2),
        }
        
        # 模拟融资轮次
        financing_rounds = ['天使轮', 'Pre-A轮', 'A轮', 'B轮', 'C轮', 'D轮及以上']
        financing = financing_rounds[hash(company['keyno']) % len(financing_rounds)]
        
        result.append({
            'name': company['company_name'],
            'industry': company['industry'] or '',
            'subTrack': company['std_industr_small_category'] or '',
            'regYear': company['company_birth'][:4] if company['company_birth'] else '',
            'financing': financing,
            'marketFit': match_scores['marketFit'],
            'supplyChainFit': match_scores['supplyChainFit'],
            'networkFit': match_scores['networkFit'],
            'resourceFit': match_scores['resourceFit']
        })
    
    # 添加调试信息
    print(f"精准招商查询条件: industry={industry}, region={region}")
    print(f"精准招商结果数量: {len(result)}")
    
    return JsonResponse(result, safe=False)
