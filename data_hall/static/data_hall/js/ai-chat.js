// AI聊天交互逻辑
class AIChatManager {
  constructor(options = {}) {
    // 配置选项
    this.apiUrl = options.apiUrl || '/api/ai/chat';  // 默认API地址，实际部署时替换
    this.apiKey = options.apiKey || '';             // 可选的API密钥
    this.modelName = options.modelName || 'bot-20250421104824-ttj7h'; // 默认模型
    this.maxTokens = options.maxTokens || 1000;     // 最大token数量
    this.temperature = options.temperature || 0.7;  // 创造性程度
    this.systemPrompt = options.systemPrompt || '你是一个产业研究智能助手，负责回答用户关于新势力企业和产业趋势的问题。请提供准确、专业的回答。'; // 系统提示词

    // 会话状态
    this.conversations = [];  // 存储聊天历史
    this.isWaitingForResponse = false; // 是否正在等待AI响应
    
    // 初始化系统消息
    this.initSystemMessage();
  }
  
  // 初始化系统消息
  initSystemMessage() {
    // 清空会话历史
    this.conversations = [];
    // 添加系统提示信息作为第一条消息
    if (this.systemPrompt) {
      this.addMessage('system', this.systemPrompt);
    }
  }

  // 添加消息到会话历史
  addMessage(role, content) {
    this.conversations.push({ role, content });
    return this.conversations;
  }

  // 清空会话历史并重新初始化系统提示
  clearConversation() {
    this.conversations = [];
    this.initSystemMessage();
    return this.conversations;
  }

  // 发送消息到API
  async sendMessage(message) {
    if (this.isWaitingForResponse) {
      console.warn('已有请求正在处理中...');
      return null;
    }

    this.isWaitingForResponse = true;
    
    try {
      // 根据后端的修改，我们只需发送用户的当前消息
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: message // 直接发送用户输入的消息文本
        })
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      // 解析JSON响应
      const data = await response.json();
      
      // 从响应中获取AI的回答，保留原始格式
      const aiResponse = data.response || "未收到有效回复";
      
      this.isWaitingForResponse = false;
      return aiResponse;
    } catch (error) {
      console.error('AI服务请求出错:', error);
      this.isWaitingForResponse = false;
      throw error;
    }
  }

  // 模拟发送消息 (用于开发测试，不实际调用API)
  async simulateSendMessage(message) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 多行文本示例，用于测试格式保留功能
        const mockResponses = {
          default: `这是对"${message}"的模拟回复。\n在实际部署中，这里会展示AI的响应内容。\n\n包含多行格式和空行。`,
          '新势力企业': '根据最新数据，中国新势力企业主要集中在以下领域：\n\n1. 人工智能（35%增长率）\n2. 新能源（28%增长率）\n3. 生物医药\n4. 高端制造',
          '产业趋势': '当前产业发展趋势显示，数字化转型正加速推进，特别是在以下领域：\n\n- 智能制造\n- 绿色能源\n- 医疗健康\n\n其中专精特新企业已超过4000家，为产业链安全提供重要支撑。',
          '技术创新': '国内技术创新主要集中在以下领域：\n\n1. 半导体\n2. 新材料\n3. 人工智能\n\n近年来，在光刻机、高端芯片、量子计算等卡脖子技术上取得突破性进展，自主创新能力显著提升。',
          '合成生物': '合成生物领域中，企业数量最多的三个细分赛道是：\n\n1. 生物医药（约占45%）\n   - 代表企业：诺和诺德、药明生物\n2. 生物能源（约占30%）\n3. 生物材料（约占15%）\n\n近年来，合成蛋白质和基因编辑技术方向的企业增长最为迅速。'
        };
        
        // 根据关键词匹配不同的回复
        let aiResponse = mockResponses.default;
        for (const [keyword, response] of Object.entries(mockResponses)) {
          if (message.includes(keyword) && keyword !== 'default') {
            aiResponse = response;
            break;
          }
        }
        
        resolve(aiResponse);
      }, 1500);
    });
  }
}

// 全局AI聊天管理器实例
window.aiChatManager = new AIChatManager({
  apiUrl: '/api/ai/chat',  // 这里设置实际的API接口地址
  modelName: 'bot-20250421104824-ttj7h',  // 设置使用的模型
  systemPrompt: ''  // 对于某些API，可能不需要系统提示，这里设为空
});

// 导出到全局对象，方便其他文件访问
window.AIChatManager = AIChatManager; 