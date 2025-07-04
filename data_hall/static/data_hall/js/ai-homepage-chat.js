class HomepageAIChatManager {
    constructor() {
        this.isOpen = false;
        this.chatManager = null;
        this.markdownRenderer = null;
        this.isClosing = false;
        this.isAIResponding = false;
        this.markdownInitRetries = 0; // 添加重试计数器

        this.initializeElements();
        this.initializeEventListeners();
        this.initializeMarkdownRenderer();
        this.enhanceHoverButtonExperience();
        this.bindRecommendationCards();

        console.log('首页AI聊天管理器初始化完成');
    }

    // 获取静态资源URL的辅助方法
    getStaticAssetUrl(filename) {
        // 从HTML模板中的img元素获取正确的静态文件URL
        const headerImg = document.querySelector('#homepage-chat-header img[alt="AI Assistant"]');
        if (headerImg && headerImg.src) {
            return headerImg.src;
        }
        // 备用方案：根据Django静态文件配置构建路径
        return `/static/${filename}`;
    }

    initializeElements() {
        this.overlay = document.getElementById('homepage-ai-chat-overlay');
        this.chatContainer = document.getElementById('homepage-ai-chat');
        this.messagesContainer = document.getElementById('homepage-chat-messages');
        this.inputArea = document.getElementById('homepage-chat-input');
        this.sendBtn = document.getElementById('homepage-send-btn');
        this.closeBtn = document.getElementById('homepage-chat-close-btn');
        
        // 侧边栏相关元素
        this.sidebar = document.getElementById('homepage-chat-sidebar');
        this.sidebarToggle = document.getElementById('homepage-sidebar-toggle');
        this.newConversationBtn = document.getElementById('new-conversation-btn');
        this.sidebarOverlay = this.chatContainer.querySelector('.sidebar-overlay');
        this.chatMainContainer = document.getElementById('chat-main-container'); // 🔧 添加主容器引用
        this.isSidebarOpen = false; // 🔧 确保初始状态为隐藏

        // 初始化发送按钮状态 - 对齐ai_chat_widget.html
        if (this.sendBtn && this.inputArea) {
            this.sendBtn.disabled = true; // 初始时禁用发送按钮
            this.sendBtn.title = '发送消息';
        }
    }

    initializeEventListeners() { // 关闭按钮
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        // 点击覆盖层关闭
        if (this.overlay) {
            let clickStartTime = 0;
            let clickStartTarget = null;

            this.overlay.addEventListener('mousedown', (e) => {
                clickStartTime = Date.now();
                clickStartTarget = e.target;
            });

            this.overlay.addEventListener('click', (e) => { 
                // 如果点击的是侧边栏或其子元素，不关闭
                if (this.sidebar && this.sidebar.contains(e.target)) {
                    return;
                }
                
                // 如果点击的是侧边栏切换按钮，不关闭
                if (this.sidebarToggle && this.sidebarToggle.contains(e.target)) {
                    return;
                }
                
                // 只有点击到覆盖层本身才关闭
                if (e.target === this.overlay && clickStartTarget === this.overlay) {
                    const clickDuration = Date.now() - clickStartTime;
                    // 只有快速点击（不是拖拽）才关闭，防止文本选择时误关闭
                    if (clickDuration < 300) {
                        // 如果侧边栏打开，先关闭侧边栏
                        if (this.isSidebarOpen) {
                            this.closeSidebar();
                        } else {
                            this.close();
                        }
                    }
                }
            });
        }

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // 防止AI窗口内的滚动事件冒泡到背景页面
        if (this.chatContainer) {
            this.chatContainer.addEventListener('wheel', (e) => {
                e.stopPropagation();
            }, { passive: true });
            
            this.chatContainer.addEventListener('touchmove', (e) => {
                e.stopPropagation();
            }, { passive: true });
        }

        // 防止消息区域的滚动传播
        if (this.messagesContainer) {
            this.messagesContainer.addEventListener('wheel', (e) => {
                // 检查是否到达滚动边界
                const element = this.messagesContainer;
                const isAtTop = element.scrollTop === 0;
                const isAtBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
                
                // 如果在边界且继续滚动，阻止事件传播
                if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }

        // 侧边栏切换按钮事件
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // 新会话按钮事件
        if (this.newConversationBtn) {
            this.newConversationBtn.addEventListener('click', () => this.startNewConversation());
        }

        // 侧边栏遮罩层点击事件
        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', (e) => {
                // 确保点击的是遮罩层本身，而不是其子元素
                if (e.target === this.sidebarOverlay) {
                    this.closeSidebar();
                }
            });
        }



        // 发送按钮
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // 输入框Enter发送
        if (this.inputArea) {
            this.inputArea.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // 自动调整输入框高度和发送按钮状态
            this.inputArea.addEventListener('input', () => {
                this.autoResizeInput();
                // 更新发送按钮状态 - 对齐ai_chat_widget的逻辑
                if (this.sendBtn && !this.isAIResponding) {
                    this.sendBtn.disabled = this.inputArea.value.trim() === '';
                }
            });
        }
    }

    // 初始化Markdown渲染器
    initializeMarkdownRenderer() {
        console.log('初始化Markdown渲染器... 重试次数:', this.markdownInitRetries);
        console.log('marked可用:', typeof marked !== 'undefined');
        console.log('DOMPurify可用:', typeof DOMPurify !== 'undefined');

        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            console.log('配置Markdown渲染器...');

            marked.setOptions({
                breaks: true,
                gfm: true,
                tables: true,
                sanitize: false,
                smartLists: true,
                smartypants: false,
                headerIds: false, // 避免ID冲突
                mangle: false // 保持简洁的输出
            });

            this.markdownRenderer = {
                render: (markdown) => {
                    try {
                        console.log('渲染Markdown内容:', markdown.substring(0, 100) + '...');
                        const rawHtml = marked.parse(markdown);
                        console.log('Marked解析结果:', rawHtml.substring(0, 200) + '...');

                        const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
                            ALLOWED_TAGS: [
                                'p',
                                'br',
                                'strong',
                                'em',
                                'u',
                                'strike',
                                'del',
                                'h1',
                                'h2',
                                'h3',
                                'h4',
                                'h5',
                                'h6',
                                'ul',
                                'ol',
                                'li',
                                'blockquote',
                                'code',
                                'pre',
                                'table',
                                'thead',
                                'tbody',
                                'tr',
                                'th',
                                'td',
                                'a',
                                'hr',
                                'span',
                                'div'
                            ],
                            ALLOWED_ATTR: [
                                'href',
                                'title',
                                'class',
                                'id',
                                'target'
                            ]
                        });

                        console.log('DOMPurify清理结果:', sanitizedHtml.substring(0, 200) + '...');
                        return sanitizedHtml;
                    } catch (error) {
                        console.error('Markdown渲染失败:', error);
                        console.error('原始内容:', markdown);
                        return this.escapeHtml(markdown);
                    }
                },
                escapeHtml: (text) => {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }
            };

            console.log('Markdown渲染器初始化成功');
            this.markdownInitRetries = 0; // 重置重试计数器
        } else {
            this.markdownInitRetries ++;
            if (this.markdownInitRetries < 10) { // 最多重试10次
                console.warn(`Markdown库未完全加载，延迟初始化... (${
                    this.markdownInitRetries
                }/10)`);
                setTimeout(() => this.initializeMarkdownRenderer(), 300 * this.markdownInitRetries);
            } else {
                console.error('Markdown库加载失败，将使用基本渲染器');
            }
        }
    }

    // 获取或创建AI聊天管理器实例
    async getChatManager() {
        if (!this.chatManager) { // 等待AIChatManager加载
            let attempts = 0;
            while (typeof AIChatManager === 'undefined' && attempts < 10) {
                console.log('等待AIChatManager加载...');
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (typeof AIChatManager === 'undefined') {
                throw new Error('AIChatManager未能正确加载');
            }

            console.log('初始化AI聊天管理器...');
            this.chatManager = new AIChatManager({apiUrl: '/ai/api/chat/', historyUrl: '/ai/api/history/', systemPrompt: '你是一个专业的产业研究智能助手，专注于分析中国新势力企业和产业链数据。请基于系统数据提供准确、专业、有见地的回答。'});
            await this.chatManager.initialize();
            console.log('AI聊天管理器初始化完成');
        }
        return this.chatManager;
    }

    // 打开聊天界面
    async open() {
        if (this.isOpen || this.isClosing) 
            return;
        

        console.log('打开首页AI聊天界面');

        // 获取聊天管理器
        await this.getChatManager();

        // 显示界面
        this.overlay.classList.remove('hidden');
        this.overlay.style.display = 'flex';
        this.overlay.classList.add('show');
        this.chatContainer.classList.add('show');

        this.isOpen = true;

        // 聚焦输入框
        setTimeout(() => {
            if (this.inputArea) {
                this.inputArea.focus();
            }
        }, 300);

        // 加载历史消息
        this.loadChatHistory();
    }

    // 关闭聊天界面 - 添加关闭动画
    close() {
        if (!this.isOpen || this.isClosing) 
            return;
        

        console.log('关闭首页AI聊天界面');

        this.isClosing = true;

        // 🔧 关闭AI窗口时先关闭侧边栏
        if (this.isSidebarOpen) {
            this.closeSidebar();
        }

        // 移除显示类，添加隐藏类
        this.overlay.classList.remove('show');
        this.overlay.classList.add('hide');
        this.chatContainer.classList.remove('show');
        this.chatContainer.classList.add('hide');

        // 等待动画完成后隐藏
        setTimeout(() => {
            this.overlay.classList.add('hidden');
            this.overlay.style.display = 'none';
            this.overlay.classList.remove('hide');
            this.chatContainer.classList.remove('hide');
            this.isOpen = false;
            this.isClosing = false;
        }, 300);
    }

    // 侧边栏控制方法
    toggleSidebar() {
        if (this.isSidebarOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        if (!this.sidebar || this.isSidebarOpen) return;
        
        console.log('打开侧边栏');
        this.sidebar.classList.add('show');
        
        // 🔧 给主容器添加sidebar-open类，触发内容区域推挤
        if (this.chatMainContainer) {
            this.chatMainContainer.classList.add('sidebar-open');
        }
        
        // 在移动端显示遮罩层
        if (window.innerWidth <= 768 && this.sidebarOverlay) {
            this.sidebarOverlay.style.display = 'block';
            this.sidebarOverlay.classList.add('show');
        }
        
        this.isSidebarOpen = true;
    }

    closeSidebar() {
        if (!this.sidebar || !this.isSidebarOpen) return;
        
        console.log('关闭侧边栏');
        this.sidebar.classList.remove('show');
        
        // 🔧 从主容器移除sidebar-open类，让内容区域回归原位
        if (this.chatMainContainer) {
            this.chatMainContainer.classList.remove('sidebar-open');
        }
        
        // 隐藏遮罩层
        if (this.sidebarOverlay) {
            this.sidebarOverlay.classList.remove('show');
            setTimeout(() => {
                if (!this.isSidebarOpen && this.sidebarOverlay.style.display !== 'none') {
                    this.sidebarOverlay.style.display = 'none';
                }
            }, 250);
        }
        
        this.isSidebarOpen = false;
    }

    // 开始新会话
    startNewConversation() {
        console.log('开始新会话');
        
        // 🔧 优先关闭侧边栏，确保界面回归初始状态
        if (this.isSidebarOpen) {
            this.closeSidebar();
        }
        
        // 清空当前消息
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = '';
            // 重新添加推荐问题卡片
            this.renderRecommendationCards();
        }
        
        // 清空输入框
        if (this.inputArea) {
            this.inputArea.value = '';
            this.autoResizeInput();
            if (this.sendBtn) {
                this.sendBtn.disabled = true;
            }
        }
        
        // 重置AI响应状态
        this.isAIResponding = false;
        
        console.log('新会话已开始，侧边栏已关闭');
    }

    // 渲染推荐问题卡片（单独提取方法）
    renderRecommendationCards() {
        const recommendationHTML = `
            <div class="recommendation-cards-container">
                <div class="recommendation-card">
                    <div class="card-header">
                        <span class="card-emoji">📈</span>
                        <div class="card-title">查趋势</div>
                    </div>
                    <div class="card-content">
                        <div class="card-subtitle" data-question="近几年新势力企业呈现怎么样的变化趋势？">近几年新势力企业呈现怎么样的变化趋势？</div>
                        <div class="card-subtitle" data-question="哪些行业的新势力企业增长最快？">哪些行业的新势力企业增长最快？</div>
                    </div>
                </div>

                <div class="recommendation-card">
                    <div class="card-header">
                        <span class="card-emoji">🏭</span>
                        <div class="card-title">查产业</div>
                    </div>
                    <div class="card-content">
                        <div class="card-subtitle" data-question="合成生物哪些细分赛道的新势力企业最多？">合成生物哪些细分赛道的新势力企业最多？</div>
                        <div class="card-subtitle" data-question="某个产业链行业的代表企业是哪些？">某个产业链行业的代表企业是哪些？</div>
                    </div>
                </div>

                <div class="recommendation-card">
                    <div class="card-header">
                        <span class="card-emoji">📊</span>
                        <div class="card-title">查市场动态</div>
                    </div>
                    <div class="card-content">
                        <div class="card-subtitle" data-question="最近一年获得B轮以上融资的新势力企业有哪些？">最近一年获得B轮以上融资的新势力企业有哪些？</div>
                        <div class="card-subtitle" data-question="近期资本最关注的新兴赛道有哪些？">近期资本最关注的新兴赛道有哪些？</div>
                    </div>
                </div>

                <div class="recommendation-card">
                    <div class="card-header">
                        <span class="card-emoji">🧪</span>
                        <div class="card-title">查技术能力</div>
                    </div>
                    <div class="card-content">
                        <div class="card-subtitle" data-question="新势力企业中有哪些企业是专精特新企业？">新势力企业中有哪些企业是专精特新企业？</div>
                        <div class="card-subtitle" data-question="有哪些解决国外卡脖子技术的产品？">有哪些解决国外卡脖子技术的产品？</div>
                    </div>
                </div>

                <div class="recommendation-card">
                    <div class="card-header">
                        <span class="card-emoji">🔮</span>
                        <div class="card-title">查未来趋势</div>
                    </div>
                    <div class="card-content">
                        <div class="card-subtitle" data-question="未来2-5年，新势力企业中哪些更有可能变为独角兽？判断依据是什么？">未来2-5年，新势力企业中哪些更有可能变为独角兽？判断依据是什么？</div>
                        <div class="card-subtitle" data-question="哪些领域可能孕育出下一轮颠覆性创新？">哪些领域可能孕育出下一轮颠覆性创新？</div>
                    </div>
                </div>

                <div class="recommendation-card">
                    <div class="card-header">
                        <span class="card-emoji">🧭</span>
                        <div class="card-title">查应用场景</div>
                    </div>
                    <div class="card-content">
                        <div class="card-subtitle" data-question="低空经济企业有哪些应用场景？">低空经济企业有哪些应用场景？</div>
                        <div class="card-subtitle" data-question="政府扶持可以哪几方面展开？">政府扶持可以哪几方面展开？</div>
                    </div>
                </div>
            </div>
        `;
        
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = recommendationHTML;
            // 重新绑定推荐卡片点击事件
            this.bindRecommendationCards();
        }
    }

    // 加载聊天历史
    async loadChatHistory() {
        if (!this.chatManager) 
            return;
        

        try {
            const messages = await this.chatManager.getAllMessages();
            this.renderMessages(messages);
        } catch (error) {
            console.error('加载聊天历史失败:', error);
        }
    }

    // 渲染消息列表
    renderMessages(messages) {
        if (!this.messagesContainer) 
            return;
        

        // 保存推荐卡片容器
        const recommendationContainer = this.messagesContainer.querySelector('.recommendation-cards-container');

        // 清空消息容器，但保留推荐卡片
        this.messagesContainer.innerHTML = '';
        if (recommendationContainer) {
            this.messagesContainer.appendChild(recommendationContainer);
        }

        // 渲染历史消息（如果有的话）
        if (messages && messages.length > 0) {
            console.log('渲染历史消息:', messages.length, '条');
            messages.forEach(message => {
                this.addMessageToUI(message.role, message.content, false);
            });
        } else {
            console.log('没有历史消息需要渲染');
        }

        this.scrollToBottom();
    }

    // 发送消息 - 对齐ai_chat_widget.html
    async sendMessage() {
        const message = this.inputArea.value.trim();
        if (message === '') 
            return;
        

        // 标准化Unicode字符，确保表情符号正确处理 - 对齐ai_chat_widget.html
        const normalizedMessage = message.normalize('NFC');

        // 如果AI正在响应，则停止当前响应 - 对齐ai_chat_widget.html
        if (this.isAIResponding) { // TODO: 实现停止AI响应的逻辑
            console.log('停止AI响应');
            return;
        }

        console.log('发送消息:', normalizedMessage);

        // 清空输入框并重置高度 - 对齐ai_chat_widget.html
        this.inputArea.value = '';
        this.inputArea.style.height = 'auto';
        this.inputArea.style.height = '60px'; // 重置为最小高度
        this.autoResizeInput();

        // 添加用户消息到UI
        this.addMessageToUI('user', normalizedMessage);

        // 显示加载状态
        this.showTypingIndicator();

        // 设置AI响应状态
        this.setSendButtonState(true);

        try {
            console.log('获取AI聊天管理器...');
            const chatManager = await this.getChatManager();

            console.log('发送消息到AI:', normalizedMessage);
            const response = await chatManager.sendMessage(normalizedMessage);

            console.log('收到AI响应:', response, '类型:', typeof response);

            // 隐藏加载状态
            this.hideTypingIndicator();

            if (response) { // AIChatManager.sendMessage 直接返回AI回复内容（字符串）
                const aiContent = typeof response === 'string' ? response : response.content;
                if (aiContent && aiContent.trim()) {
                    console.log('添加AI回复到UI:', aiContent);
                    this.addMessageToUI('assistant', aiContent);
                } else {
                    console.error('AI回复内容为空:', aiContent);
                    throw new Error('AI回复内容为空');
                }
            } else {
                console.error('未收到AI响应');
                throw new Error('未收到AI响应');
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            this.hideTypingIndicator();
            this.addMessageToUI('assistant', `抱歉，我遇到了问题：${
                error.message
            }。请稍后再试。`);
        } finally { // 恢复发送按钮状态
            this.setSendButtonState(false);
        }
    }

    // 添加消息到UI
    addMessageToUI(role, content, animate = true) {
        if (!this.messagesContainer) 
            return;
        

        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start space-x-3 mb-4 chat-message-item';

        if (role === 'user') {
            messageDiv.innerHTML = `
        <div class="flex-1"></div>
        <div class="homepage-chat-message-user">
            <div class="markdown-content">${
                this.renderContent(content)
            }</div>
            <!-- 用户消息悬浮按钮 -->
            <div class="homepage-message-hover-actions">
                <button class="homepage-message-action-btn regenerate-btn" title="重新生成">
                    <span class="btn-tooltip">重新生成</span>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                </button>
                <button class="homepage-message-action-btn edit-btn" title="编辑消息">
                    <span class="btn-tooltip">编辑消息</span>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                </button>
                <button class="homepage-message-action-btn delete-btn" title="删除消息">
                    <span class="btn-tooltip">删除消息</span>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
        } else {
            // 从HTML中获取logo URL，避免在JS中使用Django模板标签
            const logoUrl = this.getStaticAssetUrl('ai_assistant_logo.jpg');
            messageDiv.innerHTML = `
        <img src="${logoUrl}" alt="AI" class="w-10 h-10 mt-1 opacity-85 flex-shrink-0" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)) drop-shadow(0 0 2px rgba(255,255,255,0.2));">
        <div class="homepage-chat-message-ai">
            <div class="markdown-content">${
                this.renderContent(content)
            }</div>
            <!-- AI消息悬浮按钮 -->
            <div class="homepage-message-hover-actions">
                <button class="homepage-message-action-btn regenerate-btn" title="重新生成">
                    <span class="btn-tooltip">重新生成</span>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                </button>
                <button class="homepage-message-action-btn copy-btn" title="复制内容">
                    <span class="btn-tooltip">复制内容</span>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2z"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
        }

        if (animate) {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(10px)';
        }

        this.messagesContainer.appendChild(messageDiv);

        if (animate) {
            setTimeout(() => {
                messageDiv.style.transition = 'all 0.3s ease';
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            }, 50);
        }

        this.scrollToBottom();

        // 为新添加的消息绑定悬浮按钮事件
        this.bindMessageHoverActions(messageDiv);
    }

    // 绑定消息悬浮按钮事件
    bindMessageHoverActions(messageDiv) {
        const copyBtn = messageDiv.querySelector('.copy-btn');
        const regenerateBtn = messageDiv.querySelector('.regenerate-btn');
        const editBtn = messageDiv.querySelector('.edit-btn');
        const deleteBtn = messageDiv.querySelector('.delete-btn');

        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyMessage(copyBtn);
            });
        }

        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.regenerateResponse(regenerateBtn);
            });
        }

        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editMessage(editBtn);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteMessage(deleteBtn);
            });
        }
    }

    // 复制消息功能 - 完全对齐ai_chat_widget.html
    copyMessage(button) { // 获取消息内容元素
        const messageContainer = button.closest('.homepage-chat-message-ai, .homepage-chat-message-user');
        const messageContentEl = messageContainer.querySelector('.markdown-content');
        const messageText = messageContentEl.textContent || messageContentEl.innerText;

        // 复制到剪贴板
        navigator.clipboard.writeText(messageText).then(() => { // 显示复制成功提示
            const originalTitle = button.title;
            button.title = '已复制！';
            button.style.borderColor = 'rgba(16, 185, 129, 0.4)';

            setTimeout(() => {
                button.title = originalTitle;
                button.style.borderColor = '';
            }, 1500);
        }).catch(() => { // 降级方案 - 选择文本
            const range = document.createRange();
            const selection = window.getSelection();

            range.selectNodeContents(messageContentEl);
            selection.removeAllRanges();
            selection.addRange(range);

            // 显示提示
            const originalTitle = button.title;
            button.title = '已选择文本';
            setTimeout(() => {
                button.title = originalTitle;
                selection.removeAllRanges();
            }, 1500);
        });
    }

    // 重新生成功能 - 完全对齐ai_chat_widget.html
    async regenerateResponse(button) { // 获取用户消息内容和对应的用户消息容器
        let userMessage = '';
        let userMessageContainer = null;
        let targetAiMessageContainer = null;

        // 查找用户消息和对应的AI回复
        const messageContainer = button.closest('.flex.items-start');
        const isUserMessage = messageContainer.querySelector('.homepage-chat-message-user') !== null;
        const isAiMessage = messageContainer.querySelector('.homepage-chat-message-ai') !== null;

        if (isUserMessage) { // 从用户消息按钮触发
            userMessageContainer = messageContainer;
            const userMessageEl = messageContainer.querySelector('.homepage-chat-message-user .markdown-content');
            if (userMessageEl) {
                userMessage = userMessageEl.textContent.trim() || userMessageEl.innerText.trim();
            }

            // 查找对应的AI回复
            let nextElement = messageContainer.nextElementSibling;
            while (nextElement) {
                const aiMessage = nextElement.querySelector('.homepage-chat-message-ai');
                if (aiMessage) {
                    targetAiMessageContainer = nextElement;
                    break;
                }
                nextElement = nextElement.nextElementSibling;
            }
        } else if (isAiMessage) { // 从AI消息按钮触发
            targetAiMessageContainer = messageContainer;

            // 往前查找对应的用户消息
            let prevElement = messageContainer.previousElementSibling;
            while (prevElement) {
                const userMessageEl = prevElement.querySelector('.homepage-chat-message-user .markdown-content');
                if (userMessageEl) {
                    userMessage = userMessageEl.textContent.trim() || userMessageEl.innerText.trim();
                    userMessageContainer = prevElement;
                    break;
                }
                prevElement = prevElement.previousElementSibling;
            }
        }

        if (! userMessage) {
            console.warn('未找到用户消息内容');
            alert('未找到要重新生成的用户消息');
            return;
        }

        console.log('准备重新生成AI回复，用户消息:', userMessage);

        // 设置重新生成状态
        this.setSendButtonState(true);

        // 如果有现有的AI回复，显示重新生成状态
        let originalContent = '';
        let aiMessageBubble = null;
        let typingDiv = null;

        if (targetAiMessageContainer) {
            aiMessageBubble = targetAiMessageContainer.querySelector('.homepage-chat-message-ai');
            if (aiMessageBubble) {
                const messageContentEl = aiMessageBubble.querySelector('.markdown-content');
                if (messageContentEl) {
                    originalContent = messageContentEl.textContent || messageContentEl.innerText;

                    // 隐藏原文本，显示打字指示器
                    messageContentEl.style.display = 'none';

                    // 创建打字指示器
                    typingDiv = document.createElement('div');
                    typingDiv.className = 'homepage-typing-indicator';
                    typingDiv.innerHTML = `
                <div class="homepage-typing-dot"></div>
                <div class="homepage-typing-dot"></div>
                <div class="homepage-typing-dot"></div>
            `;

                    aiMessageBubble.insertBefore(typingDiv, messageContentEl);
                    aiMessageBubble.classList.add('message-regenerating');
                }
            }
        } else { // 没有现有AI回复，显示新的打字指示器
            this.showTypingIndicator();
            typingDiv = document.getElementById('homepage-typing-indicator');
        }

        try { // 获取聊天管理器并调用重新生成
            const chatManager = await this.getChatManager();

            // 获取用户消息ID用于重新生成请求
            let userMessageId = null;
            const allMessages = chatManager.getAllMessages();
            const matchingUserMsg = allMessages.find(msg => msg.role === 'user' && msg.content.trim() === userMessage.trim());
            if (matchingUserMsg) {
                userMessageId = matchingUserMsg.id;
                console.log('找到用户消息ID:', userMessageId);
            }

            const newAiResponse = await chatManager.regenerateResponse(userMessage, userMessageId);

            if (newAiResponse) {
                if (targetAiMessageContainer && aiMessageBubble) { // 更新现有的AI回复
                    const messageContentEl = aiMessageBubble.querySelector('.markdown-content');
                    if (messageContentEl) {
                        messageContentEl.innerHTML = this.renderContent(newAiResponse);
                        messageContentEl.style.display = '';
                    }

                    // 清理打字指示器和状态
                    if (typingDiv && typingDiv.parentNode) {
                        typingDiv.parentNode.removeChild(typingDiv);
                    }
                    aiMessageBubble.classList.remove('message-regenerating');
                } else { // 添加新的AI回复到UI
                    this.hideTypingIndicator();
                    this.addMessageToUI('assistant', newAiResponse);
                }

                console.log('重新生成成功');
            } else {
                throw new Error('重新生成返回空内容');
            }

        } catch (error) {
            console.error('重新生成失败:', error);

            // 清理打字指示器
            if (typingDiv && typingDiv.parentNode) {
                typingDiv.parentNode.removeChild(typingDiv);
            }

            // 恢复状态
            if (aiMessageBubble) {
                const messageContentEl = aiMessageBubble.querySelector('.markdown-content');
                if (messageContentEl) {
                    messageContentEl.innerHTML = this.renderContent(originalContent);
                    messageContentEl.style.display = '';
                }
                aiMessageBubble.classList.remove('message-regenerating');
            } else {
                this.hideTypingIndicator();
                this.addMessageToUI('assistant', '重新生成失败，请检查网络连接后重试。');
            }
        } finally {
            this.setSendButtonState(false);
        }
    }

    // 编辑消息功能 - 完全对齐ai_chat_widget.html
    editMessage(button) { // 获取消息内容元素
        const messageContentEl = button.closest('.homepage-chat-message-user').querySelector('.markdown-content');
        const originalText = messageContentEl.textContent || messageContentEl.innerText;
        const messageBubble = button.closest('.homepage-chat-message-user');

        // 创建编辑输入框 - 使用ai_chat_widget.css中的样式类
        const editInput = document.createElement('textarea');
        editInput.value = originalText;

        // 智能检测长文本模式 - 使用正确的CSS类名
        const isLongText = originalText.length > 100 || originalText.split('\n').length > 3;
        const baseClass = 'message-edit-input'; // 使用ai_chat_widget.css中的类名
        editInput.className = isLongText ? `${baseClass} long-text-mode` : baseClass;

        // 设置智能placeholder - 完全对齐ai_chat_widget.html
        if (isLongText) {
            editInput.placeholder = '✏️ 长文本编辑模式已启用\n\n💡 优化功能:\n• 更大的编辑空间\n• 智能自动扩展\n• Enter = 保存, Shift+Enter = 换行\n• Esc = 取消编辑';
        } else {
            editInput.placeholder = '✏️ 编辑你的问题...\n💡 Enter保存, Esc取消';
        }

        // 临时隐藏原文本
        messageContentEl.style.opacity = '0';
        messageContentEl.style.pointerEvents = 'none';

        // 在气泡内插入编辑框
        messageBubble.appendChild(editInput);

        // 智能高度计算 - 对齐ai_chat_widget.html的逻辑
        const baseMinHeight = isLongText ? 56 : 40;
        const maxHeight = isLongText ? 320 : 200;
        const lineHeight = 18;

        // 计算初始高度
        const lines = originalText.split('\n').length;
        const estimatedLines = Math.max(lines, Math.ceil(originalText.length / 40));
        const contentHeight = Math.max(estimatedLines * lineHeight + 32, baseMinHeight);
        const initialHeight = Math.min(contentHeight, maxHeight);

        // 设置初始高度
        editInput.style.height = initialHeight + 'px';
        editInput.style.minHeight = baseMinHeight + 'px';
        editInput.style.maxHeight = maxHeight + 'px';

        // 智能自动高度调整 - 完全对齐ai_chat_widget.html
        const adjustHeight = () => {
            editInput.style.height = 'auto';
            editInput.style.overflowY = 'hidden';

            const scrollHeight = editInput.scrollHeight;
            const newHeight = Math.max(scrollHeight, baseMinHeight);
            const finalHeight = Math.min(newHeight, maxHeight);

            editInput.style.height = finalHeight + 'px';

            if (scrollHeight > maxHeight) {
                editInput.style.overflowY = 'auto';
            } else {
                editInput.style.overflowY = 'hidden';
                editInput.scrollTop = 0;
            }
        };

        // 聚焦和选择文本 - 对齐ai_chat_widget.html
        setTimeout(() => {
            editInput.focus();
            if (originalText.length < 50) {
                editInput.select();
            } else {
                editInput.setSelectionRange(originalText.length, originalText.length);
                editInput.scrollTop = editInput.scrollHeight;
            }
        }, 50);

        // 事件监听器
        editInput.addEventListener('input', adjustHeight);

        // 动态长文本检测 - 对齐ai_chat_widget.html
        editInput.addEventListener('input', (e) => {
            const currentText = editInput.value;
            const shouldBeLongText = currentText.length > 100 || currentText.split('\n').length > 3;
            const currentlyLongText = editInput.classList.contains('long-text-mode');

            if (shouldBeLongText && ! currentlyLongText) {
                editInput.classList.add('long-text-mode');
                editInput.placeholder = '✏️ 长文本编辑模式已启用\n\n💡 优化功能:\n• 更大的编辑空间\n• 智能自动扩展\n• Enter = 保存, Shift+Enter = 换行\n• Esc = 取消编辑';
            } else if (! shouldBeLongText && currentlyLongText && currentText.length < 80) {
                editInput.classList.remove('long-text-mode');
                editInput.placeholder = '✏️ 编辑你的问题...\n💡 Enter保存, Esc取消';
            }

            adjustHeight();

            // 智能保存提示
            if (editInput.value.trim() !== originalText.trim() && editInput.value.trim() !== '') {
                editInput.style.borderColor = 'rgba(34, 197, 94, 0.5)';
            } else {
                editInput.style.borderColor = '';
            }
        });

        // 保存函数 - 保持不变，已经实现完整
        const saveEdit = async () => {
            const newText = editInput.value.trim();
            if (newText && newText !== originalText) {
                try {
                    const chatManager = await this.getChatManager();
                    const allMessages = chatManager.getAllMessages();

                    // 查找用户消息
                    let userMessage = allMessages.find(msg => msg.role === 'user' && msg.content.trim() === originalText.trim());

                    if (userMessage && userMessage.id) { // 调用后端API更新消息内容
                        await chatManager.updateMessage(userMessage.id, newText);
                        console.log('消息已成功保存到后端:', newText);

                        // 更新UI显示
                        messageContentEl.innerHTML = this.renderContent(newText);

                        // 同步更新本地消息数组
                        const localMessageIndex = allMessages.findIndex(msg => msg.id === userMessage.id);
                        if (localMessageIndex !== -1) {
                            chatManager.messages[localMessageIndex].content = newText;
                        }
                    } else { // 降级处理
                        console.log('未找到消息ID，仅更新本地UI');
                        messageContentEl.innerHTML = this.renderContent(newText);
                    }
                } catch (error) {
                    console.error('保存编辑消息失败:', error);
                    messageContentEl.innerHTML = this.renderContent(newText);
                }
            } else if (newText === originalText) {
                messageContentEl.innerHTML = this.renderContent(newText);
            }

            // 清理编辑状态
            editInput.remove();
            messageContentEl.style.opacity = '';
            messageContentEl.style.pointerEvents = '';
        };

        // 取消函数
        const cancelEdit = () => {
            editInput.remove();
            messageContentEl.style.opacity = '';
            messageContentEl.style.pointerEvents = '';
        };

        // 键盘事件 - 完全对齐ai_chat_widget.html
        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
                e.preventDefault();
                editInput.value = originalText;
                adjustHeight();
                editInput.style.borderColor = '';
            }
        });

        // 失焦保存 - 对齐ai_chat_widget.html
        editInput.addEventListener('blur', (e) => {
            const relatedTarget = e.relatedTarget;
            if (relatedTarget && (relatedTarget.tagName === 'INPUT' || relatedTarget.tagName === 'TEXTAREA')) {
                return;
            }

            const currentText = editInput.value.trim();
            if (currentText !== originalText.trim() && currentText !== '') {
                saveEdit();
            } else if (currentText === '') {
                cancelEdit();
            } else {
                cancelEdit();
            }
        });

        // 初始调整高度
        setTimeout(adjustHeight, 0);
    }

    // 删除消息功能 - 完全对齐ai_chat_widget.html
    async deleteMessage(button) { // 确认是否要删除
        if (!confirm('确定要删除这条消息吗？此操作无法撤销，将同时删除对应的AI回复。')) {
            return;
        }

        // 查找消息容器
        const messageContainer = button.closest('.flex.items-start');
        if (! messageContainer) {
            console.warn('未找到消息容器');
            return;
        }

        // 只处理用户消息删除
        const userMessageElement = messageContainer.querySelector('.homepage-chat-message-user');
        if (! userMessageElement) {
            console.warn('只能删除用户消息');
            return;
        }

        // 获取用户消息内容
        const messageContentEl = userMessageElement.querySelector('.markdown-content');
        if (! messageContentEl) {
            console.warn('未找到消息内容');
            return;
        }

        const userMessageContent = messageContentEl.textContent || messageContentEl.innerText;
        console.log('准备删除用户消息:', userMessageContent);

        try { // 获取聊天管理器
            const chatManager = await this.getChatManager();

            // 在本地消息中查找对应的用户消息ID
            const userMessage = chatManager.getAllMessages().find(msg => msg.role === 'user' && msg.content.trim() === userMessageContent.trim());

            if (! userMessage || ! userMessage.id) {
                throw new Error('未找到对应的用户消息ID');
            }

            console.log('找到用户消息ID:', userMessage.id);

            // 显示删除中状态
            messageContainer.style.opacity = '0.5';
            messageContainer.style.pointerEvents = 'none';

            // 调用后端API删除消息对
            await chatManager.deleteMessagePair(userMessage.id);

            // 查找要删除的UI元素（用户消息和对应的AI回复）
            let nextElement = messageContainer.nextElementSibling;
            const messagesToDelete = [messageContainer];

            // 查找紧随其后的AI回复消息
            while (nextElement) {
                const aiMessage = nextElement.querySelector('.homepage-chat-message-ai');
                if (aiMessage) {
                    messagesToDelete.push(nextElement);
                    break;
                }
                // 如果遇到另一个用户消息，停止查找
                if (nextElement.querySelector('.homepage-chat-message-user')) {
                    break;
                }
                nextElement = nextElement.nextElementSibling;
            }

            // 添加删除动画并移除UI元素
            messagesToDelete.forEach((element, index) => {
                element.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                element.style.opacity = '0';
                element.style.transform = 'translateY(-10px)';

                setTimeout(() => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                }, 300 + index * 100);
            });

            console.log(`消息删除成功: 用户消息及其${
                messagesToDelete.length - 1
            }条AI回复已从数据库和UI中删除`);

        } catch (error) {
            console.error('删除消息失败:', error);

            // 恢复UI状态
            messageContainer.style.opacity = '';
            messageContainer.style.pointerEvents = '';

            // 显示错误提示
            let errorMessage = '删除消息失败，请稍后重试。';
            if (error.message.includes('未找到')) {
                errorMessage = '未找到要删除的消息，可能已被删除。';
            }

            alert(errorMessage);
        }
    }

    // 增强悬停按钮用户体验 - 完全对齐ai_chat_widget.html
    enhanceHoverButtonExperience() {
        let hoverTimeout = null;

        // 为所有消息容器添加增强的悬停逻辑
        document.addEventListener('mouseover', (e) => {
            const messageContainer = e.target.closest('.homepage-chat-message-ai, .homepage-chat-message-user');
            const hoverActions = e.target.closest('.homepage-message-hover-actions');

            if (messageContainer || hoverActions) { // 清除任何现有的隐藏计时器
                if (hoverTimeout) {
                    clearTimeout(hoverTimeout);
                    hoverTimeout = null;
                }

                // 如果悬停在消息上，显示对应的按钮
                if (messageContainer) {
                    const actions = messageContainer.querySelector('.homepage-message-hover-actions');
                    if (actions) {
                        actions.style.opacity = '1';
                        actions.style.visibility = 'visible';
                        actions.style.transition = 'opacity 0.1s ease-out, visibility 0.1s ease-out';
                    }
                }
            }
        });

        // 处理鼠标离开
        document.addEventListener('mouseout', (e) => {
            const messageContainer = e.target.closest('.homepage-chat-message-ai, .homepage-chat-message-user');
            const hoverActions = e.target.closest('.homepage-message-hover-actions');

            // 检查鼠标是否真的离开了消息区域
            if (messageContainer || hoverActions) {
                const relatedTarget = e.relatedTarget;
                const sameContainer = relatedTarget && (relatedTarget.closest('.homepage-chat-message-ai, .homepage-chat-message-user') === messageContainer || relatedTarget.closest('.homepage-message-hover-actions') === (messageContainer ? messageContainer.querySelector('.homepage-message-hover-actions') : hoverActions));

                if (! sameContainer) { // 延迟隐藏，给用户时间移动鼠标
                    hoverTimeout = setTimeout(() => {
                        const actions = messageContainer ? messageContainer.querySelector('.homepage-message-hover-actions') : hoverActions;

                        if (actions && ! actions.matches(':hover') && ! actions.closest('.homepage-chat-message-ai, .homepage-chat-message-user').matches(':hover')) {
                            actions.style.opacity = '0';
                            actions.style.visibility = 'hidden';
                            actions.style.transition = 'opacity 0.3s ease-in, visibility 0.3s ease-in';
                        }
                    }, 200); // 200ms延迟，给用户足够时间
                }
            }
        });

        // 为按钮添加直接悬停检测
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest('.homepage-message-action-btn')) {
                const actions = e.target.closest('.homepage-message-hover-actions');
                if (actions) { // 清除隐藏计时器
                    if (hoverTimeout) {
                        clearTimeout(hoverTimeout);
                        hoverTimeout = null;
                    }

                    // 确保按钮组保持可见
                    actions.style.opacity = '1';
                    actions.style.visibility = 'visible';
                    actions.style.transition = 'none';
                }
            }
        });

        console.log('首页AI聊天悬停按钮体验增强已启用');
    }

    // 渲染消息内容
    renderContent(content) {
        console.log('renderContent被调用，内容长度:', content.length);
        console.log('markdownRenderer可用:', !!this.markdownRenderer);

        if (this.markdownRenderer) {
            try {
                const result = this.markdownRenderer.render(content);
                console.log('Markdown渲染成功');
                return result;
            } catch (error) {
                console.error('Markdown渲染器调用失败:', error);
                return this.basicMarkdownRender(content);
            }
        } else {
            console.warn('Markdown渲染器不可用，使用基本渲染');
            return this.basicMarkdownRender(content);
        }
    }

    // 基本Markdown渲染（降级方案）
    basicMarkdownRender(content) {
        console.log('使用基本Markdown渲染');

        // 转义HTML特殊字符
        let html = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        // 基本Markdown语法处理
        html = html
        // 标题.replace(/^### (.*$)/gm, '<h3>$1</h3>').replace(/^## (.*$)/gm, '<h2>$1</h2>').replace(/^# (.*$)/gm, '<h1>$1</h1>')

        // 粗体和斜体.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')

        // 代码块.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>').replace(/`(.*?)`/g, '<code>$1</code>');

        // 处理列表 - 改进的处理方式
        const lines = html.split('\n');
        const processedLines = [];
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const isListItem = /^[\s]*-[\s]+(.*)$/.test(line);

            if (isListItem) {
                const match = line.match(/^[\s]*-[\s]+(.*)$/);
                if (! inList) {
                    processedLines.push('<ul>');
                    inList = true;
                }
                processedLines.push(`<li>${
                    match[1]
                }</li>`);
            } else {
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                }
                processedLines.push(line);
            }
        }

        // 如果文档结束时还在列表中，关闭列表
        if (inList) {
            processedLines.push('</ul>');
        }

        html = processedLines.join('\n');

        // 处理换行和段落
        html = html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');

        // 包装段落
        if (html && ! html.startsWith('<')) {
            html = '<p>' + html + '</p>';
        }

        // 清理多余的段落标签
        html = html.replace(/<p><\/p>/g, '').replace(/<p>(<[uo]l>)/g, '$1').replace(/(<\/[uo]l>)<\/p>/g, '$1').replace(/<p>(<h[1-6]>)/g, '$1').replace(/(<\/h[1-6]>)<\/p>/g, '$1').replace(/<p>(<pre>)/g, '$1').replace(/(<\/pre>)<\/p>/g, '$1');

        console.log('基本渲染结果:', html.substring(0, 200) + '...');
        return html;
    }

    // 显示打字指示器
    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'flex items-start space-x-3 mb-4';
        indicator.id = 'homepage-typing-indicator';
        // 从HTML中获取logo URL，避免在JS中使用Django模板标签
        const logoUrl = this.getStaticAssetUrl('ai_assistant_logo.jpg');
        indicator.innerHTML = `
    <img src="${logoUrl}" alt="AI" class="w-10 h-10 mt-1 opacity-85 flex-shrink-0" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)) drop-shadow(0 0 2px rgba(255,255,255,0.2));">
    <div class="homepage-typing-indicator">
        <div class="homepage-typing-dot"></div>
        <div class="homepage-typing-dot"></div>
        <div class="homepage-typing-dot"></div>
    </div>
`;

        this.messagesContainer.appendChild(indicator);
        this.scrollToBottom();
    }

    // 隐藏打字指示器
    hideTypingIndicator() {
        const indicator = document.getElementById('homepage-typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // 设置发送按钮状态 - 对齐ai_chat_widget.html
    setSendButtonState(isLoading) {
        if (!this.sendBtn) 
            return;
        

        this.isAIResponding = isLoading; // 更新AI响应状态

        const sendIcon = this.sendBtn.querySelector('.send-icon');
        const stopIcon = this.sendBtn.querySelector('.stop-icon');

        if (isLoading) {
            this.sendBtn.classList.add('send-btn-sending');
            sendIcon.classList.add('hidden');
            stopIcon.classList.remove('hidden');
            this.sendBtn.disabled = false; // 发送中时允许点击停止
            this.sendBtn.title = '停止生成';
        } else {
            this.sendBtn.classList.remove('send-btn-sending');
            sendIcon.classList.remove('hidden');
            stopIcon.classList.add('hidden');
            this.sendBtn.disabled = this.inputArea.value.trim() === ''; // 根据输入框内容设置
            this.sendBtn.title = '发送消息';
        }
    }

    // 自动调整输入框高度
    autoResizeInput() {
        if (!this.inputArea) 
            return;
        

        this.inputArea.style.height = 'auto';
        this.inputArea.style.height = Math.min(this.inputArea.scrollHeight, 150) + 'px';
    }

    // 滚动到底部
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    // 绑定推荐卡片点击事件
    bindRecommendationCards() { // 使用事件委托，避免因为DOM更新导致事件丢失
        if (this.messagesContainer) {
            this.messagesContainer.addEventListener('click', (e) => { // 只响应card-subtitle元素的点击
                const subtitle = e.target.closest('.card-subtitle');
                if (subtitle) {
                    const question = subtitle.getAttribute('data-question');
                    if (question && this.inputArea) { // 将推荐问题填入输入框
                        this.inputArea.value = question;
                        this.autoResizeInput();

                        // 更新发送按钮状态
                        if (this.sendBtn && !this.isAIResponding) {
                            this.sendBtn.disabled = false;
                        }

                        // 聚焦输入框
                        this.inputArea.focus();

                        // 可选：自动发送问题
                        // this.sendMessage();
                    }
                }
            });
        }

        console.log('推荐卡片点击事件已绑定');
    }


}

// 全局初始化
window.homepageAIChat = null;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function () {
    window.homepageAIChat = new HomepageAIChatManager();
});