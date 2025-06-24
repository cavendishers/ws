# 产业链数据导入使用说明

## 概述

本项目提供了完整的产业链数据导入和管理功能，支持从JSON文件导入复杂的层级结构数据到Django数据库中。

## 数据模型

### IndustryChain (产业链)
- `name`: 产业链名称
- `code`: 产业链代码 (唯一)
- `description`: 产业链描述

### ChainPoint (链点)
- `name`: 链点名称
- `code`: 节点代码 (唯一)
- `level`: 层级
- `parent`: 父链点 (自关联)
- `industry_chain`: 所属产业链
- `node_type`: 节点类型 (1=分类节点, 2=产品节点, 3=下游应用)
- `node_num`: 节点序号
- `node_important`: 重要程度 (0-5级)
- `product_code`: 产品代码
- `product_name`: 产品名称
- `product_define`: 产品定义
- `company_count`: 企业数量
- `node_num_desc`: 节点描述 (如：上游、中游、下游)

## 管理命令

### 1. import_industry_chain - 导入产业链数据

```bash
# 基本导入
python manage.py import_industry_chain data_hall/data/industry.json

# 清除现有数据后导入
python manage.py import_industry_chain data_hall/data/industry.json --clear

# 测试运行 (不实际导入数据)
python manage.py import_industry_chain data_hall/data/industry.json --dry-run
```

**参数说明:**
- `json_file`: JSON文件路径 (必需)
- `--clear`: 清除现有数据后再导入
- `--dry-run`: 仅测试，不实际导入数据

**支持的JSON格式:**
```json
{
    "graph": {
        "treeGraph": {
            "NodeCode": "IC0007",
            "NodeName": "集成电路",
            "IndustryChainDefine": "产业链描述...",
            "Children": [
                {
                    "NodeCode": "IC00070105",
                    "NodeName": "软件、材料、设备",
                    "NodeLevel": 1,
                    "NodeType": 1,
                    "NodeNum": 1,
                    "NodeImportant": 0,
                    "ProductCode": "",
                    "ProductName": "",
                    "ParentNodeCode": "",
                    "ProductDefine": null,
                    "CompanyCount": 23023,
                    "NodeNumDesc": "上游",
                    "Children": [...]
                }
            ]
        }
    }
}
```

### 2. industry_chain_stats - 查看统计信息

```bash
# 查看所有产业链概览
python manage.py industry_chain_stats

# 查看特定产业链的详细信息
python manage.py industry_chain_stats --chain-code IC0007

# 查看详细信息包括结构预览
python manage.py industry_chain_stats --chain-code IC0007 --detail

# 查看所有产业链的详细信息
python manage.py industry_chain_stats --detail
```

**参数说明:**
- `--chain-code`: 指定产业链代码
- `--detail`: 显示详细信息

## 使用示例

### 1. 导入新的产业链数据

```bash
# 首次导入
python manage.py import_industry_chain data/new_industry.json

# 如果需要重新导入，清除现有数据
python manage.py import_industry_chain data/new_industry.json --clear
```

### 2. 验证导入结果

```bash
# 查看导入的产业链概览
python manage.py industry_chain_stats

# 查看特定产业链的详细信息
python manage.py industry_chain_stats --chain-code IC0007 --detail
```

### 3. 数据库操作示例

```python
from data_hall.models import IndustryChain, ChainPoint

# 获取产业链
ic = IndustryChain.objects.get(code='IC0007')

# 获取根节点
root_points = ChainPoint.objects.filter(industry_chain=ic, parent=None)

# 获取某个节点的子节点
children = ChainPoint.objects.filter(parent=some_point)

# 按重要程度查询
important_points = ChainPoint.objects.filter(
    industry_chain=ic, 
    node_important__gte=3
).order_by('-node_important')

# 按企业数量查询
top_companies = ChainPoint.objects.filter(
    industry_chain=ic,
    company_count__gt=0
).order_by('-company_count')
```

## 注意事项

1. **数据完整性**: 导入使用事务确保数据一致性
2. **重复数据**: 使用 `get_or_create` 避免重复导入
3. **外键约束**: 删除数据时注意外键关系
4. **大数据量**: 对于大量数据，建议使用 `--dry-run` 先测试
5. **备份**: 重要数据导入前请备份数据库

## 错误处理

- **文件不存在**: 检查JSON文件路径
- **JSON格式错误**: 验证JSON文件格式
- **数据库错误**: 检查模型字段和约束
- **外键错误**: 确保关联数据存在

## 扩展功能

可以根据需要扩展以下功能：

1. **数据验证**: 添加更严格的数据验证规则
2. **批量操作**: 支持批量导入多个文件
3. **增量更新**: 支持增量更新现有数据
4. **数据导出**: 支持将数据导出为JSON格式
5. **API接口**: 提供REST API进行数据操作

## 相关文件

- `data_hall/models.py`: 数据模型定义
- `data_hall/management/commands/import_industry_chain.py`: 导入命令
- `data_hall/management/commands/industry_chain_stats.py`: 统计命令
- `data_hall/data/industry.json`: 示例数据文件 