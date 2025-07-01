from django.contrib import admin
from .models import CompanyInfo, CompanyRanking, Province, City, District

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

# ChatMessageAdmin已移除 - 现在使用腾讯智能体API管理会话和消息

