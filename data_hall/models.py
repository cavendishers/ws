from django.db import models

# Create your models here.

# 用户表
class User(models.Model):
    username = models.CharField(max_length=100, unique=True, verbose_name='用户名')
    password = models.CharField(max_length=100, verbose_name='密码')
    email = models.EmailField(unique=True, verbose_name='邮箱')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '用户'
        verbose_name_plural = '用户'
        
    def __str__(self):
        return self.username


class CompanyInfo(models.Model):
    keyno = models.CharField(db_column='KeyNo',max_length=64,primary_key=True, db_comment='唯一标识符')  # Field name made lowercase.
    company_name = models.CharField(db_column='Company_name', max_length=128, db_comment='公司名称')  # Field name made lowercase.
    company_birth = models.CharField(db_column='Company_birth', max_length=20, blank=True, null=True, db_comment='公司成立年份')  # Field name made lowercase.
    insured_num = models.CharField(db_column='Insured_num', max_length=20, blank=True, null=True, db_comment='参保人数')  # Field name made lowercase.
    latitude = models.CharField(db_column='Latitude', max_length=32, blank=True, null=True, db_comment='纬度')  # Field name made lowercase.
    longitude = models.CharField(db_column='Longitude', max_length=32, blank=True, null=True, db_comment='经度')  # Field name made lowercase.
    industry = models.CharField(db_column='Industry', max_length=20, blank=True, null=True, db_comment='公司所属产业')  # Field name made lowercase.
    province = models.CharField(db_column='Province', max_length=20, blank=True, null=True, db_comment='所在省份')  # Field name made lowercase.
    city = models.CharField(db_column='City', max_length=32, blank=True, null=True, db_comment='所在城市')  # Field name made lowercase.
    county = models.CharField(db_column='County', max_length=32, blank=True, null=True, db_comment='所在区县')  # Field name made lowercase.

    class Meta:
        managed = True
        db_table = 'company_info'

    def __str__(self):
        return self.company_name

