/**
 * AI助手首页交互管理器
 * 负责统一管理首页的AI助手交互，将旧版界面对接新版AI助手逻辑
 */
class AIAssistantIndexManager {
    constructor() {
        // DOM元素
        this.aiSearchTrigger = null;
        this.aiSearchOverlay = null;
        this.aiSearchClose = null;
        this.aiSearchInput = null;
        this.aiSearchSubmit = null;
        this.aiResponseArea = null;
        this.aiOverlayContent = null;
        this.overlayScrollContainer = null;
        this.recommendationButtons = [];
        this.sessionManagementTrigger = null;
        
        // 状态管理
        this.isOverlayOpen = false;
        this.chatHistory = [];
        
        // 初始化标志
        this.isInitialized = false;
        
        // 绑定方法上下文
        this.openSearchOverlay = this.openSearchOverlay.bind(this);
        this.closeSearchOverlay = this.closeSearchOverlay.bind(this);
        this.handleSearchSubmit = this.handleSearchSubmit.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.handleRecommendationClick = this.handleRecommendationClick.bind(this);
        this.handleOverlayClick = this.handleOverlayClick.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
    }
    
    /**
     * 初始化AI助手管理器
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('AI助手首页管理器已初始化');
            return;
        }
        
        try {
            console.log('开始初始化AI助手首页管理器...');
            
            // 获取DOM元素
            this.initDOMElements();
            
            // 绑定事件监听器
            this.bindEventListeners();
            
            // 等待并确保AI聊天管理器可用
            await this.ensureAIChatManager();
            
            // 加载新势力企业数据
            this.loadTopCompanies();
            
            this.isInitialized = true;
            console.log('AI助手首页管理器初始化完成');
            
        } catch (error) {
            console.error('AI助手首页管理器初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 初始化DOM元素
     */
    initDOMElements() {
        this.aiSearchTrigger = document.getElementById('ai-search-trigger');
        this.aiSearchOverlay = document.getElementById('ai-search-overlay');
        this.aiSearchClose = document.getElementById('ai-search-close');
        this.aiSearchInput = document.getElementById('ai-search-input-overlay');
        this.aiSearchSubmit = document.getElementById('ai-search-submit-overlay');
        this.aiResponseArea = document.getElementById('ai-response-area');
        this.aiOverlayContent = document.getElementById('ai-overlay-content');
        this.overlayScrollContainer = document.getElementById('overlay-scroll-container');
        this.recommendationButtons = document.querySelectorAll('.recommendation-btn');
        this.sessionManagementTrigger = document.getElementById('session-management-trigger');
        
        console.log('DOM元素初始化完成', {
            trigger: !!this.aiSearchTrigger,
            overlay: !!this.aiSearchOverlay,
            input: !!this.aiSearchInput,
            responseArea: !!this.aiResponseArea
        });
    }
    
    /**
     * 绑定事件监听器
     */
    bindEventListeners() {
        // 触发器点击事件
        if (this.aiSearchTrigger) {
            this.aiSearchTrigger.addEventListener('click', this.openSearchOverlay);
        }
        
        // 关闭按钮点击事件
        if (this.aiSearchClose) {
            this.aiSearchClose.addEventListener('click', this.closeSearchOverlay);
        }
        
        // 发送按钮点击事件
        if (this.aiSearchSubmit) {
            this.aiSearchSubmit.addEventListener('click', this.handleSearchSubmit);
        }
        
        // 输入框回车事件
        if (this.aiSearchInput) {
            this.aiSearchInput.addEventListener('keypress', this.handleKeyPress);
        }
        
        // 推荐按钮点击事件
        this.recommendationButtons.forEach(button => {
            button.addEventListener('click', this.handleRecommendationClick);
        });
        
        // 覆盖层外部点击关闭
        if (this.aiSearchOverlay) {
            this.aiSearchOverlay.addEventListener('click', this.handleOverlayClick);
            
            // 阻止聊天窗口的滚动传播
            if (this.overlayScrollContainer) {
                this.overlayScrollContainer.addEventListener('wheel', (e) => {
                    if (this.isOverlayOpen) {
                        e.stopPropagation();
                    }
                }, { passive: false });
            }
        }
        
        // ESC键关闭
        document.addEventListener('keydown', this.handleEscapeKey);
        
        // 会话管理预留入口
        if (this.sessionManagementTrigger) {
            this.sessionManagementTrigger.addEventListener('click', () => {
                if (window.sessionManagement && window.sessionManagement.openSessionManager) {
                    window.sessionManagement.openSessionManager();
                } else {
                    console.log('会话管理功能暂未实现');
                    // 可以在这里显示一个提示消息
                    alert('会话管理功能正在开发中，敬请期待！');
                }
            });
        }
        
        console.log('事件监听器绑定完成');
    }
    
    /**
     * 确保AI聊天管理器可用
     */
    async ensureAIChatManager(maxRetries = 20) {
        let retries = 0;
        return new Promise((resolve, reject) => {
            const checkManager = () => {
                console.log(`检查AI聊天管理器 - 尝试 ${retries + 1}/${maxRetries}`);
                
                if (window.aiChatManager && typeof window.aiChatManager.initialize === 'function') {
                    console.log('AI聊天管理器已就绪');
                    resolve(window.aiChatManager);
                } else if (retries >= maxRetries) {
                    console.error('AI聊天管理器加载超时');
                    reject(new Error('AI聊天管理器加载超时'));
                } else {
                    retries++;
                    setTimeout(checkManager, 300);
                }
            };
            
            checkManager();
        });
    }
    
    /**
     * 确保聊天同步管理器可用
     */
    async ensureChatSyncManager() {
        // 如果同步管理器不存在，尝试创建
        if (!window.chatSyncManager && window.createChatSyncManager) {
            window.createChatSyncManager({
                historyUrl: '/api/ai/history/',
                chatUrl: '/api/ai/chat/',
                pageSize: 20
            });
        }
        
        return window.chatSyncManager;
    }
    
    /**
     * 打开搜索覆盖层（对接新版AI助手）
     */
    async openSearchOverlay() {
        try {
            console.log('准备打开AI搜索覆盖层...');
            
            // 检查新版AI助手是否可用
            if (window.NewAIAssistant && typeof window.NewAIAssistant.open === 'function') {
                console.log('使用新版AI助手');
                window.NewAIAssistant.open();
                return;
            }
            
            // 如果新版AI助手不可用，使用旧版界面但对接新版逻辑
            console.log('使用旧版界面对接新版AI逻辑');
            
            // 清空历史记录和输入框
            this.chatHistory = [];
            if (this.aiResponseArea) this.aiResponseArea.innerHTML = '';
            if (this.aiSearchInput) this.aiSearchInput.value = '';
            
            // 重置AI聊天管理器的会话历史
            if (window.aiChatManager) {
                await window.aiChatManager.initialize();
            }
            
            // 显示覆盖层
            if (this.aiSearchOverlay) {
                this.aiSearchOverlay.classList.remove('hidden');
                this.aiSearchOverlay.classList.add('flex');
                this.isOverlayOpen = true;
                
                // 添加动画效果
                requestAnimationFrame(() => {
                    if (this.aiOverlayContent) {
                        this.aiOverlayContent.classList.remove('scale-95', 'opacity-0');
                    }
                });
                
                // 聚焦输入框
                if (this.aiSearchInput) this.aiSearchInput.focus();
            }
            
        } catch (error) {
            console.error('打开AI搜索覆盖层失败:', error);
        }
    }
    
    /**
     * 关闭搜索覆盖层
     */
    closeSearchOverlay() {
        if (this.aiOverlayContent) {
            this.aiOverlayContent.classList.add('scale-95', 'opacity-0');
            this.aiOverlayContent.addEventListener('transitionend', () => {
                if (this.aiSearchOverlay) {
                    this.aiSearchOverlay.classList.add('hidden');
                    this.aiSearchOverlay.classList.remove('flex');
                    this.isOverlayOpen = false;
                }
            }, { once: true });
        } else if (this.aiSearchOverlay) {
            this.aiSearchOverlay.classList.add('hidden');
            this.aiSearchOverlay.classList.remove('flex');
            this.isOverlayOpen = false;
        }
    }
    
    /**
     * 处理搜索提交（使用新版AI逻辑并同步后端）
     */
    async handleSearchSubmit() {
        if (!this.isOverlayOpen || !this.aiSearchInput) return;
        
        const query = this.aiSearchInput.value.trim();
        if (!query) return;
        
        try {
            console.log('发送查询到AI服务:', query);
            
            // 添加用户消息到聊天历史
            this.chatHistory.push({ sender: 'user', text: query });
            this.renderMessage('user', query);
            this.aiSearchInput.value = '';
            
            // 显示"正在思考"状态
            this.renderMessage('ai', '正在思考中...');
            
            // 确保同步管理器可用
            const syncManager = await this.ensureChatSyncManager();
            
            // 如果有同步管理器且用户已登录，使用同步版本发送消息
            if (syncManager) {
                try {
                    console.log('使用同步管理器发送消息');
                    const result = await syncManager.sendMessageWithAutoSave(query, this.getConversationHistory());
                    
                    // 移除"正在思考"气泡
                    this.removeThinkingBubble();
                    
                    // 添加AI回复到聊天历史
                    this.chatHistory.push({ sender: 'ai', text: result.response });
                    this.renderMessage('ai', result.response);
                    
                    console.log('消息已发送并同步到后端数据库');
                    return;
                    
                } catch (syncError) {
                    console.log('同步发送失败，降级使用本地AI管理器:', syncError.message);
                    
                    // 降级处理：使用原有的AI聊天管理器
                    const aiChatManager = await this.ensureAIChatManager();
                    const aiResponse = await aiChatManager.sendMessage(query);
                    
                    // 移除"正在思考"气泡
                    this.removeThinkingBubble();
                    
                    // 添加AI回复到聊天历史
                    this.chatHistory.push({ sender: 'ai', text: aiResponse });
                    this.renderMessage('ai', aiResponse);
                    
                    console.log('使用本地AI管理器完成消息处理');
                    return;
                }
            }
            
            // 如果没有同步管理器，使用原有的AI聊天管理器
            console.log('使用原有AI聊天管理器');
            const aiChatManager = await this.ensureAIChatManager();
            const aiResponse = await aiChatManager.sendMessage(query);
            
            // 移除"正在思考"气泡
            this.removeThinkingBubble();
            
            // 添加AI回复到聊天历史
            this.chatHistory.push({ sender: 'ai', text: aiResponse });
            this.renderMessage('ai', aiResponse);
            
        } catch (error) {
            console.error('AI处理请求出错:', error);
            
            // 移除"正在思考"气泡
            this.removeThinkingBubble();
            
            // 显示错误消息
            let errorMessage = "抱歉，AI服务暂时无法响应，请稍后再试。";
            
            if (error.message && error.message.includes('网络')) {
                errorMessage = "网络连接失败，请检查您的网络连接后重试。";
            } else if (error.message && error.message.includes('超时')) {
                errorMessage = "请求超时，服务器可能繁忙，请稍后再试。";
            }
            
            this.chatHistory.push({ sender: 'ai', text: errorMessage });
            this.renderMessage('ai', errorMessage);
        }
    }
    
    /**
     * 获取对话历史（转换为同步管理器需要的格式）
     */
    getConversationHistory() {
        return this.chatHistory.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
        }));
    }
    
    /**
     * 处理键盘事件
     */
    handleKeyPress(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.handleSearchSubmit();
        }
    }
    
    /**
     * 处理推荐按钮点击
     */
    handleRecommendationClick(e) {
        if (!this.isOverlayOpen || !this.aiSearchInput) return;
        
        const queryText = e.target.textContent.trim();
        this.aiSearchInput.value = queryText;
        this.handleSearchSubmit();
        this.aiSearchInput.focus();
    }
    
    /**
     * 处理覆盖层外部点击
     */
    handleOverlayClick(e) {
        if (e.target === this.aiSearchOverlay) {
            this.closeSearchOverlay();
        }
    }
    
    /**
     * 处理ESC键
     */
    handleEscapeKey(e) {
        if (e.key === 'Escape' && this.isOverlayOpen) {
            this.closeSearchOverlay();
        }
    }
    
    /**
     * 渲染单条消息
     */
    renderMessage(sender, text) {
        if (!this.isOverlayOpen || !this.aiResponseArea) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('flex', 'items-start', 'space-x-3', 'text-sm');

        const icon = document.createElement('i');
        icon.classList.add('fas', 'text-xl', 'pt-1');

        const textBubble = document.createElement('div');
        textBubble.classList.add('chat-bubble', 'px-4', 'py-2', 'leading-relaxed', 'whitespace-pre-wrap');
        
        // 处理思考中状态
        if (text === '正在思考中...') {
            textBubble.textContent = text;
            if (sender === 'ai') {
                textBubble.classList.add('animate-pulse');
                textBubble.id = 'thinking-bubble';
            }
        } else {
            // 安全处理文本内容
            textBubble.innerHTML = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        if (sender === 'user') {
            messageDiv.classList.add('justify-end');
            icon.classList.add('fa-user-circle', 'text-gray-500', 'order-2');
            textBubble.classList.add('chat-bubble-user', 'order-1');
            messageDiv.appendChild(textBubble);
            messageDiv.appendChild(icon);
        } else {
            messageDiv.classList.add('justify-start');
            icon.classList.add('fa-robot', 'text-blue-500');
            textBubble.classList.add('chat-bubble-ai');
            messageDiv.appendChild(icon);
            messageDiv.appendChild(textBubble);
        }

        this.aiResponseArea.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    /**
     * 移除思考气泡
     */
    removeThinkingBubble() {
        if (!this.isOverlayOpen) return;
        
        const thinkingBubble = document.getElementById('thinking-bubble');
        if (thinkingBubble && thinkingBubble.parentElement) {
            thinkingBubble.parentElement.remove();
        }
    }
    
    /**
     * 滚动到底部
     */
    scrollToBottom() {
        if (this.isOverlayOpen && this.overlayScrollContainer) {
            this.overlayScrollContainer.scrollTop = this.overlayScrollContainer.scrollHeight;
        }
    }
    
    /**
     * 加载新势力企业数据
     */
    async loadTopCompanies() {
        const tbody = document.getElementById('topCompanyTbody');
        if (!tbody) {
            console.error('找不到表格主体元素 #topCompanyTbody');
            return;
        }
        
        console.log('开始获取新势力企业名单数据...');
        
        // 显示加载状态
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-3 text-center">加载中...</td></tr>';
        
        try {
            const apiUrl = '/api/top-companies/?limit=10';
            console.log('请求URL:', apiUrl);
            
            const response = await fetch(apiUrl);
            console.log('API响应状态码:', response.status);
            
            if (!response.ok) {
                throw new Error(`网络错误，状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('获取到的完整数据:', data);
            
            if (data && data.companies && Array.isArray(data.companies) && data.companies.length > 0) {
                console.log(`成功获取到 ${data.companies.length} 条企业数据`);
                this.renderTopCompaniesTable(data.companies);
            } else {
                console.warn('API返回无效数据格式或空数据:', data);
                tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-3 text-center">暂无数据</td></tr>';
            }
            
        } catch (error) {
            console.error('获取新势力企业名单出错:', error);
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-3 text-center">数据加载失败</td></tr>';
        }
    }
    
    /**
     * 渲染新势力企业名单表格
     */
    renderTopCompaniesTable(companies) {
        console.log('开始渲染企业数据表格...');
        const tbody = document.getElementById('topCompanyTbody');
        if (!tbody) {
            console.error('找不到表格主体元素 #topCompanyTbody');
            return;
        }
        
        try {
            tbody.innerHTML = '';
            console.log('渲染企业数据:', companies);
            
            companies.forEach((company, index) => {
                console.log(`处理第 ${index+1} 条数据:`, company);
                
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-[#1A2B5E]';
                
                // 确保score是数字
                let score = company.score;
                if (typeof score !== 'number') {
                    console.log(`转换分数 ${score} 为数字类型`);
                    score = parseFloat(score) || 0;
                }
                
                tr.innerHTML = `
                    <td class="px-4 py-3 text-[var(--secondary)]">${company.rank}</td>
                    <td class="px-4 py-3">${company.name}</td>
                    <td class="px-4 py-3">${company.city || '未知'}</td>
                    <td class="px-4 py-3">${company.county || '未知'}</td>
                    <td class="px-4 py-3 text-yellow-400 font-bold">${score.toFixed(1)}</td>
                `;
                
                tbody.appendChild(tr);
            });
            
            console.log('表格渲染完成');
        } catch (error) {
            console.error('渲染企业数据表格出错:', error);
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-3 text-center">渲染数据出错</td></tr>';
        }
    }
    
    /**
     * 获取覆盖层状态
     */
    isOpen() {
        return this.isOverlayOpen;
    }
    
    /**
     * 设置覆盖层状态
     */
    setOverlayOpen(state) {
        this.isOverlayOpen = state;
    }
    
    /**
     * 销毁管理器（清理事件监听器）
     */
    destroy() {
        // 移除事件监听器
        if (this.aiSearchTrigger) {
            this.aiSearchTrigger.removeEventListener('click', this.openSearchOverlay);
        }
        
        if (this.aiSearchClose) {
            this.aiSearchClose.removeEventListener('click', this.closeSearchOverlay);
        }
        
        if (this.aiSearchSubmit) {
            this.aiSearchSubmit.removeEventListener('click', this.handleSearchSubmit);
        }
        
        if (this.aiSearchInput) {
            this.aiSearchInput.removeEventListener('keypress', this.handleKeyPress);
        }
        
        if (this.aiSearchOverlay) {
            this.aiSearchOverlay.removeEventListener('click', this.handleOverlayClick);
        }
        
        this.recommendationButtons.forEach(button => {
            button.removeEventListener('click', this.handleRecommendationClick);
        });
        
        document.removeEventListener('keydown', this.handleEscapeKey);
        
        this.isInitialized = false;
        console.log('AI助手首页管理器已销毁');
    }
}

// 全局实例
window.aiAssistantIndexManager = null;

// 全局工具对象（向后兼容）
if (!window.appUtils) {
    window.appUtils = {
        overlayOpen: false,
        setOverlayOpen(state) {
            this.overlayOpen = state;
            if (window.aiAssistantIndexManager) {
                window.aiAssistantIndexManager.setOverlayOpen(state);
            }
        },
        isOverlayOpen() {
            if (window.aiAssistantIndexManager) {
                return window.aiAssistantIndexManager.isOpen();
            }
            return this.overlayOpen;
        }
    };
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('开始初始化AI助手首页管理器...');
        
        // 创建全局实例
        window.aiAssistantIndexManager = new AIAssistantIndexManager();
        
        // 等待一段时间确保所有依赖脚本加载完成
        setTimeout(async () => {
            try {
                await window.aiAssistantIndexManager.initialize();
                console.log('AI助手首页管理器初始化成功');
            } catch (error) {
                console.error('AI助手首页管理器初始化失败:', error);
            }
        }, 1000);
        
    } catch (error) {
        console.error('创建AI助手首页管理器失败:', error);
    }
});

// 页面卸载时清理
window.addEventListener('beforeunload', function() {
    if (window.aiAssistantIndexManager) {
        window.aiAssistantIndexManager.destroy();
    }
});

console.log('AI助手首页管理器脚本已加载'); 