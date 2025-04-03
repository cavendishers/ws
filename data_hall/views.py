from django.shortcuts import render
from django.contrib.auth.decorators import login_required

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
    return render(request, 'data_hall/map.html')

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
