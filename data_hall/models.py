from django.db import models
from django.utils import timezone
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
    industry = models.CharField(db_column='Industry', max_length=32, blank=True, null=True, db_comment='公司所属产业')  # Field name made lowercase.
    industry_sub = models.CharField(db_column='Industry_sub', max_length=64, blank=True, null=True, db_comment='公司所属产业子类')  # Field name made lowercase.
    province = models.CharField(db_column='Province', max_length=20, blank=True, null=True, db_comment='所在省份')  # Field name made lowercase.
    city = models.CharField(db_column='City', max_length=32, blank=True, null=True, db_comment='所在城市')  # Field name made lowercase.
    county = models.CharField(db_column='County', max_length=32, blank=True, null=True, db_comment='所在区县')  # Field name made lowercase.
    std_industr_category = models.CharField(db_column='Std_industr_category', max_length=32, blank=True, null=True, db_comment='国标行业门类')  # Field name made lowercase.
    std_industr_big_category = models.CharField(db_column='Std_industr_sub_category', max_length=64, blank=True, null=True, db_comment='国标行业大类')  # Field name made lowercase.
    std_industr_mid_category = models.CharField(db_column='std_industr_mid_category', max_length=64, blank=True, null=True, db_comment='国标行业中类')  # Field name made lowercase.
    std_industr_small_category = models.CharField(db_column='std_industr_small_category', max_length=64, blank=True, null=True, db_comment='国标行业小类')  # Field name made lowercase.
    tag = models.CharField(db_column='tag', max_length=255, blank=True, null=True, db_comment='标签')
    company_scale = models.CharField(db_column='Company_scale', max_length=32, blank=True, null=True, db_comment='公司规模')  # Field name made lowercase.
      # Field name made lowercase.
    class Meta:
        managed = True
        db_table = 'company_info'

    def __str__(self):
        return self.company_name

# 创建企业排名模型
class CompanyRanking(models.Model):
    company = models.OneToOneField(CompanyInfo, on_delete=models.CASCADE, related_name='ranking', verbose_name='关联企业')
    dev_potential = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='发展潜力', help_text='0-100分')
    expansion_speed = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='扩张速度', help_text='0-100分')
    innovation = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='创新能力', help_text='0-100分')
    capital_attention = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='资本关注', help_text='0-100分')
    team_background = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='团队背景', help_text='0-100分')
    comprehensive_score = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='综合得分', help_text='0-100分')
    rank = models.PositiveIntegerField(verbose_name='排名', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '企业排名'
        verbose_name_plural = '企业排名'
        ordering = ['rank']
        
    def save(self, *args, **kwargs):
        # 如果没有设置综合得分，自动计算五个维度的平均值作为综合得分
        if not self.comprehensive_score:
            self.comprehensive_score = (
                self.dev_potential + 
                self.expansion_speed + 
                self.innovation + 
                self.capital_attention + 
                self.team_background
            ) / 5
        super().save(*args, **kwargs)
        
    def __str__(self):
        return f"{self.company.company_name} - 排名: {self.rank}"

# 创建企业融资情况模型
class CompanyFinancing(models.Model):
    # 公司唯一标识，与CompanyInfo表关联
    company = models.ForeignKey(CompanyInfo, on_delete=models.CASCADE, related_name='financings', verbose_name='关联企业', db_column='keyno')
    financing_round = models.CharField(max_length=50, verbose_name='融资轮次',null=True, blank=True)
    financing_amount = models.CharField(max_length=50, verbose_name='融资金额',null=True, blank=True)
    financing_date = models.DateField(verbose_name='融资日期', null=True, blank=True)
    investor_id = models.CharField(max_length=64, verbose_name='投资方ID', null=True, blank=True)
    investor_name = models.CharField(max_length=128, verbose_name='投资方名称', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '企业融资情况'
        verbose_name_plural = '企业融资情况'
        ordering = ['-financing_date']
        indexes = [
            models.Index(fields=['company']),
            models.Index(fields=['financing_date']),
            models.Index(fields=['financing_round']),
        ]
    
    def __str__(self):
        return f"{self.company.company_name} - {self.financing_round} - {self.financing_date}"


