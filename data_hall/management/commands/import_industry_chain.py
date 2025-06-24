<<<<<<< HEAD
from django.core.management.base import BaseCommand
import json
from data_hall.models import IndustryChain, ChainPoint
from django.db import transaction

class Command(BaseCommand):
    help = '从JSON文件导入产业链数据'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='JSON文件的路径')
        parser.add_argument(
            '--clear',
            action='store_true',
            help='清除现有数据后再导入',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='仅测试，不实际导入数据',
        )

    def handle(self, *args, **options):
        json_file = options['json_file']
        clear_existing = options['clear']
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('这是一次测试运行，不会实际修改数据库'))
        
        try:
            # 读取JSON文件
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'文件不存在: {json_file}'))
            return
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f'JSON格式错误: {e}'))
            return
        
        # 获取根节点数据
        try:
            root_data = data['graph']['treeGraph']
        except KeyError:
            self.stdout.write(self.style.ERROR('JSON结构不正确，缺少graph.treeGraph节点'))
            return
        
        if dry_run:
            self.stdout.write(f'将要导入的产业链: {root_data["NodeName"]} ({root_data["NodeCode"]})')
            self._count_nodes(root_data['Children'])
            return
        
        # 使用事务确保数据一致性
        with transaction.atomic():
            # 如果指定了clear参数，先清除现有数据
            if clear_existing:
                self.stdout.write('清除现有数据...')
                # 先删除链点（因为有外键约束）
                ChainPoint.objects.all().delete()
                IndustryChain.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('数据清除完成！'))
            
            # 检查产业链是否已存在
            industry_chain, created = IndustryChain.objects.get_or_create(
                code=root_data['NodeCode'],
                defaults={
                    'name': root_data['NodeName'],
                    'description': root_data.get('IndustryChainDefine', '')
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'成功创建产业链: {industry_chain.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'产业链已存在: {industry_chain.name}'))
                # 如果产业链已存在且没有指定清除，询问是否继续
                if not clear_existing:
                    # 删除该产业链下的所有链点，重新导入
                    ChainPoint.objects.filter(industry_chain=industry_chain).delete()
                    self.stdout.write(self.style.WARNING('已删除该产业链下的现有链点，将重新导入'))
            
            # 递归创建链点
            self._create_chain_points(root_data['Children'], None, industry_chain)
        
        self.stdout.write(self.style.SUCCESS('数据导入完成！'))
        
        # 显示统计信息
        total_points = ChainPoint.objects.filter(industry_chain=industry_chain).count()
        self.stdout.write(self.style.SUCCESS(f'总共导入了 {total_points} 个链点'))
    
    def _create_chain_points(self, nodes, parent, industry_chain):
        """递归创建链点"""
        if not isinstance(nodes, list):
            return
            
        for node in nodes:
            try:
                # 创建链点，处理更多字段
                chain_point, created = ChainPoint.objects.get_or_create(
                    code=node['NodeCode'],
                    defaults={
                        'name': node['NodeName'],
                        'level': str(node['NodeLevel']),
                        'parent': parent,
                        'industry_chain': industry_chain,
                        # 新增字段
                        'node_type': node.get('NodeType'),
                        'node_num': node.get('NodeNum'),
                        'node_important': node.get('NodeImportant'),
                        'product_code': node.get('ProductCode') or None,
                        'product_name': node.get('ProductName') or None,
                        'parent_node_code': node.get('ParentNodeCode') or None,
                        'product_define': node.get('ProductDefine'),
                        'company_count': node.get('CompanyCount', 0),
                        'node_num_desc': node.get('NodeNumDesc'),
                    }
                )
                
                if created:
                    self.stdout.write(f'创建链点: {chain_point.name} (Level: {chain_point.level}, Type: {chain_point.node_type}, Companies: {chain_point.company_count})')
                else:
                    self.stdout.write(f'链点已存在: {chain_point.name}')
                
                # 递归处理子节点
                if 'Children' in node and node['Children']:
                    self._create_chain_points(node['Children'], chain_point, industry_chain)
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'创建链点失败 {node.get("NodeName", "未知")}: {e}'))
                continue
    
    def _count_nodes(self, nodes, level=1):
        """统计节点数量（用于dry-run）"""
        if not isinstance(nodes, list):
            return 0
            
        count = 0
        for node in nodes:
            count += 1
            self.stdout.write(f'{"  " * level}Level {node["NodeLevel"]}: {node["NodeName"]} ({node["NodeCode"]})')
            
            if 'Children' in node and node['Children']:
                count += self._count_nodes(node['Children'], level + 1)
        
        if level == 1:
            self.stdout.write(self.style.SUCCESS(f'总共将导入 {count} 个链点'))
        
        return count 
=======
from django.core.management.base import BaseCommand
import json
from data_hall.models import IndustryChain, ChainPoint

class Command(BaseCommand):
    help = '从JSON文件导入产业链数据'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='JSON文件的路径')
        # parser.add_argument(
        #     '--clear',
        #     action='store_true',
        #     help='清除现有数据后再导入',
        # )

    def handle(self, *args, **options):
        json_file = options['json_file']
        
        # 如果指定了clear参数，先清除现有数据
        # if options['clear']:
        #     self.stdout.write('清除现有数据...')
        #     IndustryChain.objects.all().delete()
        #     self.stdout.write(self.style.SUCCESS('数据清除完成！'))
        
        # 读取JSON文件
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 获取根节点数据
        root_data = data['graph']['treeGraph']
        
        # 创建产业链记录
        industry_chain = IndustryChain.objects.create(
            name=root_data['NodeName'],
            code=root_data['NodeCode'],
            description=root_data.get('ProductDefine', '')  # 使用ProductDefine作为描述，如果没有则为空字符串
        )
        
        self.stdout.write(self.style.SUCCESS(f'成功创建产业链: {industry_chain.name}'))
        
        # 递归创建链点
        def create_chain_points(nodes, parent=None, industry_chain=industry_chain):
            if not isinstance(nodes, list):
                return
                
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
        create_chain_points(root_data['Children'])
        
        self.stdout.write(self.style.SUCCESS('数据导入完成！')) 
>>>>>>> 38effd7 ( Please enter the commit message for your changes. Lines starting)
