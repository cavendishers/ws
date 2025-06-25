/**
 * 聊天记录同步管理器
 * 负责与后端数据库同步聊天记录
 */
class ChatSyncManager {
    constructor(options = {}) {
        this.historyUrl = options.historyUrl || '/api/ai/history/';
        this.chatUrl = options.chatUrl || '/api/ai/chat/';
        this.pageSize = options.pageSize || 20;
        
        // 同步状态
        this.isSyncing = false;
        this.lastSyncTime = null;
        
        console.log('聊天记录同步管理器初始化完成');
    }
    
    /**
     * 从后端加载聊天历史
     */
    async loadChatHistory(page = 1, pageSize = null) {
        if (this.isSyncing) {
            console.log('正在同步中，跳过重复请求');
            return [];
        }
        
        this.isSyncing = true;
        
        try {
            console.log(`从后端加载聊天历史 - 页码: ${page}, 每页条数: ${pageSize || this.pageSize}`);
            
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: (pageSize || this.pageSize).toString()
            });
            
            const response = await fetch(`${this.historyUrl}?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('聊天历史加载成功:', {
                total: data.total,
                page: data.page,
                totalPages: data.total_pages,
                resultsCount: data.results?.length || 0
            });
            
            this.lastSyncTime = new Date();
            return data;
            
        } catch (error) {
            console.error('加载聊天历史失败:', error);
            throw new Error(`加载聊天历史失败: ${error.message}`);
        } finally {
            this.isSyncing = false;
        }
    }
    
    /**
     * 保存聊天消息到后端
     */
    async saveChatMessage(role, content, sessionId = null, metadata = null) {
        try {
            console.log(`保存聊天消息到后端 - 角色: ${role}, 内容长度: ${content.length}`);
            
            const requestData = {
                role: role,
                content: content,
                session_id: sessionId,
                metadata: metadata || {}
            };
            
            const response = await fetch(this.historyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('聊天消息保存成功:', data);
            return data;
            
        } catch (error) {
            console.error('保存聊天消息失败:', error);
            throw new Error(`保存聊天消息失败: ${error.message}`);
        }
    }
    
    /**
     * 删除聊天消息
     */
    async deleteChatMessage(messageId) {
        try {
            console.log(`删除聊天消息 - ID: ${messageId}`);
            
            const response = await fetch(`${this.historyUrl}${messageId}/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('聊天消息删除成功:', data);
            return data;
            
        } catch (error) {
            console.error('删除聊天消息失败:', error);
            throw new Error(`删除聊天消息失败: ${error.message}`);
        }
    }
    
    /**
     * 更新聊天消息
     */
    async updateChatMessage(messageId, content, metadata = null) {
        try {
            console.log(`更新聊天消息 - ID: ${messageId}, 新内容长度: ${content.length}`);
            
            const requestData = {
                content: content
            };
            
            if (metadata) {
                requestData.metadata = metadata;
            }
            
            const response = await fetch(`${this.historyUrl}${messageId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('聊天消息更新成功:', data);
            return data;
            
        } catch (error) {
            console.error('更新聊天消息失败:', error);
            throw new Error(`更新聊天消息失败: ${error.message}`);
        }
    }
    
    /**
     * 清除所有聊天记录
     */
    async clearAllChatHistory() {
        try {
            console.log('清除所有聊天记录');
            
            const response = await fetch(this.historyUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('所有聊天记录清除成功:', data);
            return data;
            
        } catch (error) {
            console.error('清除聊天记录失败:', error);
            throw new Error(`清除聊天记录失败: ${error.message}`);
        }
    }
    
    /**
     * 发送消息到AI并自动保存
     */
    async sendMessageWithAutoSave(message, conversationHistory = [], options = {}) {
        try {
            console.log(`发送消息到AI - 消息长度: ${message.length}, 历史条数: ${conversationHistory.length}`);
            
            const requestData = {
                messages: message,
                conversation_history: conversationHistory,
                encode_emojis: true,
                emoji_encoding_method: 'html_entities',
                ...options
            };
            
            const response = await fetch(this.chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.response) {
                console.log('AI消息发送成功，自动保存已完成');
                return {
                    response: data.response,
                    metadata: data.metadata || {},
                    usage: data.usage || {},
                    success: true
                };
            } else {
                throw new Error(data.error || 'AI响应失败');
            }
            
        } catch (error) {
            console.error('发送AI消息失败:', error);
            throw new Error(`发送AI消息失败: ${error.message}`);
        }
    }
    
    /**
     * 重新生成AI回复
     */
    async regenerateResponse(userMessage, userMessageId = null, conversationHistory = []) {
        try {
            console.log(`重新生成AI回复 - 用户消息ID: ${userMessageId}, 消息长度: ${userMessage.length}`);
            
            const requestData = {
                messages: userMessage,
                conversation_history: conversationHistory,
                encode_emojis: true,
                emoji_encoding_method: 'html_entities',
                is_regenerate: true
            };
            
            if (userMessageId) {
                requestData.user_message_id = userMessageId;
            }
            
            const response = await fetch(this.chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.response) {
                console.log('AI回复重新生成成功');
                return {
                    response: data.response,
                    metadata: data.metadata || {},
                    usage: data.usage || {},
                    success: true
                };
            } else {
                throw new Error(data.error || 'AI回复重新生成失败');
            }
            
        } catch (error) {
            console.error('重新生成AI回复失败:', error);
            throw new Error(`重新生成AI回复失败: ${error.message}`);
        }
    }
    
    /**
     * 获取CSRF令牌
     */
    getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        
        // 从meta标签获取
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
            return metaToken.getAttribute('content');
        }
        
        // 从input隐藏域获取
        const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (inputToken) {
            return inputToken.value;
        }
        
        console.warn('未找到CSRF令牌');
        return '';
    }
    
    /**
     * 检查用户登录状态
     */
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status/', {
                method: 'GET',
                credentials: 'same-origin'
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.authenticated || false;
            }
            
            return false;
        } catch (error) {
            console.warn('检查登录状态失败:', error);
            return false;
        }
    }
    
    /**
     * 格式化聊天历史为标准格式
     */
    formatChatHistory(historyData) {
        if (!historyData || !historyData.results) {
            return [];
        }
        
        return historyData.results.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
            metadata: msg.metadata || {}
        })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // 按时间正序
    }
    
    /**
     * 获取最后同步时间
     */
    getLastSyncTime() {
        return this.lastSyncTime;
    }
    
    /**
     * 获取同步状态
     */
    getSyncStatus() {
        return {
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime
        };
    }
}

// 全局实例
window.chatSyncManager = null;

// 创建全局同步管理器实例
function createChatSyncManager(options = {}) {
    if (!window.chatSyncManager) {
        window.chatSyncManager = new ChatSyncManager(options);
        console.log('聊天记录同步管理器全局实例已创建');
    }
    return window.chatSyncManager;
}

// 导出类和工厂函数
window.ChatSyncManager = ChatSyncManager;
window.createChatSyncManager = createChatSyncManager;

console.log('聊天记录同步管理器脚本已加载'); 