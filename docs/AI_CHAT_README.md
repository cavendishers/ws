# AI聊天系统部署指南

## 概述

本项目集成了基于DeepSeek模型的AI聊天助手，提供产业研究相关的智能问答服务。系统采用前后端分离架构，后端使用Django REST Framework，前端使用原生JavaScript。

## 主要特性

- ✅ 对接真实的DeepSeek API（OpenAI兼容格式）
- ✅ 支持对话历史记录和上下文理解
- ✅ 完整的错误处理和日志记录
- ✅ 跨域请求支持（CORS）
- ✅ 响应速度优化和并发处理
- ✅ 前端聊天持久化存储
- ✅ 多种API调用格式支持
- ✅ 健康检查和监控接口

## 技术架构

### 后端技术栈
- Django 4.x
- Django REST Framework
- OpenAI Python SDK
- httpx（异步HTTP客户端）
- django-cors-headers

### 前端技术栈
- 原生JavaScript ES6+
- IndexedDB（聊天记录持久化）
- CSS3动画和交互

### API接口设计
```
POST /api/ai/chat/          # 主要聊天接口
GET  /api/ai/chat/          # 获取API状态
GET  /api/ai/chat/config/   # 获取配置信息
GET  /api/ai/health/        # 健康检查
```

## 快速部署

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 设置API密钥

```bash
export DEEPSEEK_API_KEY="your_deepseek_api_key"
```

### 3. 启动服务

```bash
# 简化启动
python start_ai_chat_simple.py

# 或手动启动
python manage.py runserver
```

就这么简单！系统会自动：
- ✅ 检查API密钥配置
- ✅ 启动Django服务器
- ✅ 提供完整的AI聊天功能

## API使用说明

### 基本聊天请求

```javascript
// 基本消息
fetch('/api/ai/chat/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        messages: "你好，请介绍一下新势力企业的发展情况"
    })
})
.then(response => response.json())
.then(data => console.log(data.response));

// 带对话历史
fetch('/api/ai/chat/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        messages: "请详细说明一下",
        conversation_history: [
            {"role": "user", "content": "什么是新势力企业？"},
            {"role": "assistant", "content": "新势力企业是指..."}
        ]
    })
})
```

### 响应格式

```json
{
    "success": true,
    "response": "AI回复内容",
    "model": "deepseek-chat",
    "usage": {
        "prompt_tokens": 25,
        "completion_tokens": 150,
        "total_tokens": 175
    },
    "metadata": {
        "finish_reason": "stop",
        "response_time": 1.23
    }
}
```

### 错误响应格式

```json
{
    "success": false,
    "response": "错误描述信息",
    "error": "具体错误详情",
    "error_type": "ValidationError"
}
```

## 前端集成

### 1. 引入AI聊天组件

```html
<!-- 在HTML页面中引入 -->
{% include 'data_hall/components/ai_chat_widget.html' %}

<!-- 或者作为独立页面 -->
<iframe src="{% url 'data_hall:chat_widget' %}" width="100%" height="600px"></iframe>
```

### 2. JavaScript API调用

```javascript
// 使用内置的AI聊天管理器
const response = await window.aiChatManager.sendMessage("你的问题");
console.log(response);

// 或者直接调用API
const chatResponse = await fetch('/api/ai/chat/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({messages: "你的问题"})
});
const data = await chatResponse.json();
```

## 配置说明

### 系统提示词配置

在 `settings.py` 中修改系统提示词：

```python
DEEPSEEK_SYSTEM_PROMPT = '''
你是一个专业的产业研究智能助手，专门分析新势力企业和产业链数据。
请基于以下要求回答问题：
1. 提供准确、客观的信息
2. 结合数据进行分析
3. 回答要专业且易懂
4. 如不确定请明确说明
'''
```

### 模型参数调整

```python
# 在settings.py中调整
DEEPSEEK_MAX_TOKENS = 1000      # 最大回复长度
DEEPSEEK_TEMPERATURE = 0.7      # 创造性程度 (0-2)
```

## 监控和维护

### 1. 健康检查

```bash
curl http://localhost:8000/api/ai/health/
```

### 2. 日志监控

日志文件位置：`ai_chat.log`

关键日志级别：
- INFO：正常请求处理
- WARNING：请求验证失败
- ERROR：API调用失败

### 3. 性能监控

监控指标：
- 响应时间（`response_time`字段）
- Token使用量（`usage`字段）
- 错误率

## 故障排除

### 常见问题

1. **API密钥错误**
   ```
   错误：Authentication failed
   解决：检查DEEPSEEK_API_KEY环境变量是否正确设置
   ```

2. **CORS跨域问题**
   ```
   错误：Access-Control-Allow-Origin
   解决：确保corsheaders已正确配置，检查CORS_ALLOWED_ORIGINS设置
   ```

3. **请求超时**
   ```
   错误：Request timeout
   解决：检查网络连接，考虑增加超时时间设置
   ```

4. **模型响应异常**
   ```
   错误：Invalid response format
   解决：检查DeepSeek API状态，查看详细错误日志
   ```

### 调试模式

开启详细日志：

```python
# settings.py
LOGGING = {
    'loggers': {
        'ai_chat': {
            'level': 'DEBUG',  # 改为DEBUG级别
        },
    },
}
```

## 扩展功能

### 1. 添加流式响应

可以扩展支持流式响应，实现打字机效果：

```python
# 在ai_services.py中添加
async def stream_chat_completion(self, user_message: str):
    # 流式响应实现
    pass
```

### 2. 添加文件上传支持

扩展支持图片或文档上传：

```python
# 在序列化器中添加文件字段
class ChatRequestSerializer(serializers.Serializer):
    attachment = serializers.FileField(required=False)
```

### 3. 添加会话管理

实现多会话管理和会话持久化：

```python
# 创建会话模型
class ChatSession(models.Model):
    session_id = models.CharField(max_length=100, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

## 安全考虑

1. **API密钥安全**：不要在代码中硬编码API密钥
2. **输入验证**：对用户输入进行严格验证和过滤
3. **访问控制**：考虑添加用户认证和速率限制
4. **HTTPS**：生产环境必须使用HTTPS
5. **日志安全**：避免在日志中记录敏感信息

## 生产环境部署

### 1. 环境变量

```bash
export DEBUG=False
export DEEPSEEK_API_KEY="your_production_api_key"
export CORS_ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

### 2. 性能优化

```python
# settings.py 生产环境配置
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}

# 启用数据库连接池
DATABASES['default']['CONN_MAX_AGE'] = 60
```

### 3. 部署命令

```bash
# 使用gunicorn部署
gunicorn mysite.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --log-level info
```

## 支持与联系

如有问题或建议，请通过以下方式联系：
- 项目Issues
- 技术文档Wiki
- 开发团队邮箱

---

**最后更新**：2024年12月
**版本**：v1.0.0 