from django.urls import path
from . import views
from . import api_views

app_name = 'data_hall'

urlpatterns = [
    path('', views.index, name='index'),
    path('ranking/', views.ranking, name='ranking'),
    path('industry/', views.industry, name='industry'),
    path('industry/detail/', views.industry_detail, name='industry_detail'),
    path('industry/detail/<str:industry_name>/', views.industry_detail, name='industry_detail_with_name'),
    path('enterprise/', views.enterprise, name='enterprise'),
    path('precision/', views.precision, name='precision'),
    path('map/', views.map_view, name='map'),
    path('report/', views.report, name='report'),
    path('news/', views.news, name='news'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('api/filter-data/', views.get_filter_data, name='filter-data'),
    path('api/company-stats/', views.get_company_stats, name='company-stats'),
    path('api/company-locations/', views.get_company_locations, name='company-locations'),
    path('api/county-company-counts/', views.get_county_company_counts, name='county-company-counts'),
    path('api/company-yearly-stats/', views.get_company_yearly_stats, name='company-yearly-stats'),
    path('api/company-rankings/', views.get_company_rankings, name='company_rankings'),
    path('api/enterpriseList.json', views.get_enterprise_list, name='enterprise_list'),
    path('api/precisionList.json', views.get_precision_list, name='precision_list'),
    path('api/ai/chat', views.ai_chat, name='ai_chat'),
    path('api/top-companies/', views.get_top_companies, name='top_companies'),
    path('api/yearly-stats/', views.get_yearly_stats, name='yearly_stats'),
    
    # 产业链 API 路由
    path('api/chain-points/', api_views.ChainPointListAPIView.as_view(), name='chain_point_list'),
    path('api/chain-point/<int:chain_point_id>/enterprises/', api_views.ChainPointEnterpriseListAPIView.as_view(), name='chain_point_enterprises'),
    path('api/chain-point/<int:chain_point_id>/', api_views.ChainPointDetailAPIView.as_view(), name='chain_point_detail'),
    
    # 省市区 API 路由
    path('api/regions/tree/', api_views.RegionTreeAPIView.as_view(), name='region_tree'),
    path('api/regions/provinces/', api_views.ProvinceListAPIView.as_view(), name='province_list'),
    path('api/regions/cities/', api_views.CityListAPIView.as_view(), name='city_list'),
    path('api/regions/districts/', api_views.DistrictListAPIView.as_view(), name='district_list'),
    path('api/regions/<str:region_type>/<str:region_code>/', api_views.RegionDetailAPIView.as_view(), name='region_detail'),
    path('api/regions/search/', api_views.RegionSearchAPIView.as_view(), name='region_search'),
] 