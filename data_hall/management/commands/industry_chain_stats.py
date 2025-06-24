from django.core.management.base import BaseCommand
from data_hall.models import IndustryChain, ChainPoint
from django.db.models import Count, Max

class Command(BaseCommand):
    help = '显示产业链数据统计信息'

    def add_arguments(self, parser):
        parser.add_argument(
            '--chain-code',
            type=str,
            help='指定产业链代码，只显示该产业链的统计信息'
        )
        parser.add_argument(
            '--detail',
            action='store_true',
            help='显示详细信息'
        )

    def handle(self, *args, **options):
        chain_code = options.get('chain_code')
        show_detail = options.get('detail', False)
        
        if chain_code:
            # 显示特定产业链的统计信息
            try:
                industry_chain = IndustryChain.objects.get(code=chain_code)
                self._show_chain_stats(industry_chain, show_detail)
            except IndustryChain.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'产业链 {chain_code} 不存在'))
                return
        else:
            # 显示所有产业链的概览
            self._show_all_chains_overview()
            
            if show_detail:
                self.stdout.write('\n' + '='*50)
                for chain in IndustryChain.objects.all():
                    self.stdout.write('\n')
                    self._show_chain_stats(chain, True)

    def _show_all_chains_overview(self):
        """显示所有产业链的概览"""
        self.stdout.write(self.style.SUCCESS('产业链数据概览'))
        self.stdout.write('='*50)
        
        total_chains = IndustryChain.objects.count()
        total_points = ChainPoint.objects.count()
        
        self.stdout.write(f'总产业链数量: {total_chains}')
        self.stdout.write(f'总链点数量: {total_points}')
        self.stdout.write('')
        
        # 显示各产业链基本信息
        self.stdout.write('各产业链信息:')
        for chain in IndustryChain.objects.all().order_by('code'):
            points_count = ChainPoint.objects.filter(industry_chain=chain).count()
            max_level = ChainPoint.objects.filter(industry_chain=chain).aggregate(
                max_level=Max('level')
            )['max_level'] or 0
            
            self.stdout.write(f'  {chain.code} - {chain.name}')
            self.stdout.write(f'    链点数量: {points_count}, 最大层级: {max_level}')

    def _show_chain_stats(self, industry_chain, show_detail=False):
        """显示特定产业链的详细统计信息"""
        self.stdout.write(self.style.SUCCESS(f'产业链详细信息: {industry_chain.name}'))
        self.stdout.write('-'*50)
        
        chain_points = ChainPoint.objects.filter(industry_chain=industry_chain)
        
        # 基本统计
        self.stdout.write(f'产业链代码: {industry_chain.code}')
        self.stdout.write(f'产业链名称: {industry_chain.name}')
        self.stdout.write(f'链点总数: {chain_points.count()}')
        
        if industry_chain.description:
            desc = industry_chain.description[:100] + '...' if len(industry_chain.description) > 100 else industry_chain.description
            self.stdout.write(f'描述: {desc}')
        
        # 按层级统计
        self.stdout.write('\n按层级统计:')
        level_stats = chain_points.values('level').annotate(
            count=Count('id')
        ).order_by('level')
        
        for stat in level_stats:
            self.stdout.write(f'  Level {stat["level"]}: {stat["count"]} 个链点')
        
        # 按节点类型统计
        type_stats = chain_points.values('node_type').annotate(
            count=Count('id')
        ).order_by('node_type')
        
        if type_stats:
            self.stdout.write('\n按节点类型统计:')
            type_mapping = {1: '分类节点', 2: '产品节点', 3: '下游应用', None: '未分类'}
            for stat in type_stats:
                type_name = type_mapping.get(stat['node_type'], f'类型{stat["node_type"]}')
                self.stdout.write(f'  {type_name}: {stat["count"]} 个链点')
        
        # 企业数量统计
        total_companies = sum(cp.company_count for cp in chain_points if cp.company_count)
        self.stdout.write(f'\n关联企业总数: {total_companies}')
        
        if show_detail:
            # 显示重要链点
            important_points = chain_points.filter(
                node_important__gte=3
            ).order_by('-node_important', '-company_count')[:10]
            
            if important_points:
                self.stdout.write('\n重要链点 (重要程度>=3):')
                for cp in important_points:
                    self.stdout.write(
                        f'  {cp.name} - Level:{cp.level} - '
                        f'重要程度:{cp.node_important} - 企业数:{cp.company_count}'
                    )
            
            # 显示企业数量最多的链点
            top_companies = chain_points.filter(
                company_count__gt=0
            ).order_by('-company_count')[:10]
            
            if top_companies:
                self.stdout.write('\n企业数量最多的链点 Top 10:')
                for cp in top_companies:
                    self.stdout.write(
                        f'  {cp.name} - Level:{cp.level} - 企业数:{cp.company_count}'
                    )
            
            # 显示层级结构示例
            root_points = chain_points.filter(parent=None)
            if root_points:
                self.stdout.write('\n产业链结构预览:')
                for root in root_points[:3]:  # 只显示前3个根节点
                    self._show_tree_structure(root, 0, max_depth=2)

    def _show_tree_structure(self, point, depth, max_depth=3):
        """递归显示树形结构"""
        if depth > max_depth:
            return
            
        indent = '  ' * depth
        self.stdout.write(f'{indent}{point.name} ({point.code})')
        
        children = point.children.all()[:5]  # 只显示前5个子节点
        for child in children:
            self._show_tree_structure(child, depth + 1, max_depth)
        
        if point.children.count() > 5:
            self.stdout.write(f'{indent}  ... 还有 {point.children.count() - 5} 个子节点') 