from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.models import User as DjangoUser
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
import re
from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache

class LoginForm(forms.Form):
    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={
            'class': 'appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 bg-[#0A1A3A] placeholder-gray-500 text-white rounded-t-md focus:outline-none focus:ring-[var(--secondary)] focus:border-[var(--secondary)] focus:z-10 sm:text-sm',
            'placeholder': '用户名或邮箱',
            'id': 'username',
            'autocomplete': 'username',
        }),
        label='用户名'
    )
    
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 bg-[#0A1A3A] placeholder-gray-500 text-white rounded-b-md focus:outline-none focus:ring-[var(--secondary)] focus:border-[var(--secondary)] focus:z-10 sm:text-sm',
            'placeholder': '密码',
            'id': 'password',
            'autocomplete': 'current-password',
        }),
        label='密码'
    )
    
    remember_me = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'h-4 w-4 text-[var(--secondary)] focus:ring-[var(--secondary)] border-gray-700 rounded bg-[#0A1A3A]',
            'id': 'remember-me',
        }),
        label='记住我'
    )
    
    def __init__(self, request=None, *args, **kwargs):
        self.request = request
        super().__init__(*args, **kwargs)
    
    def clean_username(self):
        username = self.cleaned_data.get('username')
        if not username:
            raise ValidationError('用户名不能为空')
        
        # Remove extra whitespace
        username = username.strip()
        
        # Basic validation
        if len(username) < 3:
            raise ValidationError('用户名至少需要3个字符')
        
        return username
    
    def clean_password(self):
        password = self.cleaned_data.get('password')
        if not password:
            raise ValidationError('密码不能为空')
        
        if len(password) < 6:
            raise ValidationError('密码至少需要6个字符')
        
        return password
    
    def clean(self):
        cleaned_data = super().clean()
        username = cleaned_data.get('username')
        password = cleaned_data.get('password')
        
        if username and password:
            # Rate limiting check
            if self.request:
                ip_address = self.get_client_ip(self.request)
                cache_key = f'login_attempts_{ip_address}'
                attempts = cache.get(cache_key, 0)
                
                if attempts >= 5:  # Max 5 attempts per hour
                    raise ValidationError('登录尝试次数过多，请1小时后再试')
            
            # Try to authenticate user
            user = authenticate(username=username, password=password)
            if user is None:
                # Increment failed attempt counter
                if self.request:
                    ip_address = self.get_client_ip(self.request)
                    cache_key = f'login_attempts_{ip_address}'
                    attempts = cache.get(cache_key, 0) + 1
                    cache.set(cache_key, attempts, 3600)  # Cache for 1 hour
                
                raise ValidationError('用户名或密码错误')
            
            if not user.is_active:
                raise ValidationError('账户已被禁用，请联系管理员')
            
            # Store user for later use
            self.user_cache = user
        
        return cleaned_data
    
    def get_client_ip(self, request):
        """Get client IP address for rate limiting"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def get_user(self):
        return getattr(self, 'user_cache', None)


class RegistrationForm(forms.Form):
    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={
            'class': 'appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 bg-[#0A1A3A] placeholder-gray-500 text-white rounded-t-md focus:outline-none focus:ring-[var(--secondary)] focus:border-[var(--secondary)] focus:z-10 sm:text-sm',
            'placeholder': '用户名',
            'id': 'username',
            'autocomplete': 'username',
        }),
        label='用户名'
    )
    
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 bg-[#0A1A3A] placeholder-gray-500 text-white focus:outline-none focus:ring-[var(--secondary)] focus:border-[var(--secondary)] focus:z-10 sm:text-sm',
            'placeholder': '邮箱地址',
            'id': 'email',
            'autocomplete': 'email',
        }),
        label='邮箱'
    )
    
    password1 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 bg-[#0A1A3A] placeholder-gray-500 text-white focus:outline-none focus:ring-[var(--secondary)] focus:border-[var(--secondary)] focus:z-10 sm:text-sm',
            'placeholder': '密码',
            'id': 'password1',
            'autocomplete': 'new-password',
        }),
        label='密码'
    )
    
    password2 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 bg-[#0A1A3A] placeholder-gray-500 text-white rounded-b-md focus:outline-none focus:ring-[var(--secondary)] focus:border-[var(--secondary)] focus:z-10 sm:text-sm',
            'placeholder': '确认密码',
            'id': 'password2',
            'autocomplete': 'new-password',
        }),
        label='确认密码'
    )
    
    def clean_username(self):
        username = self.cleaned_data.get('username')
        if not username:
            raise ValidationError('用户名不能为空')
        
        # Remove extra whitespace
        username = username.strip()
        
        # Username validation
        if len(username) < 3:
            raise ValidationError('用户名至少需要3个字符')
        
        if len(username) > 150:
            raise ValidationError('用户名不能超过150个字符')
        
        # Check for valid characters (letters, numbers, underscores, hyphens)
        if not re.match(r'^[\w\-]+$', username):
            raise ValidationError('用户名只能包含字母、数字、下划线和连字符')
        
        # Check if username already exists
        if DjangoUser.objects.filter(username__iexact=username).exists():
            raise ValidationError('用户名已存在，请选择其他用户名')
        
        return username
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if not email:
            raise ValidationError('邮箱地址不能为空')
        
        # Normalize email
        email = email.lower().strip()
        
        # Check if email already exists
        if DjangoUser.objects.filter(email__iexact=email).exists():
            raise ValidationError('该邮箱已被注册，请使用其他邮箱或直接登录')
        
        return email
    
    def clean_password1(self):
        password1 = self.cleaned_data.get('password1')
        if not password1:
            raise ValidationError('密码不能为空')
        
        # Use Django's built-in password validation
        try:
            validate_password(password1)
        except ValidationError as e:
            raise ValidationError(e.messages)
        
        return password1
    
    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        
        if password1 and password2 and password1 != password2:
            raise ValidationError('两次输入的密码不一致')
        
        return password2
    
    def save(self):
        """Create and return a new user"""
        username = self.cleaned_data['username']
        email = self.cleaned_data['email']
        password = self.cleaned_data['password1']
        
        user = DjangoUser.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        return user


class PasswordResetRequestForm(forms.Form):
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-700 bg-[#0A1A3A] placeholder-gray-500 text-white focus:outline-none focus:ring-[var(--secondary)] focus:border-[var(--secondary)] focus:z-10 sm:text-sm',
            'placeholder': '输入您的邮箱地址',
            'id': 'email',
            'autocomplete': 'email',
        }),
        label='邮箱地址'
    )
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if not email:
            raise ValidationError('邮箱地址不能为空')
        
        email = email.lower().strip()
        
        # Check if email exists
        if not DjangoUser.objects.filter(email__iexact=email).exists():
            raise ValidationError('该邮箱未注册')
        
        return email 