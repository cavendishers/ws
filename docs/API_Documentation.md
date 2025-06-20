# 产业链企业查询API文档

## 接口概述

该API用于查询特定产业链节点的关联企业信息，支持多维度筛选和分页功能。

---

## 接口详情

### 基本信息

- **接口路径**: `/api/chain-point/{chain_point_id}/enterprises/`
- **请求方法**: `GET`
- **响应格式**: `JSON`

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| chain_point_id | Integer | 是 | 产业链节点ID |

### 查询参数

#### 分页参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | Integer | 否 | 1 | 页码（从1开始） |
| page_size | Integer | 否 | 15 | 每页条数（建议1-100） |

#### 筛选参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| industries | String | 否 | 主要行业（逗号分隔多个值） | `软件,硬件,通信` |
| industry_sub_categories | String | 否 | 细分领域（逗号分隔多个值） | `集成电路,半导体` |
| relevance_levels | String | 否 | 产业关联性（逗号分隔多个值） | `高,中,低` |
| regions | String | 否 | 所属地区（逗号分隔多个值） | `北京市,上海市,广东省` |
| contact_types | String | 否 | 联系方式类型（逗号分隔多个值） | `有固定电话,有有效电话,有官方网站,有邮箱地址` |
| tech_honors | String | 否 | 科技荣誉（逗号分隔多个值） | `国家高新技术企业,专精特新企业` |
| funding_rounds | String | 否 | 融资轮次（逗号分隔多个值） | `A轮,B轮,C轮` |
| listing_status | String | 否 | 上市状态（逗号分隔多个值） | `已上市,新三板,未上市` |
| company_scale | String | 否 | 企业规模（逗号分隔多个值） | `大型企业,中型企业` |
| employee_count | String | 否 | 员工人数（逗号分隔多个值） | `100-499人,500-999人` |
| establishment_years | String | 否 | 成立年限（逗号分隔多个值） | `5-10年,10-20年` |
| registration_status | String | 否 | 登记状态（逗号分隔多个值） | `存续,在业` |

---

## 请求示例

### 基础查询
```http
GET /api/chain-point/123/enterprises/?page=1&page_size=15
```

### 带筛选条件的查询
```http
GET /api/chain-point/123/enterprises/?page=1&page_size=15&industries=软件,硬件&relevance_levels=高,中&regions=北京市,上海市
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
      "has_landline": true,
      "has_valid_phone": true,
      "has_website": true,
      "has_email": false,
      "tech_honors": "国家高新技术企业",
      "funding_round": "B轮",
      "listing_status": "未上市",
      "company_scale": "中型企业",
      "employee_count": "100-499人",
      "establishment_years": "5-10年",
      "registration_status": "存续"
    }
  ],
  "total_count": 150,
  "pagination": {
    "current_page": 1,
    "total_pages": 10,
    "total_count": 150,
    "page_size": 15,
    "has_next": true,
    "has_previous": false
  },
  "chain_point": {
    "id": 123,
    "name": "芯片设计",
    "code": "CHIP_DESIGN",
    "level": 2
  },
  "available_filters": {
    "industries": ["软件", "硬件", "通信", "材料"],
    "industry_sub_categories": ["集成电路设计", "半导体", "通信设备"],
    "regions": ["北京市", "上海市", "广东省", "浙江省"],
    "tech_honors": ["国家高新技术企业", "专精特新企业", "独角兽企业"],
    "funding_rounds": ["种子轮", "天使轮", "A轮", "B轮", "C轮"],
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
    "level": 3
  }
}
```

### 错误响应（4xx/5xx）

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

---

## 响应字段说明

### 企业信息字段 (enterprises)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 企业唯一标识 |
| company_name | String | 企业名称 |
| chain_point_name | String | 关联的产业链节点名称 |
| chain_point_level | String | 产业链环节（如：核心环节、上游、下游） |
| industry | String | 主要行业 |
| industry_sub | String | 细分领域 |
| industry_relevance | String | 产业关联性（高/中/低） |
| region | String | 所属地区 |
| has_landline | Boolean | 是否有固定电话 |
| has_valid_phone | Boolean | 是否有有效电话 |
| has_website | Boolean | 是否有官方网站 |
| has_email | Boolean | 是否有邮箱地址 |
| tech_honors | String | 科技荣誉（可为null） |
| funding_round | String | 融资轮次（可为null） |
| listing_status | String | 上市状态 |
| company_scale | String | 企业规模 |
| employee_count | String | 员工人数区间 |
| establishment_years | String | 成立年限区间 |
| registration_status | String | 工商登记状态 |

### 分页信息字段 (pagination)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| current_page | Integer | 当前页码 |
| total_pages | Integer | 总页数 |
| total_count | Integer | 总记录数 |
| page_size | Integer | 每页条数 |
| has_next | Boolean | 是否有下一页 |
| has_previous | Boolean | 是否有上一页 |

### 可用筛选选项 (available_filters)

该字段为可选字段，如果后端返回此字段，前端将使用这些选项构建筛选UI。如果不返回，前端将使用预设的筛选选项。

---

## 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 404 | 产业链节点不存在 |
| 500 | 服务器内部错误 |

---

## 筛选参数值说明

### 产业关联性 (relevance_levels)
- `高`: 与产业链节点高度相关
- `中`: 与产业链节点中度相关  
- `低`: 与产业链节点低度相关

### 联系方式类型 (contact_types)
- `有固定电话`: 企业有固定电话号码
- `有有效电话`: 企业有有效的联系电话
- `有官方网站`: 企业有官方网站
- `有邮箱地址`: 企业有邮箱联系方式

### 科技荣誉 (tech_honors)
- `国家高新技术企业`: 获得国家高新技术企业认定
- `专精特新企业`: 专精特新中小企业
- `独角兽企业`: 独角兽企业
- `瞪羚企业`: 瞪羚企业
- `科技型中小企业`: 科技型中小企业

### 融资轮次 (funding_rounds)
- `种子轮`, `天使轮`, `Pre-A轮`, `A轮`, `A+轮`, `B轮`, `B+轮`, `C轮`, `C+轮`, `D轮及以上`, `战略投资`, `IPO`

### 上市状态 (listing_status)
- `已上市`, `新三板`, `北交所`, `科创板`, `创业板`, `主板`, `港股`, `美股`, `未上市`

### 企业规模 (company_scale)
- `大型企业`, `中型企业`, `小型企业`, `微型企业`

### 员工人数 (employee_count)
- `1-49人`, `50-99人`, `100-499人`, `500-999人`, `1000-4999人`, `5000人以上`

### 成立年限 (establishment_years)
- `1年以内`, `1-3年`, `3-5年`, `5-10年`, `10-20年`, `20年以上`

### 登记状态 (registration_status)
- `存续`, `在业`, `迁入`, `迁出`, `吊销`, `注销`, `停业`, `清算`

---

## 注意事项

1. **分页**: 建议每页条数不超过100条，以保证响应性能
2. **筛选**: 多个筛选条件之间是AND关系，同一筛选条件内的多个值是OR关系
3. **缓存**: 建议对筛选选项进行适当缓存，减少重复请求
4. **错误处理**: 前端应妥善处理各种错误情况，提供友好的用户提示
5. **兼容性**: 如果后端暂时不支持某些筛选参数，应忽略这些参数而不是返回错误

---

## 版本信息

- **API版本**: v1.0
- **最后更新**: 2024年
- **维护团队**: 数据中台团队 