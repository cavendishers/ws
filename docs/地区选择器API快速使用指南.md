# 地区选择器API快速使用指南

## 快速开始

### 1. 基础调用

```javascript
// 显示地区选择器
window.regionSelector.show([], function(codes, names) {
    console.log('选中的地区代码:', codes);
    console.log('选中的地区名称:', names);
});
```

### 2. 带预选数据调用

```javascript
// 预选无锡市
const preselected = ['320200'];
window.regionSelector.show(preselected, handleSelection);

function handleSelection(codes, names) {
    // 处理选择结果
    updateRegionFilter(codes);
}
```

## 数据传递示例

### 选择无锡市的数据流程

**用户操作**：搜索并选择"无锡市"

**回调接收的数据**：
```javascript
function onConfirm(selectedCodes, selectedNames) {
    // selectedCodes: ['320200', '320000']
    // selectedNames: ['无锡市', '江苏省']
    
    // 发送到后端的筛选条件
    const filterData = {
        region_codes: selectedCodes,
        // 或者只使用主要选择
        primary_region: selectedCodes[0] // '320200' (无锡市)
    };
}
```

### 后端筛选处理

```python
# Django后端示例
def filter_companies(request):
    region_codes = request.POST.getlist('region_codes')
    
    # 方法1：精确匹配选中的地区
    companies = CompanyInfo.objects.filter(region_code__in=region_codes)
    
    # 方法2：包含子地区的匹配
    if region_codes:
        # 构建或查询条件
        q_objects = Q()
        for code in region_codes:
            # 匹配该地区及其所有子地区
            q_objects |= Q(region_code__startswith=code[:4])
        
        companies = CompanyInfo.objects.filter(q_objects)
    
    return JsonResponse({
        'companies': list(companies.values()),
        'count': companies.count()
    })
```

## 常用场景

### 企业筛选页面集成

```javascript
// HTML
<button id="select-region">选择地区 <span id="region-count">(0)</span></button>
<div id="region-display">未选择地区</div>

// JavaScript
document.getElementById('select-region').onclick = function() {
    const current = getCurrentSelectedRegions(); // 获取当前选择
    
    window.regionSelector.show(current, function(codes, names) {
        // 更新界面显示
        document.getElementById('region-count').textContent = `(${names.length})`;
        document.getElementById('region-display').textContent = names.join(', ');
        
        // 执行筛选
        filterCompaniesByRegion(codes);
    });
};

function filterCompaniesByRegion(codes) {
    fetch('/companies/filter/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({region_codes: codes})
    })
    .then(response => response.json())
    .then(data => {
        updateCompanyList(data.companies);
    });
}
```

## API接口

### 主要方法

```javascript
// 显示选择器
regionSelector.show(selectedRegions, onConfirm)

// 隐藏选择器
regionSelector.hide()

// 重置选择
regionSelector.reset()

// 获取当前选择（实时）
regionSelector.getSelectedRegions()     // 返回地区代码数组
regionSelector.getSelectedRegionNames() // 返回地区名称数组

// 名称与代码转换
regionSelector.findRegionName(code)     // 根据代码查找名称
regionSelector.findRegionCode(name)     // 根据名称查找代码
```

## 重要提醒

1. **自动初始化**：组件会自动加载，无需手动初始化
2. **数据格式**：回调函数返回两个数组：地区代码和地区名称
3. **智能计数**：选择江苏省时虽然包含所有子地区，但计数显示为1
4. **包含关系**：选择父地区时，子地区会显示为选中状态（文氏图逻辑）
5. **双向转换**：支持地区名称和代码的双向查找转换

## 故障排除

### 组件未加载
```javascript
// 检查组件是否存在
if (!window.regionSelector) {
    console.error('地区选择器未初始化');
    // 手动初始化
    initRegionSelector();
}
```

### 数据格式错误
```javascript
// 确保传入的是数组格式
const regions = typeof selectedRegions === 'string' 
    ? JSON.parse(selectedRegions) 
    : selectedRegions || [];

window.regionSelector.show(regions, callback);
``` 