from django.contrib import admin
from .models import CompanyInfo, CompanyRanking, Province, City, District, ChatMessage

# Register your models here.
# admin.site.register(User)  # 删除废弃的自定义User模型注册
admin.site.register(CompanyInfo)
admin.site.register(CompanyRanking)

# 省市区管理
@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'created_at')
    search_fields = ('name', 'code')
    ordering = ('code',)

@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'province', 'created_at')
    list_filter = ('province',)
    search_fields = ('name', 'code', 'province__name')
    ordering = ('province', 'code')

@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'city', 'get_province', 'created_at')
    list_filter = ('city__province', 'city')
    search_fields = ('name', 'code', 'city__name', 'city__province__name')
    ordering = ('city__province', 'city', 'code')
    
    def get_province(self, obj):
        return obj.city.province.name
    get_province.short_description = '省份'

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    """聊天消息管理"""
    
    list_display = [
        'id', 'user', 'role', 'content_preview', 
        'session_id', 'created_at'
    ]
    list_filter = [
        'role', 'created_at', 'user'
    ]
    search_fields = [
        'user__username', 'content', 'session_id'
    ]
    readonly_fields = [
        'id', 'created_at', 'updated_at'
    ]
    ordering = ['-created_at']
    list_per_page = 20
    
    fieldsets = (
        ('基本信息', {
            'fields': ('user', 'role', 'content')
        }),
        ('会话信息', {
            'fields': ('session_id', 'metadata'),
            'classes': ('collapse',)
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def content_preview(self, obj):
        """内容预览"""
        if len(obj.content) > 50:
            return obj.content[:50] + '...'
        return obj.content
    content_preview.short_description = '内容预览'
    
    def has_add_permission(self, request):
        """禁止通过管理后台添加聊天记录"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """限制修改权限，只允许超级用户修改"""
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        """允许删除聊天记录"""
        return request.user.is_staff

