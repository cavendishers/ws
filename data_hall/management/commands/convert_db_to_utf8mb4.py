"""
Management command to convert database tables to utf8mb4 charset for emoji support
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = '转换数据库表为utf8mb4字符集以支持表情符号存储'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='显示将要执行的SQL命令，但不实际执行'
        )
        parser.add_argument(
            '--table',
            type=str,
            help='只转换指定的表（默认转换所有表）'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        specific_table = options['table']
        
        self.stdout.write("开始检查数据库字符集配置...")
        
        with connection.cursor() as cursor:
            # 检查数据库字符集
            cursor.execute("SELECT @@character_set_database, @@collation_database;")
            db_charset = cursor.fetchone()
            self.stdout.write(f"当前数据库字符集: {db_charset[0]}, 排序规则: {db_charset[1]}")
            
            # 获取所有表的字符集信息
            cursor.execute("""
                SELECT TABLE_NAME, TABLE_COLLATION, CHARACTER_SET_NAME
                FROM information_schema.TABLES t
                JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY c
                ON t.TABLE_COLLATION = c.COLLATION_NAME
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_TYPE = 'BASE TABLE'
            """)
            
            tables_info = cursor.fetchall()
            
            self.stdout.write(f"\n找到 {len(tables_info)} 个表:")
            
            conversion_commands = []
            
            for table_name, collation, charset in tables_info:
                if specific_table and table_name != specific_table:
                    continue
                    
                self.stdout.write(f"表 '{table_name}': 字符集={charset}, 排序规则={collation}")
                
                if charset != 'utf8mb4':
                    # 需要转换的表
                    convert_cmd = f"ALTER TABLE `{table_name}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
                    conversion_commands.append(convert_cmd)
                    
                    if dry_run:
                        self.stdout.write(f"  [DRY RUN] 将执行: {convert_cmd}")
                    else:
                        self.stdout.write(f"  转换表 '{table_name}' 到 utf8mb4...")
                        try:
                            cursor.execute(convert_cmd)
                            self.stdout.write(self.style.SUCCESS(f"  ✅ 表 '{table_name}' 转换成功"))
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f"  ❌ 表 '{table_name}' 转换失败: {str(e)}"))
                else:
                    self.stdout.write(f"  ✅ 表 '{table_name}' 已经是 utf8mb4 字符集")
            
            # 检查特定字段（特别是文本字段）
            if not specific_table:
                self.stdout.write("\n检查文本字段的字符集...")
                cursor.execute("""
                    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND DATA_TYPE IN ('varchar', 'text', 'longtext', 'mediumtext', 'tinytext')
                    AND CHARACTER_SET_NAME IS NOT NULL
                    AND CHARACTER_SET_NAME != 'utf8mb4'
                """)
                
                text_columns = cursor.fetchall()
                
                if text_columns:
                    self.stdout.write(f"发现 {len(text_columns)} 个需要转换的文本字段:")
                    for table, column, col_type, charset, collation in text_columns:
                        self.stdout.write(f"  {table}.{column} ({col_type}): {charset}")
                else:
                    self.stdout.write("✅ 所有文本字段都已经是 utf8mb4 字符集")
            
            if conversion_commands:
                if dry_run:
                    self.stdout.write(f"\n[DRY RUN] 共需要执行 {len(conversion_commands)} 个转换命令")
                    self.stdout.write("使用 --dry-run=false 来实际执行转换")
                else:
                    self.stdout.write(f"\n✅ 共转换了 {len(conversion_commands)} 个表")
            else:
                self.stdout.write("\n✅ 所有表都已经是 utf8mb4 字符集，无需转换")
            
            # 给出建议
            self.stdout.write("\n建议:")
            self.stdout.write("1. 确保在 settings.py 中配置了正确的数据库选项")
            self.stdout.write("2. 重启应用服务器以应用新的数据库配置")
            self.stdout.write("3. 测试表情符号的存储和显示功能")
            
            if db_charset[0] != 'utf8mb4':
                self.stdout.write(self.style.WARNING("\n⚠️  数据库默认字符集不是 utf8mb4"))
                self.stdout.write("建议在MySQL中执行以下命令更改数据库字符集:")
                self.stdout.write(f"ALTER DATABASE `{connection.settings_dict['NAME']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;") 