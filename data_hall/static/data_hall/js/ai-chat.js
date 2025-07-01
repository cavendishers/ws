// AI聊天交互逻辑 - 腾讯智能体版本
// 防止重复加载
if (typeof window.AIChatManager !== 'undefined') {
  console.log('AI聊天管理器已存在，跳过重复加载');
} else {

class AIChatManager {
  constructor(options = {}) {
    // 配置选项 - 使用腾讯智能体API
    this.apiUrl = options.apiUrl || '/api/ai/chat/';
    this.sessionsUrl = options.sessionsUrl || '/api/ai/sessions/';
    this.modelName = options.modelName || 'tencent-agent';
    this.systemPrompt = options.systemPrompt || '你是一个产业研究智能助手，专注于分析新势力企业和产业链数据。请基于数据提供准确、专业的回答。';
    
    // 聊天状态管理
    this.currentSessionId = null;      // 当前会话ID（由腾讯云管理）
    this.isWaitingForResponse = false; // 是否正在等待AI响应
    this.currentAbortController = null; // 当前请求的取消控制器
    this.conversationHistory = [];     // 当前对话历史（临时存储，用于UI显示）
    
    // 初始化状态
    this.isInitialized = false;
    
    console.log('AIChatManager 初始化完成 - 腾讯智能体版本');
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

  // 初始化聊天管理器
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('初始化腾讯智能体聊天管理器...');
      
      // 腾讯智能体会自动管理会话，我们只需要准备UI状态
      this.conversationHistory = [];
      this.currentSessionId = null;
      this.isInitialized = true;
      
      console.log('腾讯智能体聊天管理器初始化完成');
      return true;
    } catch (error) {
      console.error('初始化失败:', error);
      this.isInitialized = true;
      return false;
    }
  }

  // 编码表情符号为HTML实体
  encodeEmojis(text) {
    return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, 
      function(match) {
        return '&#' + match.codePointAt(0) + ';';
      });
  }

  // 解码HTML实体为表情符号
  decodeEmojis(text) {
    return text.replace(/&#(\d+);/g, function(match, dec) {
      return String.fromCodePoint(dec);
    });
  }

  // 获取当前对话历史（用于UI显示）
  getAllMessages() {
    return [...this.conversationHistory]; // 返回副本避免外部修改
  }

  // 发送消息到腾讯智能体
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
      // 标准化消息内容
      const sanitizedMessage = message.trim().normalize('NFC');
      
      console.log('发送消息给腾讯智能体:', sanitizedMessage);

      // 立即添加用户消息到UI（乐观更新）
      const userMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content: sanitizedMessage,
        timestamp: new Date().toISOString(),
        metadata: { status: 'sending' }
      };
      this.conversationHistory.push(userMessage);
      
      // 构建请求体
      const requestBody = {
        message: sanitizedMessage,
        session_id: this.currentSessionId // 如果有会话ID则传递，没有则创建新会话
      };

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
        throw new Error(`腾讯智能体请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('腾讯智能体API响应:', data);

      // 检查响应状态
      if (data.success === false) {
        throw new Error(data.error || '腾讯智能体服务返回错误');
      }

      // 更新会话ID
      if (data.session_id) {
        this.currentSessionId = data.session_id;
        console.log('会话ID已更新:', this.currentSessionId);
      }

      // 更新用户消息状态
      const userMsgIndex = this.conversationHistory.findIndex(msg => msg.id === userMessage.id);
      if (userMsgIndex !== -1) {
        this.conversationHistory[userMsgIndex].metadata = { status: 'sent' };
      }

      // 添加AI回复到UI
      const aiResponse = data.response || "抱歉，我无法处理您的请求。";
      const assistantMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: data.timestamp || new Date().toISOString(),
        metadata: {
          model: data.model || this.modelName,
          session_id: this.currentSessionId,
          provider: 'tencent'
        }
      };
      this.conversationHistory.push(assistantMessage);

      console.log('消息发送成功，AI回复已添加');
      return aiResponse;

    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 移除乐观添加的用户消息（如果请求失败）
      const lastMsg = this.conversationHistory[this.conversationHistory.length - 1];
      if (lastMsg && lastMsg.role === 'user' && lastMsg.metadata?.status === 'sending') {
        this.conversationHistory.pop();
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
      console.log('取消当前腾讯智能体请求');
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.isWaitingForResponse = false;
  }

  // 开始新会话
  async startNewSession() {
    try {
      console.log('开始新的腾讯智能体会话...');
      
      // 清空当前对话历史
      this.conversationHistory = [];
      this.currentSessionId = null;
      
      console.log('新会话已准备就绪');
      return true;
    } catch (error) {
      console.error('开始新会话失败:', error);
      return false;
    }
  }

  // 获取会话列表（如果需要）
  async getSessions() {
    try {
      console.log('获取腾讯智能体会话列表...');
      
      const response = await fetch(this.sessionsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': this.getCSRFToken(),
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`获取会话列表失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('会话列表:', data);
      
      return data.sessions || [];
    } catch (error) {
      console.error('获取会话列表失败:', error);
      return [];
    }
  }

  // 获取状态信息
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isWaitingForResponse: this.isWaitingForResponse,
      currentSessionId: this.currentSessionId,
      messagesCount: this.conversationHistory.length,
      provider: 'tencent'
    };
  }

  // 检查是否正在等待AI响应
  isCurrentlyWaitingForResponse() {
    return this.isWaitingForResponse;
  }

  // 强制重置等待状态
  forceResetWaitingState() {
    console.warn('强制重置腾讯智能体响应等待状态');
    this.isWaitingForResponse = false;
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  // 获取最后一次AI回复
  getLastResponse() {
    if (this.conversationHistory.length > 0) {
      for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
        if (this.conversationHistory[i].role === 'assistant') {
          return this.conversationHistory[i].content;
        }
      }
    }
    return null;
  }

  // 清空当前对话（开始新会话）
  clearConversation() {
    console.log('清空当前对话，开始新会话');
    return this.startNewSession();
  }

  // === 以下是已废弃的方法，保留用于兼容性 ===

  // 已废弃：腾讯智能体不支持历史记录分页加载
  async loadChatHistory() {
    console.warn('loadChatHistory 方法已废弃 - 腾讯智能体会自动管理会话历史');
    return [];
  }

  // 已废弃：腾讯智能体不支持消息删除
  async deleteMessagePair() {
    console.warn('deleteMessagePair 方法已废弃 - 腾讯智能体不支持消息删除');
    throw new Error('腾讯智能体不支持消息删除功能');
  }

  // 已废弃：腾讯智能体不支持消息编辑
  async updateMessage() {
    console.warn('updateMessage 方法已废弃 - 腾讯智能体不支持消息编辑');
    throw new Error('腾讯智能体不支持消息编辑功能');
  }

  // 已废弃：腾讯智能体不支持清空历史记录
  async clearAllMessages() {
    console.warn('clearAllMessages 方法已废弃 - 请使用 startNewSession 开始新会话');
    return this.startNewSession();
  }

  // 已废弃：腾讯智能体不支持历史记录刷新
  async refreshChatHistory() {
    console.warn('refreshChatHistory 方法已废弃 - 腾讯智能体会自动管理会话历史');
    return [];
  }

  // 已废弃：腾讯智能体不支持重新生成
  async regenerateResponse() {
    console.warn('regenerateResponse 方法已废弃 - 腾讯智能体不支持重新生成功能');
    throw new Error('腾讯智能体不支持重新生成功能，请发送新的消息');
  }

  // 已废弃：使用 sendMessage 替代
  addMessage(role, content) {
    console.warn('addMessage 方法已废弃，请使用 sendMessage');
    return this.conversationHistory;
  }

  // 已废弃：模拟发送已移除
  simulateSendMessage() {
    console.warn('simulateSendMessage 方法已废弃，请使用真实的腾讯智能体API');
    throw new Error('simulateSendMessage 方法已移除，请使用真实的腾讯智能体API');
  }

  // 已废弃：分页相关功能
  needsLoadMore() {
    console.warn('needsLoadMore 方法已废弃 - 腾讯智能体不使用分页');
    return false;
  }

  // 已废弃：对话历史提取
  getConversationHistory() {
    console.warn('getConversationHistory 方法已废弃 - 腾讯智能体会自动管理上下文');
    return [];
  }

  // 已废弃：消息标准化
  normalizeMessages(messages) {
    console.warn('normalizeMessages 方法已废弃 - 腾讯智能体使用标准格式');
    return messages;
  }
}

// 导出到全局对象，方便其他文件访问
window.AIChatManager = AIChatManager;

console.log('AI聊天管理器类已加载 - 腾讯智能体版本');

} // 结束重复加载保护

// 全局AI聊天管理器实例（在保护块外面，确保总是创建）
if (!window.aiChatManager) {
  window.aiChatManager = new window.AIChatManager({
    apiUrl: '/api/ai/chat/',
    sessionsUrl: '/api/ai/sessions/',
    modelName: 'tencent-agent',
    systemPrompt: '你是一个产业研究智能助手，专注于分析新势力企业和产业链数据。请基于数据提供准确、专业的回答。'
  });
  console.log('腾讯智能体聊天管理器实例已创建');
} else {
  console.log('AI聊天管理器实例已存在，跳过创建');
} 