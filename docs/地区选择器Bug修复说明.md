# 地区选择器Bug修复说明

## Bug描述

**错误信息**：
```
Uncaught TypeError: window.regionSelector.findRegionCode is not a function
    at ChainSidebar.syncRegionSelectorState (chain-sidebar.js:1763:52)
    at ChainSidebar.openRegionSelector (chain-sidebar.js:1702:14)
```

**触发场景**：
当用户选择了一个地区后，想要重新选择地区时，点击"所属地区"按钮会触发此错误。

## 问题根因

`chain-sidebar.js`中的多个方法调用了`window.regionSelector.findRegionCode()`方法，但该方法在地区选择器类中不存在。

**受影响的代码位置**：
- `chain-sidebar.js:1393` - `removeRegionAndChildren()`方法
- `chain-sidebar.js:1706` - `openRegionSelector()`方法  
- `chain-sidebar.js:1762` - `syncRegionSelectorState()`方法

## 修复方案

在`RegionSelector`类中新增`findRegionCode(name)`方法，实现根据地区名称查找对应地区代码的功能。

### 新增方法实现

```javascript
/**
 * 根据地区名称查找代码
 */
findRegionCode(name) {
    if (!this.regionDomCache || !name) return null;
    
    // 直接匹配地区名称
    const items = this.regionDomCache.querySelectorAll('[data-name]');
    for (const item of items) {
        if (item.dataset.name === name) {
            return item.dataset.code;
        }
    }
    
    // 如果直接匹配失败，尝试去除常见后缀再匹配
    const cleanName = name.replace(/(省|市|自治区|特别行政区|区|县|自治县|自治州)$/, '');
    for (const item of items) {
        const itemName = item.dataset.name;
        const cleanItemName = itemName.replace(/(省|市|自治区|特别行政区|区|县|自治县|自治州)$/, '');
        if (cleanItemName === cleanName) {
            return item.dataset.code;
        }
    }
    
    return null;
}
```

### 方法特点

1. **精确匹配**：优先进行完全匹配地区名称
2. **智能匹配**：支持去除常见地区后缀后的模糊匹配
3. **容错处理**：对空值和缺失数据进行保护
4. **高效查询**：基于DOM缓存进行快速查找

### 使用示例

```javascript
// 根据名称查找代码
const code1 = window.regionSelector.findRegionCode('江苏省');
console.log(code1); // "320000"

const code2 = window.regionSelector.findRegionCode('无锡市'); 
console.log(code2); // "320200"

// 支持简称匹配
const code3 = window.regionSelector.findRegionCode('江苏');
console.log(code3); // "320000"

// 根据代码查找名称（已有方法）
const name = window.regionSelector.findRegionName('320200');
console.log(name); // "无锡市"
```

## 修复验证

修复后，用户可以正常进行以下操作：

1. ✅ 选择地区后再次点击"所属地区"按钮
2. ✅ 重新选择不同的地区
3. ✅ 清空地区选择后重新选择
4. ✅ 多次切换地区选择

## 相关API更新

修复同时完善了地区选择器的API接口：

```javascript
// 新增的双向转换方法
regionSelector.findRegionName(code)     // 根据代码查找名称（已有）
regionSelector.findRegionCode(name)     // 根据名称查找代码（新增）
```

## 注意事项

1. **数据依赖**：方法依赖`regionDomCache`中的地区数据，确保数据完整性
2. **名称规范**：建议使用标准的地区名称进行查询
3. **性能考虑**：查找基于DOM遍历，大数据量时考虑缓存优化

## 总结

此次修复解决了地区选择器在重复使用时的JavaScript错误，增强了组件的稳定性和可用性。同时完善了API接口，提供了完整的地区名称与代码双向转换功能。 