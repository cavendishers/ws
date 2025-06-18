# AI聊天助手常驻功能使用说明

## 概述

AI聊天助手常驻功能通过iframe架构实现，确保聊天助手在整个网站中始终保持在线状态，不会因为页面跳转而被重新加载或刷新，从而保持聊天记录和状态的连续性。

## 架构设计

### 核心组件

1. **Shell容器页面** (`shell.html`)
   - 作为整个应用的外层容器
   - 包含两个主要iframe：主内容iframe和聊天助手iframe
   - 负责iframe间的通信和导航管理

2. **聊天助手iframe** (`chat_widget_standalone.html`)
   - 独立的聊天助手页面，加载原有的`ai_chat_widget.html`
   - 透明背景，只有聊天组件接收用户交互
   - 维持聊天状态和记录不变

3. **主内容iframe** (`base_iframe.html` + 各页面的iframe版本)
   - 动态加载网站的各个页面内容
   - 拦截所有导航行为，转为iframe内容切换
   - 保持原有页面功能不变

## 访问方式

### 主要入口
- **Shell页面**: `/shell/` - 带有常驻聊天助手的完整应用
- **独立聊天助手**: `/chat-widget/` - 仅聊天助手页面

### iframe版本页面
- 首页: `/iframe/`
- 新势力榜单: `/iframe/ranking/`
- 产业链: `/iframe/industry/`
- 企业库: `/iframe/enterprise/`
- 产业地图: `/iframe/map/`
- 产业报告: `/iframe/report/`
- 商业快讯: `/iframe/news/`
- 精准招商: `/iframe/precision/`
- 登录页: `/iframe/login/`

## 功能特点

### 1. 聊天助手常驻
- ✅ 页面跳转时聊天助手不重新加载
- ✅ 聊天记录持续保存在IndexedDB中
- ✅ 聊天窗口位置和状态保持不变
- ✅ 支持拖动、最小化、全屏等所有原有功能

### 2. 数据持久化
- ✅ **IndexedDB存储**：使用浏览器原生IndexedDB API，数据本地化存储
- ✅ **聊天记录持久化**：所有用户和AI的对话记录自动保存
- ✅ **会话管理**：按日期自动分组聊天会话
- ✅ **窗口状态保存**：聊天窗口位置、大小、最小化状态持续保存
- ✅ **设置同步**：用户偏好设置自动保存和恢复
- ✅ **数据导入导出**：支持聊天记录的备份和恢复功能

### 3. 无缝导航
- ✅ 所有导航链接自动拦截并转换为iframe内容切换
- ✅ 保持原有的导航栏样式和交互逻辑
- ✅ 支持桌面端和移动端菜单
- ✅ URL状态同步（通过postMessage通信）

### 4. 兼容性保证
- ✅ 保持所有现有页面的完整功能
- ✅ API调用和数据加载正常工作
- ✅ 样式和布局完全一致
- ✅ JavaScript交互功能完整

## 使用方法

### 开发者

1. **访问Shell页面**: 直接访问 `/shell/` 路径
2. **页面内容管理**: 通过主内容iframe动态加载各页面
3. **导航处理**: 所有`<a>`链接自动转换为iframe导航

### 最终用户

1. **正常使用**: 访问 `/shell/` 即可使用带有常驻聊天助手的完整系统
2. **聊天功能**: 
   - 点击右下角聊天按钮打开聊天窗口
   - 支持拖动聊天窗口到任意位置
   - 可最小化或全屏聊天
   - 聊天记录在页面间切换时保持不变

3. **页面导航**: 
   - 点击导航栏菜单项正常跳转
   - 聊天助手始终保持在屏幕上
   - 聊天状态和记录不会丢失

## 技术实现

### 数据持久化机制

```javascript
// IndexedDB数据库初始化
const chatStorage = new ChatStorageManager();
await chatStorage.initDB();

// 保存聊天消息
await chatStorage.saveMessage(content, sender, metadata);

// 恢复聊天记录
const messages = await chatStorage.getMessages();
messages.forEach(message => {
    addMessageToUI(message.content, message.sender, false);
});

// 清除会话记录
await chatStorage.clearSession();
```

### iframe通信机制

```javascript
// 主内容iframe向Shell发送导航请求
window.parent.postMessage({
    type: 'navigate',
    url: targetUrl
}, '*');

// Shell接收导航请求并更新iframe源
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'navigate') {
        document.getElementById('content').src = event.data.url;
    }
});
```

### 导航拦截

```javascript
// 拦截所有导航链接
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const url = this.getAttribute('data-url');
        if (url && window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'navigate',
                url: url
            }, '*');
        }
    });
});
```

## 注意事项

### 开发注意事项

1. **URL配置**: 确保所有iframe版本的URL路由正确配置
2. **链接更新**: 页面内的所有导航链接需要使用`data-url`属性和`nav-link`类
3. **样式继承**: iframe页面需要包含完整的CSS样式
4. **API兼容**: 确保API调用在iframe环境中正常工作

### 用户体验优化

1. **加载提示**: Shell页面提供加载状态提示
2. **错误处理**: 对iframe加载失败进行错误处理
3. **性能优化**: 避免重复加载相同的iframe内容
4. **移动端适配**: 确保在移动设备上的良好体验

## 故障排除

### 常见问题

1. **聊天助手不显示**: 检查`/chat-widget/`路径是否可访问
2. **导航不工作**: 确认链接使用了正确的`data-url`属性
3. **样式丢失**: 检查iframe页面的CSS引用
4. **API调用失败**: 验证CORS设置和相对路径
5. **聊天记录不持久化**: 
   - 检查浏览器是否支持IndexedDB
   - 确认`chat-storage.js`是否正确加载
   - 查看浏览器开发工具中的Application > IndexedDB
6. **存储空间不足**: 检查浏览器存储配额，清理不必要的数据

### 调试方法

1. 打开浏览器开发工具
2. 检查Console中的错误信息
3. 验证iframe的src属性是否正确
4. 确认postMessage通信是否正常
5. **持久化调试**：
   - 打开Application标签页 > IndexedDB > AIChatStorage
   - 检查chatMessages表中是否有数据
   - 在Console中测试：`window.chatStorage.getMessages()`
   - 检查存储管理器状态：`window.chatStorage.db`

## 未来扩展

### 可能的改进方向

1. **路由同步**: 实现Shell页面URL与iframe内容的同步
2. **状态管理**: 更完善的应用状态管理
3. **缓存优化**: iframe内容的智能缓存机制
4. **多窗口支持**: 支持多个聊天窗口或功能窗口

### 兼容性考虑

- 支持所有现代浏览器
- 移动端设备良好兼容
- 考虑无障碍访问需求 