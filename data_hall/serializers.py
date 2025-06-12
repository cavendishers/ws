from rest_framework import serializers
from .models import CompanyInfo, ChainPoint, ChainPointCompany

class ChainPointSerializer(serializers.ModelSerializer):
    """产业链节点序列化器"""
    class Meta:
        model = ChainPoint
        fields = ['id', 'name', 'code', 'level']

class CompanyChainSerializer(serializers.ModelSerializer):
    """企业产业链关联序列化器"""
    # 添加企业名称、产业链节点、产业链环节、产业关联性等字段
    company_name = serializers.CharField(source='company.company_name')
    company_id = serializers.CharField(source='company.keyno')
    chain_point_name = serializers.CharField(source='chain_point.name')
    chain_point_level = serializers.CharField(source='chain_point.level')
    industry = serializers.CharField(source='company.industry', default='')
    industry_sub = serializers.CharField(source='company.industry_sub', default='')
    
    # 计算产业关联性 - 这里简单实现，可以根据实际需求调整
    industry_relevance = serializers.SerializerMethodField()
    
    class Meta:
        model = ChainPointCompany
        fields = [
            'company_id', 
            'company_name', 
            'chain_point_name', 
            'chain_point_level', 
            'industry', 
            'industry_sub',
            'industry_relevance'
        ]
    
    def get_industry_relevance(self, obj):
        """
        计算产业关联性
        这里简单实现，可以根据实际需求调整计算逻辑
        例如：可以基于企业标签、产业分类等计算相关性
        """
        # 默认关联性为"高"
        return "高"

class EnterpriseListByChainPointSerializer(serializers.Serializer):
    """链点企业列表序列化器"""
    chain_point = ChainPointSerializer()
    enterprises = CompanyChainSerializer(many=True)
    total_count = serializers.IntegerField() 