# AI聊天组件使用说明

## 概述

这是一个为Django项目设计的全局AI聊天框组件，参考Grok聊天界面设计，具有现代化的UI和流畅的交互体验。

## 功能特点

### 🎨 视觉设计
- **现代化界面**：参考Grok聊天界面的设计风格
- **配色协调**：与网站的深蓝色主题完美融合
- **精美Logo**：右上角嵌入定制的AI助手Logo
- **响应式设计**：适配桌面端和移动端

### 🖱️ 交互功能
- **悬浮触发按钮**：固定在右下角的圆形按钮
- **滑入动画**：聊天窗口平滑的进入/退出动画
- **自适应输入框**：根据内容自动调整高度
- **实时响应**：按钮状态实时更新

### 🧩 组件元素
- **模型选择器**：右上角"Grok 3"下拉菜单
- **DeepSearch**：搜索功能下拉菜单
- **Think按钮**：带有脉冲动画效果
- **附件上传**：文件上传功能图标
- **发送按钮**：带有向上箭头的发送键

## 安装步骤

### 1. 文件结构
确保以下文件已正确放置：
```
data_hall/
├── static/
│   ├── ai_assistant_logo.svg                     # AI助手Logo
│   └── data_hall/css/ai_chat_widget.css          # 组件样式文件
└── templates/data_hall/
    ├── components/ai_chat_widget.html             # 组件模板
    └── base.html                                  # 基础模板（已集成）
```

### 2. 组件集成
组件已自动集成到`base.html`中，所有继承此模板的页面都会显示聊天组件：

```html
<!-- 在base.html中已添加 -->
{% include 'data_hall/components/ai_chat_widget.html' %}
```

### 3. 样式引用
组件会自动加载所需的CSS文件：
```html
<link rel="stylesheet" href="{% static 'data_hall/css/ai_chat_widget.css' %}" />
```

## 使用方式

### 全局使用（推荐）
组件已集成到`base.html`，无需额外配置，在所有页面中自动显示。

### 单独页面使用
如需在特定页面单独使用，可以直接引入：
```html
{% load static %}
{% include 'data_hall/components/ai_chat_widget.html' %}
```

## 自定义配置

### 修改位置
在`ai_chat_widget.css`中修改位置：
```css
#ai-chat-widget {
  position: fixed;
  bottom: 1.5rem;  /* 距离底部距离 */
  right: 1.5rem;   /* 距离右侧距离 */
}
```

### 修改尺寸
调整聊天窗口大小：
```css
#chat-window {
  width: 24rem;     /* 宽度 */
  height: 600px;    /* 高度 */
}
```

### 修改颜色主题
组件使用CSS变量，可以通过修改这些变量来调整颜色：
```css
:root {
  --button-highlight: #00BFFF;  /* 主要按钮颜色 */
  --bg-secondary: #0A1020;      /* 背景色 */
  --text-primary: #FFFFFF;      /* 主要文本色 */
  --text-secondary: #D0D7E0;    /* 次要文本色 */
}
```

## 交互说明

### 基本操作
1. **打开聊天**：点击右下角的圆形按钮
2. **发送消息**：在输入框中输入内容，点击发送按钮或按回车键
3. **关闭聊天**：点击右上角的关闭按钮或点击聊天窗口外部

### 高级功能
1. **模型选择**：点击右上角"Grok 3"选择不同的AI模型
2. **搜索功能**：点击"DeepSearch"使用不同的搜索选项
3. **思考模式**：点击"Think"按钮启用AI思考模式
4. **附件上传**：点击附件图标上传文件（功能待实现）

### 键盘快捷键
- `Enter`：发送消息
- `Shift + Enter`：换行
- `Esc`：关闭聊天窗口（可扩展）

## 响应式特性

### 桌面端（>768px）
- 窗口尺寸：384px × 600px
- 位置：固定在右下角
- 完整功能展示

### 平板端（≤768px）
- 窗口尺寸：屏幕宽度 - 2rem
- 位置：居中显示
- 触发按钮调整为较小尺寸

### 手机端（≤480px）
- 窗口尺寸：几乎全屏
- 位置：覆盖大部分屏幕
- 优化的触摸交互

## 性能优化

### CSS优化
- 使用CSS变量减少重复
- 硬件加速的动画效果
- 高效的滚动条样式

### JavaScript优化
- 事件委托减少内存占用
- 防抖处理用户输入
- 懒加载和异步处理

### 动画优化
- 使用`transform`而非改变布局属性
- 60fps流畅动画效果
- 合理的动画时长设置

## 扩展开发

### 后端集成
要连接真正的AI服务，需要修改JavaScript中的发送消息函数：

```javascript
// 发送消息到后端
async function sendMessage() {
    const message = chatInput.value.trim();
    if (message === '') return;

    addMessage(message, 'user');
    const typingIndicator = showTypingIndicator();
    
    try {
        const response = await fetch('/api/chat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        
        if (typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }
        
        addMessage(data.response, 'ai');
    } catch (error) {
        console.error('Error:', error);
        addMessage('抱歉，出现了错误，请稍后再试。', 'ai');
    }
}
```

### 功能扩展
1. **消息历史**：保存聊天记录到localStorage
2. **语音输入**：集成语音识别API
3. **文件上传**：实现真正的文件上传功能
4. **多语言支持**：添加国际化支持

### 自定义主题
可以创建多套主题配色：

```css
/* 暗色主题 */
.theme-dark {
  --chat-bg: #1a1a1a;
  --chat-text: #ffffff;
}

/* 亮色主题 */
.theme-light {
  --chat-bg: #ffffff;
  --chat-text: #000000;
}
```

## 故障排除

### 常见问题

1. **组件不显示**
   - 检查CSS文件是否正确加载
   - 确认模板路径是否正确
   - 检查浏览器控制台是否有错误

2. **样式异常**
   - 确认CSS变量是否正确定义
   - 检查是否有样式冲突
   - 验证Tailwind CSS是否正常工作

3. **交互无响应**
   - 检查JavaScript是否有错误
   - 确认DOM元素ID是否唯一
   - 验证事件监听器是否正确绑定

### 调试技巧
- 使用浏览器开发者工具检查元素
- 在控制台测试JavaScript函数
- 使用网络标签页检查资源加载

## 更新日志

### v1.0.0 (当前版本)
- ✅ 基础聊天界面实现
- ✅ 响应式设计适配
- ✅ Grok风格UI设计
- ✅ 流畅动画效果
- ✅ 模拟AI对话功能

### 未来计划
- 🔄 后端API集成
- 🔄 消息历史功能
- 🔄 语音交互支持
- 🔄 主题切换功能
- 🔄 多语言支持

## 技术支持

如有问题或建议，请联系开发团队。

---

*此组件专为中国新势力企业态势感知系统设计，遵循系统的整体设计规范和技术标准。* 