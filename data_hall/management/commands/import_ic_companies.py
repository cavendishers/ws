import json
import csv
from django.core.management.base import BaseCommand
from django.db import transaction
from data_hall.models import CompanyInfo, IndustryChain, ChainPoint, ChainPointCompany

class Command(BaseCommand):
    help = '从CSV文件导入集成电路相关公司数据'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='CSV文件的路径')

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        
        # 获取集成电路产业链
        try:
            ic_chain = IndustryChain.objects.get(code='IC0007')
            self.stdout.write(f'找到集成电路产业链: {ic_chain.name}')
        except IndustryChain.DoesNotExist:
            self.stdout.write(self.style.ERROR('未找到集成电路产业链(IC0007)，请先导入产业链数据'))
            return

        # 读取CSV文件
        with open(csv_file, 'r', encoding='gb18030', errors='ignore') as f:
            # 跳过BOM标记
            content = f.read()
            if content.startswith('\ufeff'):
                content = content[1:]
            
            # 使用StringIO来处理内容
            from io import StringIO
            csv_file = StringIO(content)
            reader = csv.DictReader(csv_file)
            total_count = 0
            success_count = 0
            
            for row in reader:
                total_count += 1
                try:
                    with transaction.atomic():
                        # 处理公司基本信息
                        company_data = {
                            'keyno': row['KeyNo'],
                            'company_name': row['CompanyName'],
                            'company_birth': row.get('StartDate', ''),
                            'province': json.loads(row['Area']).get('ProvinceName', '') if row.get('Area') else '',
                            'city': json.loads(row['Area']).get('CityName', '') if row.get('Area') else '',
                            'county': json.loads(row['Area']).get('CountyName', '') if row.get('Area') else '',
                        }
                        
                        # 创建或更新公司信息
                        company, created = CompanyInfo.objects.update_or_create(
                            keyno=company_data['keyno'],
                            defaults=company_data
                        )
                        
                        # 处理产业链关联
                        if row.get('IndustryChainJson'):
                            chain_data = json.loads(row['IndustryChainJson'])
                            for node in chain_data:
                                if node['c'] == 'IC0007':  # 只处理集成电路产业链的数据
                                    try:
                                        # 查找对应的链点
                                        chain_point = ChainPoint.objects.get(
                                            code=node['n'],
                                            industry_chain=ic_chain
                                        )
                                        
                                        # 创建或更新关联关系
                                        ChainPointCompany.objects.update_or_create(
                                            chain_point=chain_point,
                                            company=company,
                                            defaults={
                                                'score': float(node['s']) if isinstance(node['s'], (int, float, str)) else None,
                                                'node_type': int(node['t'].get('$numberInt', 0)) if isinstance(node['t'], dict) else int(node['t']),
                                                'node_importance': int(node['h'].get('$numberInt', 0)) if isinstance(node['h'], dict) else int(node['h']),
                                                'level': int(node['l'].get('$numberInt', 0)) if isinstance(node['l'], dict) else int(node['l'])
                                            }
                                        )
                                        
                                    except ChainPoint.DoesNotExist:
                                        self.stdout.write(self.style.WARNING(f'未找到链点: {node["n"]}'))
                                        continue
                        
                        success_count += 1
                        if success_count % 100 == 0:
                            self.stdout.write(f'已处理 {success_count} 条记录...')
                            
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'处理记录时出错: {str(e)}'))
                    continue
            
            self.stdout.write(self.style.SUCCESS(
                f'数据导入完成！总记录数: {total_count}, 成功导入: {success_count}, '
                f'失败: {total_count - success_count}'
            )) 