from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'), 
    path('register/', views.register, name='register'),
    path('password-reset/', views.password_reset_request, name='password_reset'),
    
    # iframe版本路由
    path('iframe/login/', views.login_iframe, name='login_iframe'),
] 