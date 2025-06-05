from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Count
from .models import CompanyInfo, CompanyRanking, CompanyFinancing, User, IndustryChain
from django.db.models import Q
import json
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from openai import OpenAI

def index(request):
    """首页视图"""
    return render(request, 'data_hall/index.html')

def ranking(request):
    """新势力榜单页面"""
    return render(request, 'data_hall/ranking.html')

def industry(request):
    """产业链页面"""
    # 从数据库获取所有产业链
    industries = IndustryChain.objects.all()
    
    context = {
        'industries': industries,
    }
    return render(request, 'data_hall/industry.html', context)

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
    # 如果用户已经登录，直接跳转到首页
    if request.session.get('user_id'):
        return redirect('data_hall:index')
    
    # 处理POST请求（用户登录表单提交）
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        remember = request.POST.get('remember-me') == 'on'
        
        try:
            user = User.objects.get(username=username)
            if user.password == password:  # 实际项目中应该使用加密密码
                # 登录成功，将用户信息存入会话
                request.session['user_id'] = user.id
                request.session['username'] = user.username
                
                # 如果选择"记住我"，设置会话过期时间为2周
                if remember:
                    request.session.set_expiry(60 * 60 * 24 * 14)  # 2周
                else:
                    request.session.set_expiry(0)  # 浏览器关闭即失效
                
                # 重定向到首页
                return redirect('data_hall:index')
            else:
                # 密码错误
                return render(request, 'data_hall/login.html', {'error': '密码错误'})
        except User.DoesNotExist:
            # 用户不存在
            return render(request, 'data_hall/login.html', {'error': '用户不存在'})
    
    # GET请求，展示登录页面
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
    industry = request.GET.get('industry', '')
    page = request.GET.get('page', 1)  # 页码，默认第1页
    page_size = request.GET.get('page_size', 20)  # 每页数量，默认20条
    
    try:
        page = int(page)
        page_size = int(page_size)
    except ValueError:
        page = 1
        page_size = 20
    
    # 构建查询条件
    query = Q()
    if industry and industry != '':
        query &= Q(company__industry=industry)
    
    # 查询企业排名数据总数，用于计算总页数
    total_count = CompanyRanking.objects.filter(query).count()
    total_pages = (total_count + page_size - 1) // page_size
    
    # 计算分页偏移量
    start = (page - 1) * page_size
    end = start + page_size
    
    # 查询当前页的数据，按综合得分降序排序
    rankings = (
        CompanyRanking.objects.filter(query)
        .select_related('company')
        .order_by('-comprehensive_score')[start:end]
    )
    
    # 构建返回数据
    result = []
    for idx, ranking in enumerate(rankings, start + 1):  # 排名从1开始，需要加上偏移量
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
    print(f"排名查询条件: industry={industry}, page={page}, page_size={page_size}")
    print(f"排名结果数量: {len(result)}, 总记录数: {total_count}, 总页数: {total_pages}")
    
    return JsonResponse({
        'rankings': result,
        'total_count': total_count,
        'current_page': page,
        'page_size': page_size,
        'total_pages': total_pages
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
        financing = request.GET.get('financing', '')  # 新增融资轮次筛选
        
        # 构建基本查询条件
        query = Q()
        if name:
            query &= Q(company_name__icontains=name)
        if industry:
            query &= Q(industry=industry)
        if province:
            query &= Q(province=province)
        if city:
            query &= Q(city=city)
            
        # 如果有融资轮次筛选，筛选对应的企业keyno
        if financing:
            # 获取符合融资轮次条件的企业ID列表
            financing_companies = CompanyFinancing.objects.filter(
                financing_round__icontains=financing
            ).values_list('company_id', flat=True).distinct()
            
            # 将融资轮次条件添加到查询中
            query &= Q(keyno__in=financing_companies)
        
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
            # 尝试获取企业的排名评分数据
            ranking_data = {
                'devPotential': 0,
                'expansionSpeed': 0,
                'innovation': 0,
                'capitalAttention': 0,
                'teamBackground': 0,
                'comprehensiveScore': 0
            }
            
            try:
                # 检查企业是否有关联的排名数据
                if hasattr(company, 'ranking'):
                    ranking = company.ranking
                    ranking_data = {
                        'devPotential': float(ranking.dev_potential),
                        'expansionSpeed': float(ranking.expansion_speed),
                        'innovation': float(ranking.innovation),
                        'capitalAttention': float(ranking.capital_attention),
                        'teamBackground': float(ranking.team_background),
                        'comprehensiveScore': float(ranking.comprehensive_score)
                    }
            except Exception as e:
                print(f"获取企业排名数据出错: {str(e)}")
            
            # 尝试获取企业最新的融资轮次信息
            financing_round = '未知'
            try:
                # 按融资日期降序排序，获取最新一条融资记录
                latest_financing = CompanyFinancing.objects.filter(
                    company=company
                ).order_by('-financing_date').first()
                
                if latest_financing and latest_financing.financing_round:
                    financing_round = latest_financing.financing_round
            except Exception as e:
                print(f"获取企业融资数据出错: {str(e)}")
            
            company_data = {
                'name': company.company_name or '',
                'province': company.province or '',
                'city': company.city or '',
                'industry': company.industry or '',
                'subTrack': company.std_industr_small_category or '',
                'regYear': company.company_birth[:4] if company.company_birth else '',
                'financing': financing_round,  # 更新为从数据库获取的融资轮次
                'devPotential': ranking_data['devPotential'],
                'expansionSpeed': ranking_data['expansionSpeed'],
                'innovation': ranking_data['innovation'],
                'capitalAttention': ranking_data['capitalAttention'],
                'teamBackground': ranking_data['teamBackground'],
                'comprehensiveScore': ranking_data['comprehensiveScore']
            }
            
            data.append(company_data)
        
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
        
        # 获取融资轮次分布数据
        company_ids = CompanyInfo.objects.filter(query).values_list('keyno', flat=True)
        financing_stats = []
        
        # 查询这些企业的融资轮次数据
        financing_rounds = CompanyFinancing.objects.filter(
            company_id__in=company_ids
        ).values('financing_round').annotate(
            count=Count('id')
        ).order_by('-count')
        
        for round_data in financing_rounds:
            if round_data['financing_round']:
                financing_stats.append({
                    'name': round_data['financing_round'],
                    'value': round_data['count']
                })
        
        # 如果没有足够的融资数据，添加默认数据避免图表空白
        if len(financing_stats) < 3:
            default_rounds = ['天使轮', 'A轮', 'B轮', 'C轮及以上', 'IPO']
            for i, round_name in enumerate(default_rounds):
                if not any(item['name'] == round_name for item in financing_stats):
                    financing_stats.append({
                        'name': round_name,
                        'value': 0
                    })
        
        return JsonResponse({
            'data': data,
            'total_count': total_count,
            'current_page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'industry_stats': industry_stats,
            'financing_stats': financing_stats  # 添加融资轮次分布数据
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

@csrf_exempt
@require_POST
def ai_chat(request):
    """处理AI聊天请求，使用openai库与AI API交互"""
    try:
        # 解析请求数据
        data = json.loads(request.body)
        messages = data.get('messages', '')

        # 初始化OpenAI客户端
        client = OpenAI(
            base_url="https://ark.cn-beijing.volces.com/api/v3/bots",
            api_key="e85ba65e-9b03-4e28-bd4a-08e6cc5fd74a"
        )

        completion = client.chat.completions.create(
            model="bot-20250421104824-ttj7h",
            messages=[{"role": "user", "content": messages}],
        )

        response_data = completion.choices[0].message.content
        print(response_data)
        return JsonResponse({"response": response_data}, safe=False)
        
    except json.JSONDecodeError as e:
        return JsonResponse({
            'error': True,
            'message': f'JSON解析错误: {str(e)}'
        }, status=400)
        
    except Exception as e:
        return JsonResponse({
            'error': True,
            'message': f'API调用异常: {str(e)}'
        }, status=500)

def get_top_companies(request):
    """获取新势力企业名单 - 根据综合得分排序"""
    print("====== 开始处理新势力企业名单请求 ======")
    print(f"请求方法: {request.method}")
    print(f"请求参数: {request.GET}")
    
    try:
        # 获取筛选参数
        industry = request.GET.get('industry', '')
        city = request.GET.get('city', '')
        county = request.GET.get('county', '')
        limit = int(request.GET.get('limit', 10))  # 默认获取前10条
        
        print(f"获取新势力企业名单参数: industry={industry}, city={city}, county={county}, limit={limit}")
        
        # 定义测试数据
        test_data = [
            {'rank': 1, 'name': '深度科技公司', 'city': '杭州市', 'county': '西湖区', 'score': 92.5},
            {'rank': 2, 'name': '云智大数据科技', 'city': '杭州市', 'county': '滨江区', 'score': 90.8},
            {'rank': 3, 'name': '智联网络科技', 'city': '杭州市', 'county': '下城区', 'score': 89.3},
            {'rank': 4, 'name': '未来芯片技术', 'city': '杭州市', 'county': '余杭区', 'score': 87.6},
            {'rank': 5, 'name': '星辰人工智能', 'city': '杭州市', 'county': '钱塘区', 'score': 86.2}
        ]
        
        # 首先检查是否有排名数据
        ranking_count = CompanyRanking.objects.count()
        print(f"数据库中排名数据数量: {ranking_count}")
        
        if ranking_count == 0:
            print("数据库中没有排名数据，返回测试数据")
            print(f"测试数据: {test_data}")
            response = JsonResponse({'companies': test_data})
            print(f"返回状态码: {response.status_code}")
            print("====== 结束处理新势力企业名单请求 ======")
            return response
        
        # 构建公司查询条件
        company_query = Q()
        if industry and industry != '':
            company_query &= Q(industry=industry)
        if city and city != '':
            company_query &= Q(city=city)
        if county and county != '':
            company_query &= Q(county=county)
        
        # 获取符合条件的公司的keyno列表
        company_keys = CompanyInfo.objects.filter(company_query).values_list('keyno', flat=True)
        print(f"符合条件的公司数量: {len(company_keys)}")
        if len(company_keys) == 0:
            print("未找到符合条件的公司，返回测试数据")
            response = JsonResponse({'companies': test_data})
            print(f"返回状态码: {response.status_code}")
            print("====== 结束处理新势力企业名单请求 ======")
            return response
        
        # 查询这些公司的排名数据，按综合得分降序排序
        top_rankings = (
            CompanyRanking.objects.filter(company__keyno__in=company_keys)
            .select_related('company')
            .order_by('-comprehensive_score')[:limit]
        )
        
        print(f"匹配到的排名数据数量: {top_rankings.count()}")
        
        result = []
        for i, ranking in enumerate(top_rankings, 1):
            company = ranking.company
            result.append({
                'rank': i,
                'name': company.company_name,
                'city': company.city or '未知',
                'county': company.county or '未知',
                'score': float(ranking.comprehensive_score)
            })
        
        # 处理没有足够数据的情况
        if len(result) == 0:
            print("没有找到匹配的排名数据，使用测试数据")
            result = test_data
        
        print(f"返回数据条数: {len(result)}")
        print(f"返回数据第一条: {result[0] if result else '无数据'}")
        response = JsonResponse({'companies': result})
        print(f"返回状态码: {response.status_code}")
        print("====== 结束处理新势力企业名单请求 ======")
        return response
    
    except Exception as e:
        print(f"获取新势力企业名单出错: {str(e)}")
        print(f"错误类型: {type(e)}")
        import traceback
        print(f"错误堆栈: {traceback.format_exc()}")
        # 出错时也返回测试数据，保证前端显示
        response = JsonResponse({'companies': test_data})
        print(f"返回状态码: {response.status_code}")
        print("====== 结束处理新势力企业名单请求 ======")
        return response

def get_yearly_stats(request):
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

def logout(request):
    """用户退出登录"""
    # 清除会话
    if 'user_id' in request.session:
        del request.session['user_id']
    if 'username' in request.session:
        del request.session['username']
    
    # 重定向到首页
    return redirect('data_hall:index')
    
def industry_detail(request, industry_name=None):
    """产业链详情页面"""
    # 如果没有指定产业名称，则默认为'新能源汽车'
    if not industry_name:
        industry_name = request.GET.get('industry', '新能源汽车')
    
    # 从数据库中获取所有产业链名称
    available_industries = list(IndustryChain.objects.values_list('name', flat=True))
    
    # 如果数据库中没有数据，使用默认值
    if not available_industries:
        available_industries = ['新能源汽车']
    
    # 如果指定的产业链名称不在数据库中，使用第一个可用的产业链
    if industry_name not in available_industries:
        industry_name = available_industries[0]
        
    # 构建上下文数据
    context = {
        'industry_name': industry_name,
        'available_industries': available_industries,  # 传递所有可用的产业链名称到模板
    }
    
    return render(request, 'data_hall/industry_detail.html', context)
