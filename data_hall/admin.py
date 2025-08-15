from django.contrib import admin
from .models import User, CompanyInfo, CompanyRanking

# Register your models here.
admin.site.register(User) # test
admin.site.register(CompanyInfo)
admin.site.register(CompanyRanking)

