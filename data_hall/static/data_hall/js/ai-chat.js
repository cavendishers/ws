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
    
    /*
     * 表情符号编码策略说明：
     * 1. 前端发送消息时，将表情符号编码为HTML实体（如😊 -> &#128522;）
     * 2. 后端接收到encode_emojis=true时，应该：
     *    - 将AI回复中的表情符号也编码为HTML实体后再存储到数据库
     *    - 确保数据库字符集支持或使用编码存储
     * 3. 前端渲染时，自动将HTML实体解码为表情符号显示
     */

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

  // 标准化消息格式
  normalizeMessages(apiMessages) {
    return apiMessages.map(msg => ({
      id: msg.id,
      role: msg.role === 'user' ? 'user' : 'assistant', // 统一角色命名
      content: this.decodeEmojis(msg.content), // 解码表情符号用于显示
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
      // 构建请求体 - 确保表情符号正确编码并兼容数据库
      let sanitizedMessage = message.trim().normalize('NFC'); // 标准化Unicode字符
      sanitizedMessage = this.encodeEmojis(sanitizedMessage); // 编码表情符号
      
      console.log('发送消息给AI:', message);
      console.log('编码后的消息:', sanitizedMessage);

      // 立即添加用户消息到本地（乐观更新） - 保持原始文本用于显示
      const userMessage = {
        id: `temp-user-${Date.now()}`, // 临时ID
        role: 'user',
        content: message.trim().normalize('NFC'), // 保持原始Unicode字符用于显示
        timestamp: new Date().toISOString(),
        metadata: { status: 'sending' }
      };
      this.messages.push(userMessage);
      
      const requestBody = {
        messages: sanitizedMessage,
        encode_emojis: true, // 告知后端需要对回复进行表情符号编码
        emoji_encoding_method: 'html_entities' // 指定编码方法
      };

      // 如果有对话历史，加入上下文 - 同样处理表情符号
      const conversationHistory = this.getConversationHistory(8).map(msg => {
        let content = msg.content.normalize('NFC'); // 标准化历史消息中的Unicode字符
        content = this.encodeEmojis(content); // 编码表情符号
        return {
          role: msg.role,
          content: content
        };
      });
      if (conversationHistory.length > 0) {
        requestBody.conversation_history = conversationHistory;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': this.getCSRFToken(),
          'X-Emoji-Encoding': 'true', // 告知后端使用表情符号编码
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

      let aiResponse = data.response || "抱歉，我无法处理您的请求。";
      
      // 后端已经处理了表情符号编码/解码，直接使用返回的内容
      // 如果回复中包含HTML实体编码的表情符号，解码为显示格式
      if (data.metadata && data.metadata.has_emojis) {
        aiResponse = this.decodeEmojis(aiResponse);
      }
      
              // 更新用户消息状态（使用后端返回的真实ID）
        const userMsgIndex = this.messages.findIndex(msg => msg.id === userMessage.id);
        if (userMsgIndex !== -1) {
          // 如果后端返回了用户消息ID，更新为真实ID
          if (data.metadata && data.metadata.user_message_id) {
            this.messages[userMsgIndex].id = data.metadata.user_message_id;
            console.log('用户消息ID已更新为:', data.metadata.user_message_id);
          }
          this.messages[userMsgIndex].metadata = { status: 'sent' };
        }

              // 添加AI回复到本地（使用后端返回的真实ID）
        const assistantMessage = {
          id: (data.metadata && data.metadata.ai_message_id) || `temp-ai-${Date.now()}`, // 优先使用后端返回的ID
          role: 'assistant',
          content: aiResponse, // AI回复内容（已处理表情符号）
          timestamp: data.timestamp || new Date().toISOString(),
          metadata: {
            model: data.model || this.modelName,
            usage: data.usage || {},
            response_time: data.metadata?.response_time || 0,
            has_emojis: data.metadata?.has_emojis || false,
            ai_message_id: data.metadata?.ai_message_id
          }
        };
      this.messages.push(assistantMessage);

              console.log('消息发送成功，AI回复已添加到本地');
        console.log('AI回复原始内容:', aiResponse);
        console.log('AI回复是否包含表情符号:', /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu.test(aiResponse));
        console.log('AI消息保存状态:', (data.metadata && data.metadata.ai_message_id) ? '已保存到数据库' : '仅本地存储');
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

  // 删除指定的消息对（用户消息和对应的AI回复）
  async deleteMessagePair(userMessageId) {
    try {
      console.log('开始删除消息对，用户消息ID:', userMessageId);
      
      const response = await fetch(`${this.historyUrl}${userMessageId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': this.getCSRFToken(),
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`删除消息失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('消息删除成功:', data);

      // 从本地消息数组中移除对应的消息
      this.messages = this.messages.filter(msg => {
        // 删除用户消息本身
        if (msg.id === userMessageId) {
          return false;
        }
        // 查找并删除对应的AI回复（通常在用户消息后面）
        const userMsgIndex = this.messages.findIndex(m => m.id === userMessageId);
        const currentMsgIndex = this.messages.indexOf(msg);
        
        // 如果是紧跟在用户消息后的AI回复，也删除
        if (userMsgIndex !== -1 && currentMsgIndex === userMsgIndex + 1 && msg.role === 'assistant') {
          return false;
        }
        return true;
      });

      console.log('本地消息已更新，删除了用户消息及其AI回复');
      return data;

    } catch (error) {
      console.error('删除消息失败:', error);
      throw error;
    }
  }

  // 更新用户消息内容
  async updateMessage(messageId, newContent) {
    try {
      console.log('开始更新消息，ID:', messageId, '新内容:', newContent);
      
      // 标准化并编码新内容
      let sanitizedContent = newContent.trim().normalize('NFC');
      sanitizedContent = this.encodeEmojis(sanitizedContent);
      
      const response = await fetch(`${this.historyUrl}${messageId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': this.getCSRFToken(),
          'X-Emoji-Encoding': 'true',
        },
        body: JSON.stringify({
          content: sanitizedContent
        }),
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`更新消息失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('消息更新成功:', data);

      // 更新本地消息数组中的对应消息
      const messageIndex = this.messages.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        this.messages[messageIndex].content = newContent.trim().normalize('NFC');
        this.messages[messageIndex].metadata = {
          ...this.messages[messageIndex].metadata,
          edited: true,
          edit_time: new Date().toISOString()
        };
        console.log('本地消息已更新');
      }

      return data;

    } catch (error) {
      console.error('更新消息失败:', error);
      throw error;
    }
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

  // 新增：检查是否正在等待AI响应
  isCurrentlyWaitingForResponse() {
    return this.isWaitingForResponse;
  }

  // 新增：强制重置等待状态（用于处理状态不一致的情况）
  forceResetWaitingState() {
    console.warn('强制重置AI响应等待状态');
    this.isWaitingForResponse = false;
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  // 新增：获取最后一次AI回复（用于检查是否有未显示的回复）
  getLastResponse() {
    if (this.messages.length > 0) {
      // 查找最后一条AI消息
      for (let i = this.messages.length - 1; i >= 0; i--) {
        if (this.messages[i].role === 'ai' || this.messages[i].role === 'assistant') {
          return this.messages[i].content;
        }
      }
    }
    return null;
  }

  // 重新生成AI回复（针对指定的用户消息）
  async regenerateResponse(userMessage, userMessageId = null) {
    if (this.isWaitingForResponse) {
      console.warn('已有请求正在处理中，无法重新生成');
      return null;
    }

    this.isWaitingForResponse = true;
    this.currentAbortController = new AbortController();

    try {
      console.log('重新生成AI回复，用户消息:', userMessage);
      console.log('用户消息ID:', userMessageId);
      
      // 优先使用用户消息ID查找，如果没有则使用内容匹配
      let userMsg = null;
      let userMsgIndex = -1;
      
      if (userMessageId) {
        // 使用ID精确查找
        userMsgIndex = this.messages.findIndex(msg => msg.id === userMessageId);
        if (userMsgIndex !== -1) {
          userMsg = this.messages[userMsgIndex];
        }
      }
      
      // 如果ID查找失败，使用内容匹配（处理编辑后的消息）
      if (!userMsg) {
        userMsgIndex = this.messages.findIndex(msg => 
          msg.role === 'user' && msg.content.trim() === userMessage.trim()
        );
        if (userMsgIndex !== -1) {
          userMsg = this.messages[userMsgIndex];
          userMessageId = userMsg.id; // 更新userMessageId
        }
      }

      if (!userMsg) {
        // 如果仍然没找到，说明这是编辑后的新消息，需要特殊处理
        console.log('未找到对应的用户消息，这可能是编辑后的新消息');
        // 创建临时用户消息对象用于处理
        userMsg = {
          id: null,
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString()
        };
        userMessageId = null; // 重置ID
      }

      let aiMsgIndex = -1;
      let aiMsg = null;

      // 查找紧跟其后的AI回复（如果有已知的用户消息位置）
      if (userMsgIndex !== -1 && userMsgIndex + 1 < this.messages.length) {
        const nextMsg = this.messages[userMsgIndex + 1];
        if (nextMsg.role === 'assistant') {
          aiMsgIndex = userMsgIndex + 1;
          aiMsg = nextMsg;
        }
      }

      // 构建重新生成的请求
      let sanitizedMessage = userMessage.trim().normalize('NFC');
      sanitizedMessage = this.encodeEmojis(sanitizedMessage);

      const requestBody = {
        messages: sanitizedMessage,
        encode_emojis: true,
        emoji_encoding_method: 'html_entities',
        regenerate: true, // 标记为重新生成请求
        user_message_id: userMessageId // 传递用户消息ID用于后端识别（可能为null）
      };

      // 添加上下文（排除当前要重新生成的消息对）
      const contextMessages = this.messages
        .slice(0, userMsgIndex) // 只取之前的消息作为上下文
        .filter(msg => msg.role !== 'system')
        .slice(-6) // 取最近6条作为上下文
        .map(msg => ({
          role: msg.role,
          content: this.encodeEmojis(msg.content.normalize('NFC'))
        }));

      if (contextMessages.length > 0) {
        requestBody.conversation_history = contextMessages;
      }

      console.log('发送重新生成请求:', requestBody);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': this.getCSRFToken(),
          'X-Emoji-Encoding': 'true',
        },
        body: JSON.stringify(requestBody),
        signal: this.currentAbortController.signal
      });

      if (!response.ok) {
        throw new Error(`重新生成请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('重新生成API响应:', data);

      if (data.success === false) {
        throw new Error(data.response || '重新生成失败');
      }

      let newAiResponse = data.response || "抱歉，重新生成失败。";
      
      // 处理表情符号解码
      if (data.metadata && data.metadata.has_emojis) {
        newAiResponse = this.decodeEmojis(newAiResponse);
      }

      // 更新或创建AI回复消息
      if (aiMsgIndex !== -1) {
        // 更新现有的AI回复
        this.messages[aiMsgIndex] = {
          ...this.messages[aiMsgIndex],
          content: newAiResponse,
          timestamp: data.timestamp || new Date().toISOString(),
          metadata: {
            ...this.messages[aiMsgIndex].metadata,
            model: data.model || this.modelName,
            usage: data.usage || {},
            response_time: data.metadata?.response_time || 0,
            has_emojis: data.metadata?.has_emojis || false,
            regenerated: true,
            ai_message_id: data.metadata?.ai_message_id || this.messages[aiMsgIndex].id
          }
        };
      } else {
        // 创建新的AI回复（如果之前没有）
        const newAiMessage = {
          id: data.metadata?.ai_message_id || `temp-ai-${Date.now()}`,
          role: 'assistant',
          content: newAiResponse,
          timestamp: data.timestamp || new Date().toISOString(),
          metadata: {
            model: data.model || this.modelName,
            usage: data.usage || {},
            response_time: data.metadata?.response_time || 0,
            has_emojis: data.metadata?.has_emojis || false,
            regenerated: true,
            ai_message_id: data.metadata?.ai_message_id
          }
        };
        
        // 插入到用户消息后面
        this.messages.splice(userMsgIndex + 1, 0, newAiMessage);
      }

      console.log('重新生成成功，本地消息已更新');
      return newAiResponse;

    } catch (error) {
      console.error('重新生成失败:', error);
      throw error;
    } finally {
      this.isWaitingForResponse = false;
      this.currentAbortController = null;
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