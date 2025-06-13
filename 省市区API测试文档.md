# 省市区 API 接口 Postman 测试文档

## 服务器配置
- **Base URL**: `http://localhost:8000`
- **Content-Type**: `application/json`

## API 接口列表

### 1. 获取完整省市区树形结构

**接口信息**
- **Method**: GET
- **URL**: `http://localhost:8000/api/regions/tree/`
- **描述**: 获取完整的省市区三级联动数据

**请求示例**
```
GET http://localhost:8000/api/regions/tree/
```

**响应示例**
```json
{
  "provinces": [
    {
      "code": "110000",
      "name": "北京市",
      "cities": [
        {
          "code": "110100",
          "name": "市辖区",
          "districts": [
            {
              "code": "110101",
              "name": "东城区"
            },
            {
              "code": "110102",
              "name": "西城区"
            }
          ]
        }
      ]
    }
  ]
}
```

---

### 2. 获取省份列表

**接口信息**
- **Method**: GET
- **URL**: `http://localhost:8000/api/regions/provinces/`
- **描述**: 获取所有省份列表（不包含子级数据）

**请求示例**
```
GET http://localhost:8000/api/regions/provinces/
```

**响应示例**
```json
{
  "provinces": [
    {
      "code": "110000",
      "name": "北京市"
    },
    {
      "code": "120000",
      "name": "天津市"
    },
    {
      "code": "130000",
      "name": "河北省"
    }
  ]
}
```

---

### 3. 获取城市列表

**接口信息**
- **Method**: GET
- **URL**: `http://localhost:8000/api/regions/cities/`
- **描述**: 获取城市列表，支持按省份筛选

**请求示例 1: 获取所有城市**
```
GET http://localhost:8000/api/regions/cities/
```

**请求示例 2: 获取北京市下的城市**
```
GET http://localhost:8000/api/regions/cities/?province_code=110000
```

**响应示例**
```json
{
  "cities": [
    {
      "code": "110100",
      "name": "市辖区",
      "province_code": "110000",
      "province_name": "北京市"
    }
  ]
}
```

---

### 4. 获取区县列表

**接口信息**
- **Method**: GET
- **URL**: `http://localhost:8000/api/regions/districts/`
- **描述**: 获取区县列表，支持按城市或省份筛选

**请求示例 1: 获取所有区县**
```
GET http://localhost:8000/api/regions/districts/
```

**请求示例 2: 获取北京市辖区下的区县**
```
GET http://localhost:8000/api/regions/districts/?city_code=110100
```

**请求示例 3: 获取北京市下的所有区县**
```
GET http://localhost:8000/api/regions/districts/?province_code=110000
```

**响应示例**
```json
{
  "districts": [
    {
      "code": "110101",
      "name": "东城区",
      "city_code": "110100",
      "city_name": "市辖区",
      "province_code": "110000",
      "province_name": "北京市"
    },
    {
      "code": "110102",
      "name": "西城区",
      "city_code": "110100",
      "city_name": "市辖区",
      "province_code": "110000",
      "province_name": "北京市"
    }
  ]
}
```

---

### 5. 获取地区详情

**接口信息**
- **Method**: GET
- **URL**: `http://localhost:8000/api/regions/{type}/{code}/`
- **描述**: 获取指定地区的详细信息
- **参数**:
  - `type`: 地区类型 (province/city/district)
  - `code`: 地区代码

**请求示例 1: 获取省份详情**
```
GET http://localhost:8000/api/regions/province/110000/
```

**响应示例**
```json
{
  "code": "110000",
  "name": "北京市",
  "cities": [
    {
      "code": "110100",
      "name": "市辖区",
      "districts": [
        {
          "code": "110101",
          "name": "东城区"
        }
      ]
    }
  ]
}
```

**请求示例 2: 获取城市详情**
```
GET http://localhost:8000/api/regions/city/110100/
```

**响应示例**
```json
{
  "code": "110100",
  "name": "市辖区",
  "districts": [
    {
      "code": "110101",
      "name": "东城区"
    },
    {
      "code": "110102",
      "name": "西城区"
    }
  ]
}
```

**请求示例 3: 获取区县详情**
```
GET http://localhost:8000/api/regions/district/110101/
```

**响应示例**
```json
{
  "code": "110101",
  "name": "东城区"
}
```

---

### 6. 地区搜索

**接口信息**
- **Method**: GET
- **URL**: `http://localhost:8000/api/regions/search/`
- **描述**: 根据关键词搜索地区
- **参数**:
  - `keyword`: 搜索关键词（必需）
  - `type`: 搜索类型 (province/city/district/all，默认 all)
  - `limit`: 返回数量限制（默认 20）

**请求示例 1: 搜索包含"海"的所有地区**
```
GET http://localhost:8000/api/regions/search/?keyword=海
```

**请求示例 2: 只搜索城市**
```
GET http://localhost:8000/api/regions/search/?keyword=海&type=city
```

**请求示例 3: 限制返回 5 条结果**
```
GET http://localhost:8000/api/regions/search/?keyword=海&limit=5
```

**响应示例**
```json
{
  "keyword": "海",
  "type": "all",
  "count": 15,
  "results": [
    {
      "type": "province",
      "code": "460000",
      "name": "海南省",
      "full_name": "海南省"
    },
    {
      "type": "city",
      "code": "310000",
      "name": "上海市",
      "full_name": "上海市",
      "province_code": "310000",
      "province_name": "上海市"
    },
    {
      "type": "district",
      "code": "110108",
      "name": "海淀区",
      "full_name": "北京市 市辖区 海淀区",
      "city_code": "110100",
      "city_name": "市辖区",
      "province_code": "110000",
      "province_name": "北京市"
    }
  ]
}
```

---

## Postman 集合配置

### 1. 创建新的 Collection
1. 打开 Postman
2. 点击 "New" → "Collection"
3. 命名为 "省市区 API 测试"

### 2. 设置环境变量
1. 点击右上角的设置图标
2. 选择 "Manage Environments"
3. 点击 "Add"
4. 创建环境变量：
   - Variable: `base_url`
   - Initial Value: `http://localhost:8000`
   - Current Value: `http://localhost:8000`

### 3. 添加请求

#### 请求 1: 获取省市区树形结构
- **Name**: 获取省市区树形结构
- **Method**: GET
- **URL**: `{{base_url}}/api/regions/tree/`

#### 请求 2: 获取省份列表
- **Name**: 获取省份列表
- **Method**: GET
- **URL**: `{{base_url}}/api/regions/provinces/`

#### 请求 3: 获取城市列表
- **Name**: 获取城市列表（所有）
- **Method**: GET
- **URL**: `{{base_url}}/api/regions/cities/`

#### 请求 4: 按省份获取城市
- **Name**: 按省份获取城市
- **Method**: GET
- **URL**: `{{base_url}}/api/regions/cities/`
- **Params**: 
  - Key: `province_code`
  - Value: `110000`

#### 请求 5: 获取区县列表
- **Name**: 获取区县列表（所有）
- **Method**: GET
- **URL**: `{{base_url}}/api/regions/districts/`

#### 请求 6: 按城市获取区县
- **Name**: 按城市获取区县
- **Method**: GET
- **URL**: `{{base_url}}/api/regions/districts/`
- **Params**: 
  - Key: `city_code`
  - Value: `110100`

#### 请求 7: 省份详情
- **Name**: 获取省份详情
- **Method**: GET
- **URL**: `{{base_url}}/api/regions/province/110000/`

#### 请求 8: 城市详情
- **Name**: 获取城市详情
- **Method**: GET
- **URL**: `{{base_url}}/api/regions/city/110100/`

#### 请求 9: 区县详情
- **Name**: 获取区县详情
- **Method**: GET
- **URL**: `{{base_url}}/api/regions/district/110101/`

#### 请求 10: 地区搜索
- **Name**: 搜索地区
- **Method**: GET
- **URL**: `{{base_url}}/api/regions/search/`
- **Params**: 
  - Key: `keyword`
  - Value: `海淀`

---

## 常用测试场景

### 场景 1: 三级联动选择器
1. 先调用获取省份列表接口
2. 用户选择省份后，调用按省份获取城市接口
3. 用户选择城市后，调用按城市获取区县接口

### 场景 2: 搜索功能
1. 用户输入关键词
2. 调用搜索接口
3. 返回匹配的省市区列表

### 场景 3: 企业筛选
1. 在企业列表页面添加地区筛选器
2. 用户选择地区后，将地区代码作为筛选条件
3. 查询该地区下的所有企业

---

## 错误处理

### 常见错误响应

**404 错误 - 地区不存在**
```json
{
  "detail": "province 代码 999999 不存在"
}
```

**400 错误 - 参数错误**
```json
{
  "detail": "无效的地区类型，支持: province/city/district"
}
```

**400 错误 - 缺少搜索关键词**
```json
{
  "detail": "请提供搜索关键词"
}
```

---

## 性能优化建议

1. **缓存**: 省市区数据相对稳定，建议在前端缓存
2. **分页**: 对于大量数据，可以添加分页参数
3. **按需加载**: 根据业务需求选择合适的接口（简单列表 vs 树形结构）

---

## 测试检查清单

- [ ] 所有接口都能正常返回数据
- [ ] 筛选参数工作正常
- [ ] 搜索功能返回正确结果
- [ ] 错误处理正确
- [ ] 响应时间在可接受范围内
- [ ] 数据格式符合预期 