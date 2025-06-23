// AI聊天交互逻辑 - 完全基于后端 API 的版本
// 防止重复加载
if (typeof window.AIChatManager !== 'undefined') {
  console.log('AI聊天管理器已存在，跳过重复加载');
} else {

class AIChatManager {
  constructor(options = {}) {
    // 配置选项
    this.apiUrl = options.apiUrl || '/api/ai/chat/';
    this.historyUrl = options.historyUrl || '/api/ai/history/';
    this.modelName = options.modelName || 'deepseek-chat';
    this.maxTokens = options.maxTokens || 1000;
    this.temperature = options.temperature || 0.7;
    this.systemPrompt = options.systemPrompt || '你是一个产业研究智能助手，专注于分析新势力企业和产业链数据。请基于数据提供准确、专业的回答。';

    // 聊天状态管理
    this.messages = [];              // 当前会话的所有消息（从后端同步）
    this.isWaitingForResponse = false; // 是否正在等待AI响应
    this.isLoadingHistory = false;   // 是否正在加载历史记录
    this.currentAbortController = null; // 当前请求的取消控制器
    
    // 分页状态
    this.currentPage = 0;           // 当前已加载的页数
    this.pageSize = 10;             // 每页消息数量
    this.hasMoreMessages = true;    // 是否还有更多历史消息
    this.totalMessages = 0;         // 总消息数量
    
    // 初始化状态
    this.isInitialized = false;
    
    console.log('AIChatManager 初始化完成 - 仅使用后端API');
  }

  // 获取CSRF token
  getCSRFToken() {
    // 先尝试从meta标签获取
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) {
      return metaToken.getAttribute('content');
    }
    // 再尝试从cookie获取
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') {
        return decodeURIComponent(value);
      }
    }
    return '';
  }

  // 初始化聊天 - 从后端加载最近的消息
  async initialize() {
    if (this.isInitialized) {
      return this.messages;
    }

    try {
      console.log('开始从后端初始化聊天历史...');
      await this.loadChatHistory(true); // true 表示初始加载
      this.isInitialized = true;
      console.log(`聊天历史初始化完成，共加载 ${this.messages.length} 条消息`);
      return this.messages;
    } catch (error) {
      console.error('初始化聊天历史失败:', error);
      this.messages = [];
      this.isInitialized = true;
      return this.messages;
    }
  }

  // 从后端加载聊天历史
  async loadChatHistory(isInitialLoad = false) {
    if (this.isLoadingHistory) {
      console.log('正在加载历史记录，跳过重复请求');
      return;
    }

    if (!isInitialLoad && !this.hasMoreMessages) {
      console.log('没有更多历史消息可加载');
      return;
    }

    this.isLoadingHistory = true;
    const targetPage = isInitialLoad ? 1 : this.currentPage + 1;

    try {
      console.log(`加载聊天历史 - 页码: ${targetPage}, 每页: ${this.pageSize}`);
      
      const response = await fetch(`${this.historyUrl}?page=${targetPage}&page_size=${this.pageSize}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': this.getCSRFToken(),
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`获取聊天历史失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('聊天历史 API 响应:', data);

      // 更新分页状态
      this.hasMoreMessages = data.has_next;
      this.totalMessages = data.total;
      this.currentPage = data.page;

      if (isInitialLoad) {
        // 初始加载：直接设置消息数组
        this.messages = this.normalizeMessages(data.results);
        console.log(`初始加载完成，消息数量: ${this.messages.length}`);
      } else {
        // 分页加载：合并到现有消息前面（因为API返回的是时间倒序）
        const newMessages = this.normalizeMessages(data.results);
        this.messages = [...newMessages, ...this.messages];
        console.log(`分页加载完成，新增 ${newMessages.length} 条消息，总计: ${this.messages.length}`);
      }

      return this.messages;

    } catch (error) {
      console.error('加载聊天历史失败:', error);
      throw error;
    } finally {
      this.isLoadingHistory = false;
    }
  }

  // 标准化消息格式
  normalizeMessages(apiMessages) {
    return apiMessages.map(msg => ({
      id: msg.id,
      role: msg.role === 'user' ? 'user' : 'assistant', // 统一角色命名
      content: msg.content,
      timestamp: msg.created_at,
      metadata: msg.metadata || {}
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // 按时间正序排列
  }

  // 获取所有消息（用于UI渲染）
  getAllMessages() {
    return [...this.messages]; // 返回副本避免外部修改
  }

  // 获取对话历史（用于发送给AI的上下文）
  getConversationHistory(maxMessages = 10) {
    // 获取最近的消息作为上下文，排除系统消息
    const recentMessages = this.messages
      .filter(msg => msg.role !== 'system')
      .slice(-maxMessages)
      .map(msg => ({ role: msg.role, content: msg.content }));
    
    return recentMessages;
  }

  // 发送消息到AI
  async sendMessage(message) {
    if (this.isWaitingForResponse) {
      console.warn('已有请求正在处理中...');
      return null;
    }

    if (!message || !message.trim()) {
      throw new Error('消息内容不能为空');
    }

    this.isWaitingForResponse = true;
    
    // 创建AbortController用于取消请求
    this.currentAbortController = new AbortController();
    
    try {
      console.log('发送消息给AI:', message);

      // 立即添加用户消息到本地（乐观更新）
      const userMessage = {
        id: `temp-user-${Date.now()}`, // 临时ID
        role: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString(),
        metadata: { status: 'sending' }
      };
      this.messages.push(userMessage);

      // 构建请求体
      const requestBody = {
        messages: message.trim()
      };

      // 如果有对话历史，加入上下文
      const conversationHistory = this.getConversationHistory(8);
      if (conversationHistory.length > 0) {
        requestBody.conversation_history = conversationHistory;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': this.getCSRFToken(),
        },
        body: JSON.stringify(requestBody),
        signal: this.currentAbortController.signal
      });

      if (!response.ok) {
        throw new Error(`AI服务请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('AI API响应:', data);

      // 检查响应状态
      if (data.success === false) {
        throw new Error(data.response || 'AI服务返回错误');
      }

      const aiResponse = data.response || "抱歉，我无法处理您的请求。";

      // 更新用户消息状态（移除sending状态）
      const userMsgIndex = this.messages.findIndex(msg => msg.id === userMessage.id);
      if (userMsgIndex !== -1) {
        this.messages[userMsgIndex].metadata = { status: 'sent' };
      }

      // 添加AI回复到本地
      const assistantMessage = {
        id: `temp-ai-${Date.now()}`, // 临时ID
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          model: data.model || this.modelName,
          usage: data.usage || {},
          response_time: data.metadata?.response_time || 0
        }
      };
      this.messages.push(assistantMessage);

      console.log('消息发送成功，AI回复已添加到本地');
      return aiResponse;

    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 移除乐观添加的用户消息（如果请求失败）
      const userMsgIndex = this.messages.findIndex(msg => 
        msg.id === `temp-user-${userMessage?.id?.split('-')[2]}`
      );
      if (userMsgIndex !== -1) {
        this.messages.splice(userMsgIndex, 1);
      }

      throw error;
    } finally {
      this.isWaitingForResponse = false;
      this.currentAbortController = null;
    }
  }

  // 停止当前AI响应
  stopCurrentResponse() {
    if (this.currentAbortController) {
      console.log('取消当前AI响应请求');
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.isWaitingForResponse = false;
  }

  // 清空所有聊天记录
  async clearAllMessages() {
    try {
      console.log('开始清空所有聊天记录...');
      
      const response = await fetch(this.historyUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': this.getCSRFToken(),
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`删除聊天记录失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('聊天记录删除成功:', data);

      // 清空本地消息数组
      this.messages = [];
      
      // 重置分页状态
      this.currentPage = 0;
      this.hasMoreMessages = true;
      this.totalMessages = 0;

      console.log('本地聊天记录已清空');
      return data;

    } catch (error) {
      console.error('清空聊天记录失败:', error);
      throw error;
    }
  }

  // 刷新聊天记录（重新从后端加载）
  async refreshChatHistory() {
    try {
      console.log('刷新聊天记录...');
      
      // 重置状态
      this.messages = [];
      this.currentPage = 0;
      this.hasMoreMessages = true;
      this.totalMessages = 0;
      this.isInitialized = false;

      // 重新初始化
      await this.initialize();
      
      console.log('聊天记录刷新完成');
      return this.messages;

    } catch (error) {
      console.error('刷新聊天记录失败:', error);
      throw error;
    }
  }

  // 检查是否需要加载更多历史记录（用于滚动监听）
  needsLoadMore() {
    return this.hasMoreMessages && !this.isLoadingHistory;
  }

  // 获取状态信息
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isWaitingForResponse: this.isWaitingForResponse,
      isLoadingHistory: this.isLoadingHistory,
      messagesCount: this.messages.length,
      totalMessages: this.totalMessages,
      currentPage: this.currentPage,
      hasMoreMessages: this.hasMoreMessages
    };
  }

  // 重新生成AI回复（针对指定消息）
  async regenerateResponse(messageId, userMessage) {
    if (this.isWaitingForResponse) {
      console.warn('已有请求正在处理中，无法重新生成');
      return null;
    }

    try {
      console.log('重新生成AI回复:', userMessage);
      
      // 查找要重新生成的AI消息
      const messageIndex = this.messages.findIndex(msg => 
        msg.id === messageId || (msg.role === 'assistant' && 
        this.messages[this.messages.indexOf(msg) - 1]?.content === userMessage)
      );

      if (messageIndex === -1) {
        throw new Error('未找到要重新生成的消息');
      }

      // 发送重新生成请求
      const response = await this.sendMessage(userMessage);
      
      // 替换原来的AI回复
      if (response && messageIndex < this.messages.length) {
        this.messages[messageIndex] = {
          ...this.messages[messageIndex],
          content: response,
          timestamp: new Date().toISOString(),
          metadata: { ...this.messages[messageIndex].metadata, regenerated: true }
        };
      }

      return response;

    } catch (error) {
      console.error('重新生成回复失败:', error);
      throw error;
    }
  }

  // 注意：以下方法已弃用，仅保留作为兼容性接口
  addMessage(role, content) {
    console.warn('addMessage 方法已弃用，请使用 sendMessage 或直接通过后端API管理消息');
    return this.messages;
  }

  clearConversation() {
    console.warn('clearConversation 方法已弃用，请使用 clearAllMessages');
    return this.clearAllMessages();
  }

  simulateSendMessage() {
    throw new Error('simulateSendMessage 方法已移除，请使用真实的AI API');
  }
}

// 导出到全局对象，方便其他文件访问
window.AIChatManager = AIChatManager;

console.log('AI聊天管理器类已加载 - 完全基于后端API版本');

} // 结束重复加载保护

// 全局AI聊天管理器实例（在保护块外面，确保总是创建）
if (!window.aiChatManager) {
  window.aiChatManager = new window.AIChatManager({
    apiUrl: '/api/ai/chat/',
    historyUrl: '/api/ai/history/',
    modelName: 'deepseek-chat',
    systemPrompt: '你是一个产业研究智能助手，专注于分析新势力企业和产业链数据。请基于数据提供准确、专业的回答。'
  });
  console.log('AI聊天管理器实例已创建');
} else {
  console.log('AI聊天管理器实例已存在，跳过创建');
} 