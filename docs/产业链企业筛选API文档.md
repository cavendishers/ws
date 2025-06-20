# 产业链企业筛选功能API文档

## 文档概述

本文档详细说明了产业链企业筛选功能的API实现要求，包括所有筛选条件的字段定义、查询参数格式、响应结构等。该API用于支持前端的多维度企业筛选功能。
行业相关: industries, industry_sub_categories, industry_relevance
地理位置: regions (支持34个省市自治区)
联系方式: contact_types (4种联系方式类型)
科技荣誉: tech_honors (5种荣誉类型)
融资情况: funding_rounds (12种融资轮次)
上市状态: listing_status (9种上市状态)
企业规模: company_scale (4种规模类型)
员工人数: employee_count (6个人数区间)
成立年限: establishment_years (6个年限区间)
登记状态: registration_status (8种登记状态)

---

## 接口基本信息

- **接口路径**: `/api/chain-point/{chain_point_id}/enterprises/`
- **请求方法**: `GET`
- **响应格式**: `JSON`
- **编码格式**: `UTF-8`
- **认证方式**: 根据系统要求（可选）

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| chain_point_id | Integer | 是 | 产业链节点ID | `123` |

---

## 查询参数详细说明

### 分页参数

| 参数名 | 类型 | 必填 | 默认值 | 取值范围 | 说明 |
|--------|------|------|--------|----------|------|
| page | Integer | 否 | 1 | ≥1 | 页码（从1开始） |
| page_size | Integer | 否 | 15 | 1-100 | 每页条数 |

### 筛选参数（全部为可选）

#### 1. 行业相关筛选

| 参数名 | 类型 | 说明 | 示例值 | 前端字段映射 |
|--------|------|------|--------|-------------|
| industries | String | 主要行业，多个值用逗号分隔 | `软件,硬件,通信,材料,生物医药` | `this.filters.industries` |
| industry_sub_categories | String | 细分领域，多个值用逗号分隔 | `集成电路设计,半导体制造,通信设备` | `this.filters.industrySubCategories` |
| industry_relevance | String | 产业关联性，多个值用逗号分隔 | `高,中,低` | `this.filters.relevanceLevels` |

#### 2. 地理位置筛选

| 参数名 | 类型 | 说明 | 示例值 | 前端字段映射 |
|--------|------|------|--------|-------------|
| regions | String | 所属地区，多个值用逗号分隔 | `北京市,上海市,广东省,浙江省` | `this.filters.regions` |

**地区筛选支持的完整列表**：
```
北京市, 上海市, 广东省, 浙江省, 江苏省, 四川省, 湖北省, 陕西省, 山东省, 福建省, 
湖南省, 河南省, 安徽省, 重庆市, 天津市, 辽宁省, 河北省, 江西省, 云南省, 山西省, 
广西壮族自治区, 贵州省, 吉林省, 新疆维吾尔自治区, 甘肃省, 内蒙古自治区, 
黑龙江省, 海南省, 宁夏回族自治区, 青海省, 西藏自治区, 香港特别行政区, 
澳门特别行政区, 台湾省
```

#### 3. 联系方式筛选

| 参数名 | 类型 | 说明 | 示例值 | 前端字段映射 |
|--------|------|------|--------|-------------|
| contact_types | String | 联系方式类型，多个值用逗号分隔 | `有固定电话,有有效电话,有官方网站,有邮箱地址` | `this.filters.contactTypes` |

**联系方式类型说明**：
- `有固定电话`: 企业有固定电话号码
- `有有效电话`: 企业有有效的联系电话（包括手机）
- `有官方网站`: 企业有官方网站
- `有邮箱地址`: 企业有邮箱联系方式

#### 4. 科技荣誉筛选

| 参数名 | 类型 | 说明 | 示例值 | 前端字段映射 |
|--------|------|------|--------|-------------|
| tech_honors | String | 科技荣誉，多个值用逗号分隔 | `国家高新技术企业,专精特新企业,独角兽企业` | `this.filters.techHonors` |

**科技荣誉类型**：
- `国家高新技术企业`: 获得国家高新技术企业认定
- `专精特新企业`: 专精特新中小企业
- `独角兽企业`: 独角兽企业
- `瞪羚企业`: 瞪羚企业
- `科技型中小企业`: 科技型中小企业

#### 5. 融资情况筛选

| 参数名 | 类型 | 说明 | 示例值 | 前端字段映射 |
|--------|------|------|--------|-------------|
| funding_rounds | String | 融资轮次，多个值用逗号分隔 | `A轮,B轮,C轮,战略投资` | `this.filters.fundingRounds` |

**融资轮次类型**：
```
种子轮, 天使轮, Pre-A轮, A轮, A+轮, B轮, B+轮, C轮, C+轮, D轮及以上, 战略投资, IPO
```

#### 6. 上市状态筛选

| 参数名 | 类型 | 说明 | 示例值 | 前端字段映射 |
|--------|------|------|--------|-------------|
| listing_status | String | 上市状态，多个值用逗号分隔 | `已上市,新三板,未上市` | `this.filters.listingStatus` |

**上市状态类型**：
```
已上市, 新三板, 北交所, 科创板, 创业板, 主板, 港股, 美股, 未上市
```

#### 7. 企业规模筛选

| 参数名 | 类型 | 说明 | 示例值 | 前端字段映射 |
|--------|------|------|--------|-------------|
| company_scale | String | 企业规模，多个值用逗号分隔 | `大型企业,中型企业,小型企业` | `this.filters.companyScale` |

**企业规模类型**：
```
大型企业, 中型企业, 小型企业, 微型企业
```

#### 8. 员工人数筛选

| 参数名 | 类型 | 说明 | 示例值 | 前端字段映射 |
|--------|------|------|--------|-------------|
| employee_count | String | 员工人数区间，多个值用逗号分隔 | `100-499人,500-999人` | `this.filters.employeeCount` |

**员工人数区间**：
```
1-49人, 50-99人, 100-499人, 500-999人, 1000-4999人, 5000人以上
```

#### 9. 成立年限筛选

| 参数名 | 类型 | 说明 | 示例值 | 前端字段映射 |
|--------|------|------|--------|-------------|
| establishment_years | String | 成立年限区间，多个值用逗号分隔 | `5-10年,10-20年` | `this.filters.establishmentYears` |

**成立年限区间**：
```
1年以内, 1-3年, 3-5年, 5-10年, 10-20年, 20年以上
```

#### 10. 登记状态筛选

| 参数名 | 类型 | 说明 | 示例值 | 前端字段映射 |
|--------|------|------|--------|-------------|
| registration_status | String | 工商登记状态，多个值用逗号分隔 | `存续,在业` | `this.filters.registrationStatus` |

**登记状态类型**：
```
存续, 在业, 迁入, 迁出, 吊销, 注销, 停业, 清算
```

---

## 请求示例

### 1. 基础查询（无筛选条件）
```http
GET /api/chain-point/123/enterprises/?page=1&page_size=15
```

### 2. 单一筛选条件
```http
GET /api/chain-point/123/enterprises/?page=1&page_size=15&industries=软件
```

### 3. 多个筛选条件组合
```http
GET /api/chain-point/123/enterprises/?page=1&page_size=15&industries=软件,硬件&industry_relevance=高,中&regions=北京市,上海市&tech_honors=国家高新技术企业
```

### 4. 复杂筛选查询
```http
GET /api/chain-point/123/enterprises/?page=1&page_size=20&industries=软件,通信&industry_sub_categories=集成电路设计,半导体制造&industry_relevance=高&regions=北京市,上海市,广东省&contact_types=有固定电话,有官方网站&tech_honors=国家高新技术企业,专精特新企业&funding_rounds=A轮,B轮,C轮&listing_status=未上市&company_scale=中型企业,大型企业&employee_count=100-499人,500-999人&establishment_years=5-10年,10-20年&registration_status=存续,在业
```

---

## 响应格式

### 成功响应（200 OK）

```json
{
  "status": "success",
  "enterprises": [
    {
      "id": 12345,
      "company_name": "示例科技有限公司",
      "chain_point_name": "芯片设计",
      "chain_point_level": "核心环节",
      "industry": "软件",
      "industry_sub": "集成电路设计",
      "industry_relevance": "高",
      "region": "北京市",
      "province": "北京市",
      "city": "北京市",
      "district": "海淀区",
      "has_landline": true,
      "has_valid_phone": true,
      "has_website": true,
      "has_email": false,
      "landline": "010-12345678",
      "phone": "13800138000",
      "website": "https://www.example.com",
      "email": null,
      "tech_honors": ["国家高新技术企业", "专精特新企业"],
      "funding_round": "B轮",
      "funding_amount": "5000万人民币",
      "funding_date": "2023-06-15",
      "listing_status": "未上市",
      "listing_exchange": null,
      "listing_code": null,
      "company_scale": "中型企业",
      "employee_count": "100-499人",
      "employee_count_exact": 256,
      "establishment_date": "2018-03-15",
      "establishment_years": "5-10年",
      "registration_status": "存续",
      "registered_capital": "1000万人民币",
      "business_scope": "软件开发、技术咨询...",
      "legal_representative": "张三",
      "address": "北京市海淀区中关村大街1号",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total_count": 150,
  "filtered_count": 45,
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_count": 45,
    "page_size": 15,
    "has_next": true,
    "has_previous": false
  },
  "chain_point": {
    "id": 123,
    "name": "芯片设计",
    "code": "CHIP_DESIGN",
    "level": 2,
    "level_name": "核心环节",
    "parent_id": 100,
    "parent_name": "集成电路产业"
  },
  "applied_filters": {
    "industries": ["软件", "硬件"],
    "industry_relevance": ["高", "中"],
    "regions": ["北京市", "上海市"],
    "tech_honors": ["国家高新技术企业"]
  },
  "available_filters": {
    "industries": ["软件", "硬件", "通信", "材料", "生物医药"],
    "industry_sub_categories": ["集成电路设计", "半导体制造", "通信设备", "新材料"],
    "regions": ["北京市", "上海市", "广东省", "浙江省", "江苏省"],
    "tech_honors": ["国家高新技术企业", "专精特新企业", "独角兽企业", "瞪羚企业"],
    "funding_rounds": ["种子轮", "天使轮", "A轮", "B轮", "C轮", "战略投资"],
    "listing_status": ["已上市", "新三板", "未上市"],
    "company_scale": ["大型企业", "中型企业", "小型企业"],
    "employee_count": ["1-49人", "50-99人", "100-499人", "500-999人"],
    "establishment_years": ["1年以内", "1-3年", "3-5年", "5-10年", "10-20年"],
    "registration_status": ["存续", "在业", "迁入", "迁出"]
  }
}
```

### Coming Soon响应（200 OK）

```json
{
  "status": "coming_soon",
  "message": "该链点的企业数据正在整理中，敬请期待",
  "chain_point": {
    "id": 456,
    "name": "新兴技术节点",
    "code": "NEW_TECH",
    "level": 3,
    "level_name": "支撑环节"
  }
}
```

### 错误响应

#### 404 - 链点不存在
```json
{
  "status": "error",
  "error_code": "CHAIN_POINT_NOT_FOUND",
  "message": "指定的产业链节点不存在",
  "details": {
    "chain_point_id": 999
  }
}
```

#### 400 - 参数错误
```json
{
  "status": "error",
  "error_code": "INVALID_PARAMETERS",
  "message": "请求参数错误",
  "details": {
    "invalid_params": ["page_size"],
    "errors": {
      "page_size": "每页条数必须在1-100之间"
    }
  }
}
```

#### 500 - 服务器错误
```json
{
  "status": "error",
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "服务器内部错误，请稍后重试"
}
```

---

## 数据库字段映射建议

### 企业基本信息表 (companies)

| 数据库字段 | 响应字段 | 类型 | 说明 |
|-----------|----------|------|------|
| id | id | Integer | 主键 |
| company_name | company_name | String | 企业名称 |
| industry | industry | String | 主要行业 |
| industry_sub | industry_sub | String | 细分领域 |
| province | province | String | 省份 |
| city | city | String | 城市 |
| district | district | String | 区县 |
| region | region | String | 地区（省市组合） |
| landline | landline | String | 固定电话 |
| phone | phone | String | 联系电话 |
| website | website | String | 官方网站 |
| email | email | String | 邮箱地址 |
| employee_count_exact | employee_count_exact | Integer | 精确员工数 |
| employee_count_range | employee_count | String | 员工数区间 |
| establishment_date | establishment_date | Date | 成立日期 |
| registered_capital | registered_capital | String | 注册资本 |
| legal_representative | legal_representative | String | 法定代表人 |
| business_scope | business_scope | Text | 经营范围 |
| address | address | String | 注册地址 |
| registration_status | registration_status | String | 登记状态 |

### 产业链关联表 (chain_point_companies)

| 数据库字段 | 响应字段 | 类型 | 说明 |
|-----------|----------|------|------|
| chain_point_id | - | Integer | 链点ID |
| company_id | - | Integer | 企业ID |
| relevance_level | industry_relevance | String | 关联性等级 |
| chain_point_name | chain_point_name | String | 链点名称 |
| chain_point_level | chain_point_level | String | 链点层级 |

### 科技荣誉表 (company_tech_honors)

| 数据库字段 | 响应字段 | 类型 | 说明 |
|-----------|----------|------|------|
| company_id | - | Integer | 企业ID |
| honor_type | tech_honors | Array | 荣誉类型 |
| honor_date | - | Date | 获得日期 |

### 融资信息表 (company_funding)

| 数据库字段 | 响应字段 | 类型 | 说明 |
|-----------|----------|------|------|
| company_id | - | Integer | 企业ID |
| funding_round | funding_round | String | 融资轮次 |
| funding_amount | funding_amount | String | 融资金额 |
| funding_date | funding_date | Date | 融资日期 |

### 上市信息表 (company_listing)

| 数据库字段 | 响应字段 | 类型 | 说明 |
|-----------|----------|------|------|
| company_id | - | Integer | 企业ID |
| listing_status | listing_status | String | 上市状态 |
| listing_exchange | listing_exchange | String | 交易所 |
| listing_code | listing_code | String | 股票代码 |

---

## 筛选逻辑实现建议

### 1. SQL查询构建

```sql
-- 基础查询结构
SELECT DISTINCT c.*, 
       cpc.industry_relevance,
       cpc.chain_point_name,
       cpc.chain_point_level,
       GROUP_CONCAT(cth.honor_type) as tech_honors
FROM companies c
LEFT JOIN chain_point_companies cpc ON c.id = cpc.company_id
LEFT JOIN company_tech_honors cth ON c.id = cth.company_id
LEFT JOIN company_funding cf ON c.id = cf.company_id
LEFT JOIN company_listing cl ON c.id = cl.company_id
WHERE cpc.chain_point_id = ?
  -- 动态添加筛选条件
  AND (? IS NULL OR c.industry IN (?))
  AND (? IS NULL OR c.region IN (?))
  AND (? IS NULL OR cpc.industry_relevance IN (?))
  -- ... 其他筛选条件
GROUP BY c.id
ORDER BY c.company_name
LIMIT ? OFFSET ?
```

### 2. 筛选条件处理

```python
def build_filter_conditions(filters):
    conditions = []
    params = []
    
    # 行业筛选
    if filters.get('industries'):
        industries = filters['industries'].split(',')
        conditions.append(f"c.industry IN ({','.join(['?' for _ in industries])})")
        params.extend(industries)
    
    # 地区筛选
    if filters.get('regions'):
        regions = filters['regions'].split(',')
        conditions.append(f"c.region IN ({','.join(['?' for _ in regions])})")
        params.extend(regions)
    
    # 关联性筛选
    if filters.get('industry_relevance'):
        relevance_levels = filters['industry_relevance'].split(',')
        conditions.append(f"cpc.industry_relevance IN ({','.join(['?' for _ in relevance_levels])})")
        params.extend(relevance_levels)
    
    # 联系方式筛选
    if filters.get('contact_types'):
        contact_conditions = []
        for contact_type in filters['contact_types'].split(','):
            if contact_type == '有固定电话':
                contact_conditions.append("c.landline IS NOT NULL AND c.landline != ''")
            elif contact_type == '有有效电话':
                contact_conditions.append("c.phone IS NOT NULL AND c.phone != ''")
            elif contact_type == '有官方网站':
                contact_conditions.append("c.website IS NOT NULL AND c.website != ''")
            elif contact_type == '有邮箱地址':
                contact_conditions.append("c.email IS NOT NULL AND c.email != ''")
        
        if contact_conditions:
            conditions.append(f"({' OR '.join(contact_conditions)})")
    
    return conditions, params
```

### 3. 分页处理

```python
def paginate_results(query, page, page_size):
    # 计算总数
    count_query = f"SELECT COUNT(DISTINCT c.id) FROM ({query}) as subquery"
    total_count = execute_count_query(count_query)
    
    # 计算分页参数
    total_pages = (total_count + page_size - 1) // page_size
    offset = (page - 1) * page_size
    
    # 添加分页限制
    paginated_query = f"{query} LIMIT {page_size} OFFSET {offset}"
    
    return {
        'query': paginated_query,
        'pagination': {
            'current_page': page,
            'total_pages': total_pages,
            'total_count': total_count,
            'page_size': page_size,
            'has_next': page < total_pages,
            'has_previous': page > 1
        }
    }
```

---

## 性能优化建议

### 1. 数据库索引

```sql
-- 基础索引
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_region ON companies(region);
CREATE INDEX idx_companies_registration_status ON companies(registration_status);

-- 复合索引
CREATE INDEX idx_chain_point_companies_chain_point_id ON chain_point_companies(chain_point_id);
CREATE INDEX idx_chain_point_companies_relevance ON chain_point_companies(chain_point_id, industry_relevance);

-- 联系方式索引
CREATE INDEX idx_companies_contact ON companies(landline, phone, website, email);
```

### 2. 缓存策略

- **筛选选项缓存**: 将 `available_filters` 缓存1小时
- **热门查询缓存**: 缓存常用的筛选组合结果15分钟
- **链点信息缓存**: 缓存链点基本信息24小时

### 3. 查询优化

- 使用预编译语句避免SQL注入
- 对于复杂筛选，考虑使用搜索引擎（如Elasticsearch）
- 实现查询结果的分页缓存

---

## 测试用例

### 1. 基础功能测试

```bash
# 测试基础查询
curl "http://localhost:8000/api/chain-point/123/enterprises/?page=1&page_size=10"

# 测试单一筛选
curl "http://localhost:8000/api/chain-point/123/enterprises/?industries=软件"

# 测试多重筛选
curl "http://localhost:8000/api/chain-point/123/enterprises/?industries=软件,硬件&regions=北京市,上海市"
```

### 2. 边界条件测试

```bash
# 测试空结果
curl "http://localhost:8000/api/chain-point/123/enterprises/?industries=不存在的行业"

# 测试大分页
curl "http://localhost:8000/api/chain-point/123/enterprises/?page=999&page_size=100"

# 测试无效链点ID
curl "http://localhost:8000/api/chain-point/99999/enterprises/"
```

### 3. 性能测试

- 并发请求测试：100个并发用户
- 复杂查询测试：包含所有筛选条件的查询
- 大数据量测试：10万+企业数据的筛选性能

---

## 错误处理

### 1. 参数验证

- 验证 `page` 和 `page_size` 的有效性
- 验证筛选参数值是否在允许的范围内
- 处理特殊字符和编码问题

### 2. 异常处理

- 数据库连接异常
- 查询超时处理
- 内存不足处理

### 3. 日志记录

- 记录所有API请求和响应时间
- 记录异常和错误信息
- 记录慢查询（>1秒）

---

## 版本控制

- **当前版本**: v1.0
- **向后兼容**: 保证至少向后兼容一个主版本
- **废弃通知**: 提前3个月通知API变更

---

## 联系信息

- **开发团队**: 数据中台团队
- **技术支持**: tech-support@company.com
- **文档维护**: api-docs@company.com
- **最后更新**: 2024年12月 