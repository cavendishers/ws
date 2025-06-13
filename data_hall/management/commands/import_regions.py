import json
import os
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from data_hall.models import Province, City, District
from django.db import transaction


class Command(BaseCommand):
    help = '导入中国省市区数据到数据库'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='Pending files/data.json',
            help='JSON数据文件路径（相对于项目根目录）'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='导入前清除现有数据'
        )

    def handle(self, *args, **options):
        file_path = options['file']
        clear_data = options['clear']
        
        # 构建完整的文件路径
        if not os.path.isabs(file_path):
            file_path = os.path.join(settings.BASE_DIR, file_path)
        
        if not os.path.exists(file_path):
            raise CommandError(f'文件不存在: {file_path}')
        
        self.stdout.write(f'开始导入数据，文件路径: {file_path}')
        
        # 清除现有数据
        if clear_data:
            self.stdout.write('清除现有数据...')
            with transaction.atomic():
                District.objects.all().delete()
                City.objects.all().delete()
                Province.objects.all().delete()
            self.stdout.write('现有数据已清除')
        
        # 读取JSON数据
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            raise CommandError(f'读取文件失败: {e}')
        
        # 导入数据
        with transaction.atomic():
            self.import_data(data)
        
        # 统计导入结果
        province_count = Province.objects.count()
        city_count = City.objects.count()
        district_count = District.objects.count()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'数据导入完成!\n'
                f'省份: {province_count} 个\n'
                f'城市: {city_count} 个\n'
                f'区县: {district_count} 个'
            )
        )

    def import_data(self, data):
        """导入省市区数据"""
        self.stdout.write('开始导入省市区数据...')
        
        # 获取省份数据（根级别 86）
        if '86' not in data:
            raise CommandError('数据格式错误：找不到根级别数据 "86"')
        
        provinces_data = data['86']
        
        # 导入省份
        for province_code, province_name in provinces_data.items():
            province, created = Province.objects.get_or_create(
                code=province_code,
                defaults={'name': province_name}
            )
            if created:
                self.stdout.write(f'创建省份: {province_name} ({province_code})')
            
            # 导入该省份下的城市
            if province_code in data:
                cities_data = data[province_code]
                for city_code, city_name in cities_data.items():
                    city, created = City.objects.get_or_create(
                        code=city_code,
                        defaults={
                            'name': city_name,
                            'province': province
                        }
                    )
                    if created:
                        self.stdout.write(f'  创建城市: {city_name} ({city_code})')
                    
                    # 导入该城市下的区县
                    if city_code in data:
                        districts_data = data[city_code]
                        for district_code, district_name in districts_data.items():
                            district, created = District.objects.get_or_create(
                                code=district_code,
                                defaults={
                                    'name': district_name,
                                    'city': city
                                }
                            )
                            if created:
                                self.stdout.write(f'    创建区县: {district_name} ({district_code})')
        
        self.stdout.write('省市区数据导入完成') 