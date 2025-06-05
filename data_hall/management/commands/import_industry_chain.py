from django.core.management.base import BaseCommand
import json
from data_hall.models import IndustryChain, ChainPoint

class Command(BaseCommand):
    help = '从JSON文件导入产业链数据'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='JSON文件的路径')
        parser.add_argument(
            '--clear',
            action='store_true',
            help='清除现有数据后再导入',
        )

    def handle(self, *args, **options):
        json_file = options['json_file']
        
        # 如果指定了clear参数，先清除现有数据
        if options['clear']:
            self.stdout.write('清除现有数据...')
            IndustryChain.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('数据清除完成！'))
        
        # 读取JSON文件
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 创建产业链记录
        industry_chain = IndustryChain.objects.create(
            name=data['IndustryChainName'],
            code=data['NodeCode'],  # 使用根节点的NodeCode作为产业链代码
            description=data['IndustryChainDefine']
        )
        
        self.stdout.write(self.style.SUCCESS(f'成功创建产业链: {industry_chain.name}'))
        
        # 递归创建链点
        def create_chain_points(nodes, parent=None, industry_chain=industry_chain):
            for node in nodes:
                # 创建链点，只使用现有的字段
                chain_point = ChainPoint.objects.create(
                    name=node['NodeName'],
                    code=node['NodeCode'],
                    level=str(node['NodeLevel']),  # 转换为字符串
                    parent=parent,
                    industry_chain=industry_chain
                )
                
                self.stdout.write(f'创建链点: {chain_point.name}')
                
                # 递归处理子节点
                if 'Children' in node and node['Children']:
                    create_chain_points(node['Children'], parent=chain_point)
        
        # 开始处理根节点的子节点
        create_chain_points(data['Children'])
        
        self.stdout.write(self.style.SUCCESS('数据导入完成！')) 