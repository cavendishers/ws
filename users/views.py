from django.shortcuts import render, redirect
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.contrib import messages
from django.core.cache import cache
from .forms import LoginForm, RegistrationForm, PasswordResetRequestForm


def login(request):
    """安全登录页面"""
    # 如果用户已经登录，直接跳转到首页
    if request.user.is_authenticated:
        return redirect('data_hall:index')
    
    if request.method == 'POST':
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            auth_login(request, user)
            
            # 清除登录失败计数
            ip_address = form.get_client_ip(request)
            cache_key = f'login_attempts_{ip_address}'
            cache.delete(cache_key)
            
            # 处理"记住我"功能
            if form.cleaned_data.get('remember_me'):
                request.session.set_expiry(60 * 60 * 24 * 14)  # 2周
            else:
                request.session.set_expiry(0)  # 浏览器关闭即失效
            
            messages.success(request, f'欢迎回来，{user.username}！')
            
            # 重定向到下一页或首页
            next_url = request.GET.get('next') or 'data_hall:index'
            return redirect(next_url)
        else:
            # 表单验证失败，错误信息已包含在form.errors中
            pass
    else:
        form = LoginForm()
    
    return render(request, 'users/login.html', {'form': form})


def login_iframe(request):
    """登录iframe版本视图（安全版）"""
    # 如果用户已经登录，直接跳转到首页
    if request.user.is_authenticated:
        return redirect('data_hall:index_iframe')
    
    if request.method == 'POST':
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            auth_login(request, user)
            
            # 清除登录失败计数
            ip_address = form.get_client_ip(request)
            cache_key = f'login_attempts_{ip_address}'
            cache.delete(cache_key)
            
            # 处理"记住我"功能
            if form.cleaned_data.get('remember_me'):
                request.session.set_expiry(60 * 60 * 24 * 14)  # 2周
            else:
                request.session.set_expiry(0)  # 浏览器关闭即失效
            
            return redirect('data_hall:index_iframe')
    else:
        form = LoginForm()
    
    return render(request, 'users/login.html', {'form': form})


def logout(request):
    """用户安全退出登录"""
    if request.user.is_authenticated:
        username = request.user.username
        auth_logout(request)
        messages.info(request, f'您已安全退出，再见 {username}！')
    
    return redirect('data_hall:index')


def register(request):
    """用户注册页面"""
    # 如果用户已经登录，直接跳转到首页
    if request.user.is_authenticated:
        return redirect('data_hall:index')
    
    if request.method == 'POST':
        form = RegistrationForm(data=request.POST)
        if form.is_valid():
            user = form.save()
            auth_login(request, user)
            messages.success(request, f'注册成功！欢迎加入，{user.username}！')
            return redirect('data_hall:index')
    else:
        form = RegistrationForm()
    
    return render(request, 'users/register.html', {'form': form})


def password_reset_request(request):
    """密码重置请求页面"""
    if request.user.is_authenticated:
        return redirect('data_hall:index')
    
    if request.method == 'POST':
        form = PasswordResetRequestForm(data=request.POST)
        if form.is_valid():
            # TODO: 实现邮件发送功能
            messages.info(request, '密码重置邮件已发送到您的邮箱，请查收。')
            return redirect('users:login')
    else:
        form = PasswordResetRequestForm()
    
    return render(request, 'users/password_reset.html', {'form': form})
