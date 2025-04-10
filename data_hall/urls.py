from django.urls import path
from . import views

app_name = 'data_hall'

urlpatterns = [
    path('', views.index, name='index'),
    path('ranking/', views.ranking, name='ranking'),
    path('industry/', views.industry, name='industry'),
    path('enterprise/', views.enterprise, name='enterprise'),
    path('precision/', views.precision, name='precision'),
    path('map/', views.map_view, name='map'),
    path('report/', views.report, name='report'),
    path('news/', views.news, name='news'),
    path('login/', views.login, name='login'),
    path('api/filter-data/', views.get_filter_data, name='filter-data'),
    path('api/company-stats/', views.get_company_stats, name='company-stats'),
    path('api/company-locations/', views.get_company_locations, name='company-locations'),
    path('api/county-company-counts/', views.get_county_company_counts, name='county-company-counts'),
    path('api/company-yearly-stats/', views.get_company_yearly_stats, name='company-yearly-stats'),
] 