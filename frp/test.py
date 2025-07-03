import pymysql

# 建立连接
connection = pymysql.connect(
    host='47.121.220.248',
    user='root',
    password='20000420',
    port=3306
)

# 测试连接
cursor = connection.cursor()
cursor.execute("SELECT VERSION()")
version = cursor.fetchone()
print(f"数据库版本: {version[0]}")

# 关闭连接
connection.close()
