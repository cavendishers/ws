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
] 