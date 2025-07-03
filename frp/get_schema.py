import pymysql
import sys

# --- 请在这里配置您的数据库连接信息 ---
db_config = {
    "host": "127.0.0.1",  # 数据库主机地址，如果是本地就是 '127.0.0.1' 或 'localhost'
    "port": 3306,         # 数据库端口，MySQL 默认是 3306
    "user": "root",  # 您的数据库用户名
    "password": "20000420", # 您的数据库密码
    "database": "demo",     # 您要导出表结构的数据库名称
    "charset": "utf8mb4"    # 数据库字符集，通常是 utf8mb4
}
# -----------------------------------------

def get_database_schema(config):
    """
    连接到指定的MySQL数据库，并获取所有表的CREATE TABLE语句。

    Args:
        config (dict): 包含数据库连接信息的字典。

    Returns:
        str: 包含所有表结构定义的字符串，如果出错则返回None。
    """
    schema_definitions = []
    connection = None
    try:
        # 建立数据库连接
        connection = pymysql.connect(**config)
        print(f"✅ 成功连接到数据库 '{config['database']}' on {config['host']}:{config['port']}.")
        
        with connection.cursor() as cursor:
            # 1. 获取数据库中所有的表名
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            table_names = [table[0] for table in tables]
            
            if not table_names:
                print(f"⚠️ 数据库 '{config['database']}' 中没有找到任何表。")
                return ""

            print(f"🔍 找到了 {len(table_names)} 个表: {', '.join(table_names)}")
            
            # 2. 遍历每个表，获取其创建语句
            for table_name in table_names:
                print(f"   - 正在导出 '{table_name}' 的表结构...")
                # 使用 SHOW CREATE TABLE 获取最准确的表结构定义
                cursor.execute(f"SHOW CREATE TABLE `{table_name}`")
                result = cursor.fetchone()
                # result 是一个元组，第二个元素 (result[1]) 就是 CREATE TABLE 语句
                create_statement = result[1]
                
                # 添加注释头，使其更清晰
                schema_definitions.append(f"--\n-- Table structure for table `{table_name}`\n--")
                schema_definitions.append(create_statement + ";")

        print("✅ 所有表结构导出完成。")
        return "\n\n".join(schema_definitions)

    except pymysql.Error as e:
        print(f"❌ 数据库操作失败: {e}", file=sys.stderr)
        if "Access denied" in str(e):
            print("   提示: 请检查您的用户名和密码是否正确。", file=sys.stderr)
        elif "Unknown database" in str(e):
            print(f"   提示: 请确认数据库 '{config['database']}' 是否存在。", file=sys.stderr)
        elif "Can't connect to MySQL server" in str(e):
            print(f"   提示: 请检查数据库主机地址 '{config['host']}' 和端口 '{config['port']}' 是否正确，并确保MySQL服务正在运行。", file=sys.stderr)
        return None
    finally:
        # 确保无论成功与否，数据库连接都会被关闭
        if connection:
            connection.close()
            print("🔌 数据库连接已关闭。")


if __name__ == "__main__":
    # 执行主函数并打印结果
    full_schema = get_database_schema(db_config)
    
    if full_schema is not None:
        print("\n" + "="*50)
        print("          MySQL 数据库表结构 (Schema Definition)")
        print("="*50 + "\n")
        print(full_schema)
        
        # 可选：将结果保存到文件
        try:
            with open(f"{db_config['database']}_schema.sql", "w", encoding="utf-8") as f:
                f.write(full_schema)
            print(f"\n✅ 结果已成功保存到文件: {db_config['database']}_schema.sql")
        except IOError as e:
            print(f"\n❌ 保存到文件失败: {e}", file=sys.stderr)

